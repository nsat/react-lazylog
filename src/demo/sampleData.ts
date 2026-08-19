// Sample log content used across the demo examples.

const services = ["api-gateway", "auth", "scheduler", "worker", "db-proxy"];
const levels = [
    { label: "INFO", ansi: "\u001b[32m" }, // green
    { label: "DEBUG", ansi: "\u001b[36m" }, // cyan
    { label: "WARN", ansi: "\u001b[33m" }, // yellow
    { label: "ERROR", ansi: "\u001b[31m" }, // red
];
const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";

const messages = [
    "Received inbound request",
    "Cache miss, querying upstream",
    "Connection pool saturated, queuing request",
    "Token validated successfully",
    "Retrying operation after transient failure",
    "Persisted record to database",
    "Scheduled job completed",
    "Deadline exceeded while waiting on dependency",
    "Health check passed",
    "Emitting metrics to collector",
];

/**
 * Generates a deterministic, ANSI-colorized multi-line log string.
 */
export function generateAnsiLog(lineCount = 500): string {
    const lines: string[] = [];
    const base = new Date("2024-01-01T00:00:00Z").getTime();

    for (let i = 0; i < lineCount; i += 1) {
        const level = levels[i % levels.length];
        const service = services[i % services.length];
        const message = messages[i % messages.length];
        const timestamp = new Date(base + i * 137).toISOString();

        lines.push(
            `\u001b[90m${timestamp}${RESET} ${level.ansi}${BOLD}${level.label.padEnd(5)}${RESET} ` +
                `\u001b[35m[${service}]${RESET} ${message} ` +
                `\u001b[90m(req_id=${(1000 + i).toString(16)})${RESET}`,
        );
    }

    return lines.join("\n");
}

/**
 * A short, plain-text log for the basic example.
 */
export const plainLog = Array.from({ length: 120 }, (_, i) => {
    const level = levels[i % levels.length].label;
    const message = messages[i % messages.length];
    const timestamp = new Date(new Date("2024-01-01T00:00:00Z").getTime() + i * 1000).toISOString();

    return `${timestamp}  ${level.padEnd(5)}  ${message}`;
}).join("\n");

export const ansiLog = generateAnsiLog(1000);
