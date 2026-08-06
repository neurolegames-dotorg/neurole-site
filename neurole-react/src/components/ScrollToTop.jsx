import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Every navigation on the static site is a full page load, so the browser
// starts each page at the top and jumps to #anchors by itself. The SPA keeps
// the scroll position instead — clicking a footer link at the bottom of a long
// page lands the reader halfway down the next one. This restores all three
// behaviours:
//
//   • #anchor         → scroll to it, however we got here
//   • new navigation  → top of the page
//   • back / forward  → left to the browser's own scroll restoration
//
// Two things to know before changing any of this:
//
// 1. style.css sets `html{scroll-behavior:smooth}`, which applies to
//    programmatic scrolls too. Every call below therefore passes an explicit
//    `behavior`, or a route change animates its way to the top instead of
//    starting there — and animated scrolls are dropped outright while a tab is
//    in the background, so it can silently do nothing at all.
//
// 2. The anchor case is not gated on navigation type. Opening
//    /volunteer#create-a-case in a fresh tab is a POP, and the browser's own
//    jump has already failed by then because React hasn't rendered the target.

// Frames to keep looking for a target that hasn't rendered yet.
const ANCHOR_RETRIES = 10;
// How long to keep re-asserting the position afterwards. The first landing is
// measured against a layout that hasn't settled — usePageStyle injects the
// page's stylesheet, webfonts reflow the text above the anchor, images take up
// their space — all of which move the target out from under the reader.
const SETTLE_MS = 600;

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let frame, tries = 0, cancelled = false, settleUntil = 0;

      // Position by hand rather than scrollIntoView: this has to re-run as the
      // layout settles, and repeated scrollIntoView calls fight the smooth
      // animation from CSS instead of correcting it.
      const align = (el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: 'instant' });
      };

      const settle = (el) => {
        if (cancelled) return;
        align(el);
        if (performance.now() < settleUntil) frame = requestAnimationFrame(() => settle(el));
      };

      const find = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (!el) {
          if (++tries < ANCHOR_RETRIES) frame = requestAnimationFrame(find);
          return;
        }
        settleUntil = performance.now() + SETTLE_MS;
        settle(el);
      };

      frame = requestAnimationFrame(find);
      return () => { cancelled = true; cancelAnimationFrame(frame); };
    }

    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);

  return null;
}
