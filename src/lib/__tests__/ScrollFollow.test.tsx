import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ScrollFollow from "../components/ScrollFollow";

describe("ScrollFollow", () => {
    it("passes follow=true to the render prop when startFollowing is set", () => {
        const renderProp = vi.fn(({ follow }) => (
            <div data-testid="child" data-follow={String(follow)} />
        ));

        render(<ScrollFollow startFollowing render={renderProp} />);

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");
        expect(renderProp).toHaveBeenCalledWith(
            expect.objectContaining({
                follow: true,
                onScroll: expect.any(Function),
                startFollowing: expect.any(Function),
                stopFollowing: expect.any(Function),
            }),
        );
    });

    it("defaults follow to false", () => {
        render(
            <ScrollFollow
                render={({ follow }) => <div data-testid="child" data-follow={String(follow)} />}
            />,
        );

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "false");
    });

    it("provides the follow helpers to the render prop", () => {
        let captured: any;

        render(
            <ScrollFollow
                startFollowing
                render={(args) => {
                    captured = args;

                    return <div data-testid="child" data-follow={String(args.follow)} />;
                }}
            />,
        );

        expect(captured).toMatchObject({
            follow: true,
            onScroll: expect.any(Function),
            startFollowing: expect.any(Function),
            stopFollowing: expect.any(Function),
        });
    });

    it("stopFollowing() sticks even while startFollowing prop stays true", () => {
        let captured: any;

        render(
            <ScrollFollow
                startFollowing
                render={(args) => {
                    captured = args;

                    return <div data-testid="child" data-follow={String(args.follow)} />;
                }}
            />,
        );

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");

        act(() => captured.stopFollowing());

        // Regression: previously getDerivedStateFromProps re-derived follow=true
        // on every render, clobbering this update.
        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "false");
    });

    it("turns off following when the user scrolls away from the bottom", () => {
        let captured: any;

        render(
            <ScrollFollow
                startFollowing
                render={(args) => {
                    captured = args;

                    return <div data-testid="child" data-follow={String(args.follow)} />;
                }}
            />,
        );

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");

        act(() => {
            captured.onScroll({ scrollTop: 0, scrollHeight: 1000, clientHeight: 300 });
        });

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "false");
    });

    it("re-syncs follow when the startFollowing prop changes", () => {
        let captured: any;
        const renderProp = (args: any) => {
            captured = args;

            return <div data-testid="child" data-follow={String(args.follow)} />;
        };

        const { rerender } = render(<ScrollFollow startFollowing={false} render={renderProp} />);

        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "false");

        act(() => captured.startFollowing());
        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");

        // Changing the prop from true-was-not-set to explicit true is a no-op
        // if unchanged; flip it to false to confirm the prop still controls.
        rerender(<ScrollFollow startFollowing={false} render={renderProp} />);
        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");

        rerender(<ScrollFollow startFollowing render={renderProp} />);
        expect(screen.getByTestId("child")).toHaveAttribute("data-follow", "true");
    });
});
