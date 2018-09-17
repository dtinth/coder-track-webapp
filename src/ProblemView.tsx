import React, { FormEvent } from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import { Card, Button, Textarea, Loading, ErrorBox } from "./UI";
import styled from "react-emotion";
import * as fiery from "fiery";
import { getContestantDataRef } from "./contestantData";

type Props = { problemId: string };
export class ProblemView extends React.Component<Props> {
  render() {
    return (
      <fiery.Data
        dataRef={firebase
          .database()
          .ref("problems")
          .child(this.props.problemId)}
      >
        {problemState =>
          fiery.unwrap(problemState, {
            loading: () => <Loading>Loading problem description...</Loading>,
            error: (e, retry) => (
              <ErrorBox error={e} retry={retry}>
                Cannot load problem description
              </ErrorBox>
            ),
            completed: problemData => this.renderProblem(problemData)
          })
        }
      </fiery.Data>
    );
  }
  renderProblem(problemData: IProblem | null) {
    if (!problemData) {
      return <ErrorBox>Problem not found (this should not happen!)</ErrorBox>;
    }
    const problemId = this.props.problemId;
    return (
      <div>
        <Card>
          <h1>{problemData.title}</h1>
          <div>{problemData.description}</div>
        </Card>
        <Card>
          <h1>Input data</h1>
          <ProblemInput problemId={problemId} problemData={problemData} />
          <h2>Submit output data</h2>
          <ProblemOutput problemId={problemId} problemData={problemData} />
        </Card>
      </div>
    );
  }
}

type ProblemInputProps = {
  problemId: string;
  problemData: IProblem;
};
type ProblemInputState = {
  inputData: string | null;
  inputLoadingError: Error | null;
};
class ProblemInput extends React.PureComponent<
  ProblemInputProps,
  ProblemInputState
> {
  private inputTextArea: HTMLTextAreaElement | null = null;
  state: ProblemInputState = {
    inputData: null,
    inputLoadingError: null
  };
  async componentDidMount() {
    await this.loadInputData();
  }
  componentDidUpdate(
    prevProps: ProblemInputProps,
    prevState: ProblemInputState
  ) {
    if (
      !canSubmit(prevProps.problemData) &&
      canSubmit(this.props.problemData)
    ) {
      setTimeout(() => this.loadInputData(), this.props.problemData ? 2000 : 0);
    }
  }
  async loadInputData() {
    if (!canSubmit(this.props.problemData)) {
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
    return (
      <div>
        <Textarea
          rows={5}
          disabled={!this.state.inputData}
          readOnly
          innerRef={el => (this.inputTextArea = el)}
          value={
            canSubmit(this.props.problemData)
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
      </div>
    );
  }
}

type ProblemOutputProps = {
  problemId: string;
  problemData: IProblem;
};
type ProblemOutputState = {
  submitting: boolean;
  submissionError: Error | null;
  cooldown: number;
};
class ProblemOutput extends React.PureComponent<
  ProblemOutputProps,
  ProblemOutputState
> {
  private inputTextArea: HTMLTextAreaElement | null = null;
  private coolingDown: ReturnType<typeof setInterval> | null = null;
  state: ProblemOutputState = {
    submitting: false,
    submissionError: null,
    cooldown: 0
  };
  onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const outputData = this.inputTextArea!.value;
    if (!outputData) {
      window.alert("Please enter output data!");
      return;
    }
    this.setState({ submitting: true, submissionError: null });
    try {
      const submitResult = await (firebase.functions() as any).call(
        "submitOutput",
        {
          problemId: this.props.problemId,
          output: outputData
        }
      );
      if (!submitResult.data.success) {
        this.setState({ cooldown: 30 });
        if (!this.coolingDown) {
          this.coolingDown = setInterval(() => {
            this.setState(
              state => ({ cooldown: state.cooldown - 1 }),
              () => {
                if (this.state.cooldown === 0) {
                  clearInterval(this.coolingDown!);
                  this.coolingDown = null;
                }
              }
            );
          }, 1000);
        }
      }
    } catch (e) {
      this.setState({ submissionError: e });
    } finally {
      this.setState({ submitting: false });
    }
  };
  render() {
    return (
      <fiery.Data
        dataRef={getContestantDataRef()
          .child("solved")
          .child(this.props.problemId)}
      >
        {dataState =>
          fiery.unwrap(dataState, {
            completed: solvedTime => this.renderForm({ solved: !!solvedTime }),
            error: () => this.renderForm({ solved: false }),
            loading: () => this.renderForm({ solved: false })
          })
        }
      </fiery.Data>
    );
  }
  renderForm(options: { solved: boolean }) {
    const disabled =
      !canSubmit(this.props.problemData) ||
      this.state.cooldown > 0 ||
      options.solved;
    return (
      <form onSubmit={this.onSubmit}>
        <Textarea
          rows={3}
          disabled={disabled}
          defaultValue=""
          placeholder="Paste output result here..."
          innerRef={el => (this.inputTextArea = el)}
        />
        {!this.state.submitting && (
          <Toolbar>
            <Toolbar.Item>
              <Button disabled={disabled}>Submit</Button>
            </Toolbar.Item>
            {this.state.cooldown > 0 && (
              <Toolbar.Item>
                <span style={{ color: "#c33" }}>
                  <strong>Incorrect answer.</strong> Please wait{" "}
                  {this.state.cooldown}s before re-submitting.
                </span>
              </Toolbar.Item>
            )}
            {options.solved && (
              <Toolbar.Item>
                <span style={{ color: "#383" }}>
                  <strong>Problem solved! Congratulations!</strong>
                </span>
              </Toolbar.Item>
            )}
          </Toolbar>
        )}
        {!!this.state.submitting && <Loading>Submitting...</Loading>}
        {!!this.state.submissionError && (
          <ErrorBox error={this.state.submissionError}>
            Failed to submit output...
          </ErrorBox>
        )}
      </form>
    );
  }
}

const Toolbar = Object.assign(
  styled("div")({
    marginTop: 8,
    display: "flex",
    alignItems: "baseline"
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
