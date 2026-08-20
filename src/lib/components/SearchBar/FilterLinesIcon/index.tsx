import React, { PureComponent } from "react";

import { filterLinesIcon } from "./index.module.css";

export default class FilterLinesIcon extends PureComponent {
    render() {
        // Material Symbols "filter_list" icon.
        return (
            <svg className={filterLinesIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
                <path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z" />
            </svg>
        );
    }
}
