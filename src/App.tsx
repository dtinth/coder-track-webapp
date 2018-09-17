import * as React from "react";
import { firebase } from "./firebase";
import { css, keyframes } from "react-emotion";
import { ContestantView } from "./ContestantView";
import { Button, Card, Loading } from "./UI";

class App extends React.Component<
  {},
  { currentUser: firebase.User | null; authStatus: "checking" | "done" }
> {
  constructor(props: any) {
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
      return (
        <MainContainer>
          <Loading>Checking authentication state…</Loading>
        </MainContainer>
      );
    } else if (this.state.authStatus === "done") {
      if (this.state.currentUser) {
        return (
          <MainContainer
            headerRight={
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ marginRight: "1em" }}>
                  Hello, <strong>{this.state.currentUser.displayName}</strong>
                  <br />
                  You have <strong>N</strong> points.
                </div>
                <SignOutButton />
              </div>
            }
          >
            <ContestantView user={this.state.currentUser} />
          </MainContainer>
        );
      } else {
        return (
          <MainContainer>
            <Card>
              You are not signed in — please <PleaseSignIn />
            </Card>
          </MainContainer>
        );
      }
    }
  }
}

class MainContainer extends React.Component<{
  headerRight?: React.ReactNode;
}> {
  render() {
    return (
      <div>
        <header
          className={css({
            borderBottom: "5px solid #F6D805",
            background: "white",
            display: "flex",
            alignItems: "center"
          })}
        >
          <img
            width={392}
            height={77}
            style={{ display: "block", flex: "none" }}
            src={require("./coder-track-logo.png")}
          />
          <div style={{ marginLeft: "auto", paddingRight: "16px" }}>
            {this.props.headerRight}
          </div>
        </header>
        {this.props.children}
      </div>
    );
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
    return <Button onClick={() => this.signOut()}>Sign Out</Button>;
  }
}

class PleaseSignIn extends React.Component<{}> {
  async signIn() {
    try {
      await firebase
        .auth()
        .signInWithPopup(new firebase.auth.FacebookAuthProvider());
    } catch (e) {
      window.alert(`Cannot sign in: ${e}`);
    }
  }
  render() {
    return <Button onClick={() => this.signIn()}>sign in</Button>;
  }
}

export default App;
