import { List, Range } from "immutable";
import { any, arrayOf, bool, func, number, object, oneOfType, shape, string } from "prop-types";

import React, { Component, Fragment } from "react";
import { AutoSizer, List as VirtualList } from "react-virtualized";

import ansiparse from "../../ansiparse";
import { decode, encode } from "../../encoding";
import request from "../../request";
import { searchLines } from "../../search";
import stream from "../../stream";
import {
    SEARCH_BAR_HEIGHT,
    SEARCH_MIN_KEYWORDS,
    convertBufferToLines,
    getHighlightRange,
    getScrollIndex,
    searchFormatPart,
} from "../../utils";
import websocket from "../../websocket";
import Line from "../Line";
import Loading from "../Loading";
import SearchBar from "../SearchBar";
import { lazyLog, searchMatch, searchMatchHighlighted } from "./index.module.css";

export default class LazyLog extends Component<any, any> {
    static propTypes = {
        /**
         * The URL from which to fetch content. Subject to same-origin policy,
         * so must be accessible via fetch on same domain or via CORS.
         */
        url: string,
        /**
         * String containing text to display.
         */
        text: string,
        /**
         * Options object which will be passed through to the `fetch` request.
         * Defaults to `{ credentials: 'omit' }`.
         */
        fetchOptions: object,

        /**
         * Options object which will be passed through to websocket.
         */
        websocketOptions: shape({
            // a callback which is invoked when the websocket connection is opened.
            onOpen: func,
            // a callback which is invoked when the websocket connection is closed.
            onClose: func,
            // a callback which is invoked when there is an error opening the
            // underlying websocket connection..
            onError: func,
            // a callback which formats the websocket data stream.
            formatMessage: func,
        }),
        /**
         * Set to `true` to specify remote URL will be streaming chunked data.
         * Defaults to `false` to download data until completion.
         */
        stream: bool,

        /**
         * Set to `true` to specify that url is a websocket URL.
         * Defaults to `false` to download data until completion.
         */
        websocket: bool,

        /**
         * Set the height in pixels for the component.
         * Defaults to `'auto'` if unspecified. When the `height` is `'auto'`,
         * the component will expand vertically to fill its container.
         */
        height: oneOfType([number, string]),
        /**
         * Set the width in pixels for the component.
         * Defaults to `'auto'` if unspecified.
         * When the `width` is `'auto'`, the component will expand
         * horizontally to fill its container.
         */
        width: oneOfType([number, string]),
        /**
         * Scroll to the end of the component after each update to the content.
         * Cannot be used in combination with `scrollToLine`.
         */
        follow: bool,
        /**
         * Scroll to a particular line number once it has loaded.
         * This is 1-indexed, i.e. line numbers start at `1`.
         * Cannot be used in combination with `follow`.
         */
        scrollToLine: number,
        /**
         * Line number (e.g. `highlight={10}`) or line number range to highlight
         * inclusively (e.g. `highlight={[5, 10]}` highlights lines 5-10).
         * This is 1-indexed, i.e. line numbers start at `1`.
         */
        highlight: oneOfType([number, arrayOf(number)]),
        /**
         * Enable the ability to select multiple lines using shift + click.
         * Defaults to true.
         */
        enableMultilineHighlight: bool,
        /**
         * Make the text selectable, allowing to copy & paste. Defaults to `false`.
         */
        selectableLines: bool,
        /**
         * Enable the search feature.
         */
        enableSearch: bool,
        /**
         * Execute a function against each string part of a line,
         * returning a new line part. Is passed a single argument which is
         * the string part to manipulate, should return a new string
         * with the manipulation completed.
         */
        formatPart: func,
        /**
         * Execute a function if/when the provided `url` has completed loading.
         */
        onLoad: func,
        /**
         * Execute a function if the provided `url` has encountered an error
         * during loading.
         */
        onError: func,
        /**
         * Execute a function when the highlighted range has changed.
         * Is passed a single argument which is an `Immutable.Range`
         * of the highlighted line numbers.
         */
        onHighlight: func,
        /**
         * A fixed row height in pixels. Controls how tall a line is,
         * as well as the `lineHeight` style of the line's text.
         * Defaults to `19`.
         */
        rowHeight: number,
        /**
         * Number of rows to render above/below the visible bounds of the list.
         * This can help reduce flickering during scrolling on
         * certain browsers/devices. Defaults to `100`.
         */
        overscanRowCount: number,
        /**
         * Optional custom inline style to attach to element which contains
         * the interior scrolling container.
         */
        containerStyle: object,
        /**
         * Optional custom inline style to attach to root
         * virtual `LazyList` element.
         */
        style: object,
        /**
         * Specify an alternate component to use when loading.
         */
        loadingComponent: any,
        /**
         * Specify an additional className to append to lines.
         */
        lineClassName: string,
        /**
         * Specify an additional className to append to highlighted lines.
         */
        highlightLineClassName: string,
        /**
         * Number of extra lines to show at the bottom of the log.
         * Set this to 1 so that Linux users can see the last line
         * of the log output.
         */
        extraLines: number,
        /**
         * Flag to enable/disable case insensitive search
         */
        caseInsensitive: bool,
        /**
         * If true, capture system hotkeys for searching the page (Cmd-F, Ctrl-F,
         * etc.)
         */
        captureHotKeys: bool,
        /**
         * If true, search like a browser search - enter jumps to the next line
         * with the searched term, shift + enter goes backwards.
         * Also adds up and down arrows to search bar to jump
         * to the next and previous result.
         * If false, enter toggles the filter instead.
         * Defaults to true.
         */
        searchLikeBrowser: bool,
        /**
         * Additional function called when a line number is clicked.
         * On click, the line will always be highlighted.
         * This function is to provide additional actions.
         * Receives an object with lineNumber and highlightRange.
         * Defaults to null.
         */
        onLineNumberClick: func,
    };

