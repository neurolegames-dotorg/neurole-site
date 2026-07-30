import pageStyle from './styles/DailyGamePlayPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { NEURO_DISORDERS, FALLBACK_CASES } from '../games-data'
import {
  parseCSV, getDayIndex, dateStrForDayIndex,
  checkAnswer, findClosestKnownDisorder,
  startCountdown, getDisorderCategory, askNeuroleAIRaw,
  getSavedDailyCompletionForIndex, saveDailyCompletionForIndex, getDailyStats,
  submitGlobalDailyResult, fetchGlobalDailyDistribution,
  renderGoogleSignIn
} from '../utils/helpers'

export default function DailyGamePlayPage() {
  usePageStyle(pageStyle);
  const [searchParams] = useSearchParams()

  // ?day=N replays a published case from the archive. Anything missing,
  // malformed, negative or in the future falls back to today's case.
  const todayIndex = getDayIndex()
  const rawDay = searchParams.get('day')
  const parsedDay = rawDay === null ? NaN : Number.parseInt(rawDay, 10)
  const dayIndex = Number.isInteger(parsedDay) && parsedDay >= 0 && parsedDay <= todayIndex
    ? parsedDay
    : todayIndex
  const isArchive = dayIndex !== todayIndex

  const [gameState, setGameState] = useState({
    symptoms: [], answer: '', synonyms: [], explanation: '',
    shown: 1, attemptsUsed: 0, guesses: [], solved: false, alreadyCompletedToday: false
  })
  const [inputValue, setInputValue] = useState('')
  const [autocompleteMatches, setAutocompleteMatches] = useState([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pastGuesses, setPastGuesses] = useState([])
  const [closestNote, setClosestNote] = useState('')
  const [caseDate, setCaseDate] = useState('—')
  const [caseNumber, setCaseNumber] = useState('')
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [won, setWon] = useState(false)
  const [countdownText, setCountdownText] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatLog, setChatLog] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [wrongFlash, setWrongFlash] = useState('')
  const [sheetWarning, setSheetWarning] = useState('')
  const [shakeForm, setShakeForm] = useState(false)
  const [noCase, setNoCase] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  const loadCase = useCallback(async () => {
    try {
      const etToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const lastDay = sessionStorage.getItem('neurole_last_play_date')
      if (lastDay && lastDay !== etToday) {
        sessionStorage.removeItem('neurole_daily_playing')
        sessionStorage.removeItem('neurole_csv_cache')
        sessionStorage.removeItem('neurole_csv_time')
      }
      sessionStorage.setItem('neurole_last_play_date', etToday)
    } catch (err) {
      // Private-mode browsers throw on sessionStorage — the game still works
      // without the day-rollover cache reset.
      console.warn('Neurole: sessionStorage unavailable', err.message)
    }

    const caseNum = dayIndex + 1
    setCaseNumber('Case #' + caseNum)
    setCaseDate(
      new Date(dateStrForDayIndex(dayIndex) + 'T12:00:00')
        .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    )

    let chosen = null
    let sheetReached = false
    let symptoms = [], answer = '', synonyms = [], explanation = ''

    try {
      let csvText = null
      try {
        const age = Date.now() - (parseInt(sessionStorage.getItem('neurole_csv_time') || '0'))
        if (age < 1800000) csvText = sessionStorage.getItem('neurole_csv_cache')
      } catch (err) {
        console.warn("Neurole: couldn't read the cached sheet", err.message)
      }
      if (!csvText) {
        const sheetUrl = window.NEUROLE_CONFIG?.DAILY_CASE_SHEET_CSV
        if (sheetUrl && !sheetUrl.startsWith('PASTE_')) {
          const res = await fetch(sheetUrl + '&_cb=' + Date.now(), { cache: 'no-store' })
          if (res.ok) {
            csvText = await res.text()
            try {
              sessionStorage.setItem('neurole_csv_cache', csvText)
              sessionStorage.setItem('neurole_csv_time', String(Date.now()))
            } catch (err) {
              console.warn("Neurole: couldn't cache the sheet", err.message)
            }
          }
        }
      }
      if (csvText) {
        sheetReached = true
        let allRows = parseCSV(csvText).filter(r => r.some(c => c.trim()))
        const col0 = (allRows[0]?.[0] || '').trim()
        const col1 = (allRows[0]?.[1] || '').trim()
        const isDataRow = /^\d+$/.test(col0) || /^\d{4}-/.test(col0) || /^\d{4}-/.test(col1)
        if (!isDataRow && allRows.length > 1) {
          allRows = allRows.slice(1)
        }
        const idx = dayIndex
        if (idx >= 0 && idx < allRows.length) {
          const row = allRows[idx]
          symptoms = [1, 2, 3, 4, 5].map(i => (row[i] || '').trim()).filter(Boolean)
          answer = (row[6] || '').trim()
          synonyms = (row[7] || '').split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
          explanation = (row[8] || '').trim()
          if (symptoms.length > 0 && answer) chosen = true
        }
      }
    } catch (err) {
      console.error("Neurole: sheet error", err.message)
    }

    if (!chosen || !answer) {
      if (sheetReached) {
        // The sheet loaded fine, it just has no usable row for this day — the
        // case hasn't been written yet. Matches the static site: show the
        // empty state rather than pretending a sample case is the real one.
        setNoCase(true)
        setLoaded(true)
        return
      }
      // Sheet unreachable (offline, bad config, blocked request) — a sample
      // case keeps the game playable.
      const fallbackIdx = dayIndex % FALLBACK_CASES.length
      const fb = FALLBACK_CASES[fallbackIdx]
      symptoms = fb.symptoms
      answer = fb.answer
      synonyms = fb.accepted_synonyms.split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
      explanation = fb.explanation
      setSheetWarning('Running in offline mode — sample case loaded.')
    }

    const saved = getSavedDailyCompletionForIndex(dayIndex)
    let newState = {
      symptoms, answer, synonyms, explanation,
      shown: 1, attemptsUsed: 0, guesses: [], solved: false, alreadyCompletedToday: false
    }

    if (saved) {
      newState.answer = saved.answer
      newState.explanation = saved.explanation
      newState.attemptsUsed = saved.attemptsUsed
      newState.solved = saved.won
      newState.shown = symptoms.length
      newState.alreadyCompletedToday = true
      if (saved.won) {
        setWon(true)
        setResultModalOpen(true)
        if (!isArchive) {
          submitGlobalDailyResult(dateStrForDayIndex(dayIndex), saved.attemptsUsed)
        }
      }
    }

    setGameState(newState)
    gameStateRef.current = newState
    setLoaded(true)
  }, [dayIndex, isArchive])

  useEffect(() => {
    loadCase()
  }, [loadCase])

  // The empty state tells the player when the next case lands, so it needs the
  // countdown running too — not just the result modal.
  useEffect(() => {
    if (!noCase || isArchive) return
    const id = startCountdown(null, setCountdownText)
    return () => clearInterval(id)
  }, [noCase, isArchive])

  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => {
      const gs = gameStateRef.current
      if (gs.solved || gs.attemptsUsed >= 5) return
      setGameState(prev => {
        if (prev.shown < prev.symptoms.length) {
          return { ...prev, shown: Math.min(prev.shown + 1, prev.symptoms.length) }
        }
        return prev
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [loaded])

  // Declared before handleGuess, which lists them as dependencies — a
  // useCallback referenced in a dep array must already be initialised.
  const showResult = useCallback((w, gs) => {
    const state = gs || gameStateRef.current
    setWon(w)
    saveDailyCompletionForIndex(dayIndex, w, state.attemptsUsed, state.answer, state.explanation)
    setResultModalOpen(true)
    // Archive replays are personal practice — they must not skew the global
    // counters for a day that has already closed.
    if (!isArchive) {
      submitGlobalDailyResult(dateStrForDayIndex(dayIndex), w ? state.attemptsUsed : null)
    }
  }, [dayIndex, isArchive])

  const closeAutocomplete = useCallback(() => {
    setAutocompleteOpen(false)
    setAutocompleteMatches([])
    setActiveIndex(-1)
  }, [])

  const handleGuess = useCallback((e) => {
    e.preventDefault()
    const gs = gameStateRef.current
    if (gs.solved) return
    const guess = inputValue.trim()
    if (!guess) return
    closeAutocomplete()

    if (checkAnswer(guess, gs)) {
      const newState = { ...gs, solved: true }
      setGameState(newState)
      gameStateRef.current = newState
      setClosestNote('')
      showResult(true, newState)
    } else {
      const newAttempts = gs.attemptsUsed + 1
      const newGuesses = [...gs.guesses, guess]
      const newState = {
        ...gs,
        attemptsUsed: newAttempts,
        guesses: newGuesses,
        shown: newAttempts >= 5 ? gs.symptoms.length : Math.min(gs.shown + 1, gs.symptoms.length)
      }
      setGameState(newState)
      gameStateRef.current = newState
      setPastGuesses(newGuesses)
      setShakeForm(true)
      setTimeout(() => setShakeForm(false), 450)
      setWrongFlash(guess)
      setTimeout(() => setWrongFlash(''), 1600)

      const closest = findClosestKnownDisorder(guess, gs.answer, NEURO_DISORDERS)
      setClosestNote(closest ? `Read as: "${closest}" — not quite right.` : '')

      if (newAttempts >= 5) {
        showResult(false, newState)
      }
    }
    setInputValue('')
  }, [inputValue, showResult, closeAutocomplete])

  const handleInputChange = useCallback((e) => {
    const val = e.target.value
    setInputValue(val)
    const trimmed = val.trim().toLowerCase()
    if (!trimmed) { closeAutocomplete(); return }
    const matches = NEURO_DISORDERS.filter(name => name.toLowerCase().includes(trimmed))
    setAutocompleteMatches(matches.slice(0, 8))
    setAutocompleteOpen(matches.length > 0)
    setActiveIndex(-1)
  }, [closeAutocomplete])

  const handleKeyDown = useCallback((e) => {
    if (!autocompleteOpen || !autocompleteMatches.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, autocompleteMatches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      setInputValue(autocompleteMatches[activeIndex])
      closeAutocomplete()
    } else if (e.key === 'Escape') {
      closeAutocomplete()
    }
  }, [autocompleteOpen, autocompleteMatches, activeIndex, closeAutocomplete])

  const handleAutocompleteSelect = useCallback((name) => {
    setInputValue(name)
    closeAutocomplete()
  }, [closeAutocomplete])

  const handleShare = useCallback(async () => {
    const gs = gameStateRef.current
    const total = 5
    const used = gs.attemptsUsed || 0
    const w = gs.solved
    let grid = ''
    for (let i = 0; i < total; i++) {
      if (i < used - (w ? 1 : 0)) grid += '🟥'
      else if (i === used - 1 && w) grid += '🟩'
      else grid += '⬜'
    }
    const tries = w ? `${used}/${total}` : `X/${total}`
    const caseDay = new Date(dateStrForDayIndex(dayIndex) + 'T12:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const heading = isArchive
      ? `Neurole Case #${dayIndex + 1} — ${caseDay}`
      : `Neurole Daily Case — ${caseDay}`
    const shareText = w
      ? `${heading}\n${tries}\n\n${grid}\n\nI diagnosed it in ${used} ${used === 1 ? 'try' : 'tries'}. Can you beat that?\nneurole.org/daily-game.html`
      : `${heading}\n${tries}\n\n${grid}\n\nThis one stumped me. Think you can crack it?\nneurole.org/daily-game.html`
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url: 'https://neurole.org/daily-game.html', title: 'Neurole — The Daily Case' })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    } catch (err) {
      // Dismissing the native share sheet rejects — not an error worth showing.
      console.warn('Neurole: share cancelled or unavailable', err.message)
    }
  }, [dayIndex, isArchive])

  const handleChatSubmit = useCallback(async (e) => {
    e.preventDefault()
    const q = chatInput.trim()
    if (!q) return
    setChatLog(prev => [...prev, { role: 'user', text: q }])
    setChatInput('')
    setChatLog(prev => [...prev, { role: 'ai', text: 'Thinking…' }])
    const gs = gameStateRef.current
    const gameFinished = gs.solved || gs.attemptsUsed >= 5
    const shownSymptoms = gs.symptoms.slice(0, gs.shown).map((s, i) => `${i + 1}. ${s}`).join('\n')
    let prompt
    if (gameFinished) {
      prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
The player just finished a diagnostic case. The correct diagnosis was: "${gs.answer}".
Explanation given to the player: "${gs.explanation}"
The player's follow-up question is: "${q}"

The case is over, so you may discuss the diagnosis, symptoms, and reasoning freely. Answer clearly and concisely (2-4 sentences), in plain language for a curious learner who isn't a medical professional.`
    } else {
      prompt = `You are a friendly neuroscience tutor inside an educational diagnostic game called Neurole.
A player is mid-way through guessing a clinical case and has NOT solved it yet. They have used ${gs.attemptsUsed} of 5 guesses so far.
Symptoms revealed to them so far:
${shownSymptoms}

The player's question is: "${q}"

CRITICAL RULE: Do NOT reveal, name, confirm, deny, or strongly hint at the specific name of the diagnosis under any circumstances, even if the player asks directly or tries to trick you into confirming a guess. Instead:
- Help them think through the symptoms they've already seen
- Explain relevant neuroscience/anatomy/physiology concepts behind the symptoms in general terms
- Encourage them to consider patterns, without naming or strongly implying the answer
- If they ask "is it X?" or try to get you to confirm/deny a specific condition, politely decline and redirect them to think about the symptom pattern instead, without confirming or denying anything about X
Keep your answer to 2-4 sentences, plain language, encouraging tone.`
    }
    const answer = await askNeuroleAIRaw(prompt) || "I can't reach an AI provider right now — try again in a moment."
    setChatLog(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, text: answer } : msg))
  }, [chatInput])

  const gs = gameStateRef.current
  const dailyStats = getDailyStats()
  const totalSymptoms = gs.symptoms.length || 5

  useEffect(() => {
    if (resultModalOpen) {
      const id = startCountdown(null, setCountdownText)
      renderGoogleSignIn('result-google-container', () => {
        const el = document.getElementById('result-google-container')
        if (el) el.innerHTML = `<p class="rmodal-signed">✓ Signed in — streak saved!</p>`
      })
      if (won) {
        const dateKey = dateStrForDayIndex(dayIndex)
        fetchGlobalDailyDistribution(dateKey).then(global => {
          if (global) {
            setGlobalDist(global)
          }
        })
      }
      return () => clearInterval(id)
    }
  }, [resultModalOpen, won, dayIndex])

  const [globalDist, setGlobalDist] = useState(null)
  const distData = globalDist || dailyStats.distribution
  const distLabel = globalDist ? `Guess Distribution — All Players (${globalDist.total.toLocaleString()})` : 'Guess Distribution — Your History'

  const renderDistribution = (dist, label) => {
    if (!dist) return null
    const maxCount = Math.max(1, ...dist)
    return (
      <div>
        <p id="result-distribution-label" className="rmodal-section-label" style={{ marginTop: 16, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</p>
        {dist.map((count, i) => {
          const pct = count ? Math.max(10, Math.round((count / maxCount) * 100)) : 0
          const isThisGame = won && gs.attemptsUsed === i + 1
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ width: 12, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--rm-soft)' }}>{i + 1}</span>
              <div style={{ flex: 1, background: 'var(--rm-track)', borderRadius: 4, overflow: 'hidden', height: 18 }}>
                <div style={{
                  width: pct + '%', minWidth: count ? '22px' : '0',
                  background: isThisGame ? '#8B2635' : 'var(--rm-soft)',
                  height: '100%', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 6, boxSizing: 'border-box'
                }}>
                  {count ? <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, color: '#fff' }}>{count}</span> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main className="wrap case-shell">
      <div id="game-content" style={{ display: 'block' }}>
        {!loaded && <div style={{ textAlign: 'center', padding: 80, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>{isArchive ? `Loading case #${dayIndex + 1}…` : "Loading today's case…"}</div>}

        {sheetWarning && (
          <div id="sheet-warning-banner" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#7A4F00', background: '#FFF8E7', border: '1px solid #F5D78E', borderRadius: 6, padding: '10px 14px', marginBottom: 16, lineHeight: 1.5 }}>{sheetWarning}</div>
        )}

        {noCase && loaded && (
          <div style={{ textAlign: 'center', padding: '48px 20px', maxWidth: 400, margin: '0 auto' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🧠</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, margin: '0 0 10px' }}>{isArchive ? 'Case unavailable' : 'No case today'}</h3>
            <p style={{ fontFamily: "'Outfit',sans-serif", color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.7, margin: '0 0 6px' }}>
              {isArchive ? "This archived case couldn't be found." : "Today's case hasn't been added yet."}
            </p>
            <p id="no-case-countdown" style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--neuro-blue-deep)', margin: '0 0 24px' }}>{isArchive ? '' : countdownText}</p>
            <Link className="btn" to={isArchive ? '/archive' : '/neuroanatomy'} style={{ display: 'inline-flex' }}>
              {isArchive ? 'Back to the archive →' : 'Try Map the Brain →'}
            </Link>
          </div>
        )}

        {loaded && !noCase && (
          <div className="case-card" style={shakeForm ? { animation: 'wrongShake .4s ease' } : {}}>
            <div className="case-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 26, fontFamily: 'var(--mono)', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span id="case-number" style={{ fontFamily: 'var(--game-font)', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--neuro-blue-deep)', color: '#fff', padding: '3px 10px', borderRadius: 20 }}>{caseNumber}</span>
                <span id="case-date">{caseDate}</span>
                {isArchive && (
                  <span id="archive-badge" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', border: '1px solid var(--rule)', color: 'var(--ink-soft)', padding: '2px 9px', borderRadius: 20 }}>From the archive</span>
                )}
              </div>
              <div className="attempts-dots" id="attempts-dots" style={{ display: 'flex', gap: 7 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={i < gs.attemptsUsed ? 'used' : ''} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: i < gs.attemptsUsed ? 'var(--signal-red)' : 'var(--rule)',
                    border: '2px solid',
                    borderColor: i < gs.attemptsUsed ? 'var(--signal-red)' : 'var(--rule)',
                    display: 'inline-block',
                    transition: 'all .3s',
                    ...(gs.solved && i === gs.attemptsUsed - 1 ? { background: '#5CB57C', borderColor: '#5CB57C', transform: 'scale(1.3)' } : {})
                  }} />
                ))}
              </div>
            </div>

            <ul className="symptom-log" style={{ listStyle: 'none', margin: '0 0 30px', padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: totalSymptoms }).map((_, i) => (
                <li key={i} className={i < gs.shown ? 'revealed' : 'locked'} style={{
                  border: '1px solid var(--rule)',
                  borderLeft: i < gs.shown ? '5px solid var(--neuro-blue)' : '5px solid var(--rule)',
                  background: i < gs.shown ? 'var(--paper-deep)' : 'transparent',
                  padding: '18px 20px', fontSize: i < gs.shown ? 17.5 : 12.5,
                  lineHeight: 1.55, borderRadius: 2,
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  color: i < gs.shown ? 'inherit' : 'var(--ink-soft)',
                  fontFamily: i < gs.shown ? 'inherit' : 'var(--mono)',
                  letterSpacing: i < gs.shown ? 'normal' : '.06em',
                  textTransform: i < gs.shown ? 'none' : 'uppercase',
                  opacity: i < gs.shown ? 1 : .55
                }}>
                  <span className="hint-num" style={{
                    fontFamily: 'var(--mono)', fontSize: 12,
                    color: i < gs.shown ? 'var(--neuro-blue-deep)' : 'var(--ink-soft)',
                    fontWeight: 600, flexShrink: 0, minWidth: 30
                  }}>Hint {i + 1}</span>
                  <span>{i < gs.shown ? gs.symptoms[i] : 'Locked — make a guess to reveal this hint'}</span>
                </li>
              ))}
            </ul>

            <div id="guess-area" style={{ display: gs.solved || gs.attemptsUsed >= 5 ? 'none' : 'block' }}>
              <form className="guess-row" id="guess-form" onSubmit={handleGuess} style={{ position: 'relative', display: 'flex', gap: 10, marginBottom: 16 }}>
                <input type="text" id="guess-input" placeholder="Type your diagnosis…" autoComplete="off"
                  value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown}
                  style={{ flex: 1, fontFamily: 'var(--serif-body)', fontSize: 16, padding: '14px 16px', border: '1.5px solid var(--ink-soft)', background: '#fff', height: 52, boxSizing: 'border-box' }} />
                <div className={`autocomplete-list${autocompleteOpen ? ' open' : ''}`} style={{
                  position: 'absolute', top: '100%', left: 0, right: 84,
                  background: '#fff', border: '1.5px solid var(--ink-soft)', borderTop: 'none',
                  maxHeight: 240, overflowY: 'auto', zIndex: 40,
                  boxShadow: '0 10px 20px rgba(0,0,0,.08)',
                  display: autocompleteOpen ? 'block' : 'none'
                }}>
                  {autocompleteMatches.map((name, i) => (
                    <div key={name} role="option" className={i === activeIndex ? 'active' : ''}
                      onMouseDown={(e) => { e.preventDefault(); handleAutocompleteSelect(name) }}
                      style={{ padding: '11px 16px', fontFamily: 'var(--serif-body)', fontSize: 15.5, cursor: 'pointer', borderBottom: '1px solid var(--paper-deep)', background: i === activeIndex ? 'var(--paper-deep)' : '' }}>
                      {name}
                    </div>
                  ))}
                </div>
                <button className="btn" type="submit" aria-label="Submit diagnosis" title="Submit" style={{ fontSize: 18, padding: '0 20px', height: 52, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </form>
              {closestNote && <div className="closest-note" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', margin: '-8px 0 18px' }}>{closestNote}</div>}
              <div className="past-guesses" id="past-guesses" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {pastGuesses.map((g, i) => {
                  const cat = getDisorderCategory(g)
                  return (
                    <div key={i} className="wrong-guess-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(168,68,58,.06)', border: '1.5px solid rgba(168,68,58,.25)', borderRadius: 10, padding: '11px 16px' }}>
                      <span className="wrong-guess-name" style={{ fontFamily: 'var(--game-font)', fontSize: 17, fontWeight: 700, color: 'var(--signal-red)', textDecoration: 'line-through', textDecorationColor: 'rgba(168,68,58,.5)', flex: 1 }}>{g}</span>
                      <span className="wrong-guess-cat" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(168,68,58,.75)', background: 'rgba(168,68,58,.1)', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>{cat}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {gs.solved || gs.attemptsUsed >= 5 ? (
              <div id="result-area">
                <div className={`result-banner${gs.solved ? '' : ' fail'}`} style={{ padding: '22px 24px', marginTop: 10, borderLeft: gs.solved ? '5px solid #5C8C72' : '5px solid var(--signal-red)', background: 'var(--paper-deep)' }}>
                  {gs.solved ? (
                    <><h4 style={{ margin: '0 0 8px', fontFamily: 'var(--serif-display)', fontSize: 23 }}>Correct — it's {gs.answer}.</h4><p style={{ fontSize: 16, lineHeight: 1.6 }}>{gs.explanation}</p></>
                  ) : (
                    <><h4 style={{ margin: '0 0 8px', fontFamily: 'var(--serif-display)', fontSize: 23 }}>The diagnosis was {gs.answer}.</h4><p style={{ fontSize: 16, lineHeight: 1.6 }}>{gs.explanation}</p></>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {loaded && !noCase && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 18, textAlign: 'center' }}>
            Educational use only — not medical advice.
          </p>
        )}
      </div>

      {wrongFlash && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: '#fff', border: '2.5px solid #8B2635', borderRadius: 12,
          opacity: 1, pointerEvents: 'none', zIndex: 500, textAlign: 'center',
          minWidth: 220, maxWidth: '82vw', padding: '18px 28px 14px',
          boxShadow: '0 8px 30px rgba(0,0,0,.16)'
        }}>
          <div style={{ fontFamily: "'Libre Baskerville',Georgia,serif", fontWeight: 700, fontSize: 'clamp(20px,5vw,30px)', color: '#8B2635', lineHeight: 1.2, wordBreak: 'break-word' }}>{wrongFlash}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B2635', marginTop: 6, opacity: .7 }}>Incorrect</div>
        </div>
      )}

      <button className="chat-fab" id="case-chat-fab" aria-label="Explain this case" onClick={() => setChatOpen(true)}
        style={{ position: 'fixed', bottom: 26, right: 26, height: 50, padding: '0 22px 0 18px', borderRadius: 30, background: 'var(--neuro-blue-bright)', color: '#fff', border: 'none', display: loaded && !noCase ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 22px rgba(0,0,0,.18)', fontFamily: 'var(--mono)', fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', zIndex: 60 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Explain
      </button>

      <div className={`chat-backdrop${chatOpen ? ' open' : ''}`} style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,25,.5)', display: chatOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) setChatOpen(false) }}>
        <div className="chat-panel" style={{ width: 440, maxWidth: '100%', maxHeight: '80vh', background: 'var(--paper)', border: '2px solid var(--ink)', display: 'flex', flexDirection: 'column' }}>
          <div className="chat-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--serif-display)', fontSize: 19 }}>Ask about this case</h4>
            <button className="close" onClick={() => setChatOpen(false)} style={{ position: 'static', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)', lineHeight: 1 }}>✕</button>
          </div>
          <div className="chat-body" style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
            <div className="chat-log" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
              {chatLog.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`} style={{
                  fontSize: 14.5, padding: '9px 12px', borderRadius: 3,
                  background: msg.role === 'user' ? 'var(--paper-deep)' : '#fff',
                  border: msg.role === 'ai' ? '1px solid var(--rule)' : 'none',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>{msg.text}</div>
              ))}
            </div>
          </div>
          <form className="chat-ask-row" onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--rule)' }}>
            <input type="text" id="case-chat-input" placeholder="e.g. why does this fit the symptoms?"
              value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              style={{ flex: 1, padding: '10px 11px', border: '1px solid var(--ink-soft)', fontFamily: 'var(--serif-body)' }} />
            <button className="btn" type="submit">Ask</button>
          </form>
        </div>
      </div>

      <div className={`modal-backdrop rmodal-backdrop${resultModalOpen ? ' open' : ''}`} id="result-modal"
        style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,25,.5)', display: resultModalOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
        onClick={(e) => { if (e.target.id === 'result-modal') setResultModalOpen(false) }}>
        <div className="rmodal-card" style={{ background: '#fff', maxWidth: 480, width: '100%', borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 40px rgba(0,0,0,.22)' }}>
          <div className="rmodal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
            <span className="rmodal-title" style={{ fontFamily: 'var(--serif-display)', fontSize: 18, fontWeight: 700 }}>The Daily Case</span>
            <button className="rmodal-close" aria-label="Close" onClick={() => setResultModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
          </div>

          <div className="rmodal-hero" style={{ textAlign: 'center', padding: '24px 20px 12px' }}>
            <div className="rmodal-icon" style={{ marginBottom: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#8B2635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}>
                <polyline points="2,12 5,12 7,5 9,19 11,9 13,15 15,12 22,12" />
              </svg>
            </div>
            <h3 className="rmodal-headline" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, margin: '8px 0 4px' }}>{won ? 'Diagnosed.' : 'Not this time.'}</h3>
            <p className="rmodal-sub" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
              {won ? `${gs.answer} — ${gs.attemptsUsed} ${gs.attemptsUsed === 1 ? 'try' : 'tries'}` : `The diagnosis was: ${gs.answer}`}
            </p>
          </div>

          <div className="rmodal-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--rule)' }}>
            {[
              { id: 'stat-played', val: dailyStats.played, label: 'Played' },
              { id: 'stat-win', val: dailyStats.winPct + '%', label: 'Win %' },
              { id: 'stat-streak', val: dailyStats.currentStreak, label: 'Streak' },
              { id: 'stat-maxstreak', val: dailyStats.bestStreak, label: 'Best' }
            ].map(s => (
              <div key={s.id} id={s.id} className="rmodal-stat" style={{ textAlign: 'center', padding: '16px 4px', borderRight: '1px solid var(--rule)' }}>
                <div className="rmodal-stat-val" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, fontWeight: 700, color: 'var(--neuro-blue-deep)', lineHeight: 1 }}>{s.val}</div>
                <div className="rmodal-stat-label" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rmodal-section" style={{ padding: '16px 20px' }}>
            <div id="result-grid" className="rmodal-grid" style={{ textAlign: 'center', fontSize: 24, letterSpacing: 4, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const used = gs.attemptsUsed || 0
                if (i < used - (won ? 1 : 0)) return '🟥'
                else if (i === used - 1 && won) return '🟩'
                else return '⬜'
              }).join('')}
            </div>
            {renderDistribution(distData, distLabel)}
          </div>

          <div className="rmodal-section" style={{ padding: '0 20px 16px', textAlign: 'center' }}>
            <p className="rmodal-countdown" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
              {isArchive
                ? <Link to="/archive" style={{ color: 'inherit' }}>← Back to the archive</Link>
                : countdownText}
            </p>
            <button type="button" id="share-btn" className="rmodal-cta" onClick={handleShare}
              style={{ fontFamily: 'var(--mono)', fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', padding: '11px 20px', border: '1.5px solid var(--ink)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', borderRadius: 8 }}>Share ↗</button>
            <div id="result-google-container" style={{ marginTop: 12 }}></div>
          </div>

          <div className="rmodal-games" style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--rule)' }}>
            <p className="rmodal-section-label" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12 }}>Play Today's Games</p>
            <div className="rmodal-games-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link to="/neuroanatomy" className="rmodal-game-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--rule)', textDecoration: 'none', color: 'inherit' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6B4F94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, flexShrink: 0 }}>
                  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                  <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
                </svg>
                <div>
                  <div className="rmodal-game-title" style={{ fontFamily: 'var(--serif-display)', fontSize: 14, fontWeight: 600 }}>Map the Brain</div>
                  <div className="rmodal-game-sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)' }}>Identify regions</div>
                </div>
              </Link>
              <Link to="/archive" className="rmodal-game-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--rule)', textDecoration: 'none', color: 'inherit' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--rm-soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, flexShrink: 0 }}>
                  <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2.5h6v3H9z" /><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
                </svg>
                <div>
                  <div className="rmodal-game-title" style={{ fontFamily: 'var(--serif-display)', fontSize: 14, fontWeight: 600 }}>Case Archive</div>
                  <div className="rmodal-game-sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)' }}>Past cases</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
