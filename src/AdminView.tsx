import React, { ReactNode, createContext } from "react";
import { Card, ErrorBox, MarkdownBody, Toolbar, Button, Loading } from "./UI";
import { Data, unwrap } from "fiery";
import firebase from "firebase";
import { IProblem, IContestant, IContestInfo, IProblemState } from "./types";
import { Switch, Route } from "react-router";
import { Link } from "react-router-dom";
import sortBy from "lodash.sortby";
import styled from "react-emotion";
import { callFunction } from "./firebaseFunctions";
import { getRankingInfo } from "../functions/src/submissions";

const AdminContext = createContext<{
  problems: { [problemId: string]: IProblem };
  contestants: { [uid: string]: IContestant } | null;
  contestInfo: IContestInfo | null;
  code: { [problemId: string]: { [uid: string]: string } } | null;
}>(null as any);

export class AdminView extends React.Component {
  render() {
    return (
      <Card>
        <Data dataRef={firebase.database().ref("problems")}>
          {problemsState => (
            <Data dataRef={firebase.database().ref("contestants")}>
              {contestantsState => (
                <Data dataRef={firebase.database().ref("contest/info")}>
                  {contestInfoState => (
                    <Data dataRef={firebase.database().ref("contest/code")}>
                      {codeState =>
                        joinState(
                          {
                            problems: problemsState,
                            contestants: contestantsState,
                            contestInfo: contestInfoState,
                            code: codeState
                          },
                          output => (
                            <AdminContext.Provider value={output}>
                              <AdminMain />
                            </AdminContext.Provider>
                          )
                        )
                      }
                    </Data>
                  )}
                </Data>
              )}
            </Data>
          )}
        </Data>
      </Card>
    );
  }
}

class AdminMain extends React.Component {
  render() {
    return (
      <Switch>
        <Route
          exact
          path="/admin/problems"
          render={() => (
            <AdminContext.Consumer>
              {ctx => (
                <AdminProblemList
                  problems={ctx.problems}
                  contestInfo={ctx.contestInfo}
                />
              )}
            </AdminContext.Consumer>
          )}
        />
        <Route
          exact
          path="/admin/problem/:id"
          render={({ match }) => {
            return (
              <AdminContext.Consumer>
                {({ problems, contestInfo }) => {
                  const k = match.params.id;
                  const problem = problems[k];
                  const problemState =
                    (contestInfo &&
                      contestInfo.problems &&
                      contestInfo.problems[k]) ||
                    null;
                  const currentProblem =
                    contestInfo && contestInfo.currentProblem;
                  return (
                    <AdminProblemView
                      problemId={k}
                      problemData={problem}
                      problemState={problemState}
                      current={currentProblem === k}
                    />
                  );
                }}
              </AdminContext.Consumer>
            );
          }}
        />
        <Route
          exact
          path="/admin/code/:problemId/:uid"
          render={({ match }) => {
            const problemId: string = match.params.problemId;
            const uid: string = match.params.uid;
            return (
              <div>
                <h2>
                  Solution for problem "{problemId}" by{" "}
                  <ContestantName uid={uid} />
                </h2>
                <AdminContext.Consumer>
                  {ctx => {
                    const code =
                      ctx.code &&
                      ctx.code[problemId] &&
                      ctx.code[problemId][uid];
                    return code ? (
                      <MarkdownBody>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word"
                          }}
                        >
                          <code>{code}</code>
                        </pre>
                      </MarkdownBody>
                    ) : (
                      "No code submitted"
                    );
                  }}
                </AdminContext.Consumer>
              </div>
            );
          }}
        />
        <Route
          exact
          path="/admin/leaderboard"
          render={() => (
            <div>
              <h2>Leaderboard</h2>
              <Leaderboard />
            </div>
          )}
        />
        <Route
          exact
          path="/admin"
          render={() => (
            <div>
              <h1>Admin</h1>
              <ul>
                <li>
                  <Link to="/admin/problems">Problems</Link>
                </li>
                <li>
                  <Link to="/admin/leaderboard">Leaderboard</Link>
                </li>
              </ul>
            </div>
          )}
        />
      </Switch>
    );
  }
}

