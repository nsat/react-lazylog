import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

// Records the rowCount react-window sees on every render, plus scroll calls.
const renders: number[] = [];
const scrollCalls: Array<{ index: number; align?: string }> = [];

vi.mock("react-window", () => ({
    List: ({ listRef, rowCount, rowComponent: Row, rowProps }: any) => {
        const ref = React.useRef<HTMLDivElement>(null);

        React.useImperativeHandle(listRef, () => ({
            get element() {
                return ref.current;
            },
            scrollToRow: (cfg: { index: number; align?: string }) => scrollCalls.push(cfg),
        }));

        renders.push(rowCount);

        return React.createElement(
            "div",
            { ref, "data-testid": "scroller" },
            rowCount > 0 ? Row({ index: 0, style: {}, ...rowProps }) : null,
        );
    },
}));

vi.mock("react-virtualized-auto-sizer", () => ({
    AutoSizer: ({ renderProp }: any) => renderProp({ height: 100, width: 600 }),
}));

const { default: LazyLog } = await import("../components/LazyLog");

describe("follow / streaming text prop", () => {
    it("never drops the list to 0 rows when appending, and follows to the newest line", async () => {
        renders.length = 0;
        scrollCalls.length = 0;

        const { rerender } = render(
            <LazyLog text={"l1\nl2\nl3\n"} follow height={100} width={600} />,
        );

        await waitFor(() => expect(renders.some((c) => c > 0)).toBe(true));

        // Simulate three streamed appends.
        rerender(<LazyLog text={"l1\nl2\nl3\nl4\n"} follow height={100} width={600} />);
        await new Promise((r) => setTimeout(r, 20));
        rerender(<LazyLog text={"l1\nl2\nl3\nl4\nl5\n"} follow height={100} width={600} />);
        await new Promise((r) => setTimeout(r, 20));

        // Regression: the list must never remount with 0 rows after initial mount,
        // otherwise react-window resets scroll to the top on every streamed line.
        const rendersAfterMount = renders.slice(1);

        expect(rendersAfterMount.every((c) => c > 0)).toBe(true);

        // And follow keeps scrolling to the newest (last) line at the bottom.
        const last = scrollCalls[scrollCalls.length - 1];

        expect(last.align).toBe("end");
        expect(last.index).toBe(4); // 5 lines -> last index is 4
    });
});
