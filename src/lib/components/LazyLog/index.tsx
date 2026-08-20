import { List, Range } from "immutable";

import React, { Component, Fragment } from "react";
import {
    List as VirtualList,
    type ListImperativeAPI,
    type RowComponentProps,
} from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";

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

export interface WebsocketOptions {
    /** A callback which is invoked when the websocket connection is opened. */
    onOpen?: (e: Event, socket: WebSocket) => void;
    /** A callback which is invoked when the websocket connection is closed. */
    onClose?: (e: CloseEvent) => void;
    /** A callback which is invoked when there is an error opening the underlying websocket connection. */
    onError?: (err: Event) => void;
    /** A callback which formats the websocket data stream. */
    formatMessage?: (data: unknown) => unknown;
}

export interface LazyLogProps {
    /**
     * The URL from which to fetch content. Subject to same-origin policy,
     * so must be accessible via fetch on same domain or via CORS.
     */
    url?: string;
    /**
     * String containing text to display.
     */
    text?: string;
    /**
     * Options object which will be passed through to the `fetch` request.
     * Defaults to `{ credentials: 'omit' }`.
     */
    fetchOptions?: RequestInit;
    /**
     * Options object which will be passed through to websocket.
     */
    websocketOptions?: WebsocketOptions;
    /**
     * Set to `true` to specify remote URL will be streaming chunked data.
     * Defaults to `false` to download data until completion.
     */
    stream?: boolean;
    /**
     * Set to `true` to specify that url is a websocket URL.
     * Defaults to `false` to download data until completion.
     */
    websocket?: boolean;
    /**
     * Set the height in pixels for the component.
     * Defaults to `'auto'` if unspecified. When the `height` is `'auto'`,
     * the component will expand vertically to fill its container.
     */
    height?: number | string;
    /**
     * Set the width in pixels for the component.
     * Defaults to `'auto'` if unspecified.
     * When the `width` is `'auto'`, the component will expand
     * horizontally to fill its container.
     */
    width?: number | string;
    /**
     * Scroll to the end of the component after each update to the content.
     * Cannot be used in combination with `scrollToLine`.
     */
    follow?: boolean;
    /**
     * Scroll to a particular line number once it has loaded.
     * This is 1-indexed, i.e. line numbers start at `1`.
     * Cannot be used in combination with `follow`.
     */
    scrollToLine?: number;
    /**
     * Line number (e.g. `highlight={10}`) or line number range to highlight
     * inclusively (e.g. `highlight={[5, 10]}` highlights lines 5-10).
     * This is 1-indexed, i.e. line numbers start at `1`.
     */
    highlight?: number | number[];
    /**
     * Enable the ability to select multiple lines using shift + click.
     * Defaults to true.
     */
    enableMultilineHighlight?: boolean;
    /**
     * Make the text selectable, allowing to copy & paste. Defaults to `false`.
     */
    selectableLines?: boolean;
    /**
     * Enable the search feature.
     */
    enableSearch?: boolean;
    /**
     * Execute a function against each string part of a line,
     * returning a new line part. Is passed a single argument which is
     * the string part to manipulate, should return a new string
     * with the manipulation completed.
     */
    formatPart?: (text: string) => React.ReactNode;
    /**
     * Execute a function if/when the provided `url` has completed loading.
     */
    onLoad?: () => void;
    /**
     * Execute a function if the provided `url` has encountered an error
     * during loading.
     */
    onError?: (error: unknown) => void;
    /**
     * Execute a function when the highlighted range has changed.
     * Is passed a single argument which is an `Immutable.Range`
     * of the highlighted line numbers.
     */
    onHighlight?: (range: unknown) => void;
    /**
     * A fixed row height in pixels. Controls how tall a line is,
     * as well as the `lineHeight` style of the line's text.
     * Defaults to `19`.
     */
    rowHeight?: number;
    /**
     * Number of rows to render above/below the visible bounds of the list.
     * This can help reduce flickering during scrolling on
     * certain browsers/devices. Defaults to `100`.
     */
    overscanRowCount?: number;
    /**
     * Optional custom inline style to attach to element which contains
     * the interior scrolling container.
     */
    containerStyle?: React.CSSProperties;
    /**
     * Optional custom inline style to attach to root
     * virtual `LazyList` element.
     */
    style?: React.CSSProperties;
    /**
     * Specify an alternate component to use when loading.
     */
    loadingComponent?: React.ComponentType<any>;
    /**
     * Specify an additional className to append to lines.
     */
    lineClassName?: string;
    /**
     * Specify an additional className to append to highlighted lines.
     */
    highlightLineClassName?: string;
    /**
     * Number of extra lines to show at the bottom of the log.
     * Set this to 1 so that Linux users can see the last line
     * of the log output.
     */
    extraLines?: number;
    /**
     * Flag to enable/disable case insensitive search
     */
    caseInsensitive?: boolean;
    /**
     * If true, capture system hotkeys for searching the page (Cmd-F, Ctrl-F,
     * etc.)
     */
    captureHotKeys?: boolean;
    /**
     * If true, search like a browser search - enter jumps to the next line
     * with the searched term, shift + enter goes backwards.
     * Also adds up and down arrows to search bar to jump
     * to the next and previous result.
     * If false, enter toggles the filter instead.
     * Defaults to true.
     */
    searchLikeBrowser?: boolean;
    /**
     * Additional function called when a line number is clicked.
     * On click, the line will always be highlighted.
     * This function is to provide additional actions.
     * Receives an object with lineNumber and highlightRange.
     * Defaults to null.
     */
    onLineNumberClick?: (info: { lineNumber: number; highlightRange: unknown }) => void;
    /**
     * A map of line number to gutter content, rendered between the line
     * number and the line content.
     */
    gutter?: Record<number, React.ReactNode>;
    /**
     * Callback invoked whenever the scroll offset changes within the inner
     * scrollable region. Commonly used together with `ScrollFollow`.
     */
    onScroll?: (args: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void;
}

// Values threaded into react-window's row component via `rowProps`. Any state a
// row's output depends on must live here so react-window knows to re-render the
// affected rows when it changes (search matches, highlight ranges, filtering).
interface LazyLogRowProps {
    highlight: any;
    lines: List<Uint8Array>;
    offset: number;
    isFilteringLinesWithMatches: boolean;
    filteredLines: List<Uint8Array>;
    resultLineUniqueIndexes: number[];
    isSearching: boolean;
    searchKeywords: string;
    resultLines: number[];
    currentResultsPosition: number;
}

// The implementation reads a mix of props (guaranteed by defaultProps) and
// pass-through props as `any`; the strongly-typed public surface is exported
// via the `LazyLogProps`-typed alias at the bottom of this file.
class LazyLog extends Component<any, any> {
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
        { highlight, follow, scrollToLine, url: nextUrl, text: nextText }: any,
        {
            count,
            offset,
            url: previousUrl,
            text: previousText,
            highlight: previousHighlight,
            isSearching,
            scrollToIndex,
        }: any,
    ) {
        const newScrollToIndex = isSearching
            ? scrollToIndex
            : getScrollIndex({ follow, scrollToLine, count, offset });
        const isUrlChange = nextUrl && nextUrl !== previousUrl;
        const isTextChange = nextText && nextText !== previousText;
        const shouldUpdate = isUrlChange || isTextChange;

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
                      loaded: false,
                      error: null,
                      // For a URL change the emitter streams fresh data, so clear
                      // the existing lines. For a text change we re-parse the whole
                      // string in request()/handleTextUpdate and REPLACE the lines
                      // in a single commit — keeping the old lines mounted until
                      // then avoids the list briefly rendering 0 rows (which would
                      // unmount react-window and reset scroll to the top on every
                      // streamed line).
                      ...(isUrlChange
                          ? { lines: List(), count: 0, offset: 0 }
                          : null),
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
        this.setState({ listRef: React.createRef<ListImperativeAPI>() });
        this.request();
    }

