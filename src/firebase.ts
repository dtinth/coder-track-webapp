import * as firebase from "firebase";

var config = {
  apiKey: "AIzaSyCFoQm74_Fc0Us-uHTXUhSn72chT3hD6uA",
  authDomain: "codertrack.firebaseapp.com",
  databaseURL: "https://codertrack.firebaseio.com",
  projectId: "codertrack",
  storageBucket: "codertrack.appspot.com",
  messagingSenderId: "87702529255"
};

firebase.initializeApp(config);
Object.assign(window, { firebase });

export { firebase };
