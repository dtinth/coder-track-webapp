import React, { ReactNode } from "react";
import { Card, ErrorBox } from "./UI";
import { Data, unwrap } from "fiery";
import firebase from "firebase";

export class AdminView extends React.Component {
  render() {
    return (
      <Card>
        <h1>Admin view</h1>
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
                      output => {
                        return null;
                      }
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
}

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
