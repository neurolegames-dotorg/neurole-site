import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listArticles } from '../lib/articles';

// The Articles link appears by itself as soon as the first .md file lands in
// src/content/articles/, and disappears if they are all removed — so
// publishing an article never needs a second edit here, and the nav never
// points at an empty page in the meantime.
const hasArticles = () => listArticles().length > 0;
import { useTheme } from '../hooks/useTheme';

// Icon tile colours for the drawer entries that have no artwork of their own,
// carried over from the client's design so the two stay in step.
const TILE = {
  imposter: '#6935A8',
  archive: '#C9982F',
  interactive: '#3A6EA5',
  about: '#5C5C66',
  volunteer: '#B8577A',
  donate: '#C1543F',
  contact: '#3A8A82',
  articles: '#4A6B8A',
  signin: '#2B2B38'
};

export default function Header({ onSignIn }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // The banner is a swappable file: drop a replacement at the same path and
  // bump the query string. If it is ever missing, the wordmark takes over
  // rather than leaving a broken image at the top of the drawer.
  const [bannerOk, setBannerOk] = useState(true);
  const overlayRef = useRef(null);
  const backdropRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const themeLabel = dark ? 'Switch to light mode' : 'Switch to dark mode';
  const themeGlyph = dark ? '☀' : '☾';

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && mobileOpen) closeMobile();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <Link to="/" className="brand">
            <img src="/neurole-logo.png" alt="Neurole logo" style={{ height: 40, width: 'auto', display: 'block' }} />
            <span className="brand-wordmark">Neurole</span>
          </Link>
          <nav className="nav-left">
            <Link to="/contact">Contact Us</Link>
            <Link to="/volunteer">Join Us</Link>
            <Link to="/donate">Donate</Link>
            <Link to="/about">About</Link>
            {hasArticles() && <Link to="/articles">Articles</Link>}
            <Link to="/interactive">Interactive<span className="beta-pill" style={{ marginLeft: 5 }}>Beta</span></Link>
            <button
              type="button"
              className={`theme-toggle-btn${dark ? ' is-dark' : ''}`}
              onClick={toggleTheme}
              aria-pressed={dark}
              aria-label={themeLabel}
              title={themeLabel}
            >{themeGlyph}</button>
            <button className="linklike" data-signin onClick={onSignIn}>Sign In</button>
          </nav>
          <button
            className={`hamburger-btn${mobileOpen ? ' is-open' : ''}`}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-overlay"
            onClick={mobileOpen ? closeMobile : openMobile}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      <div
        ref={backdropRef}
        className={`mobile-nav-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={closeMobile}
      ></div>

      <div
        ref={overlayRef}
        id="mobile-nav-overlay"
        className={`mobile-nav-overlay${mobileOpen ? ' open' : ''}`}
      >
        <button className="mobile-nav-close" aria-label="Close menu" onClick={closeMobile}>✕</button>
        <div className={`mobile-nav-brand${bannerOk ? ' has-banner' : ''}`}>
          {bannerOk ? (
            <img className="full-width" src="/play-neurole-banner.svg?v=1" alt="Play Neurole.org"
              width="380" height="150" onError={() => setBannerOk(false)} />
          ) : (
            <img src="/neurole-logo.png" alt="Neurole" style={{ height: 44, width: 'auto', display: 'block', margin: 0 }} />
          )}
        </div>
        <ul className="mobile-nav-items">
          {/* Games first. The drawer is the only navigation at every width —
              .nav-left is display:none — so leaving the games out of it meant
              there was no way to reach them from anywhere but the homepage. */}
          <li>
            <Link to="/daily-game" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon"><img src="/daily-case-icon.png" alt="" width="32" height="32" /></span>
                The Daily Case
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/neuroanatomy" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon"><img src="/map-brain-icon.png" alt="" width="32" height="32" /></span>
                Map the Brain
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/synapse" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon"><img src="/synapse-icon.png" alt="" width="32" height="32" /></span>
                The Synapse
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/imposter" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.imposter }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /><path d="M2 2l20 20" /></svg>
                </span>
                Imposter
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/archive" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.archive }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M10 13h4" /></svg>
                </span>
                Case Archive
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/interactive" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.interactive }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>
                </span>
                Interactive<span className="beta-pill" style={{ marginLeft: 5 }}>Beta</span>
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          {hasArticles() && (
            <li>
              <Link to="/articles" onClick={closeMobile}>
                <span className="nav-item-left">
                  <span className="nav-item-icon" style={{ background: TILE.articles }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" /><path d="M17 8h3v10a2 2 0 0 1-2 2" /><path d="M8 8h5M8 12h5M8 16h3" /></svg>
                  </span>
                  Articles
                </span>
                <span className="nav-arrow">›</span>
              </Link>
            </li>
          )}
          <li>
            <Link to="/about" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.about }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="7.5" r="0.6" fill="#fff" stroke="none" /></svg>
                </span>
                About
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/volunteer" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.volunteer }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </span>
                Join Us
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/donate" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.donate }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
                </span>
                Donate
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <Link to="/contact" onClick={closeMobile}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.contact }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                </span>
                Contact Us
              </span>
              <span className="nav-arrow">›</span>
            </Link>
          </li>
          <li>
            <button className="nav-tab-btn" data-signin onClick={() => { closeMobile(); if (onSignIn) onSignIn(); }}>
              <span className="nav-item-left">
                <span className="nav-item-icon" style={{ background: TILE.signin }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
                </span>
                Sign In
              </span>
              <span className="nav-arrow">›</span>
            </button>
          </li>
          <li className="theme-toggle-mobile-item">
            <button
              type="button"
              className={`theme-toggle-btn${dark ? ' is-dark' : ''}`}
              onClick={toggleTheme}
              aria-pressed={dark}
              aria-label={themeLabel}
              title={themeLabel}
            >{themeGlyph}</button>
          </li>
        </ul>
      </div>
    </>
  );
}
