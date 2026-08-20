import { useEffect } from 'react';

// Holds the page still while an overlay is open.
//
// Without this the page behind a modal keeps scrolling under the pointer and
// the wheel, which on a phone reads as the modal having lost its place — you
// dismiss it and find yourself somewhere else on the page. The drawer already
// did this; the modals did not, so the two behaved differently.
//
// Locks are counted rather than set and cleared. The result popup can open on
// top of an already-locked page, and a plain set/clear pair would have the
// first overlay to close release the scroll for both.
let locks = 0;
let previousOverflow = '';

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
