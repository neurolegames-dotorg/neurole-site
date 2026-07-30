import pageStyle from './styles/InteractivePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* SEO: description="Neurole is a free educational neuroscience games platform built for students, clinicians, and curious minds worldwide." */
/* OG: title="Interactive (Beta) — Neurole", url="https://neurole.org/interactive.html" */
/* Twitter: title="Interactive (Beta) — Neurole" */

const STAGES = [
  {
    label: 'Stage 1 of 4',
    title: 'A healthy brain',
    text: 'Billions of neurons connect in dense networks, supporting sharp memory, language, and thought.'
  },
  {
    label: 'Stage 2 of 4',
    title: 'Early / mild stage',
    text: 'Small protein plaques begin forming. Mild memory lapses appear — misplacing items, forgetting recent conversations.'
  },
  {
    label: 'Stage 3 of 4',
    title: 'Moderate stage',
    text: 'Plaques and tangles spread. Confusion grows, memory loss becomes more noticeable, and daily tasks get harder.'
  },
  {
    label: 'Stage 4 of 4',
    title: 'Severe stage',
    text: 'Widespread tissue loss (atrophy) shrinks the brain. Memory, communication, and independence are significantly affected.'
  }
]

export default function InteractivePage() {
  usePageStyle(pageStyle);
  const [stage, setStage] = useState(0)
  const scrollerRef = useRef(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let ticking = false
    function update() {
      ticking = false
      const rect = scroller.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      if (total <= 0) { setStage(0); return }
      const progress = Math.max(0, Math.min(1, -rect.top / total))
      const idx = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length))
      setStage(idx)
    }
    function onScroll() {
      if (!ticking) { requestAnimationFrame(update); ticking = true }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
        <h1>Interactive <span style={{ fontSize: '0.55em', fontWeight: 600, color: 'var(--ink-soft)' }}>(Beta)</span></h1>
        <p>An early beta of our interactive teaching tools — scroll to explore.</p>
        <div style={{ marginTop: 14 }}>
          <Link to="/interactive/brain-lab" className="btn" style={{ fontSize: 12 }}>3D Brain Lab <span style={{ fontSize: 16, lineHeight: 1 }}>→</span></Link>
        </div>
      </div></div>

      <main className="wrap" style={{ padding: '16px 0 70px', maxWidth: 820 }}>
        <div className="wrap" style={{ padding: 0 }}>
          <span className="section-eyebrow">Interactive<span className="beta-pill">Beta</span></span>
          <h2 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 26, letterSpacing: '-.01em', margin: '0 0 8px' }}>Watch Alzheimer's progress</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, maxWidth: 560, margin: 0 }}>Scroll down to see how the disease changes the brain over time.</p>
        </div>

        <div className="alz-scroller" id="alz-scroller" ref={scrollerRef}>
          <div className="alz-sticky" id="alz-sticky" data-stage={stage}>
            <div className="alz-visual">
              <svg className="alz-brain" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
                <path className="alz-brain-shape" d="M100 18c-28 0-46 16-52 34-14 3-24 16-22 32 1 10 8 18 17 22-4 9-3 20 5 28 8 8 19 9 28 5 6 9 16 15 24 15s18-6 24-15c9 4 20 3 28-5 8-8 9-19 5-28 9-4 16-12 17-22 2-16-8-29-22-32-6-18-24-34-52-34z" />
                <path d="M100 18c0 40 0 84 0 124" stroke="rgba(0,0,0,.15)" strokeWidth="2" fill="none" />
                <circle className="alz-plaque p1" cx="72" cy="58" r="4" />
                <circle className="alz-plaque p1" cx="128" cy="64" r="3.5" />
                <circle className="alz-plaque p1" cx="60" cy="90" r="3" />
                <circle className="alz-plaque p2" cx="140" cy="92" r="4" />
                <circle className="alz-plaque p2" cx="90" cy="40" r="3" />
                <circle className="alz-plaque p2" cx="110" cy="110" r="3.5" />
                <circle className="alz-plaque p2" cx="50" cy="70" r="2.5" />
                <circle className="alz-plaque p3" cx="150" cy="70" r="3" />
                <circle className="alz-plaque p3" cx="80" cy="120" r="3" />
                <circle className="alz-plaque p3" cx="120" cy="50" r="2.5" />
                <circle className="alz-plaque p3" cx="65" cy="105" r="2.5" />
                <circle className="alz-plaque p3" cx="135" cy="115" r="3" />
              </svg>
            </div>
            <div className="alz-caption">
              <div className="alz-stage-label" id="alz-stage-label">{STAGES[stage].label}</div>
              <h3 id="alz-stage-title">{STAGES[stage].title}</h3>
              <p id="alz-stage-text">{STAGES[stage].text}</p>
            </div>
            <div className="alz-dots">
              {STAGES.map((_, i) => (
                <span key={i} className={'alz-dot' + (i === stage ? ' active' : '')} data-i={i}></span>
              ))}
            </div>
          </div>
        </div>

        <div className="wrap" style={{ padding: 0, marginTop: 24 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>More interactive teaching tools are on the way. Have an idea? <Link to="/contact" style={{ color: 'var(--neuro-blue-deep)' }}>Let us know →</Link></p>
        </div>
      </main>
    </>
  )
}
