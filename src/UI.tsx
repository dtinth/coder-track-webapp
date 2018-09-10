import React from "react";
import { css } from "emotion";
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
          background: "white"
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
    border: "none",
    color: "#aaa"
  }
});

export const Textarea = styled("textarea")({
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  border: "1px solid #ECB36D",
  borderRadius: "5px"
});
