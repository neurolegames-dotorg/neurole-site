import { useEffect, useState } from 'react';
import { renderGoogleSignIn, googleSignInState } from '../utils/helpers';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const GSI_CONTAINER = 'signin-google-container';

export default function SignInModal({ open, onClose }) {
  const [signedIn, setSignedIn] = useState(googleSignInState.signedIn);
  useBodyScrollLock(open);

  // The header modal was never wired to renderGoogleSignIn during the React
  // port (the static site did it in script.js), so the container below the
  // "or" divider stayed empty and there was no way to sign in from the header.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // The GSI script in index.html is async+defer, so on a cold load it can
    // still be in flight when the modal opens. Without this wait,
    // renderGoogleSignIn sees `google` undefined and renders its
    // "couldn't load Google Sign-In" error even though nothing is wrong.
    let tries = 0;
    (function waitForGsi() {
      if (cancelled) return;
      const ready = typeof window.google !== 'undefined' && window.google.accounts;
      if (ready || tries++ > 30) {
        renderGoogleSignIn(GSI_CONTAINER, (state) => {
          if (!cancelled) setSignedIn(!!state.signedIn);
        });
        return;
      }
      setTimeout(waitForGsi, 100);
    })();

    return () => {
      cancelled = true;
      // Google renders an iframe into the container; leaving it mounted means
      // the next open stacks a second button on top of the first.
      const el = document.getElementById(GSI_CONTAINER);
      if (el) el.innerHTML = '';
    };
  }, [open]);

  const firstName = googleSignInState.name ? googleSignInState.name.split(' ')[0] : '';

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} id="signin-modal">
      <div className="modal" style={{ maxWidth: 480, padding: '48px 40px 40px', textAlign: 'center' }}>
        <button className="close" data-close onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)', lineHeight: 1 }}>✕</button>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, letterSpacing: '.02em', marginBottom: 22 }}>Neurole</div>

        {signedIn ? (
          <>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-.01em' }}>
              You&rsquo;re signed in{firstName ? `, ${firstName}` : ''}
            </h3>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 22px', lineHeight: 1.6 }}>
              {googleSignInState.email}
            </p>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#111', borderRadius: 6, fontSize: 15, padding: 14 }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 600, margin: '0 0 22px', letterSpacing: '-.01em' }}>Log in or create an account</h3>
            <div className="field" style={{ marginBottom: 12, textAlign: 'left' }}>
              <label style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Email address</label>
              <input type="email" id="signin-email" placeholder="" style={{ width: '100%', padding: '12px 14px', fontSize: 16, border: '1.5px solid var(--rule)', borderRadius: 6, fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box', marginTop: 4 }} />
            </div>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', background: '#111', borderRadius: 6, fontSize: 15, padding: 14, marginBottom: 14 }} onClick={onClose}>Continue</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}></div>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}></div>
            </div>
            <div id={GSI_CONTAINER} style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}></div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'var(--ink-soft)', margin: '14px 0 0', lineHeight: 1.6 }}>By continuing, you agree to Neurole&rsquo;s <a href="#" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Terms</a> and <a href="#" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Privacy Policy</a>.</p>
          </>
        )}
      </div>
    </div>
  );
}
