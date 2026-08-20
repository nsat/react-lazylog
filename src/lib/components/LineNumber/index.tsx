import React, { Component } from "react";

import { lineNumber, lineNumberHighlight } from "./index.module.css";

/**
 * The line number of a single line.
 * The anchor contained within is interactive, and will highlight the
 * entire line upon selection.
 */
export default class LineNumber extends Component<any, any> {
    static defaultProps = {
        style: null,
        highlight: false,
        onClick: null,
    };

    render() {
        const { highlight, onClick, number, style } = this.props;

        return (
            <a
                id={number}
                onClick={onClick}
                className={highlight ? lineNumberHighlight : lineNumber}
                style={style}
            />
        );
    }
}
