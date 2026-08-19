import { useEffect, useMemo, useRef, useState } from "react";

import { LazyLog, ScrollFollow } from "../lib/components";
import { ansiLog, plainLog } from "./sampleData";

type TabId = "basic" | "ansi" | "search" | "highlight" | "follow";

interface Tab {
    id: TabId;
    label: string;
    description: string;
}

const TABS: Tab[] = [
    {
        id: "basic",
        label: "Basic",
        description: "Render a plain-text log. LazyLog virtualizes rows for smooth scrolling.",
    },
    {
        id: "ansi",
        label: "ANSI colors",
        description: "ANSI escape sequences are parsed and colorized automatically.",
    },
    {
        id: "search",
        label: "Search",
        description:
            "Enable the built-in search bar. Type a term to jump between matches (browser-like search).",
    },
    {
        id: "highlight",
        label: "Highlighting",
        description:
            "Highlight a line or an inclusive range of lines. Click a line number to highlight it.",
    },
    {
        id: "follow",
        label: "Scroll follow",
        description:
            "ScrollFollow keeps the view pinned to the newest line as content streams in, until the user scrolls away. Streaming auto-pauses at 50 lines — resume to keep going.",
    },
];

function Viewer({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-[60vh] w-full overflow-hidden rounded-lg border border-spire-grey-1 bg-spire-dark">
            {children}
        </div>
    );
}

function BasicExample() {
    return (
        <Viewer>
            <LazyLog text={plainLog} selectableLines />
        </Viewer>
    );
}

function AnsiExample() {
    return (
        <Viewer>
            <LazyLog text={ansiLog} selectableLines />
        </Viewer>
    );
}

function SearchExample() {
    return (
        <Viewer>
            <LazyLog text={ansiLog} enableSearch caseInsensitive selectableLines />
        </Viewer>
    );
}

function HighlightExample() {
    const [range, setRange] = useState<[number, number]>([5, 12]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-spire-grey-4">
                <label className="flex items-center gap-2">
                    From
                    <input
                        type="number"
                        min={1}
                        value={range[0]}
                        onChange={(e) => setRange([Number(e.target.value), range[1]])}
                        className="w-20 rounded border border-spire-grey-1 bg-spire-surface px-2 py-1 text-spire-white"
                    />
                </label>
                <label className="flex items-center gap-2">
                    To
                    <input
                        type="number"
                        min={1}
                        value={range[1]}
                        onChange={(e) => setRange([range[0], Number(e.target.value)])}
                        className="w-20 rounded border border-spire-grey-1 bg-spire-surface px-2 py-1 text-spire-white"
                    />
                </label>
                <span className="text-spire-grey-3">or click a line number in the viewer.</span>
            </div>
            <Viewer>
                <LazyLog text={plainLog} highlight={range} selectableLines enableMultilineHighlight />
            </Viewer>
        </div>
    );
}

function FollowExample() {
    const INITIAL_TEXT = "Streaming log output...\n";
    const AUTO_PAUSE_AT = 50;

    const [text, setText] = useState(INITIAL_TEXT);
    const [isStreaming, setIsStreaming] = useState(true);
    const [autoPaused, setAutoPaused] = useState(false);
    const counter = useRef(0);
    // Ensures the auto-pause only fires once (at AUTO_PAUSE_AT); after the user
    // resumes, streaming continues past the threshold without pausing again.
    const hasAutoPaused = useRef(false);

    useEffect(() => {
        if (!isStreaming) {
            return;
        }

        const interval = setInterval(() => {
            // Auto-pause once when reaching AUTO_PAUSE_AT; the user can resume.
            if (!hasAutoPaused.current && counter.current >= AUTO_PAUSE_AT) {
                hasAutoPaused.current = true;
                setAutoPaused(true);
                setIsStreaming(false);

                return;
            }

            counter.current += 1;
            setText(
                (prev) =>
                    prev +
                    `\u001b[36m[stream]\u001b[0m line ${counter.current} — ` +
                    `${new Date().toISOString()}\n`,
            );
        }, 400);

        return () => clearInterval(interval);
    }, [isStreaming]);

    const handleToggleStreaming = () => {
        // Clear the auto-pause notice when the user manually resumes.
        if (!isStreaming) {
            setAutoPaused(false);
        }

        setIsStreaming((s) => !s);
    };

    const handleReset = () => {
        counter.current = 0;
        hasAutoPaused.current = false;
        setAutoPaused(false);
        setText(INITIAL_TEXT);
        setIsStreaming(true);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                    onClick={handleToggleStreaming}
                    className="rounded-md bg-spire-red px-3 py-1.5 font-medium text-spire-white transition-colors hover:opacity-90"
                >
                    {isStreaming ? "Pause" : "Resume"}
                </button>
                <button
                    onClick={handleReset}
                    className="rounded-md bg-spire-surface-2 px-3 py-1.5 font-medium text-spire-white transition-colors hover:bg-spire-grey-1"
                >
                    Reset
                </button>
                <span className="text-spire-grey-3">
                    {counter.current} lines
                    {isStreaming ? " — streaming" : " — paused"}
                </span>
            </div>
            <Viewer>
                <ScrollFollow
                    startFollowing
                    render={({ follow, onScroll }) => (
                        <LazyLog text={text} follow={follow} onScroll={onScroll} selectableLines />
                    )}
                />
            </Viewer>
        </div>
    );
}

export default function App() {
    const [active, setActive] = useState<TabId>("basic");
    const activeTab = useMemo(() => TABS.find((t) => t.id === active)!, [active]);

    return (
        <div className="min-h-screen bg-spire-dark text-spire-white">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        @nsat/react-lazylog
                    </h1>
                    <p className="mt-2 max-w-2xl text-spire-grey-3">
                        A React component that lazily loads and views large remote text in the browser.
                        Efficient virtualized scrolling, ANSI colorization, search, and line highlighting.
                    </p>
                </header>

                <nav className="mb-4 flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActive(tab.id)}
                            className={
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                                (active === tab.id
                                    ? "bg-spire-red text-spire-white"
                                    : "bg-spire-surface text-spire-grey-4 hover:bg-spire-surface-2")
                            }
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <p className="mb-4 text-sm text-spire-grey-3">{activeTab.description}</p>

                {active === "basic" && <BasicExample />}
                {active === "ansi" && <AnsiExample />}
                {active === "search" && <SearchExample />}
                {active === "highlight" && <HighlightExample />}
                {active === "follow" && <FollowExample />}

                <footer className="mt-10 border-t border-spire-grey-1 pt-6 text-xs text-spire-grey-2">
                    Built with React 19, TypeScript 5, and Vite. Maintained by Spire Global, Inc.
                </footer>
            </div>
        </div>
    );
}
