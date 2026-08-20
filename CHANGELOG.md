# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.0]

This is a major modernization release. The package is now published under the
`@nsat` scope, targets React 18/19, is built with Vite, and ships bundled type
declarations. It also replaces the unmaintained `react-virtualized` dependency.

### Changed

- **Default color scheme is now the Spire brand palette.** The log-viewer (and search
  bar) background is **Spire Dark** (`#04060f`), and ANSI colors, line highlighting,
  and search matches use the Spire **BU color scheme** (e.g. red → Altitude Change
  `#c85a3d`, green → Mindful Green `#00806c`, blue → Calypso Wave `#2280c5`, cyan →
  Equatorial Aqua `#00adca`, magenta → Vast Violet `#80146e`; highlighted lines use
  Black Sapphire `#0f447a`; active search match uses Spire Red `#be0000`).
- **All themeable colors are now CSS custom properties** (e.g. `--lazylog-background`,
  `--lazylog-color-red`, `--lazylog-search-match-background`) scoped to `.react-lazylog`
  and `.react-lazylog-searchbar`, so consumers can re-theme the viewer without
  overriding internal class names. See the README "Styling" section.
- **BREAKING: Package renamed to `@nsat/react-lazylog`.** Update imports from
  `react-lazylog` to `@nsat/react-lazylog`. The package is published to the
  GitHub Packages registry (`https://npm.pkg.github.com/`).
- **BREAKING: Distribution format is now an ES module.** The package `main`,
  `module`, and `exports` now point at `dist/index.js` (ESM). The old UMD/CommonJS
  bundle (`build/index.js`) is no longer produced. CommonJS `require()` is not
  supported.
- **BREAKING: Runtime `propTypes` validation was removed** in favor of the shipped
  TypeScript types. The `prop-types` dependency has been dropped. Component prop
  contracts are now expressed as exported TypeScript interfaces (e.g. `LazyLogProps`,
  `ScrollFollowProps`), giving consumers full compile-time checking and IntelliSense.
- **BREAKING: Styles are shipped as a separate stylesheet.** Consumers must now
  import the CSS once in their app:
  ```js
  import "@nsat/react-lazylog/styles.css";
  ```
- **BREAKING: React 18 is now the minimum supported version.** `peerDependencies`
  changed from `react: >=16.3.0` to `react: >=18.0.0` and `react-dom: >=18.0.0`.
  Render examples updated to use `createRoot` instead of `ReactDOM.render`.
- **BREAKING: Replaced `react-virtualized` with `react-window` +
  `react-virtualized-auto-sizer`** for row virtualization. The public `<LazyLog />`
  and `<ScrollFollow />` component APIs are unchanged, but any code that relied on
  passing through arbitrary `react-virtualized` `List` props (e.g. `scrollToAlignment`)
  will need to be revisited. Supported passthrough props such as `rowHeight`,
  `overscanRowCount`, and `onScroll` continue to work.
- Migrated the build toolchain from **webpack to Vite**. `npm run build` now
  type-checks with `tsc` and bundles with Vite; the demo builds via
  `npm run build:demo`.
- Upgraded to **TypeScript 5** and enabled `strict` mode across the library.
  Internal modules and components are now properly typed (previously largely `any`).
- Upgraded all dependencies to their latest major versions (TypeScript intentionally
  held at v5 due to v7 incompatibilities), including `immutable` 5, `hotkeys-js` 4,
  `react-string-replace` 2, `react-window` 2, `react-virtualized-auto-sizer` 2,
  and Vite 8.

### Added

- **The demo UI now uses the Spire core brand palette** (Spire Dark, Spire Red, and
  the Spire grey scale), exposed as Tailwind theme tokens (`bg-spire-dark`,
  `text-spire-red`, `border-spire-grey-1`, etc.) in the demo's `index.css`.
- **`ScrollFollow` now automatically resumes following when the user scrolls back
  to the bottom.** Previously scrolling away turned following off permanently until
  re-enabled programmatically; `handleScroll` is now symmetric — it disables follow
  when the user scrolls away from the bottom and re-enables it when they scroll back
  to (near) the bottom.
- **Comprehensive demo application** showcasing basic text logs, ANSI colorization,
  search, line highlighting, and streaming with `ScrollFollow`. Builds to a
  self-contained single-file static site (`dist-demo/index.html`) suitable for
  GitHub Pages, deployed via `.github/workflows/deploy-demo-pages.yml`.