    componentDidUpdate(prevProps: any, prevState: any) {
        if (
            prevProps.url !== this.props.url ||
            prevState.url !== this.state.url ||
            prevProps.text !== this.props.text
        ) {
            this.request();
        }

        // Reset scroll position when there's new data, otherwise the screen goes blank for some reason
        if (
            prevProps.text !== this.props.text &&
            !this.props.follow &&
            this.state.scrollTop > 0 &&
            this.state.listRef?.current?.element
        ) {
            this.state.listRef.current.element.scrollTop = this.state.scrollTop;
        }

        if (!this.state.loaded && prevState.loaded !== this.state.loaded && this.props.onLoad) {
            this.props.onLoad();
        } else if (this.state.error && prevState.error !== this.state.error && this.props.onError) {
            this.props.onError(this.state.error);
        }

        if (this.props.highlight && prevProps.highlight !== this.props.highlight && this.props.onHighlight) {
            this.props.onHighlight(this.state.highlight);
        }

        // react-window is imperative for scrolling; when scrollToIndex changes
        // to a valid (non-negative) index, scroll to that row. -1 means "no scroll".
        if (
            prevState.scrollToIndex !== this.state.scrollToIndex &&
            this.state.scrollToIndex >= 0 &&
            this.state.listRef?.current
        ) {
            this.state.listRef.current.scrollToRow({
                index: this.state.scrollToIndex,
                // When following, keep the newest line pinned to the bottom of
                // the viewport; otherwise align scrolled-to lines to the top.
                align: this.props.follow ? "end" : "start",
            });
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

            // Replace (not append) the full parsed content in a single commit.
            // `remaining` is a single Uint8Array line; push it as one element.
            // Using List.concat here would spread the typed array into individual
            // bytes (one "line" per character).
            this.handleTextUpdate({
                lines: remaining ? lines.push(remaining) : lines,
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

    handleUpdate = ({ lines: moreLines, encodedLog }: any) => {
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

    // Used by the `text` prop path. Unlike `handleUpdate` (which appends chunks
    // for streaming sources), this REPLACES the entire line set in one commit so
    // the virtualized list is never emptied between renders. Emptying it would
    // unmount react-window and reset the scroll position to the top on every
    // change to the `text` prop (e.g. simulated streaming / follow).
    handleTextUpdate = ({ lines, encodedLog }: any) => {
        this.encodedLog = encodedLog;
        const { scrollToLine, follow } = this.props;
        const { count: previousCount } = this.state;

        const offset = 0;
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

        this.forceSearch();
    };

    handleEnd = (encodedLog: any) => {
        this.encodedLog = encodedLog;
        this.setState({ loaded: true });

        if (this.props.onLoad) {
            this.props.onLoad();
        }
    };

    handleError = (err: any) => {
        this.setState({ error: err });

        if (this.props.onError) {
            this.props.onError(err);
        }
    };

    handleHighlight = (e: any) => {
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

    handleSearch = (keywords: any) => {
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

    handleFilterLinesWithMatches = (isFilterEnabled: any) => {
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
            const resultLineUniqueIndexes: number[] = [...new Set<number>(resultLines)];

            this.setState({
                resultLineUniqueIndexes,
                filteredLines: lines.filter((line: any, index: number) =>
                    resultLineUniqueIndexes.some((resultLineIndex: number) => index + 1 === resultLineIndex),
                ),
            });
        }
    };

    handleFormatPart = (lineNumber: any) => {
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
                    (element: number) => element === resultLines[currentResultsPosition],
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

    // Rendered by react-window's <List> as its `rowComponent`. It receives
    // `index` and `style` from the list plus the values passed via `rowProps`.
    // react-window memoizes rows and only re-renders them when the values in
    // `rowProps` change, so anything a row depends on (search/highlight/filter
    // state, the line data itself) must be threaded through `rowProps` — reading
    // it from `this.state`/`this.props` closure alone would not trigger updates.
    renderRow = ({
        index,
        style,
        highlight,
        lines,
        offset,
        isFilteringLinesWithMatches,
        filteredLines,
        resultLineUniqueIndexes,
        // The following are unused directly here but are included in rowProps so
        // that changes to search state force affected rows to re-render.
        isSearching: _isSearching,
        searchKeywords: _searchKeywords,
        resultLines: _resultLines,
        currentResultsPosition: _currentResultsPosition,
    }: RowComponentProps<LazyLogRowProps>) => {
        const {
            rowHeight,
            selectableLines,
            lineClassName,
            highlightLineClassName,
            onLineNumberClick,
            gutter,
        } = this.props;
        const linesToRender = isFilteringLinesWithMatches ? filteredLines : lines;
        const number = isFilteringLinesWithMatches ? resultLineUniqueIndexes[index] : index + 1 + offset;

        // The rowCount is padded with `extraLines`, so some indexes may be
        // beyond the actual line data. Render an empty spacer for those.
        const lineData = linesToRender.get(index);

        if (lineData === undefined) {
            return <div style={style} key={index} />;
        }

        return (
            <Line
                className={lineClassName}
                highlightClassName={highlightLineClassName}
                rowHeight={rowHeight}
                style={style}
                key={number}
                number={number}
                formatPart={this.handleFormatPart(number)}
                selectable={selectableLines}
                highlight={highlight.includes(number)}
                onLineNumberClick={(e: any) => {
                    const highlighted = this.handleHighlight(e);
                    onLineNumberClick?.({ lineNumber: number, highlightRange: highlighted });
                }}
                gutter={gutter ? gutter[number] : null}
                data={ansiparse(decode(lineData))}
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

    calculateListHeight = (autoSizerHeight: any) => {
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
        const itemCount = rowCount === 0 ? rowCount : rowCount + this.props.extraLines;

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
                    style={{
                        width: this.props.width === "auto" ? "100%" : this.props.width,
                        height: this.props.height === "auto" ? "100%" : this.props.height,
                        flex: this.props.height === "auto" ? 1 : undefined,
                    }}
                    renderProp={({ height, width }) => {
                        const listHeight = this.calculateListHeight(height ?? 0);
                        const listWidth = this.props.width === "auto" ? (width ?? 0) : this.props.width;

                        // react-window does not have a built-in no-rows renderer,
                        // so render the empty/loading/error state ourselves.
                        if (itemCount === 0) {
                            return (
                                <div
                                    className={`react-lazylog ${lazyLog}`}
                                    style={{
                                        height: listHeight,
                                        width: listWidth,
                                        ...this.props.style,
                                    }}
                                >
                                    {this.renderNoRows()}
                                </div>
                            );
                        }

                        return (
                            <VirtualList
                                listRef={this.state.listRef}
                                className={`react-lazylog ${lazyLog}`}
                                rowCount={itemCount}
                                rowHeight={this.props.rowHeight}
                                rowComponent={this.renderRow}
                                rowProps={
                                    {
                                        highlight: this.state.highlight,
                                        lines: this.state.lines ?? List(),
                                        offset: this.state.offset ?? 0,
                                        isFilteringLinesWithMatches:
                                            this.state.isFilteringLinesWithMatches ?? false,
                                        filteredLines: this.state.filteredLines ?? List(),
                                        resultLineUniqueIndexes:
                                            this.state.resultLineUniqueIndexes ?? [],
                                        isSearching: this.state.isSearching ?? false,
                                        searchKeywords: this.state.searchKeywords ?? "",
                                        resultLines: this.state.resultLines ?? [],
                                        currentResultsPosition:
                                            this.state.currentResultsPosition ?? 0,
                                    } satisfies LazyLogRowProps
                                }
                                overscanCount={this.props.overscanRowCount}
                                style={{
                                    height: listHeight,
                                    width: listWidth,
                                    ...this.props.style,
                                }}
                                onScroll={(event: React.UIEvent<HTMLDivElement>) => {
                                    const { scrollTop, scrollHeight, clientHeight } =
                                        event.currentTarget;

                                    this.setState({ scrollTop });

                                    // Forward to consumer's onScroll (e.g. ScrollFollow),
                                    // matching the { scrollTop, scrollHeight, clientHeight }
                                    // shape it expects to detect scrolling away from the bottom.
                                    // While following, programmatic scrolls land at the bottom
                                    // (distanceFromBottom ~= 0), so ScrollFollow's tolerance keeps
                                    // following on; a genuine user scroll up turns it off.
                                    this.props.onScroll?.({
                                        scrollTop,
                                        scrollHeight,
                                        clientHeight,
                                    });
                                }}
                            />
                        );
                    }}
                />
            </Fragment>
        );
    }
}

// Export with the strongly-typed public props so consumers get full
// type-checking and IntelliSense on `<LazyLog ... />`, while the implementation
// above stays permissive internally.
export default LazyLog as unknown as React.ComponentClass<LazyLogProps>;
