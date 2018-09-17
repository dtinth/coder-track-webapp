import firebase from "firebase";
import React from "react";
import * as fiery from "fiery";
import { ProblemView } from "./ProblemView";
import { Loading, ErrorBox } from "./UI";
import { Data } from "fiery";

export class ContestantView extends React.Component<{ user: firebase.User }> {
  render() {
    return (
      <Data dataRef={firebase.database().ref("currentProblem")}>
        {dataState =>
          fiery.unwrap(dataState, {
            completed: currentProblem => (
              <ProblemView problemId={currentProblem} key={currentProblem} />
            ),
            loading: () => <Loading>Loading current problem state...</Loading>,
            error: (e, retry) => (
              <ErrorBox retry={retry}>
                Cannot fetch current problem state: {String(e)}
              </ErrorBox>
            )
          })
        }
      </Data>
    );
  }
}
