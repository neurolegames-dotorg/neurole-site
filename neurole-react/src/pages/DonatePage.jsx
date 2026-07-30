import pageStyle from './styles/DonatePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { Link } from 'react-router-dom'

/* SEO: description="Support free neuroscience education. Donate to Neurole to keep games free for everyone, or support Alzheimer's research through our partner link." */
/* OG: title="Donate — Support Free Neuroscience Education | Neurole", url="https://neurole.org/donate.html" */
/* Twitter: title="Donate — Support Free Neuroscience Education | Neurole" */

export default function DonatePage() {
  usePageStyle(pageStyle);
  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Back to home</Link>
        <h1>Donate</h1>
        <p>Support free neuroscience education — or donate directly to research that could change millions of lives.</p>
      </div></div>

      <main className="wrap" style={{ padding: '36px 0 70px' }}>
        <div className="neurole-donate-card">
          <div className="neurole-donate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8B2635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,12 5,12 7,5 9,19 11,9 13,15 15,12 22,12" /></svg>
          </div>
          <h2>Support Neurole</h2>
          <p>Neurole is built and run by volunteers and stays free for every student, clinician, and curious mind who uses it. Your donation directly covers hosting, data, and tools that keep the games running and growing — no ads, no paywalls, ever.</p>
          <a className="btn" id="neurole-donate-btn" href="https://www.paypal.com/donate/?hosted_button_id=REPLACE_WITH_YOUR_ID" target="_blank" rel="noopener" style={{ background: '#8B2635' }}>Donate to Neurole →</a>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)', margin: '10px 0 0' }}>100% goes directly to keeping Neurole free and running.</p>
        </div>

        <p style={{ fontFamily: 'var(--serif-display)', fontSize: 20, margin: '44px 0 6px' }}>Prefer to support research directly?</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, maxWidth: 780, margin: '0 0 20px' }}>These partner organizations fund Alzheimer's care, research, and awareness. Donations here go straight to them, not to Neurole.</p>

        <div className="donate-grid">
          <div className="donate-card" style={{ borderLeft: '5px solid #E8474C' }}>
            <h3 style={{ color: '#C4323A' }}>Hilarity for Charity</h3>
            <p>Founded by Seth Rogen and Lauren Miller Rogen, Hilarity for Charity funds Alzheimer's care, research, and awareness — with a mission to engage a younger generation in the fight against the disease.</p>
            <a className="btn" id="hfc-donate-btn" href="https://hilarityforcharity.org/donate" target="_blank" rel="noopener" style={{ background: '#E8474C' }}>Donate to HFC →</a>
          </div>
          <div className="donate-card alz-card">
            <h3>Alzheimer's Association</h3>
            <p>The Alzheimer's Association is the world's leading voluntary health organisation for Alzheimer's care, support, and research. Every donation funds research that could change millions of lives.</p>
            <a className="btn" href="https://act.alz.org/donate" target="_blank" rel="noopener">Donate to Alzheimer's →</a>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-soft)', maxWidth: 780, marginTop: 20 }}>Neurole is not affiliated with Hilarity for Charity or the Alzheimer's Association. Both links go directly to their official donation pages.</p>
      </main>
    </>
  )
}
