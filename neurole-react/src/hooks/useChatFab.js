import { useEffect, useRef } from 'react';

// Chat FAB: liquid-glass linger interaction.
//
// Port of initChatFabInteraction() in the static site's script.js, which walks
// the DOM once on DOMContentLoaded — a pattern that never fires for a React
// route that mounts later. Attach the returned ref to the .chat-fab button
// instead:
//
//   const fabRef = useChatFab();
//   <button ref={fabRef} className="chat-fab" …>
//
// Purely additive motion: a cursor-tracking glass highlight, a clamped
// magnetic pull, the delayed "linger" glow, and a ripple from wherever the
// cursor entered. Skipped entirely for pointer:coarse and reduced-motion.
const LINGER_DELAY = 400;   // ms of continuous hover before "linger" kicks in
const PULL_STRENGTH = 7;    // px of magnetic pull toward the cursor, max

export function useChatFab() {
  const ref = useRef(null);

  useEffect(() => {
    const fab = ref.current;
    if (!fab) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;

    let lingerTimer = null;

    const onMouseMove = (e) => {
      const rect = fab.getBoundingClientRect();
      const relX = e.clientX - rect.left, relY = e.clientY - rect.top;
      fab.style.setProperty('--fab-x', relX + 'px');
      fab.style.setProperty('--fab-y', relY + 'px');
      const dx = ((relX / rect.width) - 0.5) * PULL_STRENGTH * 2;
      const dy = ((relY / rect.height) - 0.5) * PULL_STRENGTH * 2;
      fab.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };

    const onMouseEnter = (e) => {
      clearTimeout(lingerTimer);
      lingerTimer = setTimeout(() => fab.classList.add('linger'), LINGER_DELAY);
      const rect = fab.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'fab-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      fab.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    };

    const onMouseLeave = () => {
      clearTimeout(lingerTimer);
      fab.classList.remove('linger');
      fab.style.transform = '';
    };

    fab.addEventListener('mousemove', onMouseMove);
    fab.addEventListener('mouseenter', onMouseEnter);
    fab.addEventListener('mouseleave', onMouseLeave);

    return () => {
      clearTimeout(lingerTimer);
      fab.removeEventListener('mousemove', onMouseMove);
      fab.removeEventListener('mouseenter', onMouseEnter);
      fab.removeEventListener('mouseleave', onMouseLeave);
      // Ripples outlive their animation if the route changes mid-flight.
      fab.querySelectorAll('.fab-ripple').forEach(el => el.remove());
    };
  }, []);

  return ref;
}

export default useChatFab;
