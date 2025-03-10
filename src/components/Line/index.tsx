import { arrayOf, bool, func, number, object, shape, string } from "prop-types";

import React, { Component } from "react";

import LineContent from "../LineContent";
import LineGutter from "../LineGutter";
import LineNumber from "../LineNumber";
import { line, lineHighlight, lineSelectable } from "./index.module.css";

/**
 * A single row of content, containing both the line number
 * and any text content within the line.
 */
export default class Line extends Component<any, any> {
    static propTypes = {
        data: arrayOf(
            shape({
                text: string,
            }),
        ).isRequired,
        number,
        rowHeight: number,
        highlight: bool,
        selectable: bool,
        style: object,
        formatPart: func,
        onLineNumberClick: func,
        onRowClick: func,
        className: string,
        highlightClassName: string,
    };

    static defaultProps = {
        highlight: false,
        selectable: false,
        style: {},
        formatPart: null,
        onLineNumberClick: null,
        onRowClick: null,
        className: "",
        highlightClassName: "",
    };

    render() {
        const {
            data,
            formatPart,
            highlight,
            selectable,
            onLineNumberClick,
            onRowClick,
            number,
            rowHeight,
            style,
            className,
            highlightClassName,
            gutter,
        } = this.props;
        const selectableClass = selectable ? ` ${lineSelectable}` : "";
        const highlightClass = highlight ? ` ${lineHighlight} ${highlightClassName}` : "";
        const classes = `${line}${selectableClass}${highlightClass} ${className}`;
        const lineStyle = {
            ...style,
            lineHeight: `${style ? style.height || rowHeight : rowHeight}px`,
            minWidth: style ? style.width || "100%" : "100%",
            width: null,
        };

        return (
            <div className={classes} style={lineStyle}>
                <LineNumber number={number} highlight={highlight} onClick={onLineNumberClick} />
                <LineGutter gutter={gutter} />
                <LineContent number={number} onClick={onRowClick} formatPart={formatPart} data={data} />
            </div>
        );
    }
}
