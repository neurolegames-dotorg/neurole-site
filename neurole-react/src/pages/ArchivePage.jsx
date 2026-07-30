import pageStyle from './styles/ArchivePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

/* SEO: description="Browse every Daily Case ever published on Neurole. Revisit past neurological diagnoses and test your knowledge." */

const LAUNCH = '2026-07-10'

function parseCSV(text) {
  const rows = []
  let cur = [], cell = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cell += '"'; i++ } else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      cur.push(cell); cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      cur.push(cell)
      if (cur.some(c => c.trim())) rows.push(cur)
      cur = []; cell = ''
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else cell += ch
  }
  if (cell || cur.length) cur.push(cell)
  if (cur.some(c => c.trim())) rows.push(cur)
  return rows
}

export default function ArchivePage() {
  usePageStyle(pageStyle);
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadArchive() {
      try {
        const sheetUrl = typeof window !== 'undefined' && window.NEUROLE_CONFIG
          ? window.NEUROLE_CONFIG.DAILY_CASE_SHEET_CSV
          : null
        if (!sheetUrl) {
          setError(true)
          setLoading(false)
          return
        }
        const res = await fetch(sheetUrl + '&_cb=' + Date.now(), { cache: 'no-store' })
        const text = await res.text()
        let rows = parseCSV(text).filter(r => r.some(c => c.trim()))

        const c0 = (rows[0]?.[0] || '').trim()
        if (!/^\d{4}-/.test(c0) && rows.length > 1) rows = rows.slice(1)

        const [ly, lm, ld] = LAUNCH.split('-').map(Number)
        const etToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const todayUTC = Date.UTC(etToday.getFullYear(), etToday.getMonth(), etToday.getDate())
        const launchUTC = Date.UTC(ly, lm - 1, ld)
        const daysElapsed = Math.floor((todayUTC - launchUTC) / 864e5)
        const published = rows.slice(0, daysElapsed + 1).reverse()

        setCards(published)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    loadArchive()
  }, [])

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <Link className="back-home" to="/daily-game">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to Daily Case
          </Link>
          <h1>Case Archive</h1>
          <p>Every case ever published on Neurole — click any to revisit.</p>
        </div>
      </div>

      <main className="wrap" style={{ padding: '36px 0 80px' }}>
        <div className="archive-grid" id="archive-grid">
          {loading && <div className="loading-state">Loading cases…</div>}
          {error && <div className="loading-state">Could not load archive.</div>}
          {!loading && !error && cards.length === 0 && <div className="loading-state">No cases published yet.</div>}
          {!loading && !error && cards.map((row, i) => {
            const caseNum = cards.length - i
            const dayIdx = caseNum - 1
            const dateRaw = (row[0] || '').trim()
            const dateDisplay = dateRaw
              ? new Date(dateRaw + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : ''
            return (
              <Link key={i} className="archive-card" to={`/daily-game-play?day=${dayIdx}`}>
                <div className="case-num-badge">Case #{caseNum}</div>
                <div className="archive-date">{dateDisplay}</div>
                <div className="archive-arrow">Play →</div>
              </Link>
            )
          })}
        </div>
      </main>
    </>
  )
}
