import { useEffect } from 'react';

// Sections and cards fade and rise as they enter the viewport. The hidden state
// lives in CSS under `html.reveal-ready` (see the SCROLL REVEAL block in
// style.css); main.jsx sets that class before the first render, and only when
// the visitor has not asked for reduced motion. This hook just decides when
// each element becomes visible.
//
// Targets are block-level and have no hover transform of their own.
// .partner-card and .rmodal-game-card are deliberately excluded: they lift on
// hover, and a .55s transform transition would make that feel like syrup.
//
// Nothing here may live inside a modal: a modal is display:none until opened,
// so the observer never fires for it and the card would open at opacity 0.
// That is why .sub-card is not on this list.
const REVEAL_SELECTOR = [
  '.factbox', '.home-game-card', '.game-card', '.stats-section',
  '.how-card', '.case-card', '.role-card', '.donate-card', '.contact-card',
  '.value-card', '.archive-card',
].join(',');

const DURATION = 550;
const STEP = 70;
const MAX_STEPS = 4;

// `key` re-runs the scan on route change, since each page mounts its own cards.
export function useScrollReveal(key) {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('reveal-ready')) return undefined;

    // Cards in the same row should arrive as a group rather than one long
    // queue, so the stagger is indexed within each parent and capped.
    const indexInParent = new Map();
    const perParent = new Map();
    const bound = new WeakSet();
    const touched = [];
    const timers = [];

    const reveal = (el) => {
      const delay = Math.min(indexInParent.get(el) || 0, MAX_STEPS) * STEP;
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add('is-revealed');
      // Clear only the delay once it has landed — leaving it set would lag
      // every later theme change on that card. `.is-revealed` has to stay: it
      // is what holds the element visible against the hidden state.
      timers.push(window.setTimeout(() => {
        el.style.transitionDelay = '';
        el.classList.add('reveal-done');
      }, DURATION + delay + 60));
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        reveal(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const observe = (el) => {
      // Anything already revealed stays put — re-observing would hide it again.
      if (bound.has(el) || el.classList.contains('is-revealed')
          || el.classList.contains('reveal-done')) return;
      bound.add(el);
      touched.push(el);
      const n = perParent.get(el.parentNode) || 0;
      indexInParent.set(el, n);
      perParent.set(el.parentNode, n + 1);
      io.observe(el);
    };

    const scan = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.matches && node.matches(REVEAL_SELECTOR)) observe(node);
      if (node.querySelectorAll) node.querySelectorAll(REVEAL_SELECTOR).forEach(observe);
    };

    scan(document.body);

    // Cards rendered after the effect runs — anything waiting on a fetch —
    // would otherwise be hidden by the CSS and never observed, leaving them
    // permanently invisible. Only added nodes are inspected, so this stays
    // cheap on pages that mutate a lot.
    const mo = new MutationObserver((records) => {
      records.forEach((rec) => rec.addedNodes.forEach(scan));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      timers.forEach(window.clearTimeout);
      // Anything still mid-transition when the route changes must not be left
      // stranded at opacity 0.
      touched.forEach((el) => {
        el.style.transitionDelay = '';
        el.classList.add('is-revealed', 'reveal-done');
      });
    };
  }, [key]);
}
