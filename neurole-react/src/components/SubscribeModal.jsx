import { useState, useRef } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function SubscribeModal({ open, onClose }) {
  useBodyScrollLock(open);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    try {
      const res = await fetch(formRef.current.action, {
        method: 'POST',
        body: new FormData(formRef.current),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        setSuccess(true);
        formRef.current.style.display = 'none';
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      id="reminder-signup-modal"
      className={open ? 'open' : ''}
      onClick={handleBackdrop}
    >
      <div className="sub-card">
        <div className="sub-top" style={{ background: '#1a1a1a', padding: '28px 28px 22px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', margin: '0 0 8px' }}>Neurole</p>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-.01em' }}>Daily Brain Case</h3>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: 'rgba(255,255,255,.65)', margin: 0, lineHeight: 1.6 }}>One email every morning — today's neurological case, ready to play.</p>
        </div>
        <div className="sub-body" style={{ padding: '24px 28px 26px', background: '#fff' }}>
          <form ref={formRef} id="sub-form" action="https://formspree.io/f/maqgkjlr" method="POST" onSubmit={handleSubmit}>
            <input type="hidden" name="_subject" value="Neurole — Daily case subscriber" />
            <input type="hidden" name="type" value="daily_subscriber" />
            <div className="field">
              <label style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Email address</label>
              <input type="email" name="email" placeholder="you@example.com" required autoComplete="email"
                style={{ width: '100%', padding: '12px 14px', fontFamily: "'Outfit', sans-serif", fontSize: 15, border: '1.5px solid var(--rule)', borderRadius: 6, boxSizing: 'border-box' }} />
            </div>
            <button className="btn sub-submit" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', background: '#1a1a1a', borderRadius: 6, fontSize: 14, padding: 13, marginTop: 2, letterSpacing: '.03em' }}>
              {submitting ? 'Subscribing…' : 'Continue'}
            </button>
            <p id="sub-success-msg" style={{ display: success ? 'block' : 'none', textAlign: 'center', fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: '#3a7d5a', marginTop: 12 }}>✓ You're in. See you tomorrow morning.</p>
          </form>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.6 }}>No spam, unsubscribe any time.</p>
          <button className="sub-close-text" onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 8, background: 'none', border: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)', cursor: 'pointer', padding: 4, textAlign: 'center' }}>Not now</button>
        </div>
      </div>
    </div>
  );
}
