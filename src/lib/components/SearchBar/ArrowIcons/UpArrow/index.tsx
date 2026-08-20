import React, { PureComponent } from "react";

import { upArrowIcon } from "./index.module.css";

export default class UpArrowIcon extends PureComponent {
    render() {
        // Material Symbols "keyboard_arrow_up" icon.
        return (
            <svg className={upArrowIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z" />
            </svg>
        );
    }
}
