import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function Header({ onSignIn }) {
  const [mobileOpen, setMobileOpen] = useState(false);
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
            <Link to="/interactive">Interactive<span className="beta-pill" style={{ marginLeft: 5 }}>Beta</span></Link>
            <Link to="/interactive/brain-lab" style={{ fontSize: 11.5 }}>Brain Lab<span className="beta-pill" style={{ marginLeft: 5 }}>3D</span></Link>
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
        className={`mobile-nav-overlay${mobileOpen ? ' open' : ''}`}
      >
        <button className="mobile-nav-close" aria-label="Close menu" onClick={closeMobile}>✕</button>
        <div className="mobile-nav-brand">
          <img src="/neurole-logo.png" alt="Neurole" style={{ height: 44, width: 'auto', display: 'block', margin: 0 }} />
        </div>
        <ul className="mobile-nav-items">
          <li><Link to="/contact" onClick={closeMobile}>Contact Us <span className="nav-arrow">›</span></Link></li>
          <li><Link to="/volunteer" onClick={closeMobile}>Join Us <span className="nav-arrow">›</span></Link></li>
          <li><Link to="/donate" onClick={closeMobile}>Donate <span className="nav-arrow">›</span></Link></li>
          <li><Link to="/about" onClick={closeMobile}>About <span className="nav-arrow">›</span></Link></li>
          <li><Link to="/interactive" onClick={closeMobile}>Interactive<span className="beta-pill" style={{ marginLeft: 5 }}>Beta</span> <span className="nav-arrow">›</span></Link></li>
          <li><Link to="/interactive/brain-lab" onClick={closeMobile}>Brain Lab<span className="beta-pill" style={{ marginLeft: 5 }}>3D</span> <span className="nav-arrow">›</span></Link></li>
          <li><button className="nav-tab-btn" data-signin onClick={() => { closeMobile(); if (onSignIn) onSignIn(); }}>Sign In <span className="nav-arrow">›</span></button></li>
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
