import React from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import { Card, Button, Textarea } from "./UI";
import styled from "react-emotion";

export class ProblemView extends React.Component<
  { problemId: string },
  {
    problemData: IProblem | null;
    inputData: string | null;
  }
> {
  private inputTextArea: HTMLTextAreaElement | null = null;
  constructor(props: any) {
    super(props);
    this.state = { problemData: null, inputData: null };
  }
  async componentDidMount() {
    // TODO error handling
    firebase
      .database()
      .ref("problems")
      .child(this.props.problemId)
      .on("value", snapshot => {
        this.setState({ problemData: snapshot!.val() });
      });
    // TODO error handling
    const inputDataResult = await (firebase.functions() as any).call(
      "getInput",
      { problemId: this.props.problemId }
    );
    this.setState({ inputData: inputDataResult.data.input });
  }
  onCopy() {
    if (this.inputTextArea) {
      this.inputTextArea.focus();
      this.inputTextArea.select();
      document.execCommand("copy");
    }
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
              rows={5}
              disabled={!this.state.inputData}
              readOnly
              innerRef={el => (this.inputTextArea = el)}
              value={
                this.state.inputData ||
                "[input data is not yet available, please wait…]"
              }
            />
            <Toolbar>
              <Button
                disabled={!this.state.inputData}
                onClick={() => this.onCopy()}
              >
                Copy
              </Button>
            </Toolbar>
            <h2>Submit output data</h2>
            <Textarea
              rows={3}
              disabled={!submissionAllowed}
              defaultValue=""
              placeholder="Paste output result here..."
            />
            <Toolbar>
              <Button disabled={!submissionAllowed}>Submit</Button>
            </Toolbar>
          </Card>
        </div>
      );
    } else {
      return <div>Problem not found :(</div>;
    }
  }
}

const Toolbar = styled("div")({
  marginTop: "16px"
});
