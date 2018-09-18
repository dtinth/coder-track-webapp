import firebase from "firebase";
import React from "react";
import * as fiery from "fiery";
import { ProblemView } from "./ProblemView";
import { Loading, ErrorBox, Card, Button } from "./UI";
import { Data } from "fiery";
import { JoinForm } from "./JoinForm";
import { getContestantDataRef } from "./contestantData";

export class ContestantView extends React.Component<{ user: firebase.User }> {
  render() {
    return (
      <Data dataRef={getContestantDataRef()}>
        {dataState =>
          fiery.unwrap(dataState, {
            completed: contestantInfo =>
              contestantInfo
                ? this.renderProblem()
                : this.renderContestantForm(),
            error: (e, retry) => (
              <ErrorBox error={e} retry={retry}>
                Cannot load contestant info
              </ErrorBox>
            ),
            loading: () => <Loading>Loading contestant information</Loading>
          })
        }
      </Data>
    );
  }
  renderContestantForm() {
    return (
      <div>
        <Card>
          <JoinForm />
        </Card>
      </div>
    );
  }
  renderProblem() {
    return (
      <Data dataRef={firebase.database().ref("contest/info")}>
        {dataState =>
          fiery.unwrap(dataState, {
            completed: contestInfo => {
              const currentProblem = contestInfo && contestInfo.currentProblem;
              const currentProblemState =
                contestInfo &&
                contestInfo.problems &&
                currentProblem &&
                contestInfo.problems[currentProblem];
              const submissionAllowed =
                !!currentProblemState &&
                !!currentProblemState.submissionAllowed;
              const finished =
                !!currentProblemState && !!currentProblemState.finished;
              return currentProblem ? (
                <ProblemView
                  problemId={currentProblem}
                  key={currentProblem}
                  submissionAllowed={submissionAllowed}
                  finished={finished}
                />
              ) : (
                <Card>Please wait for a problem to be made available...</Card>
              );
            },
            loading: () => <Loading>Loading contest state...</Loading>,
            error: (e, retry) => (
              <ErrorBox error={e} retry={retry}>
                Cannot load contest state
              </ErrorBox>
            )
          })
        }
      </Data>
    );
  }
}
