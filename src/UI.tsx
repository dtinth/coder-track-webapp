import React from "react";
import { css, keyframes } from "emotion";
import styled from "react-emotion";
export class Card extends React.Component {
  render() {
    return (
      <div
        className={css({
          border: "2px solid #ECB36D",
          margin: "30px auto 20px",
          padding: "30px",
          boxShadow: "0 3px 16px #F6D805",
          maxWidth: "800px",
          background: "white",
          "& > h1:first-child, & > h2:first-child, & > h3:first-child": {
            marginTop: 0
          }
        })}
      >
        {this.props.children}
      </div>
    );
  }
}

export const Button = styled("button")({
  color: "#ECB36D",
  fontWeight: "bold",
  padding: "4px 10px 5px",
  borderRadius: "5px",
  border: "2px dashed #ECB36D",
  fontSize: "15px",
  background: "white",
  "&:hover:not(:disabled)": {
    background: "#ECB36D",
    color: "white"
  },
  "&:disabled": {
    background: "#ddd",
    borderColor: "transparent",
    color: "#aaa"
  }
});

export const Textarea = styled("textarea")({
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  border: "1px solid #ECB36D",
  borderRadius: "5px",
  font: "1em Menlo, Consolas, Monaco, monospace",
  "&:disabled": {
    background: "#eee",
    color: "#999",
    borderColor: "#ccc"
  }
});

const loadingAnimation = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(100%)" }
});
export class Loading extends React.Component {
  render() {
    return (
      <div
        className={css({
          padding: "32px",
          textAlign: "center"
        })}
      >
        <div
          className={css({
            opacity: 0.75,
            fontSize: "1.5em",
            fontStyle: "italic"
          })}
        >
          {this.props.children}
        </div>
        <div
          className={css({
            overflow: "hidden",
            position: "relative",
            background: "#ECB36D33",
            height: 8,
            maxWidth: "480px",
            margin: "32px auto 0"
          })}
        >
          <div
            className={css({
              background: "#ECB36D",
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              animation: `0.4s ${loadingAnimation} linear infinite`
            })}
          />
        </div>
      </div>
    );
  }
}

export class ErrorBox extends React.Component<{
  retry?: () => any;
  error?: Error;
}> {
  render() {
    return (
      <div
        style={{
          margin: "0.5em",
          padding: "0.5em",
          border: "2px solid #c33",
          background: "#fee",
          color: "#511"
        }}
      >
        <strong>Error:</strong> {this.props.children}
        {!!this.props.retry && (
          <div style={{ marginTop: "0.5em" }}>
            <Button onClick={() => this.props.retry}>Retry</Button>
          </div>
        )}
        {!!this.props.error && (
          <pre
            style={{
              margin: "0.5em 0 0",
              padding: "0.5em",
              background: "#fff",
              border: "1px solid #aaa",
              color: "#555"
            }}
          >
            {String(this.props.error.stack || this.props.error)}
          </pre>
        )}
      </div>
    );
  }
}
