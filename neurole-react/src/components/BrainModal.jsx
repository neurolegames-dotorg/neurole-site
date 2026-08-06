import { useEffect, useMemo, useRef, useState } from 'react'
import BrainViewerLazy from './BrainViewerLazy'
import { resolveRegions, CAMERA_PRESETS } from '../data/brainRegions'

/* =====================================================================
   BRAIN POPUP

   Opened by a button inside an article; closed by the X in its top-right
   corner, by Escape, or by clicking the backdrop — so the reader is
   always one obvious action away from carrying on reading.

   Only ever one of these exists at a time, which matters: each viewer
   holds a WebGL context and browsers cap how many can be live at once.
   ===================================================================== */

export default function BrainModal({ figure, onClose }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const openerRef = useRef(null)
  const [viewMode, setViewMode] = useState('focus')

  // Memoised so the `highlight` object keeps a stable identity across
  // re-renders — it is a dependency of the viewer's restyle effect, and a
  // fresh Set on every render would restyle 271 meshes on every keystroke.
  const resolved = useMemo(() => resolveFigure(figure), [figure])

  // Escape to close, and keep Tab inside the dialog while it is open.
  useEffect(() => {
    openerRef.current = document.activeElement
    closeRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown, true)

    // Stop the article scrolling behind the popup, then put the reader back
    // exactly where they were — and on the button they pressed.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [onClose])

  const heading = figure.title || resolved.labels.join(' · ') || 'Brain model'
  const cameraKnown = Object.prototype.hasOwnProperty.call(CAMERA_PRESETS, figure.camera)

  return (
    <div
      className="brainmodal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="brainmodal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        ref={dialogRef}
      >
        <header className="brainmodal-head">
          <div className="brainmodal-titles">
            <h2 className="brainmodal-title">{heading}</h2>
            {resolved.labels.length > 0 && (
              <p className="brainmodal-sub">Highlighted: {resolved.labels.join(', ')}</p>
            )}
          </div>
          <button
            type="button"
            className="brainmodal-close"
            onClick={onClose}
            aria-label="Close the 3D model and return to the article"
            ref={closeRef}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="brainmodal-stage">
          <BrainViewerLazy
            highlight={viewMode === 'focus' ? resolved.highlight : null}
            camera={cameraKnown ? figure.camera : 'default'}
            cutaway={figure.cutaway}
            autoRotate={figure.spin && !prefersReducedMotion()}
          />
          <p className="brainmodal-hint">Drag to rotate · Scroll to zoom · Right-drag to pan</p>
        </div>

        <footer className="brainmodal-foot">
          {resolved.highlight && (
            <div className="brainmodal-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={'brainmodal-toggle-btn' + (viewMode === 'focus' ? ' active' : '')}
                onClick={() => setViewMode('focus')}
              >Highlight</button>
              <button
                type="button"
                className={'brainmodal-toggle-btn' + (viewMode === 'whole' ? ' active' : '')}
                onClick={() => setViewMode('whole')}
              >Whole brain</button>
            </div>
          )}

          {figure.caption && <p className="brainmodal-caption">{figure.caption}</p>}

          {resolved.notes.map((note) => (
            <p className="brainmodal-note" key={note}>{note}</p>
          ))}

          {resolved.unknown.length > 0 && (
            <p className="brainmodal-warn">
              Not found in the model: {resolved.unknown.join(', ')}. Check the spelling
              against the region list in <code>src/data/brainRegions.js</code>.
            </p>
          )}

          <p className="brainmodal-credit">
            Anatomical model derived from{' '}
            <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer">Z&#8209;Anatomy</a>{' '}
            (BodyParts3D, &copy; DBCLS), used under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC&nbsp;BY&#8209;SA&nbsp;4.0</a>.
            Illustrative only — not a diagnostic image.
          </p>
        </footer>
      </div>
    </div>
  )
}

/* The turntable is motion the reader did not ask for, so it yields to the
   OS setting. The model stays fully draggable either way. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/* Resolves the article's region names into the matcher the viewer wants. */
function resolveFigure(figure) {
  const r = resolveRegions(figure.regions || [])
  const hasAny = r.meshNames.size || r.regionFields.size || r.categories.size
  return {
    labels: r.labels,
    notes: r.notes,
    unknown: r.unknown,
    highlight: hasAny
      ? { meshNames: r.meshNames, regionFields: r.regionFields, categories: r.categories }
      : null,
  }
}
