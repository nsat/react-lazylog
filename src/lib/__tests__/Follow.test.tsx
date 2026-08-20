import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

// Records scrollToRow calls made through react-window's imperative API.
const scrollCalls: Array<{ index: number; align?: string }> = [];

// Mock react-window's List so we can observe imperative scroll calls without
// relying on real layout (jsdom has no layout engine).
vi.mock("react-window", () => ({
    List: ({ listRef, rowCount, rowComponent: Row, rowProps }: any) => {
        React.useImperativeHandle(listRef, () => ({
            get element() {
                return null;
            },
            scrollToRow: (cfg: { index: number; align?: string }) => scrollCalls.push(cfg),
        }));

        return React.createElement(
            "div",
            null,
            rowCount > 0 ? Row({ index: 0, style: {}, ...rowProps }) : null,
        );
    },
}));

vi.mock("react-virtualized-auto-sizer", () => ({
    AutoSizer: ({ renderProp }: any) => renderProp({ height: 100, width: 600 }),
}));

// Import after the mocks are registered.
const { default: LazyLog } = await import("../components/LazyLog");

describe("ScrollFollow / follow scrolling", () => {
    it("keeps the newest line pinned to the bottom (align 'end') as content grows", async () => {
        scrollCalls.length = 0;

        const { rerender } = render(<LazyLog text={"a\nb\nc\n"} follow height={100} width={600} />);

        await waitFor(() => expect(scrollCalls.length).toBeGreaterThan(0));

        const first = scrollCalls[scrollCalls.length - 1];

        // The initial follow scroll targets the last line (index 2) at the bottom.
        expect(first).toEqual({ index: 2, align: "end" });

        let big = "";

        for (let i = 1; i <= 40; i += 1) {
            big += `line ${i}\n`;
        }

        rerender(<LazyLog text={big} follow height={100} width={600} />);

        await waitFor(() => {
            const last = scrollCalls[scrollCalls.length - 1];

            expect(last.index).toBeGreaterThan(first.index);
        });

        const last = scrollCalls[scrollCalls.length - 1];

        // Follows to the newest line, aligned to the bottom of the viewport.
        expect(last.align).toBe("end");
        expect(last.index).toBe(39);
    });
});
