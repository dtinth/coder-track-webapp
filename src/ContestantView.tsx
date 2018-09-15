import React from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import { ProblemView } from "./ProblemView";
import { Loading } from "./UI";

export class ContestantView extends React.Component<
  {},
  {
    currentProblem: string | null;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      currentProblem: null
    };
  }
  componentDidMount() {
    firebase
      .database()
      .ref("currentProblem")
      .on("value", snapshot => {
        this.setState({ currentProblem: snapshot!.val() });
      });
  }
  componentWillUnmount() {}
  render() {
    return (
      <div>
        {this.state.currentProblem ? (
          <ProblemView
            problemId={this.state.currentProblem}
            key={this.state.currentProblem}
          />
        ) : (
          <Loading>Loading current problem state...</Loading>
        )}
      </div>
    );
  }
}
