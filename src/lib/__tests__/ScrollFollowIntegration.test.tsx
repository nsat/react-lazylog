import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("react-window", () => ({
    List: ({ listRef, rowCount, rowComponent: Row, rowProps, onScroll }: any) => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useImperativeHandle(listRef, () => ({
            get element() {
                return ref.current;
            },
            scrollToRow: () => {},
        }));

        return React.createElement(
            "div",
            { ref, onScroll, "data-testid": "scroller" },
            rowCount > 0 ? Row({ index: 0, style: {}, ...rowProps }) : null,
        );
    },
}));

vi.mock("react-virtualized-auto-sizer", () => ({
    AutoSizer: ({ renderProp }: any) => renderProp({ height: 100, width: 600 }),
}));

const { default: LazyLog } = await import("../components/LazyLog");
const { default: ScrollFollow } = await import("../components/ScrollFollow");

describe("ScrollFollow + LazyLog integration", () => {
    it("disables follow when the user scrolls away and re-enables it at the bottom", async () => {
        const follows: boolean[] = [];
        const { getByTestId } = render(
            <ScrollFollow
                startFollowing
                render={({ follow, onScroll }) => {
                    follows.push(follow);

                    return (
                        <LazyLog
                            text={"a\nb\nc\nd\ne\n"}
                            follow={follow}
                            onScroll={onScroll}
                            height={100}
                            width={600}
                        />
                    );
                }}
            />,
        );

        await waitFor(() => expect(getByTestId("scroller")).toBeInTheDocument());
        expect(follows[follows.length - 1]).toBe(true);

        const el = getByTestId("scroller");

        Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
        Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });

        // Programmatic follow scroll lands (near) the bottom: following stays on.
        el.scrollTop = 899;
        fireEvent.scroll(el);
        await new Promise((r) => setTimeout(r, 20));
        expect(follows[follows.length - 1]).toBe(true);

        // User scrolls up, far from the bottom: following turns off.
        el.scrollTop = 40;
        fireEvent.scroll(el);
        await waitFor(() => expect(follows[follows.length - 1]).toBe(false));

        // User scrolls back to the bottom: following resumes automatically.
        el.scrollTop = 900; // scrollHeight - clientHeight === bottom
        fireEvent.scroll(el);
        await waitFor(() => expect(follows[follows.length - 1]).toBe(true));
    });
});
