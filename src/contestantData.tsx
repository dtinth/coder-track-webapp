import { firebase } from "./firebase";

export function getContestantDataRef() {
  return firebase
    .database()
    .ref("contestants")
    .child(firebase.auth().currentUser!.uid);
}
