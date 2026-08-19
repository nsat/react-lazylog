# React Lazylog

React component that loads and views remote text in the browser lazily and efficiently.  
Forked from
[mozilla-frontend-infra/react-lazylog](https://github.com/mozilla-frontend-infra/react-lazylog).
This fork is maintained by a team at [Spire Global, Inc.](https://github.com/nsat) for internal usage. Outside contributions are
**not** currently being reviewed or merged.

## Features

-   Efficient scrolling performance thanks to [react-window](https://github.com/bvaughn/react-window)
-   Able to load large files upwards of 100MB without crashing the browser
-   Parses, colorizes, and styles ANSI escapes within content
-   Supports remote text files as well as chunked/streamed responses
-   Line highlighting
-   Customizable styling
-   Searching through log
-   Works in latest browser versions, including iOS Safari and Android Chrome
-   v5+ requires React 18+

## Installation

This package is published to the **GitHub Packages** registry under the `@nsat` scope.
Configure npm to resolve the `@nsat` scope from GitHub Packages by adding an `.npmrc`
to your project (or your user `~/.npmrc`):

```ini
@nsat:registry=https://npm.pkg.github.com
```

Then install the package alongside its React peer dependencies:

```bash
npm install @nsat/react-lazylog react react-dom
```

> **Note:** `react` and `react-dom` are peer dependencies (`>=18`). The package is
> published as an **ES module only** — CommonJS `require()` is not supported.

## Getting started

The core component from react-lazylog is `LazyLog`. There is also a higher-order component (HOC) for
following logs until scroll. This module is distributed as an ES module.

```js
import { LazyLog } from "@nsat/react-lazylog";

// Import the styles once in your app entry point:
import "@nsat/react-lazylog/styles.css";
```

## `<LazyLog />`

### Usage

After importing a component, it can be rendered with the required `url` prop:

```jsx
import { createRoot } from "react-dom/client";
import { LazyLog } from "@nsat/react-lazylog";

// LazyLog ships its styles as a separate stylesheet:
import "@nsat/react-lazylog/styles.css";

createRoot(document.getElementById("root")).render(<LazyLog url="http://example.log" />);
```

By default the `LazyLog` will expand to fill its container, so ensure this container has valid dimensions and layout.
If you wish to have fixed dimensions, change the `height` and `width` props.

If you are going to be rendering a complete file, or an endpoint which can be downloaded all at once, use the
`<LazyLog />` component as-is for better overall performance at the expense of slightly longer upfront load time.

If you are going to be requesting a streaming or chunked response, use the `<LazyLog stream />` component with the
`stream` prop of `true` for quicker upfront rendering as content can be decoded as it arrives.

`LazyLog` accepts the following commonly-used props (see the exported `LazyLogProps`
TypeScript interface for the full, documented list):

| Property           | Type     | Required? | Description                                                                                                                                                          |
| :----------------- | :------- | :-------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowHeight`        | Number   |           | A fixed row height in pixels. Controls how tall a line is, as well as the `lineHeight` style of the line's text. Defaults to `19`.                                   |
| `overscanRowCount` | Number   |           | Number of rows to render above/below the visible bounds of the list. This can help reduce flickering during scrolling on certain browsers/devices. Defaults to `100`. |
| `onScroll`         | Function |           | Callback invoked whenever the scroll offset changes within the inner scrollable region: `({ scrollTop: number, scrollHeight: number, clientHeight: number }): void`  |

## `<ScrollFollow />`

`ScrollFollow` is a higher-order component (HOC) that aims to simplify toggling a `LazyLog`'s
"follow" functionality based on user scrolling.

While following, the view stays pinned to the newest line as content streams in. Auto-following
is **disabled automatically when the user scrolls up** (away from the bottom) and **re-enabled
automatically when the user scrolls back down to the bottom**, so following resumes without any
manual action.

### Usage

The `ScrollFollow` component accepts a render prop function which should return a component to render based on the
function's arguments.

```jsx
import { createRoot } from "react-dom/client";
import { LazyLog, ScrollFollow } from "@nsat/react-lazylog";

createRoot(document.getElementById("root")).render(
    <ScrollFollow
        startFollowing={true}
        render={({ follow, onScroll }) => (
            <LazyLog url="http://example.log" stream follow={follow} onScroll={onScroll} />
        )}
    />,
);
```

The render prop is called with the following arguments (`ScrollFollowRenderProps`):

| Argument         | Type       | Description                                                                                                                                                             |
| :--------------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `follow`         | `boolean`  | Whether the view should currently be auto-following. Pass directly to `LazyLog`'s `follow` prop.                                                                        |
| `onScroll`       | `function` | Scroll handler that toggles following based on scroll position. Disables following when scrolled away from the bottom and re-enables it at the bottom. Pass to `LazyLog`'s `onScroll` prop. |
| `startFollowing` | `function` | Helper to manually start following.                                                                                                                                     |
| `stopFollowing`  | `function` | Helper to manually stop following.                                                                                                                                      |

`ScrollFollow` also accepts a `startFollowing` boolean prop (default `false`) that sets the initial
follow state.

## Styling

The components ship with a **Spire Dark** theme (background `#04060f`) and the Spire
**BU color scheme** for ANSI colors, line highlighting, and search matches. All colors
are exposed as CSS custom properties, so you can re-theme the viewer without touching
the internal class names. There are a few techniques for overriding styles.

### Overriding colors (CSS variables)

Every themeable color is a CSS custom property scoped to the root `.react-lazylog`
element (and, for the search bar, `.react-lazylog-searchbar`). Override them in your own
stylesheet to re-theme the viewer:

```css
/* Example: a light theme */
.react-lazylog {
    --lazylog-background: #ffffff;
    --lazylog-color: #04060f;
    --lazylog-line-number-color: #6a7680;
    --lazylog-line-highlight-background: #e2e2e2;

    /* ANSI foreground colors */
    --lazylog-color-red: #be0000;
    --lazylog-color-green: #00806c;
    --lazylog-color-blue: #2280c5;
    /* ...etc */
}

.react-lazylog-searchbar {
    --lazylog-searchbar-background: #f2f2f2;
    --lazylog-searchbar-color: #04060f;
}
```

> **Note:** The search bar renders as a sibling of the log list rather than inside
> `.react-lazylog`, so its variables must be set on `.react-lazylog-searchbar` (or a
> shared ancestor of both).

The full list of variables and their defaults:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--lazylog-background` | `#04060f` (Spire Dark) | Log viewer background |
| `--lazylog-color` | `#ffffff` | Default text color |
| `--lazylog-line-number-color` | `#6a7680` (Grey 2) | Line number color |
| `--lazylog-line-number-highlight-color` | `#ffffff` | Highlighted line number color |
| `--lazylog-line-hover-background` | `#161a24` | Line hover background |
| `--lazylog-line-highlight-background` | `#0f447a` (Black Sapphire) | Highlighted line background |
| `--lazylog-gutter-color` | `#aeb1b4` (Grey 3) | Gutter text color |
| `--lazylog-selection-background` | `#2280c5` (Calypso Wave) | Text selection background |
| `--lazylog-selection-color` | `#ffffff` | Text selection text color |
| `--lazylog-search-match-background` | `#c7904b` (Orbital Ochre) | Search match background |
| `--lazylog-search-match-color` | `#04060f` | Search match text |
| `--lazylog-search-match-highlighted-background` | `#be0000` (Spire Red) | Active search match background |
| `--lazylog-search-match-highlighted-color` | `#ffffff` | Active search match text |
| `--lazylog-searchbar-background` | `#04060f` | Search bar background |
| `--lazylog-searchbar-color` | `#e2e2e2` (Grey 5) | Search bar text |
| `--lazylog-searchbar-input-background` | `#161a24` | Search input background |
| `--lazylog-searchbar-input-border` | `#485463` (Grey 1) | Search input border |
| `--lazylog-searchbar-icon-active` | `#e2e2e2` | Active search icon color |
| `--lazylog-searchbar-icon-inactive` | `#485463` | Inactive search icon color |
| `--lazylog-searchbar-icon-hover` | `#ffffff` | Search icon color on hover |
| `--lazylog-searchbar-hover-background` | `#161a24` | Search icon hover background |

ANSI colors are themeable per-color. Foregrounds: `--lazylog-color-{black,red,green,yellow,blue,magenta,cyan,white,grey}`
and their bold variants `--lazylog-color-{name}-bold`. Backgrounds:
`--lazylog-bg-{black,red,green,yellow,blue,magenta,cyan,white,grey}`. Defaults use the
Spire BU palette (e.g. red → Altitude Change `#c85a3d`, green → Mindful Green `#00806c`,
blue → Calypso Wave `#2280c5`, cyan → Equatorial Aqua `#00adca`, magenta → Vast Violet `#80146e`).

### `style` and `containerStyle`

For the core container of `<LazyLog />`, you can pass a `style` object prop to affect many styles.
For affecting the look or behavior of the scrollable region of these components, use the `containerStyle` prop with a
styling object.

### CSS stylesheets

The library ships a stylesheet at `@nsat/react-lazylog/styles.css`. Import it once in your app entry:

```js
import "@nsat/react-lazylog/styles.css";
```

If you are using CSS stylesheets, you can target the main virtual `LazyList` component with the `react-lazylog`
class name. From there you can target the individual `div` lines, `a` line numbers, or `span` line content.

## Sub-components

react-lazylog uses a number of sub-components internally to render individual parts of the log-viewing component.

> **Note:** As of v5, these sub-components are **internal only** and are no longer
> exported from the package (only `LazyLog` and `ScrollFollow` are public). The
> descriptions below document how the component is composed internally.

### `<Line />`

A single row of content, containing both the line number and any text content within the line.

### `<LineNumber />`

The line number of a single line. The anchor contained within is interactive, and will highlight the entire line upon
selection.

### `<LineContent />`

The container of all the individual pieces of content that is on a single line. May contain one or more `LinePart`s
depending on ANSI parsing.

### `<LinePart />`

An individual segment of text within a line. When the text content is ANSI-parsed, each boundary is placed within its
own `LinePart` and styled separately (colors, text formatting, etc.) from the rest of the line's content.

## Technology

-   [react-window](https://github.com/bvaughn/react-window) + [react-virtualized-auto-sizer](https://github.com/bvaughn/react-virtualized-auto-sizer) for efficiently rendering large numbers of lines
-   `fetch` API for efficiently requesting data with array buffers and binary streams
-   [ansiparse](https://www.npmjs.com/package/ansiparse) for nice log styling, like Travis
-   [mitt](https://www.npmjs.com/package/mitt) for dead-simple events to manage streaming lifecycle
-   [Immutable](https://www.npmjs.com/package/immutable) for efficiently storing and managing very large collections of lines and highlight ranges
-   `Uint8Array` for dealing with text content as binary, allows for conditionally rendering partial data and decoding everything without crashing your browser

## Migrating from v4 to v5

v5 is a major modernization release. The public `<LazyLog />` and `<ScrollFollow />`
component APIs are largely unchanged, but packaging, tooling, and a few internals
changed in breaking ways. See the [CHANGELOG](./CHANGELOG.md) for the full list.

### 1. Package name and installation

The package is now scoped and published to GitHub Packages.

```diff
- npm install react-lazylog
+ npm install @nsat/react-lazylog
```

```diff
- import { LazyLog, ScrollFollow } from "react-lazylog";
+ import { LazyLog, ScrollFollow } from "@nsat/react-lazylog";
```

Add an `.npmrc` so the `@nsat` scope resolves from GitHub Packages:

```ini
@nsat:registry=https://npm.pkg.github.com
```

### 2. React 18+ is required

The minimum supported React version is now **18** (previously `>=16.3.0`), and the
library is validated against React 18 and 19. Update your render entry point to the
React 18+ root API:

```diff
- import { render } from "react-dom";
- render(<LazyLog url="http://example.log" />, document.getElementById("root"));
+ import { createRoot } from "react-dom/client";
+ createRoot(document.getElementById("root")).render(<LazyLog url="http://example.log" />);
```

### 3. ES module only (no CommonJS)

The package now ships as an **ES module only**. The old UMD/CommonJS bundle
(`build/index.js`) is gone, and `require()` is not supported.

```diff
- const { LazyLog } = require("react-lazylog");
+ import { LazyLog } from "@nsat/react-lazylog";
```

Modern bundlers (Vite, webpack 5, Rollup, esbuild) and native ESM environments
(including Node 18+) are supported.

### 4. Styles are now a separate stylesheet

Styles are no longer injected automatically; import the stylesheet once in your app
entry point:

```js
import "@nsat/react-lazylog/styles.css";
```

### 5. `react-virtualized` replaced with `react-window`

Internally, virtualization moved from the unmaintained `react-virtualized` to
`react-window` + `react-virtualized-auto-sizer`. Supported passthrough props such as
`rowHeight`, `overscanRowCount`, and `onScroll` continue to work. However, arbitrary
`react-virtualized` `List` props that were previously passed through are **no longer
supported** — most notably `scrollToAlignment`. If you relied on such props, remove
them.

### 6. Only `LazyLog` and `ScrollFollow` are exported

Internal sub-components (`Line`, `LineNumber`, `LineContent`, `LinePart`, etc.) are no
longer published as deep-import entry points. Code such as the following will no longer
resolve:

```diff
- import Line from "react-lazylog/build/Line";
- Line.defaultProps.style = { color: "green" };
```

Use the `style` / `containerStyle` props or CSS stylesheets (see [Styling](#styling))
instead.

### 7. `propTypes` removed in favor of TypeScript types

Runtime `propTypes` validation and the `prop-types` dependency were removed. Prop
contracts are now expressed as exported TypeScript interfaces — `LazyLogProps`,
`ScrollFollowProps`, and `WebsocketOptions` — giving you full compile-time checking
and editor IntelliSense:

```tsx
import { LazyLog, type LazyLogProps } from "@nsat/react-lazylog";

const props: LazyLogProps = { url: "http://example.log", enableSearch: true };
```

### 8. Behavior fixes to be aware of

These were latent bugs in v4 that are now fixed; they may subtly change behavior:

-   **Final line without a trailing newline** is now rendered as a single line
    (previously it was incorrectly split into one row per character).
-   **`ScrollFollow`** now preserves follow state set by scrolling and the
    `startFollowing` / `stopFollowing` helpers between renders, instead of resetting
    to the `startFollowing` prop on every render. It also now **re-enables following
    automatically when the user scrolls back to the bottom** (previously scrolling
    away disabled following permanently until re-enabled programmatically).
-   **ANSI reset codes** (`39`, `49`, `22`, `23`, `24`) now correctly clear the
    corresponding color/style.

## Development and Contributing

-   Fork and clone this repo.
-   Install the dependencies with `npm install`.
-   Start the Vite dev server with `npm run dev`, which serves the demo app.
    Open a browser to the URL printed in the terminal (default http://localhost:5173) to preview the components.
-   Use CTRL-C to exit the dev server.
-   Use `npm run build` to type-check and generate the compiled library (ES module + bundled type
    declarations) in `dist/` for publishing to npm.
-   Use `npm run build:demo` to produce a self-contained static demo site in `dist-demo/` (a single
    `index.html`), which is deployed to GitHub Pages via `.github/workflows/deploy-demo-pages.yml`.

### Tooling

This project uses **Vite** for both the library build (via `vite build`) and the demo app, **TypeScript 5**,
and targets **React 18/19**. Types are bundled into a single `dist/index.d.ts` by
[vite-plugin-dts](https://github.com/qmhc/vite-plugin-dts).
