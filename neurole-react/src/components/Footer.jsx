import { Link } from 'react-router-dom';
import NEUROLE_CONFIG from '../config';

export default function Footer({ onSubscribe }) {
  return (
    <footer id="footer-contact">
      <div className="wrap">
        <div className="social-row">
          <a href={NEUROLE_CONFIG.SOCIAL.instagram} id="social-instagram" aria-label="Instagram" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href={NEUROLE_CONFIG.SOCIAL.email} id="social-email" aria-label="Email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <path d="M3 7l9 6 9-6"/>
            </svg>
          </a>
          <a href={NEUROLE_CONFIG.SOCIAL.youtube} id="social-youtube" aria-label="YouTube" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2.5" y="6" width="19" height="12" rx="4"/>
              <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
        <p className="footer-fine">© 2026 Neurole. Games for your brain.</p>
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 14, marginTop: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '4px 0' }}>
          <Link to="/contact" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', padding: '0 10px', borderRight: '1px solid rgba(0,0,0,.15)', lineHeight: 1.2 }}>Contact Us</Link>
          <Link to="/about" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', padding: '0 10px', borderRight: '1px solid rgba(0,0,0,.15)', lineHeight: 1.2 }}>About</Link>
          <Link to="/donate" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', padding: '0 10px', borderRight: '1px solid rgba(0,0,0,.15)', lineHeight: 1.2 }}>Donate</Link>
          <button onClick={onSubscribe} style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', padding: '0 10px', lineHeight: 1.2, background: 'none', border: 'none', cursor: 'pointer' }}>Subscribe</button>
        </div>
      </div>
    </footer>
  );
}
