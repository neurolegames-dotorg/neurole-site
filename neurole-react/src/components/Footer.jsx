import { Link } from 'react-router-dom';
import NEUROLE_CONFIG from '../config';
import { listArticles } from '../lib/articles';

// Mirrors the .footer-grid markup the client shipped to the static site.
// The Articles entry follows the same rule as the nav: it appears only once
// at least one article exists, so an empty articles/ folder never leaves a
// dead link in the footer.
export default function Footer({ onSubscribe }) {
  const hasArticles = listArticles().length > 0;

  return (
    <footer id="footer-contact">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-about">
            <p className="footer-about-name">Neurole</p>
            <p className="footer-about-blurb">
              A free daily neuroscience game for students, clinicians, and anyone
              curious how the brain works.
            </p>
            <button type="button" className="footer-about-cta" onClick={onSubscribe}>
              Get the daily reminder →
            </button>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">Games</p>
            <Link to="/daily-game">The Daily Case</Link>
            <Link to="/neuroanatomy">Map the Brain</Link>
            <Link to="/synapse">Synapse</Link>
            <Link to="/imposter">Imposter</Link>
            <Link to="/archive">Case Archive</Link>
            <Link to="/interactive">
              Interactive <span className="beta-pill" style={{ marginLeft: 4 }}>Beta</span>
            </Link>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">Get Involved</p>
            <Link to="/volunteer">Join Us</Link>
            <Link to="/volunteer#create-a-case">Create a Case</Link>
            <Link to="/donate">Donate</Link>
            <Link to="/contact">Contact Us</Link>
          </div>

          <div className="footer-col">
            <p className="footer-col-title">Learn More</p>
            <Link to="/about">About Neurole</Link>
            {hasArticles && <Link to="/articles">Articles</Link>}
            <Link to="/volunteer">Volunteer</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>

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
        <p className="footer-fine">
          © 2026 Neurole. Games for your brain. ·{' '}
          <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link> ·{' '}
          <Link to="/terms" style={{ color: 'inherit' }}>Terms</Link>
        </p>
      </div>
    </footer>
  );
}
