import React from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import { Card, Button, Textarea, Loading } from "./UI";
import styled from "react-emotion";
type Props = { problemId: string };
type State = {
  problemData: IProblem | null;
  problemLoadingError: Error | null;
  inputData: string | null;
  inputLoadingError: Error | null;
};
export class ProblemView extends React.Component<Props, State> {
  private inputTextArea: HTMLTextAreaElement | null = null;
  constructor(props: any) {
    super(props);
    this.state = {
      problemData: null,
      problemLoadingError: null,
      inputData: null,
      inputLoadingError: null
    };
  }
  async componentDidMount() {
    firebase
      .database()
      .ref("problems")
      .child(this.props.problemId)
      .on("value", this.onProblemDataLoad, (error: Error) => {
        this.setState({ problemLoadingError: error });
      });
    await this.loadInputData();
  }
  onProblemDataLoad = (snapshot: firebase.database.DataSnapshot | null) => {
    this.setState({ problemData: snapshot!.val() });
  };
  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!canSubmit(prevState.problemData)) {
      this.loadInputData();
    }
  }
  async loadInputData() {
    if (!canSubmit(this.state.problemData)) {
      return;
    }
    this.setState({ inputData: null, inputLoadingError: null });
    try {
      const inputDataResult = await (firebase.functions() as any).call(
        "getInput",
        { problemId: this.props.problemId }
      );
      this.setState({
        inputData: inputDataResult.data.input,
        inputLoadingError: null
      });
    } catch (e) {
      this.setState({ inputData: null, inputLoadingError: e });
    }
  }
  onCopy() {
    if (this.inputTextArea && !this.inputTextArea.disabled) {
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
                canSubmit(this.state.problemData)
                  ? this.state.inputData ||
                    (this.state.inputLoadingError
                      ? "[input data loading error, please click “retry”]\n\n" +
                        String(this.state.inputLoadingError)
                      : "[now loading input data, please wait…]")
                  : "[input data is not yet available, please wait…]"
              }
            />
            <Toolbar>
              <Toolbar.Item>
                <Button
                  disabled={!this.state.inputData}
                  onClick={() => this.onCopy()}
                >
                  Copy
                </Button>
              </Toolbar.Item>
              {!!this.state.inputLoadingError && (
                <React.Fragment>
                  <Toolbar.Item>
                    <Button onClick={() => this.loadInputData()}>Retry</Button>
                  </Toolbar.Item>
                </React.Fragment>
              )}
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
      return <Loading>Loading problem information...</Loading>;
    }
  }
}

const Toolbar = Object.assign(
  styled("div")({
    marginTop: 8,
    display: "flex"
  }),
  {
    Item: styled("div")({
      "&:not(:first-child)": {
        marginLeft: 8
      }
    })
  }
);

function canSubmit(problemData: IProblem | null) {
  return problemData ? problemData.submissionAllowed : false;
}