- **Vitest test suite** (with React Testing Library and jsdom) covering `utils`,
  `encoding`, `search`, `ansiparse`, `LazyLog`, and `ScrollFollow`. Run with
  `npm test` (and `npm run test:watch`).
- Bundled TypeScript declarations: a single `dist/index.d.ts` is generated via
  `vite-plugin-dts` + `@microsoft/api-extractor`, and `react`/`react-dom` are
  externalized from the bundle.
- A `styles.css` package export alias for the compiled stylesheet.

### Fixed

- **Search matches are highlighted again.** After migrating to `react-window` 2,
  rows are memoized and only re-render when their `rowProps` change. Search,
  highlight, and filter state was read from component state via closure and never
  threaded through `rowProps`, so matched rows never re-rendered and no highlight
  spans appeared. The relevant state is now passed via `rowProps`.
- **`follow` / `ScrollFollow` works correctly again.** Several problems were fixed:
  - **The view no longer jumps back to the top on every new line.** For the `text`
    prop path, `getDerivedStateFromProps` reset `lines`/`count` to empty on every
    change, so the virtualized list briefly rendered 0 rows — which unmounted
    react-window and reset the scroll to the top on each streamed line. The `text`
    path now replaces the parsed lines in a single commit (`handleTextUpdate`)
    without emptying the list first, keeping react-window mounted and its scroll
    position intact.
  - The `LazyLog` `onScroll` prop was never forwarded to the consumer after the
    `react-window` 2 migration (the handler only updated internal `scrollTop`), so
    `ScrollFollow` never learned when the user scrolled away and following could not
    be turned off. The scroll event's `{ scrollTop, scrollHeight, clientHeight }` is
    now forwarded to `props.onScroll`.
  - The follow scroll used `align: "start"`, pinning the newest line to the top; it
    now uses `align: "end"` so the newest line stays at the bottom of the viewport.
  - `ScrollFollow.handleScroll` now uses a small bottom-distance tolerance instead of
    an exact equality check, so sub-pixel rounding from programmatic follow scrolls no
    longer accidentally disables following.
- **Trailing line without a newline is no longer split into one row per character.**
  When log content did not end in a newline, the final partial line (a `Uint8Array`)
  was passed to `Immutable.List.concat`, which spread it into individual bytes so
  each character rendered as its own line. It is now appended as a single line via
  `List.push`. Affects both the `text` prop path (`LazyLog`) and the non-streaming
  `request` path.
- **`ScrollFollow` now respects internal follow state between prop changes.**
  `getDerivedStateFromProps` previously re-derived `follow` from the `startFollowing`
  prop on every render, clobbering updates made by scrolling away from the bottom or
  by the `startFollowing`/`stopFollowing` helpers. It now only syncs `follow` from
  the prop when the `startFollowing` prop value actually changes.
- Corrected ANSI reset handling in the parser: reset/formatting codes (`39`, `49`,
  `22`, `23`, `24`) were compared as numbers against string tokens and therefore never
  matched (dead code). They are now compared as strings so foreground/background and
  bold/italic/underline resets take effect as specified by the ANSI standard.
- Added null-safety for `response.body` in the streaming reader and typed HTTP error
  objects with an optional `status` field.
- **Runtime dependencies are no longer bundled into the published package.** Previously
  only `react`/`react-dom` were externalized, so `immutable`, `mitt`, `hotkeys-js`,
  `react-string-replace`, `react-window`, and `react-virtualized-auto-sizer` were
  inlined into `dist/index.js`. They are now all externalized, which avoids duplicate
  copies in consumer bundles and preserves package singletons (e.g. a single
  `immutable` instance across the boundary). The published bundle shrank from ~165 kB
  to ~31 kB.
- **Fixed native ESM import compatibility.** The library used `self.fetch` at module
  evaluation time, which threw `ReferenceError: self is not defined` when imported in
  Node/SSR contexts. It now uses `globalThis.fetch`, which works in browsers, Node 18+,
  and web workers.
- Added a `default` condition to the package `exports` map so non-`import` resolvers
  fall back to the ESM entry instead of failing with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

[Unreleased]: https://github.com/nsat/react-lazylog/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/nsat/react-lazylog/releases/tag/v5.0.0
