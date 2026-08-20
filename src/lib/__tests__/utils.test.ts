import { List, Range } from "immutable";
import { describe, expect, it } from "vitest";

import {
    ENCODED_CARRIAGE_RETURN,
    ENCODED_NEWLINE,
    bufferConcat,
    convertBufferToLines,
    getHighlightRange,
    getLinesLengthRanges,
    getScrollIndex,
    isNewline,
} from "../utils";

const enc = (s: string) => new TextEncoder().encode(s);

describe("isNewline", () => {
    it("detects \\n and \\r", () => {
        expect(isNewline(ENCODED_NEWLINE)).toBe(true);
        expect(isNewline(ENCODED_CARRIAGE_RETURN)).toBe(true);
        expect(isNewline(65)).toBe(false);
    });
});

describe("getScrollIndex", () => {
    it("follows to the last line when follow is true", () => {
        expect(getScrollIndex({ follow: true, count: 10, offset: 0 })).toBe(9);
        expect(getScrollIndex({ follow: true, count: 10, offset: 2 })).toBe(7);
    });

    it("scrolls to a specific 1-indexed line", () => {
        expect(getScrollIndex({ scrollToLine: 5 })).toBe(4);
    });

    it("returns -1 when the target line was already passed", () => {
        expect(getScrollIndex({ scrollToLine: 3, previousCount: 5 })).toBe(-1);
    });

    it("returns -1 with no follow and no scrollToLine", () => {
        expect(getScrollIndex({})).toBe(-1);
    });
});

describe("getHighlightRange", () => {
    it("returns an empty range for falsy / invalid input", () => {
        expect(getHighlightRange(null).equals(Range(0, 0))).toBe(true);
        expect(getHighlightRange(undefined).equals(Range(0, 0))).toBe(true);
        expect(getHighlightRange([NaN, 2]).equals(Range(0, 0))).toBe(true);
    });

    it("wraps a single number as an inclusive one-line range", () => {
        expect(getHighlightRange(10).equals(Range(10, 11))).toBe(true);
    });

    it("treats a single-element array as invalid (empty range)", () => {
        // highlight[1] is undefined -> isNaN(undefined) is true -> Range(0,0)
        expect(getHighlightRange([7]).equals(Range(0, 0))).toBe(true);
    });

    it("handles an inclusive [start, end] range", () => {
        // 5..10 inclusive -> Range(5, 11)
        expect(getHighlightRange([5, 10]).equals(Range(5, 11))).toBe(true);
    });
});

describe("bufferConcat", () => {
    it("concatenates two Uint8Arrays", () => {
        const result = bufferConcat(enc("ab"), enc("cd"));
        expect(new TextDecoder().decode(result)).toBe("abcd");
        expect(result.length).toBe(4);
    });
});

describe("convertBufferToLines", () => {
    it("splits on \\n and reports the trailing remainder", () => {
        const { lines, remaining } = convertBufferToLines(enc("one\ntwo\nthree"));

        expect(lines.size).toBe(2);
        expect(new TextDecoder().decode(lines.get(0) as Uint8Array)).toBe("one");
        expect(new TextDecoder().decode(lines.get(1) as Uint8Array)).toBe("two");
        expect(remaining).not.toBeNull();
        expect(new TextDecoder().decode(remaining as Uint8Array)).toBe("three");
    });

    it("handles \\r\\n newlines", () => {
        const { lines } = convertBufferToLines(enc("a\r\nb\r\n"));

        expect(lines.size).toBe(2);
        expect(new TextDecoder().decode(lines.get(0) as Uint8Array)).toBe("a");
        expect(new TextDecoder().decode(lines.get(1) as Uint8Array)).toBe("b");
    });

    it("prepends the previous overage buffer", () => {
        const { lines } = convertBufferToLines(enc("rld\n"), enc("wo"));

        expect(new TextDecoder().decode(lines.get(0) as Uint8Array)).toBe("world");
    });

    it("returns null remaining when input ends on a newline", () => {
        const { remaining } = convertBufferToLines(enc("done\n"));

        expect(remaining).toBeNull();
    });
});

describe("getLinesLengthRanges", () => {
    it("returns the byte index of each newline", () => {
        const ranges = getLinesLengthRanges(enc("ab\ncd\n"));

        expect(ranges).toEqual([2, 5]);
    });
});

describe("List integration", () => {
    it("convertBufferToLines returns an immutable List", () => {
        const { lines } = convertBufferToLines(enc("x\ny\n"));

        expect(List.isList(lines)).toBe(true);
    });
});
