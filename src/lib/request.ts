import mitt from "mitt";

import { convertBufferToLines } from "./utils";

interface StatusError extends Error {
    status?: number;
}

const fetcher = Promise.resolve().then(() => globalThis.fetch);

export default (url: string, options?: RequestInit) => {
    const emitter = mitt();

    emitter.on("start", async () => {
        try {
            const fetch = await fetcher;
            const response = await fetch(url, Object.assign({ credentials: "omit" }, options));

            if (!response.ok) {
                const error: StatusError = new Error(response.statusText);

                error.status = response.status;
                emitter.emit("error", error);

                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const encodedLog = new Uint8Array(arrayBuffer);
            const { lines, remaining } = convertBufferToLines(encodedLog, null);

            emitter.emit("update", {
                // `remaining` is a single Uint8Array line; push it as one
                // element. Using List.concat here would spread the typed array
                // into individual bytes (one "line" per character).
                lines: remaining ? lines.push(remaining) : lines,
            });
            emitter.emit("end", encodedLog);
        } catch (err) {
            emitter.emit("error", err);
        }
    });

    return emitter;
};
