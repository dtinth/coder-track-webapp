import * as React from "react";
import { firebase } from "./firebase";
import { css } from "react-emotion";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import { ContestantView } from "./ContestantView";
import { Button, Card, Loading, ErrorBox } from "./UI";
import { Data, unwrap } from "fiery";
import { getContestantDataRef } from "./contestantData";
import { AdminView } from "./AdminView";

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
                  <Data dataRef={getContestantDataRef()}>
                    {dataState =>
                      unwrap(dataState, {
                        completed: contestantInfo =>
                          contestantInfo ? (
                            <div>
                              You are on the{" "}
                              <strong>{contestantInfo.track}</strong> track.
                              <br />
                              You have <MyScore /> points.
                            </div>
                          ) : (
                            <div>(You have not joined the contest yet...)</div>
                          ),
                        error: (e, retry) => (
                          <ErrorBox error={e} retry={retry}>
                            Cannot load contestant info
                          </ErrorBox>
                        ),
                        loading: () => <div>Loading contestant information</div>
                      })
                    }
                  </Data>
                </div>
                <SignOutButton />
              </div>
            }
          >
            <HashRouter>
              <div>
                <Switch>
                  <Route
                    exact
                    path="/"
                    render={() => (
                      <ContestantView user={this.state.currentUser!} />
                    )}
                  />
                  <Route
                    exact
                    path="/problem/:id"
                    render={p => (
                      <ContestantView
                        user={this.state.currentUser!}
                        requestedProblem={p.match.params.id}
                      />
                    )}
                  />
                  <Route path="/admin" render={() => <AdminView />} />
                  <Route path="*" render={() => <Redirect to="/" />} />
                </Switch>
              </div>
            </HashRouter>
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

class MyScore extends React.Component {
  render() {
    return (
      <Data
        dataRef={firebase
          .database()
          .ref("contest/points")
          .child(firebase.auth().currentUser!.uid)}
      >
        {pointsState => {
          return unwrap(pointsState, {
            loading: () => "…",
            error: e => <span onClick={() => window.alert(e)}>???</span>,
            completed: points => {
              return Object.keys(points || {}).reduce(
                (a, b) => a + points[b],
                0
              );
            }
          });
        }}
      </Data>
    );
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
