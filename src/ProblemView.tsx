import React from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import { Card, Button, Textarea } from "./UI";

export class ProblemView extends React.Component<
  { problemId: string },
  {
    problemData: IProblem | null;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = { problemData: null };
  }
  componentDidMount() {
    firebase
      .database()
      .ref("problems")
      .child(this.props.problemId)
      .on("value", snapshot => {
        this.setState({ problemData: snapshot!.val() });
      });
  }
  render() {
    if (this.state.problemData) {
      const { submissionAllowed, description, title } = this.state.problemData;

      return (
        <div>
          <Card>
            <h1>{title}</h1>
            <div>{description}</div>
          </Card>
          <Card>
            <h1>Input data</h1>
            <Textarea
              disabled={!submissionAllowed}
              value="[input data is not yet available, please wait…]"
            />
            <Button disabled={!submissionAllowed}>Copy</Button>
            <h2>Submit output data</h2>
            <Textarea
              disabled={!submissionAllowed}
              defaultValue=""
              placeholder="Paste output result here..."
            />
            <Button disabled={!submissionAllowed}>Submit</Button>
          </Card>
        </div>
      );
    } else {
      return <div />;
    }
  }
}
