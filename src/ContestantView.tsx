import firebase from "firebase";
import React, { ReactNode } from "react";
import * as fiery from "fiery";
import { ProblemView } from "./ProblemView";
import { Loading, ErrorBox, Card, Button } from "./UI";
import { Data } from "fiery";
import { JoinForm } from "./JoinForm";
import { getContestantDataRef } from "./contestantData";
import sortBy from "lodash.sortby";
import { Link } from "react-router-dom";
export class ContestantView extends React.Component<{
  user: firebase.User;
  requestedProblem?: string;
}> {
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
              if (this.props.requestedProblem) {
                return (
                  <div>
                    <Card>
                      คำเตือน: คุณกำลังดูโจทย์เก่าอยู่{" "}
                      <Link to="/">ไปยังโจทย์ข้อล่าสุด</Link>
                    </Card>
                    {this.renderProblemById(
                      contestInfo,
                      this.props.requestedProblem
                    )}
                  </div>
                );
              }
              const currentProblem = contestInfo && contestInfo.currentProblem;
              return currentProblem ? (
                this.renderProblemById(contestInfo, currentProblem)
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
  renderProblemById(contestInfo: any, problemId: string): ReactNode {
    const currentProblem = contestInfo && contestInfo.currentProblem;
    const allProblemsState = contestInfo && contestInfo.problems;
    const problemState =
      allProblemsState && problemId && allProblemsState[problemId];
    const submissionAllowed =
      !!problemState && !!problemState.submissionAllowed;
    const finished = !!problemState && !!problemState.finished;
    const availableProblems = allProblemsState
      ? sortBy(
          Object.keys(allProblemsState).filter(
            k => allProblemsState[k].activated
          ),
          k => allProblemsState[k].activated
        )
      : [];
    return (
      <div>
        <ProblemView
          problemId={problemId}
          key={problemId}
          submissionAllowed={submissionAllowed}
          finished={finished}
        />
        {availableProblems.length && (
          <Card>
            <h2>Available problems</h2>
            <ol>
              {availableProblems.map((k, i) => (
                <li key={i}>
                  <Link to={k === currentProblem ? "/" : `/problem/${k}`}>
                    {k}
                  </Link>
                  {k === currentProblem && " (latest)"}
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    );
  }
}
