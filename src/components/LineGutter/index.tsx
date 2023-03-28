import { object } from "prop-types";

import React, { Component } from "react";

import { lineGutter } from "./index.module.css";

/**
 * The line number of a single line.
 * The anchor contained within is interactive, and will highlight the
 * entire line upon selection.
 */
export default class LineGutter extends Component<any, any> {
    static propTypes = {
        gutter: object,
    };

    static defaultProps = {
        gutter: null,
    };

    render() {
        const { gutter } = this.props;

        return <span className={lineGutter}>{gutter}</span>;
    }
}
