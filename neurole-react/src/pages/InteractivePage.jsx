import pageStyle from './styles/InteractivePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { Link } from 'react-router-dom'

export default function InteractivePage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: "Interactive (Beta) — Neurole",
    description: "Neurole is a free educational neuroscience games platform built for students, clinicians, and curious minds worldwide.",
    canonical: "/interactive",
  });

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
        <h1>Interactive <span style={{ fontSize: '0.55em', fontWeight: 600, color: 'var(--ink-soft)' }}>(Beta)</span></h1>
        <p>An early beta of our interactive teaching tools — more coming soon.</p>
      </div></div>

      <main className="wrap" style={{ padding: '36px 0 70px', maxWidth: 820 }}>
        <div className="wrap" style={{ padding: 0 }}>
          <span className="section-eyebrow">3D Brain Lab</span>
          <h2 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontWeight: 700, fontSize: 26, letterSpacing: '-.01em', margin: '0 0 8px' }}>Watch Alzheimer&rsquo;s progress</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, maxWidth: 560, margin: '0 0 18px' }}>Explore a 3D-rendered brain and step through the stages of Alzheimer&rsquo;s to see how the disease changes it over time.</p>
          <Link to="/interactive/brain-lab" className="btn" style={{ display: 'inline-flex' }}>Open the 3D Brain Lab &rarr;</Link>

          <div className="synapse-rule" style={{ margin: '36px 0 28px' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>

          <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, maxWidth: 560, margin: 0 }}>More interactive teaching tools are coming soon. Have an idea? <Link to="/contact" style={{ color: 'var(--neuro-blue-deep)' }}>Let us know →</Link></p>
        </div>
      </main>
    </>
  )
}
