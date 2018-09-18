import crypto from "crypto";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getRankingInfo } from "./submissions";

admin.initializeApp();

export const getInput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You must authenticate"
    );
  }
  const uid = context.auth.uid;
  const bucket = getBucket(uid);
  const snapshot = await admin
    .database()
    .ref("data")
    .child(String(data.problemId))
    .child(String(bucket))
    .child("input")
    .once("value");
  const input = snapshot.val();
  if (!input) {
    throw new functions.https.HttpsError(
      "internal",
      "No input... Something is wrong! " +
        `(uid=${uid}, problemId=${data.problemId}, bucket=${bucket})`
    );
  }
  // TODO: check if problem has been activated
  return {
    bucket,
    input
  };
});

export const submitOutput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You must authenticate"
    );
  }
  const uid = context.auth.uid;
  const bucket = getBucket(uid);
  const problemId = String(data.problemId);
  const snapshot = await admin
    .database()
    .ref("data")
    .child(problemId)
    .child(String(bucket))
    .child("output")
    .once("value");
  const expectedOutput = snapshot.val();
  if (!expectedOutput) {
    throw new functions.https.HttpsError(
      "internal",
      "No test output... Something is wrong! " +
        `(uid=${uid}, problemId=${data.problemId}, bucket=${bucket})`
    );
  }
  const contestantRef = admin
    .database()
    .ref("contestants")
    .child(String(uid));
  const contestantInfo = await contestantRef.once("value");
  const cooldown = contestantInfo.child("cooldown").val();
  if (cooldown && Date.now() < cooldown + 30000) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Please wait ${Math.max(
        0,
        Math.ceil((cooldown + 30000 - Date.now()) / 1000)
      )}s before re-submitting`
    );
  }
  const actualOutput = String(data.output);
  const sanitize = (str: string) => str.trim().replace(/\s+/g, " ");
  const success = sanitize(expectedOutput) === sanitize(actualOutput);
  await admin
    .database()
    .ref("contest/logs/submissions")
    .child(problemId)
    .push(logEntry(context, { output: actualOutput, success, bucket }));
  if (success) {
    await admin
      .database()
      .ref("contest/solved")
      .child(String(uid))
      .child(problemId)
      .set(admin.database.ServerValue.TIMESTAMP);
  } else {
    await contestantRef
      .child("cooldown")
      .set(admin.database.ServerValue.TIMESTAMP);
  }
  return {
    success
  };
});

export const joinContest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You must authenticate"
    );
  }
  const track = String(data.track);
  if (track !== "individual" && track !== "student") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "'track' must be either 'individual' or 'student'"
    );
  }
  const uid = context.auth.uid;
  const bucket = getBucket(uid);
  const contestantRef = admin
    .database()
    .ref("contestants")
    .child(String(uid));
  const snapshot = await contestantRef.once("value");
  if (snapshot.exists()) {
    throw new functions.https.HttpsError(
      "already-exists",
      "You already joined!"
    );
  }
  await contestantRef.set({
    name: String(context.auth.token.name),
    track: track,
    joinedAt: admin.database.ServerValue.TIMESTAMP
  });
  await admin
    .database()
    .ref("contest/logs/join")
    .push(logEntry(context, { track: track }));
  return { ok: true };
});
export const submitSourceCode = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You must authenticate"
      );
    }
    const uid = context.auth.uid;
    const problemId = String(data.problemId);
    const code = String(data.code);
    await admin
      .database()
      .ref("contest/logs/code")
      .child(problemId)
      .push(logEntry(context, { code }));
    await admin
      .database()
      .ref("contest/code")
      .child(problemId)
      .child(String(uid))
      .set(code);
    return {
      ok: true
    };
  }
);

//////////////// ADMIN /////////////////

export const makeCurrent = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const problemId = String(data.problemId);
  await admin
    .database()
    .ref("contest/info/currentProblem")
    .set(problemId);
  const activatedRef = admin
    .database()
    .ref("contest/info/problems")
    .child(problemId)
    .child("activated");
  if (!(await activatedRef.once("value")).val()) {
    await activatedRef.set(admin.database.ServerValue.TIMESTAMP);
  }
  await admin
    .database()
    .ref("contest/logs/admin")
    .push(logEntry(context, { action: "makeCurrent", problemId }));
  return { ok: true };
});

export const removeCurrent = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  await admin
    .database()
    .ref("contest/info/currentProblem")
    .set(null);
  await admin
    .database()
    .ref("contest/logs/admin")
    .push(logEntry(context, { action: "removeCurrent" }));
  return { ok: true };
});

export const allowSubmission = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const problemId = String(data.problemId);
  await admin
    .database()
    .ref("contest/info/problems")
    .child(problemId)
    .child("submissionAllowed")
    .set(admin.database.ServerValue.TIMESTAMP);
  await admin
    .database()
    .ref("contest/logs/admin")
    .push(logEntry(context, { action: "allowSubmission", problemId }));
  return { ok: true };
});

export const finishProblem = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const problemId = String(data.problemId);
  await admin
    .database()
    .ref("contest/info/problems")
    .child(problemId)
    .child("finished")
    .set(admin.database.ServerValue.TIMESTAMP);
  await admin
    .database()
    .ref("contest/logs/admin")
    .push(logEntry(context, { action: "finishProblem", problemId }));
  const submissions = (await admin
    .database()
    .ref("contest/logs/submissions")
    .child(problemId)
    .once("value")).val();
  const { finishers } = getRankingInfo(submissions);
  const logs: string[] = [];
  for (const finisher of finishers) {
    const pts = 100 - (finisher.rank - 1);
    await admin
      .database()
      .ref("contest/points")
      .child(finisher.uid)
      .child(problemId)
      .set(pts);
    logs.push(`${pts} to ${finisher.uid}`);
  }
  return { ok: true, logs };
});

async function assertAdmin(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You must authenticate"
    );
  }
  const isAdmin = await admin
    .database()
    .ref("admins")
    .child(context.auth.uid)
    .once("value");
  if (isAdmin.val() !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You are not admin"
    );
  }
}
//////////////// UTILS /////////////////

function logEntry(
  context: functions.https.CallableContext,
  data: { [k: string]: any }
) {
  return {
    ...data,
    timestamp: admin.database.ServerValue.TIMESTAMP,
    uid: context.auth && context.auth.uid
  };
}

function getBucket(uid: string) {
  const hash = crypto.createHash("sha1");
  hash.update(uid);
  const hex = hash.digest("hex");
  const bucket = (parseInt(hex.substr(1, 8), 16) % 3) + 1;
  return bucket;
}
