import React, { Component } from "react";

import type { AnsiPart } from "../../ansiparse";
import * as stylesModule from "./index.module.css";
const styles = stylesModule as unknown as Record<string, string>;

const getClassName = (part: AnsiPart) => {
    const className: string[] = [];

    if (part.foreground && part.bold) {
        className.push(styles[`${part.foreground}Bold`], styles.bold);
    } else if (part.foreground) {
        className.push(styles[part.foreground]);
    } else if (part.bold) {
        className.push(styles.bold);
    }

    if (part.background) {
        className.push(styles[`${part.background}Bg`]);
    }

    if (part.italic) {
        className.push(styles.italic);
    }

    if (part.underline) {
        className.push(styles.underline);
    }

    return className.join(" ");
};

/**
 * An individual segment of text within a line. When the text content
 * is ANSI-parsed, each boundary is placed within its own `LinePart`
 * and styled separately (colors, text formatting, etc.) from the
 * rest of the line's content.
 */
export default class LinePart extends Component<any, any> {
    static defaultProps = {
        format: null,
        style: null,
    };

    render() {
        const { format, part, style } = this.props;

        return (
            <span className={getClassName(part)} style={style}>
                {format ? format(part.text) : part.text}
            </span>
        );
    }
}
