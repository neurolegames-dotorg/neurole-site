import pageStyle from './styles/HomePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadFunFact } from '../utils/helpers';

function HomePage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: "Free Neuroscience Games — Daily Diagnosis Puzzle & Brain Anatomy Quiz | Neurole",
    description: "A Wordle-style daily medical diagnosis puzzle and a free brain anatomy quiz — built for pre-med, nursing, and medical students, clinicians, and anyone curious how the brain works. New case every day, no account needed.",
    canonical: "/",
  });
  const [funFact, setFunFact] = useState(null);
  const [streak, setStreak] = useState(0);
  const [countdown, setCountdown] = useState('--:--:--');
  // Flipped to false by the <img>'s onError, which swaps the hero back to the
  // photo version if hero-animation.svg is not there.
  const [heroArtOk, setHeroArtOk] = useState(true);

  useEffect(() => {
    loadFunFact().then(setFunFact).catch(() => {});
  }, []);

  // The static site ships this chip with a hard-coded "--:--:--" and no script
  // behind it, so the clock never moves. Drive it for real: time left until the
  // next midnight in America/New_York, which is when the case actually resets.
  useEffect(() => {
    const tick = () => {
      const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const next = new Date(et);
      next.setHours(24, 0, 0, 0);
      const left = Math.max(0, Math.floor((next - et) / 1000));
      const pad = n => String(n).padStart(2, '0');
      setCountdown(`${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
        <div
          className={`hero-img-wrap${heroArtOk ? ' has-hero-art' : ''}`}
          role="img"
          aria-label={heroArtOk
            ? 'A brain climbing a mountain toward a flag at the summit'
            : 'Magnified purple neurons connected by branching dendrites'}
        >
          {/* Swap the homepage hero by replacing public/hero-animation.svg, and
              bump ?v= so it is actually picked up — files in public/ are served
              unhashed, so a returning visitor would otherwise keep the cached
              one. If it is missing, onError falls back to the photo hero below
              instead of leaving a broken image across the top of the page. */}
          {heroArtOk && (
            <img
              className="hero-art"
              src="/hero-animation.svg?v=1"
              alt=""
              onError={() => setHeroArtOk(false)}
            />
          )}
          <div className="hero-bg-image"></div>
          <div className="hero-fade"></div>
          <div className="hero-text">
            <h1>Neurole</h1>
            <p>Games about your brain</p>
          </div>
        </div>
      </section>

      <main>

        <div className="wrap" style={{ marginTop: 48 }}>
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
            <span className="eyebrow-pill">Free to play, no sign-up</span>
            <h2 style={{ fontWeight: 700 }}>Three games. A new puzzle every day.</h2>
            <p className="sub">In the spirit of Wordle and Connections, rebuilt around the brain — a neurology case each morning, a word-grouping puzzle, and a neuroanatomy quiz whenever you want it.</p>

            <div className="home-games-grid">

              <Link className="home-game-card" to="/daily-game">
                <div className="home-game-card-stripe"></div>
                <div className="home-game-card-body">
                  <div className="game-card-icon-wrap">
                    <div className="game-icon-badge game-icon-badge--red">
                      <img src="/daily-case-icon.png" alt="The Daily Case" width="96" height="104" style={{ objectFit: 'contain' }} />
                    </div>
                  </div>
                  <span className="game-card-badge">Daily · Diagnostic</span>
                  <h3>The Daily Case</h3>
                  <p>A new patient each day. Read the symptoms, guess the diagnosis in five tries. Resets at midnight ET.</p>
                  <div className="next-case-chip"><span className="dot"></span><span>next case in {countdown}</span></div>
                  {streak > 0 && (
                    <div className="streak-chip">
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
                    <div className="game-icon-badge game-icon-badge--plum">
                      <img src="/map-brain-icon.png" alt="Map the Brain" width="92" height="92" style={{ objectFit: 'contain' }} />
                    </div>
                  </div>
                  <span className="game-card-badge">Untimed · Visual</span>
                  <h3>Map the Brain</h3>
                  <p>A brain image appears. Pick the highlighted region from four choices, then ask the built-in tutor what it does and what happens when it's damaged.</p>
                  <span className="play-cta">Explore neuroanatomy →</span>
                </div>
              </Link>

              <Link className="home-game-card" to="/synapse">
                <div className="home-game-card-stripe home-game-card-stripe--blue"></div>
                <div className="home-game-card-body">
                  <div className="game-card-icon-wrap">
                    <div className="game-icon-badge game-icon-badge--blue">
                      <svg viewBox="0 0 64 64" aria-hidden="true">
                        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#synapseBadgeGradient)" />
                        <path d="M20 22c5-8 16-10 24-6" stroke="#0F3D5A" strokeWidth="3" strokeLinecap="round" />
                        <path d="M20 41c5 8 16 10 24 6" stroke="#0F3D5A" strokeWidth="3" strokeLinecap="round" />
                        <path d="M23 23c2 8 2 12 4 15" stroke="#6AA7C6" strokeWidth="3" strokeLinecap="round" />
                        <path d="M40 25c-2 8-2 12-4 15" stroke="#6AA7C6" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="18" cy="22" r="4.3" fill="#2E5B7A" />
                        <circle cx="46" cy="22" r="4.3" fill="#2E5B7A" />
                        <circle cx="18" cy="42" r="4.3" fill="#4B7A99" />
                        <circle cx="46" cy="42" r="4.3" fill="#4B7A99" />
                        <circle cx="32" cy="32" r="5" fill="#F7FCFF" stroke="#6AA7C6" strokeWidth="2.2" />
                        <defs>
                          <linearGradient id="synapseBadgeGradient" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#F7FCFF" />
                            <stop offset="1" stopColor="#DFF3FF" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <span className="game-card-badge">Daily · Word-grouping</span>
                  <h3>Synapse</h3>
                  <p>16 neuroscience terms, 4 hidden groups. Sort them out in four mistakes or fewer — trickier categories in purple, easier ones in yellow.</p>
                  <span className="play-cta">Play Synapse →</span>
                </div>
              </Link>

            </div>
          </div>
        </section>

        {/* Study Games — the party-word-light game in its own section, as on
            the static homepage. */}
        <section style={{ marginTop: 56 }}>
          <div className="wrap" style={{ textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700 }}>Study Games</h2>
            <div className="home-games-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 400, margin: '0 auto' }}>
              <Link className="home-game-card" to="/imposter" style={{ '--game-accent': '#A579E8', '--game-accent-deep': '#6935A8', '--game-accent-tint': '#EFE3FC' }}>
                <div className="home-game-card-body">
                  <div className="game-card-icon-wrap">
                    <div className="game-icon-badge" style={{ background: '#EFE3FC' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6935A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/><path d="M2 2l20 20"/></svg>
                    </div>
                  </div>
                  <span className="game-card-badge">Party · Word Game</span>
                  <h3>Imposter</h3>
                  <p>Add your own words or use our neuroscience word banks, then pass the device around to find who's faking it.</p>
                  <span className="play-cta">Play →</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="stats-section" style={{ marginTop: 48 }}>
          <div className="wrap">
            <div className="stats-row">
              <div className="stat-cell"><div className="stat-num">45+</div><div className="stat-label">Brain regions</div></div>
              <div className="stat-cell"><div className="stat-num">Daily</div><div className="stat-label">New cases</div></div>
              <div className="stat-cell"><div className="stat-num">Free</div><div className="stat-label">No account needed</div></div>
            </div>
          </div>
        </section>

        <div className="wrap" style={{ marginTop: 48 }}>
          <span className="section-eyebrow">How it works</span>
          <div className="how-grid">
            <div className="how-card">
              <div className="step-num">01</div>
              <h4>Pick a game</h4>
              <p>The Daily Case for a diagnostic challenge, or Map the Brain to drill neuroanatomy at your own pace. No account needed.</p>
            </div>
            <div className="how-card">
              <div className="step-num">02</div>
              <h4>Learn by doing</h4>
              <p>Each question teaches real neuroscience. Wrong answers reveal more clues, and a built-in tutor can explain anything you're stuck on.</p>
            </div>
            <div className="how-card">
              <div className="step-num">03</div>
              <h4>Come back daily</h4>
              <p>A new case drops every day at midnight ET. Build a streak and work your way across 45+ brain regions.</p>
            </div>
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 48 }}>
          <span className="section-eyebrow">Interactive<span className="beta-pill">Beta</span></span>
          <Link to="/interactive" style={{ display: 'flex', alignItems: 'center', gap: 22, background: 'var(--paper-deep)', border: '1.5px solid var(--rule)', borderRadius: 14, padding: 30, textDecoration: 'none', marginTop: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: 'var(--paper)', border: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5C4480" strokeWidth="1.6"><path d="M9 2a3 3 0 0 0-3 3v1.2A3 3 0 0 0 4 9v1a3 3 0 0 0 1 5.5V17a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3" /><path d="M15 2a3 3 0 0 1 3 3v1.2a3 3 0 0 1 2 2.8v1a3 3 0 0 1-1 5.5V17a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3" /></svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 23, margin: '0 0 4px', color: 'var(--ink)' }}>Watch Alzheimer's progress</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, margin: 0 }}>An early look at our interactive teaching tools →</p>
            </div>
          </Link>
        </div>

        <div className="wrap" style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', background: 'var(--paper)', border: '1.5px solid var(--rule)', borderLeft: '4px solid #6B4F94', borderRadius: 10, padding: '26px 28px' }}>
            <div>
              <h3 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 22, margin: '0 0 6px', color: 'var(--ink)' }}>Help build Neurole</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: 0, maxWidth: 460, lineHeight: 1.6 }}>Clinicians, students, designers, and developers work on Neurole as volunteers. If you'd like to help, we'd like to hear from you.</p>
            </div>
            <Link className="btn" to="/volunteer" style={{ borderRadius: 999, flexShrink: 0, padding: '12px 26px' }}>Join Us →</Link>
          </div>
        </div>

        <section style={{ background: '#4A3970', marginTop: 48 }}>
          <div className="wrap" style={{ paddingTop: 40, paddingBottom: 40 }}>
            <p style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 22, lineHeight: 1.7, color: '#fff', margin: 0 }}>
              Neurole is a free educational platform aimed at teaching others about the human brain through games. With games in neurology and neuroanatomy, our team of students and professionals work towards creating games about your brain.
            </p>
          </div>
        </section>

      </main>
    </>
  );
}
export default HomePage;
