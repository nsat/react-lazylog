import React, { Component } from "react";

import LinePart from "../LinePart";
import type { AnsiPart } from "../../ansiparse";
import { lineContent } from "./index.module.css";

/* eslint-disable react/no-array-index-key */

/**
 * The container of all the individual pieces of content that
 * is on a single line. May contain one or more `LinePart`s
 * depending on ANSI parsing.
 */
export default class LineContent extends Component<any, any> {
    static defaultProps = {
        formatPart: null,
        style: null,
    };

    render() {
        const { data, formatPart, number, style } = this.props;

        if (data) {
            const last = data[data.length - 1];

            if (last && typeof last.text === "string" && !last.text.endsWith("\n")) {
                last.text += "\n";
            }
        }

        return (
            <span className={lineContent} style={style}>
                {data &&
                    data.map((part: AnsiPart, n: number) => (
                        <LinePart part={part} format={formatPart} key={`line-${number}-${n}`} />
                    ))}
            </span>
        );
    }
}
