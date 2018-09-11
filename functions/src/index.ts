import crypto from "crypto";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const getInput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new Error("You must authenticate");
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
    throw new Error(
      "No input... Something is wrong! " + `(uid=${uid}, bucket=${bucket})`
    );
  }
  // TODO: check if problem has been activated
  return {
    bucket,
    input
  };
});

function getBucket(uid: string) {
  const hash = crypto.createHash("sha1");
  hash.update(uid);
  const hex = hash.digest("hex");
  const bucket = (parseInt(hex.substr(1, 8), 16) % 3) + 1;
  return bucket;
}
