import crypto from "crypto";
import * as functions from "firebase-functions";

export const getInput = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new Error("You must authenticate");
  }
  const uid = context.auth.uid;
  const hash = crypto.createHash("sha1");
  hash.update(uid);
  const hex = hash.digest("hex");
  const bucket = (parseInt(hex.substr(0, 8), 16) % 3) + 1;
  return {
    bucket
  };
});
