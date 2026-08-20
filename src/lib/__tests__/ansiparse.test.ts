import { describe, expect, it } from "vitest";

import ansiparse from "../ansiparse";

describe("ansiparse", () => {
    it("returns plain text as a single part", () => {
        const result = ansiparse("just text");

        expect(result).toEqual([{ text: "just text" }]);
    });

    it("parses a foreground color", () => {
        const result = ansiparse("\u001b[31mred\u001b[0m");
        const colored = result.find((p: any) => p.text === "red");

        expect(colored).toBeDefined();
        expect(colored.foreground).toBe("red");
    });

    it("parses bold style", () => {
        const result = ansiparse("\u001b[1mbold\u001b[0m");
        const bold = result.find((p: any) => p.text === "bold");

        expect(bold.bold).toBe(true);
    });

    it("parses background color", () => {
        const result = ansiparse("\u001b[42mgreen-bg\u001b[0m");
        const part = result.find((p: any) => p.text === "green-bg");

        expect(part.background).toBe("green");
    });

    it("splits text across multiple color segments", () => {
        const result = ansiparse("plain \u001b[36mcyan\u001b[0m tail");
        const texts = result.map((p: any) => p.text);

        expect(texts).toContain("plain ");
        expect(texts).toContain("cyan");
    });

    it("handles backspace erase characters", () => {
        const result = ansiparse("ab\u0008c");

        expect(result.map((p: any) => p.text).join("")).toBe("ac");
    });
});
