import { describe, expect, it } from "vitest";

import { decode, encode } from "../encoding";

describe("encode / decode", () => {
    it("round-trips an ASCII string", () => {
        expect(decode(encode("hello world"))).toBe("hello world");
    });

    it("round-trips unicode", () => {
        expect(decode(encode("héllo — 世界"))).toBe("héllo — 世界");
    });

    it("encode returns a byte array", () => {
        const result = encode("abc");

        expect(ArrayBuffer.isView(result)).toBe(true);
        expect(Array.from(result)).toEqual([97, 98, 99]);
    });

    it("decode wraps a single numeric byte", () => {
        // 65 === 'A'
        expect(decode(65 as unknown as Uint8Array)).toBe("A");
    });
});
