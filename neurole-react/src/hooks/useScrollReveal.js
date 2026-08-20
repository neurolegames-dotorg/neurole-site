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
// How long to wait for the observer to prove it works before giving up on the
// animation and simply showing the page.
const FAILSAFE_MS = 4000;

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
      // Proof that the observer works — the failsafe below stands down.
      document.documentElement.classList.add('reveal-running');
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

    // Failsafe. The hidden state is applied by CSS the moment `reveal-ready`
    // is set, and only this observer ever takes it off again — so anything
    // that stops the observer firing does not degrade the animation, it makes
    // the content permanently invisible. Verified reachable: with the tab
    // occluded, an IntersectionObserver over a card sitting well inside a
    // 1536x730 viewport produced no callback at all, and every one of the
    // archive's 41 cards stayed at opacity 0.
    //
    // So: if nothing at all has revealed within a few seconds, assume the
    // observer is not going to fire and drop the gate, which makes everything
    // visible at once. A missed animation is a far smaller failure than a
    // blank page.
    //
    // The clock starts only once the page is actually being looked at. A tab
    // opened in the background can sit unobserved for minutes, and burning the
    // effect there would punish exactly the visitors who never saw the problem.
    let settled = false;
    let failsafeTimer = 0;
    const dropGate = () => {
      if (settled) return;
      settled = true;
      if (!root.classList.contains('reveal-running')) root.classList.remove('reveal-ready');
    };
    const armFailsafe = () => {
      window.clearTimeout(failsafeTimer);
      failsafeTimer = window.setTimeout(dropGate, FAILSAFE_MS);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') armFailsafe(); };
    if (document.visibilityState === 'visible') armFailsafe();
    document.addEventListener('visibilitychange', onVisible);

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
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(failsafeTimer);
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
