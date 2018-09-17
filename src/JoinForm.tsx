import { Button, Loading, ErrorBox } from "./UI";
import React from "react";
import firebase from "firebase";

type State = {
  selectedTrack: "individual" | "student";
  loading: boolean;
  error: Error | null;
  success: boolean;
};

export class JoinForm extends React.Component<{}, State> {
  state: State = {
    selectedTrack: "individual",
    loading: false,
    error: null,
    success: false
  };
  onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    this.setState({ loading: true, error: null });
    try {
      await (firebase.functions() as any).call("joinCompetition", {
        track: this.state.selectedTrack
      });
      this.setState({ success: true });
    } catch (e) {
      this.setState({ error: e });
    } finally {
      this.setState({ loading: false });
    }
  };
  render() {
    return (
      <form onSubmit={this.onSubmit}>
        <h1>Welcome to Coder Track!</h1>
        <p>Please select a track:</p>
        <p>
          <label>
            <input
              type="radio"
              checked={this.state.selectedTrack === "individual"}
              onClick={() => this.setState({ selectedTrack: "individual" })}
            />{" "}
            Individual track
          </label>
          <br />
          <label>
            <input
              type="radio"
              checked={this.state.selectedTrack === "student"}
              onClick={() => this.setState({ selectedTrack: "student" })}
            />{" "}
            Student track (สำหรับผู้ที่กำลังศึกษาระดับไม่เกินปริญญาตรีเท่านั้น)
          </label>
        </p>
        {this.state.loading ? (
          <Loading>Joining competition...</Loading>
        ) : (
          <Button>Join competition!</Button>
        )}
        {!!this.state.error && (
          <ErrorBox error={this.state.error}>Cannot join competition</ErrorBox>
        )}
      </form>
    );
  }
}
