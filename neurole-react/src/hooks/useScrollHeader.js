import { useEffect } from 'react';

// Hide the fixed masthead on scroll down, bring it back on scroll up. The
// static site has had this for a while; `.masthead.hide` already existed in the
// shared stylesheet but nothing in the React port was ever adding the class, so
// the header just sat there.
export function useScrollHeader(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const mast = document.querySelector('.masthead');
    if (!mast) return undefined;

    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        // The 80px floor keeps the header put through the small bounce at the
        // top of the page.
        if (y > lastY && y > 80) mast.classList.add('hide');
        else mast.classList.remove('hide');
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      mast.classList.remove('hide');
    };
  }, [enabled]);
}
