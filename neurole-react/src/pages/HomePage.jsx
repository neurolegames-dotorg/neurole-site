import pageStyle from './styles/HomePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadFunFact } from '../utils/helpers';

function HomePage() {
  usePageStyle(pageStyle);
  const [funFact, setFunFact] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadFunFact().then(setFunFact).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('neurole_daily_'));
      if (keys.length > 0) {
        let s = 0;
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        for (let i = 0; i < 60; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = 'neurole_daily_' + d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const saved = localStorage.getItem(key);
          if (saved && JSON.parse(saved).won) { s++; } else if (i > 0) { break; }
        }
        if (s > 0) setStreak(s);
      }
    } catch { /* ignored: storage/API unavailable */ }
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-img-wrap" role="img" aria-label="Magnified purple neurons connected by branching dendrites">
          <div className="hero-bg-image"></div>
          <div className="hero-fade"></div>
          <div className="hero-text">
            <h1>Neurole</h1>
            <p>Games about your brain</p>
          </div>
        </div>
      </section>

      <main>

        <div className="wrap" style={{ marginTop: 52 }}>
          <span className="section-eyebrow">Weekly Neuroscience Fun Fact</span>
          <div className="factbox" id="fun-fact-box">
            {funFact ? (
              <>
                <p className="fact-text">{funFact.fact}</p>
                <span className="cite">Source: <a className="fact-link" href={funFact.link} target="_blank" rel="noopener">{funFact.source || '—'}</a></span>
              </>
            ) : (
              <p className="fact-text">Loading this week's fact…</p>
            )}
          </div>
        </div>

        <section className="games-spotlight">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <span className="eyebrow-pill">Play Today — It's Free</span>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900 }}>Train your brain.<br />One game at a time.</h2>
            <p className="sub">A new neurological case every day. Identify brain regions on demand. Both free, forever — no sign-up needed.</p>

            <div className="home-games-grid">

              <Link className="home-game-card" to="/daily-game">
                <div className="home-game-card-stripe"></div>
                <div className="home-game-card-body">
                  <div className="game-card-icon-wrap">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B2635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,12 5,12 7,5 9,19 11,9 13,15 15,12 22,12" />
                    </svg>
                  </div>
                  <span className="game-card-badge">{'\uD83E\uDD7A'} Daily · Diagnostic</span>
                  <h3>The Daily Case</h3>
                  <p>A new patient walks in every day. Read the symptoms and guess the neurological diagnosis — five tries, then the answer is revealed. Resets at midnight ET.</p>
                  {streak > 0 && (
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--neuro-blue-deep)', background: 'rgba(107,79,148,.08)', padding: '5px 12px', borderRadius: 20, alignSelf: 'flex-start' }}>
                      {'\uD83D\uDD25'} {streak}-day streak
                    </div>
                  )}
                  <span className="play-cta">Play today's case →</span>
                </div>
              </Link>

              <Link className="home-game-card" to="/neuroanatomy">
                <div className="home-game-card-stripe home-game-card-stripe--purple"></div>
                <div className="home-game-card-body">
                  <div className="game-card-icon-wrap">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6B4F94" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
                      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" /><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
                      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" /><path d="M19.938 10.5a4 4 0 0 1 .585.396" />
                      <path d="M6 18a4 4 0 0 1-1.967-.516" /><path d="M19.967 17.484A4 4 0 0 1 18 18" />
                    </svg>
                  </div>
                  <span className="game-card-badge">{'\uD83E\uDDE0'} Untimed · Visual</span>
                  <h3>Map the Brain</h3>
                  <p>A brain image appears. Pick the highlighted region from four choices, then ask the AI tutor to explain what it does — and what happens when it's damaged.</p>
                  <span className="play-cta" style={{ background: 'var(--neuro-blue-deep)' }}>Explore neuroanatomy →</span>
                </div>
              </Link>

            </div>
          </div>
        </section>

        <div className="wrap">
          <span className="section-eyebrow">How it works</span>
          <div className="how-grid">
            <div className="how-card">
              <div className="step-num">01</div>
              <h4>Pick a game</h4>
              <p>Start with The Daily Case for a diagnostic challenge, or Map the Brain to drill neuroanatomy at your own pace. No account needed.</p>
            </div>
            <div className="how-card">
              <div className="step-num">02</div>
              <h4>Learn by doing</h4>
              <p>Each question reveals real neuroscience. Wrong answers unlock more clues. The built-in AI explains everything in plain language — ask it anything.</p>
            </div>
            <div className="how-card">
              <div className="step-num">03</div>
              <h4>Come back daily</h4>
              <p>A new case drops every day at midnight ET. Build your streak, improve your score, and challenge yourself across 45+ brain regions.</p>
            </div>
          </div>
        </div>

        <div className="wrap">
          <div className="stats-row">
            <div className="stat-cell"><div className="stat-num">45+</div><div className="stat-label">Brain regions</div></div>
            <div className="stat-cell"><div className="stat-num">Daily</div><div className="stat-label">New cases</div></div>
            <div className="stat-cell"><div className="stat-num">Free</div><div className="stat-label">Always & forever</div></div>
          </div>
        </div>

        <div className="wrap">
          <div className="seo-section">
            <h2 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 26, letterSpacing: '-.01em' }}>The neuroscience game built for real learning</h2>
            <p>Neurole is a free daily neuroscience game designed for pre-med students, neuroscience majors, medical students, clinicians, and anyone curious about how the brain works. A new neurological case appears every day — read five clinical symptoms and identify the diagnosis in five tries or fewer.</p>
            <p>Our neuroanatomy quiz presents real brain images where you identify the highlighted region and then ask an AI tutor to explain its function, clinical relevance, and connections to neighbouring areas. Neurole covers sulci, gyri, cortical areas, and neuropsychology — all reviewed for clinical accuracy. Free, forever.</p>
          </div>
        </div>

        <div className="wrap">
          <div className="volunteer-banner">
            <div className="volunteer-banner-text">
              <h4>Be part of the Neurole community</h4>
              <p>Clinicians, students, designers, and developers are helping us build the most engaging free neuroscience platform on the web. Your brain belongs here.</p>
            </div>
            <Link className="btn" to="/volunteer" style={{ borderRadius: 8, background: '#fff', color: '#4A3970', WebkitTextFillColor: '#4A3970' }}>Join Us →</Link>
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 52 }}>
          <span className="section-eyebrow">Interactive<span className="beta-pill">Beta</span></span>
          <Link to="/interactive" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(122,95,175,.06)', border: '1.5px solid rgba(122,95,175,.15)', borderRadius: 14, padding: 20, textDecoration: 'none', marginTop: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFE9F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5C4480" strokeWidth="1.6"><path d="M9 2a3 3 0 0 0-3 3v1.2A3 3 0 0 0 4 9v1a3 3 0 0 0 1 5.5V17a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3" /><path d="M15 2a3 3 0 0 1 3 3v1.2a3 3 0 0 1 2 2.8v1a3 3 0 0 1-1 5.5V17a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3" /></svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 19, margin: '0 0 2px', color: 'var(--ink)' }}>Watch Alzheimer's progress</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: 0 }}>An early beta of our interactive teaching tools →</p>
            </div>
          </Link>
        </div>

        <div className="mission-strip">
          <div className="wrap">
            <h2>Neuroscience, made for every curious mind</h2>
            <p>Free daily games designed for neuroscience students, clinicians, educators, and anyone curious about how their brain works.</p>
          </div>
        </div>

      </main>
    </>
  );
}
export default HomePage;
