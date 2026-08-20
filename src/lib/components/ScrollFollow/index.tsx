import React, { Component, Fragment } from "react";

export interface ScrollFollowRenderProps {
    follow: boolean;
    onScroll: (args: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void;
    startFollowing: () => void;
    stopFollowing: () => void;
}

export interface ScrollFollowProps {
    /**
     * Render a component based on the function's arguments:
     *
     *   - `follow: boolean` — whether the component should be auto-following.
     *     Pass directly to the Lazy component's `follow` prop.
     *   - `onScroll: func` — listen for scrolling events. Auto-following is
     *     turned off when the user scrolls away from the bottom and turned back
     *     on when they scroll back to the bottom. Pass directly to the Lazy
     *     component's `onScroll` prop.
     *   - `startFollowing: func` — helper to manually start following.
     *   - `stopFollowing: func` — helper to manually stop following.
     */
    render: (props: ScrollFollowRenderProps) => React.ReactNode;
    /**
     * The initial follow action; defaults to `false`. The value provided here
     * informs the initial `follow` property passed to the child function.
     * Changing this prop will also update `follow`, but internal scroll events
     * and the `startFollowing`/`stopFollowing` helpers can freely override it
     * between prop changes.
     */
    startFollowing?: boolean;
}

interface ScrollFollowState {
    follow: boolean;
    // Tracks the last `startFollowing` prop value so we only re-derive
    // `follow` when the prop actually changes, instead of on every render.
    prevStartFollowing?: boolean;
}

export default class ScrollFollow extends Component<ScrollFollowProps, ScrollFollowState> {
    static defaultProps = {
        startFollowing: false,
    };

    static getDerivedStateFromProps(
        nextProps: ScrollFollowProps,
        prevState: ScrollFollowState,
    ): Partial<ScrollFollowState> | null {
        // Only sync `follow` from the prop when the prop value has changed.
        // This keeps `startFollowing` working as a controlled trigger without
        // clobbering `follow` state set by scrolling or the helper methods.
        if (nextProps.startFollowing !== prevState.prevStartFollowing) {
            return {
                follow: Boolean(nextProps.startFollowing),
                prevStartFollowing: nextProps.startFollowing,
            };
        }

        return null;
    }

    state: ScrollFollowState = {
        follow: false,
        prevStartFollowing: false,
    };

    handleScroll = ({
        scrollTop,
        scrollHeight,
        clientHeight,
    }: {
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
    }) => {
        // Distance (in px) from the current scroll position to the bottom.
        // A small tolerance avoids false negatives from sub-pixel rounding or a
        // programmatic follow scroll that lands a pixel short of the bottom.
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceFromBottom <= 2;

        if (this.state.follow && !atBottom) {
            // User scrolled away from the bottom: stop auto-following.
            this.setState({ follow: false });
        } else if (!this.state.follow && atBottom) {
            // User scrolled back to the bottom: resume auto-following.
            this.setState({ follow: true });
        }
    };

    startFollowing = () => {
        this.setState({ follow: true });
    };

    stopFollowing = () => {
        this.setState({ follow: false });
    };

    render() {
        const { render } = this.props;
        const { follow } = this.state;

        return (
            <Fragment>
                {render({
                    follow,
                    onScroll: this.handleScroll,
                    startFollowing: this.startFollowing,
                    stopFollowing: this.stopFollowing,
                })}
            </Fragment>
        );
    }
}
