import React, { ReactNode } from "react";
import { Card, ErrorBox, MarkdownBody, Toolbar, Button } from "./UI";
import { Data, unwrap } from "fiery";
import firebase from "firebase";
import { IProblem, IContestant, IContestInfo, IProblemState } from "./types";
import { Switch, Route } from "react-router";
import { Link } from "react-router-dom";
import sortBy from "lodash.sortby";
import styled from "react-emotion";
import { callFunction } from "./firebaseFunctions";
export class AdminView extends React.Component {
  render() {
    return (
      <Card>
        <h1>Admin</h1>
        <Data dataRef={firebase.database().ref("problems")}>
          {problemsState => (
            <Data dataRef={firebase.database().ref("contestants")}>
              {contestantsState => (
                <Data dataRef={firebase.database().ref("contest/info")}>
                  {contestInfoState =>
                    joinState(
                      {
                        problems: problemsState,
                        contestants: contestantsState,
                        contestInfo: contestInfoState
                      },
                      output =>
                        this.renderAdmin(
                          output.problems,
                          output.contestants,
                          output.contestInfo
                        )
                    )
                  }
                </Data>
              )}
            </Data>
          )}
        </Data>
      </Card>
    );
  }
  renderAdmin(
    problems: { [problemId: string]: IProblem },
    contestants: { [uid: string]: IContestant },
    contestInfo: IContestInfo | null
  ) {
    return (
      <Switch>
        <Route
          exact
          path="/admin/problems"
          render={() => (
            <AdminProblemList problems={problems} contestInfo={contestInfo} />
          )}
        />
        <Route
          exact
          path="/admin/problem/:id"
          render={({ match }) => {
            const k = match.params.id;
            const problem = problems[k];
            const problemState =
              (contestInfo &&
                contestInfo.problems &&
                contestInfo.problems[k]) ||
              null;
            const currentProblem = contestInfo && contestInfo.currentProblem;
            return (
              <AdminProblemView
                problemId={k}
                problemData={problem}
                problemState={problemState}
                current={currentProblem === k}
              />
            );
          }}
        />
        <Route
          exact
          path="/admin"
          render={() => (
            <ul>
              <li>
                <Link to="/admin/problems">Problems</Link>
              </li>
            </ul>
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
          </thead>
          <tbody>
            {sortBy(Object.keys(problems), k => problems[k].number).map(k => {
              const problem = problems[k];
              const problemState =
                contestInfo && contestInfo.problems && contestInfo.problems[k];
              const activated = problemState && problemState.activated;
              const submissionAllowed =
                problemState && problemState.submissionAllowed;
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
    const activated = problemState && problemState.activated;
    const submissionAllowed = problemState && problemState.submissionAllowed;
    return (
      <div>
        <h2>Problem [{this.props.problemId}]</h2>
        <div style={{ marginBottom: "1em" }}>
          <Toolbar>
            <Toolbar.Item>
              <ActionButton
                action={() => callFunction("makeCurrent", { problemId })}
                enabled={this.props.current}
              >
                Activate and make current
              </ActionButton>
            </Toolbar.Item>
            <Toolbar.Item>
              <Button>Remove current</Button>
            </Toolbar.Item>
            <Toolbar.Item>
              <Button>Allow submission</Button>
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
      </div>
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
