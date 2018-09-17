import crypto from "crypto";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
      "No input... Something is wrong! " + `(uid=${uid}, bucket=${bucket})`
    );
  }
  // TODO: check if problem has been activated
  return {
    bucket,
    input
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
    name: context.auth.token.name,
    track: track,
    joinedAt: admin.database.ServerValue.TIMESTAMP,
    score: 0
  });
  await admin
    .database()
    .ref("logs/join")
    .push(logEntry(context, { track: track }));
  return {};
});

function logEntry(
  context: functions.https.CallableContext,
  data: { [k: string]: any }
) {
  return {
    ...data,
    timestamp: admin.database.ServerValue.TIMESTAMP,
    user: context.auth && context.auth.uid
  };
}

function getBucket(uid: string) {
  const hash = crypto.createHash("sha1");
  hash.update(uid);
  const hex = hash.digest("hex");
  const bucket = (parseInt(hex.substr(1, 8), 16) % 3) + 1;
  return bucket;
}
