import pageStyle from './styles/BrainLabPage.css?raw'
import { usePageStyle } from '../hooks/usePageStyle'
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
// Lazy wrapper, not the viewer itself — a static import here would pull
// three.js and the Draco decoder back into the main bundle for every page.
import BrainViewer from '../components/BrainViewerLazy'

const STAGES = [
  {
    label: 'Stage 1 of 4',
    title: 'A healthy brain',
    text: 'Billions of neurons connect in dense networks, supporting sharp memory, language, and thought. The brain appears full and robust.',
    region: 'No significant atrophy',
    atrophy: 0,
  },
  {
    label: 'Stage 2 of 4',
    title: 'Early / mild stage',
    text: 'Small protein plaques begin forming in the temporal lobe. Mild memory lapses appear — misplacing items, forgetting recent conversations.',
    region: 'Temporal lobe — early atrophy',
    atrophy: 18,
  },
  {
    label: 'Stage 3 of 4',
    title: 'Moderate stage',
    text: 'Plaques and tangles spread to the parietal and frontal lobes. Confusion grows, memory loss becomes more noticeable, and daily tasks get harder.',
    region: 'Temporal, parietal, frontal lobes',
    atrophy: 40,
  },
  {
    label: 'Stage 4 of 4',
    title: 'Severe stage',
    text: 'Widespread tissue loss (atrophy) shrinks the brain significantly. Memory, communication, and independence are profoundly affected.',
    region: 'Diffuse — whole brain atrophy',
    atrophy: 62,
  },
]

export default function BrainLabPage() {
  usePageStyle(pageStyle)
  const [stage, setStage] = useState(0)
  const [viewMode, setViewMode] = useState('surface')
  const viewerRef = useRef(null)

  const s = STAGES[stage]

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/interactive">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Interactive
        </Link>
        <h1>Brain Lab <span style={{ fontSize: '0.55em', fontWeight: 600, color: 'var(--ink-soft)' }}>(3D)</span></h1>
        <p>Explore a 3D-rendered brain. Scroll through Alzheimer&rsquo;s stages to see how the disease progresses.</p>
      </div></div>

      <main className="brainlab-main wrap">
        <div className="brainlab-layout">
          <div className="brainlab-viewer-wrap">
            <BrainViewer ref={viewerRef} stage={stage} viewMode={viewMode} />
            <div className="brainlab-watermark">Drag to rotate · Scroll to zoom · Right-drag to pan</div>
          </div>

          <div className="brainlab-controls">
            <div className="brainlab-stage-header">
              <span className="section-eyebrow">Alzheimer&rsquo;s Progression</span>
            </div>

            <div className="brainlab-slider-wrap">
              <label className="brainlab-slider-label">
                <span>Stage</span>
                <span className="brainlab-stage-count">{stage + 1} / 4</span>
              </label>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={stage}
                onChange={(e) => setStage(Number(e.target.value))}
                className="brainlab-slider"
              />
              <div className="brainlab-slider-marks">
                {STAGES.map((_, i) => (
                  <button
                    key={i}
                    className={'brainlab-slider-mark' + (i === stage ? ' active' : '')}
                    onClick={() => setStage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="brainlab-view-toggle">
              <button
                className={'brainlab-view-btn' + (viewMode === 'surface' ? ' active' : '')}
                onClick={() => setViewMode('surface')}
              >Surface</button>
              <button
                className={'brainlab-view-btn' + (viewMode === 'translucent' ? ' active' : '')}
                onClick={() => setViewMode('translucent')}
              >Translucent</button>
            </div>

            <div className="brainlab-info">
              <div className="brainlab-stage-label">{s.label}</div>
              <h3 className="brainlab-stage-title">{s.title}</h3>
              <p className="brainlab-stage-text">{s.text}</p>
              <div className="brainlab-region-row">
                <span className="brainlab-region-tag">Affected: {s.region}</span>
                <span className="brainlab-atrophy-tag">
                  <span className="brainlab-atrophy-bar">
                    <span className="brainlab-atrophy-fill" style={{ width: s.atrophy + '%' }} />
                  </span>
                  {s.atrophy}% atrophy
                </span>
              </div>
            </div>

            <div className="brainlab-dots">
              {STAGES.map((_, i) => (
                <span
                  key={i}
                  className={'brainlab-dot' + (i === stage ? ' active' : '')}
                  onClick={() => setStage(i)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="wrap" style={{ padding: 0, marginTop: 48 }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>
            Brain mesh with lobe-based atrophy simulation &middot;
            <Link to="/interactive" style={{ color: 'var(--neuro-blue-deep)' }}> See 2D scroll version &rarr;</Link>
          </p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 12, textAlign: 'center', marginTop: 10, opacity: 0.8 }}>
            Anatomical model derived from{' '}
            <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--neuro-blue-deep)' }}>Z&#8209;Anatomy</a>
            {' '}(BodyParts3D, &copy; DBCLS), used under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--neuro-blue-deep)' }}>CC&nbsp;BY&#8209;SA&nbsp;4.0</a>.
            Atrophy staging is an illustrative simplification, not a diagnostic image.
          </p>
        </div>
      </main>
    </>
  )
}
