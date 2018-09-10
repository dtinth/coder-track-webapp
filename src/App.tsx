import * as React from "react";
import { firebase } from "./firebase";
import { HashRouter } from "react-router-dom";

class App extends React.Component<
  {},
  { currentUser: firebase.User | null; authStatus: "checking" | "done" }
> {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      authStatus: "checking"
    };
  }
  componentDidMount() {
    firebase.auth().onAuthStateChanged(user => {
      this.setState({
        currentUser: user,
        authStatus: "done"
      });
    });
  }
  render() {
    if (this.state.authStatus === "checking") {
      return <div> checking... </div>;
    } else if (this.state.authStatus === "done") {
      if (this.state.currentUser) {
        return (
          <div>
            I am in... - <SignOutButton />
          </div>
        );
      } else {
        return <PleaseSignIn />;
      }
    }
  }
}

class SignOutButton extends React.Component<{}> {
  async signOut() {
    try {
      firebase.auth().signOut();
    } catch (e) {
      window.alert(`Cannot sign out: ${e}`);
    }
  }
  render() {
    return (
      <div>
        <button onClick={() => this.signOut()}>Sign out</button>
      </div>
    );
  }
}

class PleaseSignIn extends React.Component<{}> {
  async signIn() {
    try {
      firebase.auth().signInWithPopup(new firebase.auth.FacebookAuthProvider());
    } catch (e) {
      window.alert(`Cannot sign in: ${e}`);
    }
  }
  render() {
    return (
      <div>
        <button onClick={() => this.signIn()}>Sign In</button>
      </div>
    );
  }
}

function A(props) {
  // you can use object spread because babel-preset-react-app is set up for you
  const { href, children, ...rest } = props;
  return (
    <a
      className="App-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  );
}
export default App;
