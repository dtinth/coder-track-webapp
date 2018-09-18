import React, { FormEvent } from "react";
import firebase from "firebase";
import { IProblem } from "./types";
import download from "downloadjs";
import {
  Card,
  Button,
  Textarea,
  Loading,
  ErrorBox,
  MarkdownBody,
  Toolbar
} from "./UI";
import styled, { css } from "react-emotion";
import * as fiery from "fiery";

type Props = {
  problemId: string;
  submissionAllowed: boolean;
  finished: boolean;
};
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
          <MarkdownBody
            dangerouslySetInnerHTML={{ __html: problemData.description }}
          />
        </Card>
        <Card>
          <h1>Input data</h1>
          <ProblemInput
            problemId={problemId}
            problemData={problemData}
            submissionAllowed={this.props.submissionAllowed}
          />
          <h2>Submit output data</h2>
          <ProblemOutput
            problemId={problemId}
            problemData={problemData}
            submissionAllowed={this.props.submissionAllowed}
            finished={this.props.finished}
          />
          <fiery.Data
            dataRef={firebase
              .database()
              .ref("contest/solved")
              .child(firebase.auth().currentUser!.uid)
              .child(this.props.problemId)}
          >
            {dataState =>
              fiery.unwrap(dataState, {
                completed: solvedTime =>
                  !!solvedTime && (
                    <div>
                      <h2>Submit source code</h2>
                      <SourceCodeSubmissionForm problemId={problemId} />
                    </div>
                  ),
                error: () => null,
                loading: () => null
              })
            }
          </fiery.Data>
        </Card>
      </div>
    );
  }
}

type ProblemInputProps = {
  problemId: string;
  problemData: IProblem;
  submissionAllowed: boolean;
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
    if (!prevProps.submissionAllowed && this.props.submissionAllowed) {
      setTimeout(() => this.loadInputData(), 1000);
    }
  }
  async loadInputData() {
    if (!this.props.submissionAllowed) {
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
  onDownload() {
    if (this.inputTextArea && !this.inputTextArea.disabled) {
      const parts = [
        "codertrack",
        this.props.problemId,
        "input",
        firebase.auth().currentUser!.uid.substr(0, 7)
      ];
      const filename = `${parts.join("-")}.txt`;
      download(this.inputTextArea.value, filename, "text/plain");
    }
  }
  render() {
    return (
      <div>
        <Textarea
          rows={8}
          disabled={!this.state.inputData}
          readOnly
          innerRef={el => (this.inputTextArea = el)}
          value={
            this.props.submissionAllowed
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
          <Toolbar.Item>
            <Button
              disabled={!this.state.inputData}
              onClick={() => this.onDownload()}
            >
              Download
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
  submissionAllowed: boolean;
  finished: boolean;
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
        dataRef={firebase
          .database()
          .ref("contest/solved")
          .child(firebase.auth().currentUser!.uid)
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
      !this.props.submissionAllowed ||
      !!this.props.finished ||
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
              <Button disabled={disabled}>
                {this.props.finished ? "Time is up" : "Submit"}
              </Button>
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
                  <strong>Problem solved! Congratulations!</strong>{" "}
                  <fiery.Data
                    dataRef={firebase
                      .database()
                      .ref("contest/points")
                      .child(firebase.auth().currentUser!.uid)
                      .child(this.props.problemId)}
                  >
                    {dataState =>
                      fiery.unwrap(dataState, {
                        completed: pt =>
                          pt > 0 && <span>You received {pt} points!</span>,
                        error: () => null,
                        loading: () => null
                      })
                    }
                  </fiery.Data>
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

type SourceCodeSubmissionFormProps = { problemId: string };
type SourceCodeSubmissionFormState = {
  submitting: boolean;
  submissionError: Error | null;
};
class SourceCodeSubmissionForm extends React.PureComponent<
  SourceCodeSubmissionFormProps,
  SourceCodeSubmissionFormState
> {
  private inputTextArea: HTMLTextAreaElement | null = null;
  state: SourceCodeSubmissionFormState = {
    submitting: false,
    submissionError: null
  };
  onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const sourceCode = this.inputTextArea!.value;
    if (!sourceCode) {
      window.alert("Please describe how you solve it solution!");
      return;
    }
    this.setState({ submitting: true, submissionError: null });
    try {
      await (firebase.functions() as any).call("submitSourceCode", {
        problemId: this.props.problemId,
        code: sourceCode
      });
      window.alert("Thank you!");
    } catch (e) {
      this.setState({ submissionError: e });
    } finally {
      this.setState({ submitting: false });
    }
  };
  render() {
    return (
      <form onSubmit={this.onSubmit}>
        <p>
          Please submit the source code or describe how you solved the problem!
        </p>
        <Textarea
          rows={8}
          disabled={!!this.state.submitting}
          defaultValue=""
          placeholder="Please enter source code..."
          innerRef={el => (this.inputTextArea = el)}
        />
        {!this.state.submitting && (
          <Toolbar>
            <Toolbar.Item>
              <Button>Submit source code</Button>
            </Toolbar.Item>
          </Toolbar>
        )}
        {!!this.state.submitting && <Loading>Submitting...</Loading>}
        {!!this.state.submissionError && (
          <ErrorBox error={this.state.submissionError}>
            Failed to submit source code...
          </ErrorBox>
        )}
      </form>
    );
  }
}