    static defaultProps = {
        stream: false,
        websocket: false,
        height: "auto",
        width: "auto",
        follow: false,
        scrollToLine: 0,
        highlight: null,
        enableMultilineHighlight: true,
        selectableLines: false,
        enableSearch: false,
        rowHeight: 19,
        overscanRowCount: 100,
        containerStyle: {
            width: "auto",
            maxWidth: "initial",
            overflow: "initial",
        },
        style: {},
        extraLines: 0,
        onError: null,
        onHighlight: null,
        onLoad: null,
        formatPart: null,
        websocketOptions: {},
        fetchOptions: { credentials: "omit" },
        loadingComponent: Loading,
        lineClassName: "",
        highlightLineClassName: "",
        caseInsensitive: false,
        captureHotKeys: false,
        searchLikeBrowser: true,
        onLineNumberClick: null,
    };

    static getDerivedStateFromProps(
        { highlight, follow, scrollToLine, url: nextUrl, text: nextText },
        {
            count,
            offset,
            url: previousUrl,
            text: previousText,
            highlight: previousHighlight,
            isSearching,
            scrollToIndex,
        },
    ) {
        const newScrollToIndex = isSearching
            ? scrollToIndex
            : getScrollIndex({ follow, scrollToLine, count, offset });
        const shouldUpdate = (nextUrl && nextUrl !== previousUrl) || (nextText && nextText !== previousText);

        return {
            scrollToIndex: newScrollToIndex,
            highlight:
                previousHighlight === Range(0, 0)
                    ? getHighlightRange(highlight)
                    : previousHighlight || getHighlightRange(previousHighlight),
            ...(shouldUpdate
                ? {
                      url: nextUrl,
                      text: nextText,
                      lines: List(),
                      count: 0,
                      offset: 0,
                      loaded: false,
                      error: null,
                  }
                : null),
        };
    }

    state: any = {
        resultLines: [],
    };

