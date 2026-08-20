`ScrollFollow` is a higher-order component (HOC) that aims to simplify
toggling a `LazyLog`'s "follow" functionality based on user scrolling.
The `ScrollFollow` component accepts a render prop function which should return a
component to render based on the function's arguments.

While following, the view stays pinned to the newest line as content streams in.
Auto-following is disabled automatically when the user scrolls up (away from the
bottom) and re-enabled automatically when the user scrolls back down to the bottom.

```js
import { LazyLog } from "..";
const url = "https://runkit.io/eliperelman/streaming-endpoint/branches/master";

<div style={{ height: 500, width: 902 }}>
  <ScrollFollow
    startFollowing
    render={({ onScroll, follow, startFollowing, stopFollowing }) => (
      <LazyLog extraLines={1} enableSearch url={url} stream onScroll={onScroll} follow={follow} />
    )}
  />
</div>
```
