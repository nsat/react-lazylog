import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LazyLog from "../components/LazyLog";

// Fixed height/width so react-window renders rows without needing real layout
// measurement (jsdom reports 0x0 for AutoSizer otherwise).
const dims = { height: 300, width: 600 };

describe("LazyLog", () => {
    it("renders text content into virtualized rows", async () => {
        render(<LazyLog text={"alpha\nbravo\ncharlie\n"} {...dims} />);

        await waitFor(() => {
            expect(screen.getByText("alpha")).toBeInTheDocument();
        });
        expect(screen.getByText("bravo")).toBeInTheDocument();
        expect(screen.getByText("charlie")).toBeInTheDocument();
    });

    it("renders the search bar when enableSearch is set", async () => {
        render(<LazyLog text={"one\ntwo\n"} enableSearch {...dims} />);

        await waitFor(() => {
            expect(document.querySelector("input")).toBeInTheDocument();
        });
    });

    it("invokes onLoad after loading text", async () => {
        const onLoad = vi.fn();

        render(<LazyLog text={"line\n"} onLoad={onLoad} {...dims} />);

        await waitFor(() => {
            expect(onLoad).toHaveBeenCalled();
        });
    });

    it("colorizes ANSI content", async () => {
        render(<LazyLog text={"\u001b[31mred-line\u001b[0m\n"} {...dims} />);

        await waitFor(() => {
            expect(screen.getByText("red-line")).toBeInTheDocument();
        });
    });

    it("renders a final line that has no trailing newline as a whole line", async () => {
        // Regression: previously the trailing newline-less line was concatenated
        // into the immutable List, spreading the Uint8Array into one row per byte
        // (e.g. "charlie" became rows "c", "h", "a", ...).
        render(<LazyLog text={"alpha\nbravo\ncharlie"} {...dims} />);

        await waitFor(() => {
            expect(screen.getByText("charlie")).toBeInTheDocument();
        });
        // The single-character rows from the old bug must not exist.
        expect(screen.queryByText("c")).not.toBeInTheDocument();
        expect(screen.queryByText("h")).not.toBeInTheDocument();
    });

    it("highlights matched text when searching", async () => {
        // Regression: react-window memoizes rows by `rowProps`. Search state must
        // be threaded through `rowProps` or matched rows never re-render, so no
        // highlight spans would appear.
        const { container } = render(
            <LazyLog text={"error one\ninfo two\nerror three\n"} enableSearch {...dims} />,
        );

        await waitFor(() => expect(screen.getByText("info two")).toBeInTheDocument());

        const input = container.querySelector("input")!;

        fireEvent.change(input, { target: { value: "error" } });

        await waitFor(() => {
            const matches = container.querySelectorAll("span[class*='searchMatch']");

            expect(matches.length).toBeGreaterThan(0);
        });
    });
});
