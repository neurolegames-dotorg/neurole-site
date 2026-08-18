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
          <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, maxWidth: 560, margin: 0 }}>More interactive teaching tools are coming soon. Have an idea? <Link to="/contact" style={{ color: 'var(--neuro-blue-deep)' }}>Let us know →</Link></p>
        </div>
      </main>
    </>
  )
}