class AdminProblemList extends React.PureComponent<{
  problems: { [problemId: string]: IProblem };
  contestInfo: IContestInfo | null;
}> {
  render() {
    const problems = this.props.problems;
    const contestInfo = this.props.contestInfo;
    const currentProblem = contestInfo && contestInfo.currentProblem;
    return (
      <div>
        <h2>Problems</h2>
        <Table>
          <thead>
            <th>#</th>
            <th>ID</th>
            <th>Title</th>
            <th>Current</th>
            <th>Active?</th>
            <th>Submission</th>
            <th>Finished</th>
          </thead>
          <tbody>
            {sortBy(Object.keys(problems), k => problems[k].number).map(k => {
              const problem = problems[k];
              const problemState =
                contestInfo && contestInfo.problems && contestInfo.problems[k];
              const activated = problemState && problemState.activated;
              const submissionAllowed =
                problemState && problemState.submissionAllowed;
              const finished = problemState && problemState.finished;
              return (
                <tr key={k}>
                  <td>{problem.number}</td>
                  <td>
                    <Link to={`/admin/problem/${k}`}>{k}</Link>
                  </td>
                  <td>{problem.title}</td>
                  <td>{currentProblem === k && "(current)"}</td>
                  <td>{!!activated && "(activated)"}</td>
                  <td>{!!submissionAllowed && "(allowed)"}</td>
                  <td>{!!finished && "(finished)"}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  }
}

class AdminProblemView extends React.Component<{
  problemId: string;
  problemData: IProblem;
  problemState: IProblemState | null;
  current: boolean;
}> {
  render() {
    const problemId = this.props.problemId;
    const problemState = this.props.problemState;
    const submissionAllowed =
      (problemState && problemState.submissionAllowed) || null;
    const finished = (problemState && problemState.finished) || null;
    return (
      <div>
        <h2>Problem [{this.props.problemId}]</h2>
        <div style={{ marginBottom: "1em" }}>
          <Toolbar>
            <Toolbar.Item>
              <ActionButton
                action={() => callFunction("makeCurrent", { problemId })}
                disabled={this.props.current}
              >
                Activate and make current
              </ActionButton>
            </Toolbar.Item>
            <Toolbar.Item>
              <ActionButton
                action={() => callFunction("removeCurrent", {})}
                disabled={!this.props.current}
              >
                Stop making current
              </ActionButton>
            </Toolbar.Item>
          </Toolbar>
          <Toolbar>
            <Toolbar.Item>
              <ActionButton
                action={() => callFunction("allowSubmission", { problemId })}
                disabled={!!submissionAllowed}
              >
                Allow submission
              </ActionButton>
            </Toolbar.Item>
            <Toolbar.Item>
              <ActionButton
                action={() => callFunction("finishProblem", { problemId })}
                disabled={!submissionAllowed || !!finished}
              >
                Finish and finalize score
              </ActionButton>
            </Toolbar.Item>
          </Toolbar>
        </div>
        <details>
          <summary>Problem description</summary>
          <MarkdownBody
            dangerouslySetInnerHTML={{
              __html: this.props.problemData.description
            }}
          />
        </details>
        <details open>
          <summary>Submissions</summary>
          <Data
            dataRef={firebase
              .database()
              .ref("contest/logs/submissions")
              .child(this.props.problemId)}
          >
            {submissionState =>
              unwrap(submissionState, {
                loading: () => <Loading>Loading submissions</Loading>,
                error: (e, retry) => (
                  <ErrorBox error={e} retry={retry}>
                    Failed to load submissions
                  </ErrorBox>
                ),
                completed: submissions =>
                  this.renderSubmissions(submissions, submissionAllowed)
              })
            }
          </Data>
        </details>
      </div>
    );
  }
  renderSubmissions(
    submissions: any,
    submissionAllowed: number | null
  ): ReactNode {
    const { finishers, peopleCount, submissionCount } = getRankingInfo(
      submissions
    );
    return (
      <div>
        <p>
          Received {submissionCount}{" "}
          {submissionCount === 1 ? "submission" : "submissions"} from{" "}
          {peopleCount} {peopleCount === 1 ? "person" : "people"}.{" "}
          {finishers.length} solved the problem.
        </p>
        <Table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Time</th>
              <th>Code</th>
            </tr>
          </thead>
          {finishers.map(f => (
            <tr key={f._id}>
              <td style={{ textAlign: "right" }}>{f.rank}</td>
              <td>
                <ContestantName uid={f.uid} />
              </td>
              <td>{formatTimeTaken(f.timestamp, submissionAllowed)}</td>
              <td>
                <CodeLink uid={f.uid} problemId={this.props.problemId} />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    );
  }
}
class Leaderboard extends React.Component {
  render() {
    return (
      <Data dataRef={firebase.database().ref("contest/points")}>
        {leaderboardState =>
          unwrap(leaderboardState, {
            loading: () => <Loading>Loading leaderboard</Loading>,
            error: (e, retry) => (
              <ErrorBox error={e} retry={retry}>
                Failed to load leaderboard
              </ErrorBox>
            ),
            completed: leaderboard => (
              <AdminContext.Consumer>
                {ctx =>
                  this.renderLeaderboard(
                    leaderboard,
                    ctx.problems,
                    ctx.contestants
                  )
                }
              </AdminContext.Consumer>
            )
          })
        }
      </Data>
    );
  }
  renderLeaderboard(
    leaderboard: {
      [uid: string]: { [problemId: string]: number } | undefined;
    } | null,
    problems: { [problemId: string]: IProblem },
    contestants: { [uid: string]: IContestant } | null
  ): ReactNode {
    const sortedProblemKeys = sortBy(
      Object.keys(problems),
      k => problems[k].number
    );
    const score = (uid: string, k: string) => {
      const myData = leaderboard && leaderboard[uid];
      return myData ? myData[k] || 0 : 0;
    };
    const totalScore = (uid: string) => {
      const myData = leaderboard && leaderboard[uid];
      return myData
        ? Object.keys(myData).reduce((a, k) => a + myData[k], 0)
        : 0;
    };
    const sortedContestantKeys = contestants
      ? sortBy(Object.keys(contestants), totalScore).reverse()
      : [];
    return (
      <div>
        <Table>
          <thead>
            <tr>
              <th>Contestant</th>
              {sortedProblemKeys.map(k => (
                <th key={k}>{problems[k].number}</th>
              ))}
              <th>GRAND</th>
            </tr>
          </thead>
          <tbody>
            {sortedContestantKeys.map(uid => (
              <tr key={uid}>
                <td>
                  <ContestantName uid={uid} />
                </td>
                {sortedProblemKeys.map(k => (
                  <td key={k} style={{ textAlign: "right" }}>
                    {score(uid, k) || "-"}
                  </td>
                ))}
                <td style={{ textAlign: "right" }}>{totalScore(uid)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }
}

function formatTimeTaken(timestamp: number, start: number | null) {
  if (!start) return "(unknown?)";
  const ms = timestamp - start;
  const two = (a: number) => (a < 10 ? "0" : "") + a;
  return `${two(Math.floor(ms / 60000))}:${two(Math.floor(ms / 1000) % 60)}`;
}

class ContestantName extends React.Component<{ uid: string }> {
  render() {
    const uid = this.props.uid;
    return (
      <AdminContext.Consumer>
        {ctx => {
          const contestant = ctx.contestants && ctx.contestants[uid];
          return contestant ? (
            <span>
              <strong>{contestant.name}</strong> ({contestant.track})
            </span>
          ) : (
            `(user ${uid})`
          );
        }}
      </AdminContext.Consumer>
    );
  }
}

class CodeLink extends React.Component<{ uid: string; problemId: string }> {
  render() {
    const uid = this.props.uid;
    const problemId = this.props.problemId;
    return (
      <AdminContext.Consumer>
        {ctx => {
          const code =
            ctx.code && ctx.code[problemId] && ctx.code[problemId][uid];
          return code ? (
            <Link to={`/admin/code/${problemId}/${uid}`}>Code</Link>
          ) : (
            ""
          );
        }}
      </AdminContext.Consumer>
    );
  }
}

class ActionButton extends React.Component<{
  action: () => Promise<any>;
  disabled?: boolean;
}> {
  state = {
    loading: false
  };
  onClick = async () => {
    this.setState({ loading: true });
    try {
      await this.props.action();
    } catch (e) {
      window.alert("Cannot perform action!\n\n" + String(e.stack || e));
      throw e;
    } finally {
      this.setState({ loading: false });
    }
  };
  render() {
    return (
      <Button
        disabled={this.props.disabled || this.state.loading}
        onClick={this.onClick}
      >
        <span style={{ display: "block", position: "relative" }}>
          <span
            style={{ visibility: this.state.loading ? "hidden" : "visible" }}
          >
            {this.props.children}
          </span>
          <span
            style={{
              display: "block",
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              textAlign: "center",
              visibility: this.state.loading ? "visible" : "hidden"
            }}
          >
            [...]
          </span>
        </span>
      </Button>
    );
  }
}

const Table = styled("table")({
  borderCollapse: "collapse",
  "& td, & th": {
    border: "1px solid #ccc",
    padding: 4
  },
  "& th": {
    background: "#eee"
  }
});

function joinState<S extends { [k: string]: any }>(
  states: S,
  render: (resolved: { [k in keyof S]: any }) => ReactNode
) {
  const status: ReactNode[] = [];
  const resolved: any = {};
  let unfinished = 0;
  for (const key of Object.keys(states)) {
    unwrap(states[key], {
      loading() {
        status.push(
          <span style={{ color: "#777" }}>
            Loading <strong>{key}</strong>
          </span>
        );
        unfinished++;
      },
      error(e, retry) {
        status.push(
          <ErrorBox error={e} retry={retry}>
            Failed to load {key}
          </ErrorBox>
        );
        unfinished++;
      },
      completed(val) {
        status.push(
          <span style={{ color: "#393" }}>
            Loaded <strong>{key}</strong>
          </span>
        );
        resolved[key] = val;
      }
    });
  }
  if (!unfinished) {
    return render(resolved);
  }
  return (
    <ul>
      {status.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
