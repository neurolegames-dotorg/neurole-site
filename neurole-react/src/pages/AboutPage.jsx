import pageStyle from './styles/AboutPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { Link } from 'react-router-dom'

/* SEO: description="Neurole is a free educational neuroscience games platform built for students, clinicians, and curious minds worldwide." */
/* OG: title="About Neurole", url="https://neurole.org/about.html", image="https://neurole.org//neurole-logo.png" */
/* Twitter: title="About Neurole" */

// Roster shown in the Contributors panel, mirroring the static site's about page.
const CONTRIBUTORS = [
  { name: 'Reva Shrestha', role: 'Founder' },
  { name: 'Arnesh Mohanty', role: 'Contributor' },
  { name: 'Matt Gresham', role: 'Contributor' },
  { name: 'Nima Gholipour', role: 'Contributor' },
  { name: 'Shritha Repala', role: 'Contributor' },
  { name: 'Suleyman Akkaya', role: 'Contributor' },
];

export default function AboutPage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: "About Neurole — Free Neuroscience Education Platform",
    description: "Neurole is a free, volunteer-built neuroscience education platform — daily diagnosis puzzles and neuroanatomy quizzes for pre-med, nursing, and medical students, and clinicians worldwide.",
    canonical: "/about",
  });
  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
        <h1>About Neurole</h1>
        <p>Why we built games for your brain — and what we believe about learning neuroscience.</p>
      </div></div>

      <main className="wrap" style={{ padding: '36px 0 70px', maxWidth: 820 }}>
        <div className="panel" style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0, fontSize: 22 }}>Our mission</h3>
          <p style={{ fontSize: 16, lineHeight: 1.75 }}>Neurole is a free educational platform aimed at teaching others about the human brain through games. With games in neurology and neuroanatomy, our team of students and professionals work towards creating games about your brain.</p>
        </div>

        <h3 style={{ fontFamily: 'var(--serif-display)', fontSize: 20, marginBottom: 4 }}>What we believe</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, marginTop: 0 }}>Four principles that shape every decision we make.</p>
        <div className="about-values">
          <div className="value-card">
            <div className="val-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a4 4 0 0 0-4 4c0 1-.5 1.5-1 2a3 3 0 0 0 1 5.5V17a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-2.5a3 3 0 0 0 1-5.5c-.5-.5-1-1-1-2a4 4 0 0 0-4-4Z" /><path d="M10 21h4" /></svg></div>
            <h4>Curiosity first</h4>
            <p>The best way to learn neuroscience is to be genuinely curious about it. We build experiences that make you want to know more.</p>
          </div>
          <div className="value-card">
            <div className="val-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg></div>
            <h4>Accuracy matters</h4>
            <p>Every case and region is reviewed against real clinical and scientific sources. If something's wrong, we want to know.</p>
          </div>
          <div className="value-card">
            <div className="val-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" /></svg></div>
            <h4>Free forever</h4>
            <p>Neurole is and always will be free. Great science education shouldn't be behind a paywall.</p>
          </div>
          <div className="value-card">
            <div className="val-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
            <h4>Built with the community</h4>
            <p>The people who use Neurole are also the ones who help build it — clinicians, students, and curious minds alike.</p>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--serif-display)', fontSize: 20, margin: '32px 0 4px' }}>Contributors</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, marginTop: 0, marginBottom: 20 }}>The people behind Neurole.</p>
        <div className="panel contributor-panel" style={{ marginBottom: 24 }}>
          {CONTRIBUTORS.map(({ name, role }) => (
            <div className="contributor-row" key={name}>
              <span className="contributor-name">{name}</span>
              <span className="contributor-role">{role}</span>
            </div>
          ))}
        </div>

        <div className="synapse-rule" style={{ margin: '36px 0 28px' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <h3 style={{ fontFamily: 'var(--serif-display)', fontSize: 20, marginBottom: 8 }}>Get involved</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, marginTop: 0, marginBottom: 20 }}>Have a case idea, spotted an error, or want to help build the next game? We'd love to hear from you.</p>
        <div className="about-cta-row">
          <Link className="btn" to="/volunteer">Join Us →</Link>
          <Link className="btn ghost" to="/contact">Contact Us →</Link>
        </div>

        <div className="synapse-rule" style={{ margin: '36px 0 28px' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <div className="panel" style={{ background: 'var(--paper-deep)' }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 20, marginTop: 0 }}>Find Neurole</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 14 }}>Neurole is a free neuroanatomy quiz, neurology diagnosis game, and neuroscience study tool. If you searched for any of these, you're in the right place:</p>
          <div className="seo-tags">
            <span className="seo-tag">Neuroscience games</span>
            <span className="seo-tag">Neuroanatomy quiz</span>
            <span className="seo-tag">Free brain quiz</span>
            <span className="seo-tag">Neurology game</span>
            <span className="seo-tag">Pre-med study tools</span>
            <span className="seo-tag">Medical student games</span>
            <span className="seo-tag">Brain region identification</span>
            <span className="seo-tag">Neurology diagnosis practice</span>
            <span className="seo-tag">Free neuroscience quiz</span>
          </div>
        </div>

        <div className="synapse-rule" style={{ margin: '36px 0 28px' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

        <span className="section-eyebrow">Partnerships</span>
        <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 20, margin: '0 0 8px' }}>Working with organizations who share our mission</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, margin: '0 0 6px', maxWidth: 560 }}>Neurole partners with universities, student groups, and neuroscience organizations to expand free access to brain science education.</p>
        <div className="partner-grid">
          <a className="partner-card partner-card-logo" href="https://www.the-neuroseed-foundation.org" target="_blank" rel="noopener">
            <img src="https://primary.jwwb.nl/public/s/t/p/temp-tssbucrnphjkszleoicx/neuroseed-1-high-74ru4t.png?enable-io=true&enable=upscale&height=200" alt="The NeuroSeed Foundation" />
          </a>
          <div className="partner-card">Your Org Here</div>
          <div className="partner-card">Your Org Here</div>
          <div className="partner-card">Your Org Here</div>
        </div>
        <Link className="btn ghost" to="/contact" style={{ marginTop: 18, display: 'inline-flex' }}>Become a Partner →</Link>
      </main>
    </>
  )
}