    emitter: any = undefined;
    encodedLog: any = undefined;

    componentDidMount() {
        this.setState({ listRef: React.createRef() });
        this.request();
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            prevProps.url !== this.props.url ||
            prevState.url !== this.state.url ||
            prevProps.text !== this.props.text
        ) {
            this.request();
        }

        // Reset scroll position when there's new data, otherwise the screen goes blank for some reason
        if (prevProps.text !== this.props.text && !this.props.follow && this.state.scrollTop > 0) {
            const update = () => {
                const newPosition = this.state.scrollTop;
                this.state.listRef.current.scrollToPosition(newPosition);
                this.state.listRef.current.forceUpdateGrid();
            };
            update();
        }

        if (!this.state.loaded && prevState.loaded !== this.state.loaded && this.props.onLoad) {
            this.props.onLoad();
        } else if (this.state.error && prevState.error !== this.state.error && this.props.onError) {
            this.props.onError(this.state.error);
        }

        if (this.props.highlight && prevProps.highlight !== this.props.highlight && this.props.onHighlight) {
            this.props.onHighlight(this.state.highlight);
        }
    }

    componentWillUnmount() {
        this.endRequest();
    }

    initEmitter() {
        const { stream: isStream, websocket: isWebsocket, url, fetchOptions, websocketOptions } = this.props;

        if (isWebsocket) {
            return websocket(url, websocketOptions);
        }

        if (isStream) {
            return stream(url, fetchOptions);
        }

        return request(url, fetchOptions);
    }

    request() {
        const { text, url } = this.props;

        this.endRequest();

        if (text) {
            const encodedLog = encode(text);
            const { lines, remaining } = convertBufferToLines(encodedLog, null);

            this.handleUpdate({
                lines: remaining ? lines.concat(remaining) : lines,
                encodedLog,
            });
            this.handleEnd(encodedLog);
        }

        if (url) {
            this.emitter = this.initEmitter();
            this.emitter.on("update", this.handleUpdate);
            this.emitter.on("end", this.handleEnd);
            this.emitter.on("error", this.handleError);
            this.emitter.emit("start");
        }
    }

    endRequest() {
        if (this.emitter) {
            this.emitter.emit("abort");
            this.emitter.off("update", this.handleUpdate);
            this.emitter.off("end", this.handleEnd);
            this.emitter.off("error", this.handleError);
            this.emitter = null;
        }
    }

    handleUpdate = ({ lines: moreLines, encodedLog }) => {
        this.encodedLog = encodedLog;
        const { scrollToLine, follow, stream, websocket } = this.props;
        const { count: previousCount } = this.state;

        const offset = 0;
        const lines = (this.state.lines || List()).concat(moreLines);
        const count = lines.count();

        const scrollToIndex = getScrollIndex({
            follow,
            scrollToLine,
            previousCount,
            count,
            offset,
        });

        this.setState({
            lines,
            offset,
            count,
            scrollToIndex,
        });

        if (stream || websocket) {
            this.forceSearch();
        }
    };

    handleEnd = (encodedLog) => {
        this.encodedLog = encodedLog;
        this.setState({ loaded: true });

        if (this.props.onLoad) {
            this.props.onLoad();
        }
    };

    handleError = (err) => {
        this.setState({ error: err });

        if (this.props.onError) {
            this.props.onError(err);
        }
    };

    handleHighlight = (e) => {
        const { onHighlight, enableMultilineHighlight } = this.props;
        const { isFilteringLinesWithMatches } = this.state;

        if (!e.target.id) {
            return;
        }

        const lineNumber = +e.target.id;

        if (!lineNumber) {
            return;
        }

        const first = this.state.highlight.first();
        const last = this.state.highlight.last();
        let range;

        if (first === lineNumber) {
            range = null;
        } else if (!e.shiftKey || !first) {
            range = lineNumber;
        } else if (enableMultilineHighlight && lineNumber > first) {
            range = [first, lineNumber];
        } else if (!enableMultilineHighlight && lineNumber > first) {
            range = lineNumber;
        } else {
            range = [lineNumber, last];
        }

        const highlight = getHighlightRange(range);
        const state = { highlight };

        if (isFilteringLinesWithMatches) {
            Object.assign(state, {
                scrollToIndex: getScrollIndex({ scrollToLine: lineNumber }),
            });
        }

        this.setState(state, () => {
            if (onHighlight) {
                onHighlight(highlight);
            }

            if (isFilteringLinesWithMatches) {
                this.handleFilterLinesWithMatches(false);
            }
        });

        return highlight;
    };

    handleScrollToLine(scrollToLine = 0) {
        const scrollToIndex = getScrollIndex({
            scrollToLine,
        });

        this.setState({
            scrollToIndex,
            scrollToLine,
        });
    }

    handleEnterPressed = () => {
        const { resultLines, scrollToLine, currentResultsPosition, isFilteringLinesWithMatches } = this.state;

        if (!this.props.searchLikeBrowser) {
            this.handleFilterLinesWithMatches(!isFilteringLinesWithMatches);

            return;
        }

        // If we have search results
        if (resultLines) {
            // If we already scrolled to a line
            if (scrollToLine) {
                // Scroll to the next line if possible,
                // wrap to the top if we're at the end.

                if (currentResultsPosition + 1 < resultLines.length) {
                    this.handleScrollToLine(resultLines[currentResultsPosition + 1]);
                    this.setState({ currentResultsPosition: currentResultsPosition + 1 });

                    return;
                }
            }

            this.handleScrollToLine(resultLines[0]);
            this.setState({ currentResultsPosition: 0 });
        }
    };

    handleShiftEnterPressed = () => {
        const { resultLines, scrollToLine, currentResultsPosition } = this.state;

        if (!this.props.searchLikeBrowser) {
            return;
        }

        // If we have search results
        if (resultLines) {
            // If we already scrolled to a line
            if (scrollToLine) {
                // Scroll to the previous line if possible,
                // wrap to the bottom if we're at the top.

                if (currentResultsPosition - 1 >= 0) {
                    this.handleScrollToLine(resultLines[currentResultsPosition - 1]);
                    this.setState({ currentResultsPosition: currentResultsPosition - 1 });

                    return;
                }
            }

            this.handleScrollToLine(resultLines[resultLines.length - 1]);
            this.setState({ currentResultsPosition: resultLines.length - 1 });
        }
    };

    handleSearch = (keywords) => {
        const { resultLines, searchKeywords } = this.state;
        const { caseInsensitive, stream, websocket } = this.props;
        const currentResultLines =
            !stream && !websocket && keywords === searchKeywords
                ? resultLines
                : searchLines(keywords, this.encodedLog, caseInsensitive);

        this.setState(
            {
                resultLines: currentResultLines,
                isSearching: true,
                searchKeywords: keywords,
                currentResultsPosition: 0,
            },
            this.filterLinesWithMatches,
        );
    };

    forceSearch = () => {
        const { searchKeywords } = this.state;

        if (searchKeywords && searchKeywords.length > SEARCH_MIN_KEYWORDS) {
            this.handleSearch(this.state.searchKeywords);
        }
    };

    handleClearSearch = () => {
        this.setState({
            isSearching: false,
            searchKeywords: "",
            resultLines: [],
            filteredLines: List(),
            resultLineUniqueIndexes: [],
            isFilteringLinesWithMatches: this.state.isFilteringLinesWithMatches,
            scrollToIndex: 0,
            currentResultsPosition: 0,
        });
    };

    handleFilterLinesWithMatches = (isFilterEnabled) => {
        this.setState(
            {
                isFilteringLinesWithMatches: isFilterEnabled,
                filteredLines: List(),
                resultLineUniqueIndexes: [],
            },
            this.filterLinesWithMatches,
        );
    };

    filterLinesWithMatches = () => {
        const { resultLines, lines, isFilteringLinesWithMatches } = this.state;

        if (resultLines.length > 0 && isFilteringLinesWithMatches) {
            const resultLineUniqueIndexes = [...new Set(resultLines)];

            this.setState({
                resultLineUniqueIndexes,
                filteredLines: lines.filter((line, index) =>
                    resultLineUniqueIndexes.some((resultLineIndex) => index + 1 === resultLineIndex),
                ),
            });
        }
    };

    handleFormatPart = (lineNumber) => {
        const { isSearching, searchKeywords, resultLines, currentResultsPosition } = this.state;
        const { searchLikeBrowser } = this.props;

        if (isSearching) {
            // If browser-search has started and we're on the line
            // that has the search term that is selected
            if (
                searchLikeBrowser &&
                resultLines &&
                currentResultsPosition !== undefined &&
                resultLines[currentResultsPosition] === lineNumber
            ) {
                let locationInLine = 0;
                // Find the first occurrence of the line number
                // We use this to make sure we're only searching from where
                // the line number first occurs to the currentResultsPosition below
                const initialOccurrence = resultLines.findIndex(
                    (element) => element === resultLines[currentResultsPosition],
                );

                // This finds which word in the line should be the highlighted one.
                // For example, if we should be highlighting the 2nd match on line 18,
                // this would set locationInLine to 2.
                for (let i = initialOccurrence; i <= currentResultsPosition; i += 1) {
                    if (resultLines[i] === lineNumber) {
                        locationInLine += 1;
                    }
                }

                return searchFormatPart({
                    searchKeywords,
                    nextFormatPart: undefined,
                    caseInsensitive: this.props.caseInsensitive,
                    replaceJsx: (text, key) => (
                        <span key={key} className={searchMatch}>
                            {text}
                        </span>
                    ),
                    selectedLine: true,
                    replaceJsxHighlight: (text, key) => (
                        <span key={key} className={searchMatchHighlighted}>
                            {text}
                        </span>
                    ),
                    highlightedWordLocation: locationInLine,
                });
            }

            return searchFormatPart({
                searchKeywords,
                nextFormatPart: undefined,
                caseInsensitive: this.props.caseInsensitive,
                replaceJsx: (text, key) => (
                    <span key={key} className={searchMatch}>
                        {text}
                    </span>
                ),
                selectedLine: undefined,
                replaceJsxHighlight: undefined,
                highlightedWordLocation: undefined,
            });
        }

        return this.props.formatPart;
    };

    renderError() {
        const { url, lineClassName, selectableLines, highlightLineClassName } = this.props;
        const { error } = this.state;

        return (
            <Fragment>
                <Line
                    selectable={selectableLines}
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    number="Error"
                    key="error-line-0"
                    data={[
                        {
                            bold: true,
                            foreground: "red",
                            text: error.status
                                ? `${error.message} (HTTP ${error.status})`
                                : error.message || "Network Error",
                        },
                    ]}
                />
                <Line
                    selectable={selectableLines}
                    key="error-line-1"
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    data={[
                        {
                            bold: true,
                            text: "An error occurred attempting to load the provided log.",
                        },
                    ]}
                />
                <Line
                    selectable={selectableLines}
                    key="error-line-2"
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    data={[
                        {
                            bold: true,
                            text: "Please check the URL and ensure it is reachable.",
                        },
                    ]}
                />
                <Line
                    selectable={selectableLines}
                    key="error-line-3"
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    data={[]}
                />
                <Line
                    selectable={selectableLines}
                    key="error-line-4"
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    data={[
                        {
                            foreground: "blue",
                            text: url,
                        },
                    ]}
                />
            </Fragment>
        );
    }

    renderRow = ({ key, index, style }) => {
        const {
            rowHeight,
            selectableLines,
            lineClassName,
            highlightLineClassName,
            onLineNumberClick,
            gutter,
        } = this.props;
        const {
            highlight,
            lines,
            offset,
            isFilteringLinesWithMatches,
            filteredLines,
            resultLineUniqueIndexes,
        } = this.state;
        const linesToRender = isFilteringLinesWithMatches ? filteredLines : lines;
        const number = isFilteringLinesWithMatches ? resultLineUniqueIndexes[index] : index + 1 + offset;

        return (
            <Line
                className={lineClassName}
                highlightClassName={highlightLineClassName}
                rowHeight={rowHeight}
                style={style}
                key={key}
                number={number}
                formatPart={this.handleFormatPart(number)}
                selectable={selectableLines}
                highlight={highlight.includes(number)}
                onLineNumberClick={(e) => {
                    const highlighted = this.handleHighlight(e);
                    onLineNumberClick?.({ lineNumber: number, highlightRange: highlighted });
                }}
                gutter={gutter ? gutter[number] : null}
                data={ansiparse(decode(linesToRender.get(index)))}
            />
        );
    };

    renderNoRows = () => {
        const { loadingComponent: Loading, lineClassName, highlightLineClassName } = this.props;
        const { error, count, loaded } = this.state;

        if (error) {
            return this.renderError();
        }

        // Handle case where log is empty
        if (!count && loaded) {
            return null;
        }

        // We don't do `if (loaded) {}` in order to handle
        // the edge case where the log is streaming
        if (count) {
            return (
                <Line
                    className={lineClassName}
                    highlightClassName={highlightLineClassName}
                    data={[{ bold: true, text: "No filter matches" }]}
                />
            );
        }

        return <Loading />;
    };

    calculateListHeight = (autoSizerHeight) => {
        const { height, enableSearch } = this.props;

        if (enableSearch) {
            return height === "auto" ? autoSizerHeight - SEARCH_BAR_HEIGHT : height - SEARCH_BAR_HEIGHT;
        }

        return height === "auto" ? autoSizerHeight : height;
    };

    render() {
        const { enableSearch } = this.props;
        const {
            resultLines,
            isFilteringLinesWithMatches,
            filteredLines = List(),
            count,
            currentResultsPosition,
        } = this.state;
        const rowCount = isFilteringLinesWithMatches ? filteredLines.size : count;

        return (
            <Fragment>
                {enableSearch && (
                    <SearchBar
                        filterActive={isFilteringLinesWithMatches}
                        onSearch={this.handleSearch}
                        onClearSearch={this.handleClearSearch}
                        onFilterLinesWithMatches={this.handleFilterLinesWithMatches}
                        resultsCount={resultLines.length}
                        disabled={count === 0}
                        captureHotKeys={this.props.captureHotKeys}
                        onEnter={this.handleEnterPressed}
                        onShiftEnter={this.handleShiftEnterPressed}
                        searchLikeBrowser={this.props.searchLikeBrowser}
                        currentResultsPosition={currentResultsPosition}
                    />
                )}
                <AutoSizer
                    disableHeight={this.props.height !== "auto"}
                    disableWidth={this.props.width !== "auto"}
                >
                    {({ height, width }) => (
                        <VirtualList
                            ref={this.state.listRef}
                            className={`react-lazylog ${lazyLog}`}
                            rowCount={rowCount === 0 ? rowCount : rowCount + this.props.extraLines}
                            rowRenderer={(row) => this.renderRow(row)}
                            noRowsRenderer={this.renderNoRows}
                            {...this.props}
                            rowHeight={this.props.rowHeight}
                            height={this.calculateListHeight(height)}
                            width={this.props.width === "auto" ? width : this.props.width}
                            scrollToIndex={this.state.scrollToIndex}
                            scrollToAlignment="start"
                            onScroll={({ scrollTop }) => {
                                this.setState({ scrollTop });
                            }}
                        />
                    )}
                </AutoSizer>
            </Fragment>
        );
    }
}
