import { createPortal } from 'react-dom';

// Renders children into <body> instead of in place.
//
// style.css has `main{ animation:questionIn .25s ease; }`, so every <main>
// carries a transform for the first 250ms after it mounts — and a transformed
// ancestor becomes the containing block for `position:fixed` descendants.
// A full-screen overlay nested inside <main> therefore sizes itself against
// <main>'s box rather than the viewport; the result modal collapsed to 36px
// wide when it opened during that window (a revisited case opens it on mount,
// so it hit this every time).
//
// The static pages avoid this by putting their overlays after </main>. This is
// the same thing, expressed in React: any fixed-position overlay in a page
// component should be wrapped in <Portal>.
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
