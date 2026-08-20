import { describe, expect, it } from "vitest";

import { encode } from "../encoding";
import { searchIndexes, searchLines } from "../search";

const enc = (s: string) => Array.from(encode(s));

describe("searchIndexes", () => {
    it("finds all occurrences of a keyword", () => {
        const log = encode("error here and error there");
        const results = searchIndexes("error", log);

        // "error" starts at index 0 and again at 15
        expect(results).toEqual([0, 15]);
    });

    it("returns empty when keyword is absent", () => {
        expect(searchIndexes("missing", encode("nothing to see"))).toEqual([]);
    });

    it("matches overlapping-ish repeated tokens", () => {
        const results = searchIndexes("aa", encode("aaaa"));

        expect(results).toEqual([0, 1, 2]);
    });
});

describe("searchLines", () => {
    it("returns 1-indexed line numbers containing matches", () => {
        const log = encode("first line\nsecond error\nthird line\nfourth error\n");
        const lines = searchLines("error", log, false);

        expect(lines).toEqual([2, 4]);
    });

    it("supports case-insensitive search", () => {
        const log = encode("Line ONE\nline Two ERROR\n");

        expect(searchLines("error", log, true)).toEqual([2]);
        expect(searchLines("error", log, false)).toEqual([]);
    });
});

describe("encode helper sanity", () => {
    it("encodes to byte arrays used by search", () => {
        expect(enc("ab")).toEqual([97, 98]);
    });
});
