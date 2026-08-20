import { List } from "immutable";
import mitt, { type Emitter } from "mitt";

import { bufferConcat, convertBufferToLines } from "./utils";

interface StatusError extends Error {
    status?: number;
}

const fetcher = Promise.resolve().then(() => globalThis.fetch);

export const recurseReaderAsEvent = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    emitter: Emitter<Record<string, unknown>>,
): Promise<void> => {
    const result = await reader.read();

    if (result.value) {
        emitter.emit("data", result.value);
    }

    if (!result.done) {
        return recurseReaderAsEvent(reader, emitter);
    }

    emitter.emit("done");
};

export default (url: string, options?: RequestInit) => {
    const emitter = mitt();
    let overage: Uint8Array | null = null;
    let encodedLog: Uint8Array = new Uint8Array();

    emitter.on("data", (data: any) => {
        encodedLog = bufferConcat(encodedLog, new Uint8Array(data));

        const { lines, remaining } = convertBufferToLines(data, overage);

        overage = remaining;
        emitter.emit("update", { lines, encodedLog });
    });

    emitter.on("done", () => {
        if (overage) {
            emitter.emit("update", { lines: List.of(overage), encodedLog });
        }

        emitter.emit("end", encodedLog);
    });

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

            if (!response.body) {
                emitter.emit("error", new Error("Response body is not readable"));

                return;
            }

            const reader = response.body.getReader();

            emitter.on("abort", () => reader.cancel("ABORTED"));

            return recurseReaderAsEvent(reader, emitter as Emitter<Record<string, unknown>>);
        } catch (err) {
            emitter.emit("error", err);
        }
    });

    return emitter;
};
