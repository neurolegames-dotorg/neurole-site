import { useLayoutEffect } from 'react';

// Injects a page's original inline CSS as a <style> in <head> while the page is
// mounted, and removes it on unmount. This reproduces the per-document scoping
// of the original static HTML pages (each page carried its own <style> block),
// so pages that redefine shared selectors (.factbox, .page-hero, .start-screen…)
// don't leak styles into one another in the single-page app.
export function usePageStyle(css) {
  useLayoutEffect(() => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, [css]);
}
