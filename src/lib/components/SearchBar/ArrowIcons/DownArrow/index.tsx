import React, { PureComponent } from "react";

import { downArrowIcon } from "./index.module.css";

export default class DownArrowIcon extends PureComponent {
    render() {
        // Material Symbols "keyboard_arrow_down" icon.
        return (
            <svg className={downArrowIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
            </svg>
        );
    }
}
