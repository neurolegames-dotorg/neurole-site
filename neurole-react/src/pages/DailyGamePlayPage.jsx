import pageStyle from './styles/DailyGamePlayPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import Portal from '../components/Portal';
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { NEURO_DISORDERS, FALLBACK_CASES } from '../games-data'
import {
  parseCSV, getDayIndex, dateStrForDayIndex,
  checkAnswer, findClosestKnownDisorder,
  startCountdown, getDisorderCategory, askNeuroleAIRaw, explainWrongGuess,
  getSavedDailyCompletionForIndex, saveDailyCompletionForIndex, getDailyStats,
  submitGlobalDailyResult, fetchGlobalDailyDistribution,
  renderGoogleSignIn
} from '../utils/helpers'

const MAX_ATTEMPTS = 5
// Long enough for a real clinical question, short enough that the box is not a
// free channel into the AI provider. The Worker caps it again server-side.
const MAX_QUESTION_CHARS = 300

/** The prompt tells the model never to name the diagnosis while the case is
 *  open. A prompt is an instruction, not a guarantee — a determined player can
 *  usually talk a model into breaking one. This is the guarantee: the answer
 *  and its accepted synonyms are stripped out of the reply before it is shown,
 *  so even a model that gives the game away cannot land it on screen. */
function redactDiagnosis(text, answer, synonyms) {
  if (!text) return text
  const terms = [answer, ...(synonyms || [])]
    .map(t => (t || '').trim())
    // Very short synonyms ("MS", "ALS") appear inside ordinary words; matching
    // them whole-word only keeps the redaction from shredding the sentence.
    .filter(t => t.length >= 2)
    .sort((a, b) => b.length - a.length)
  let out = text
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '———')
  }
  return out
}

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
    symptoms: [], answer: '', synonyms: [], explanation: '', author: '',
    shown: 1, attemptsUsed: 0, guesses: [], solved: false, alreadyCompletedToday: false
  })
  const [inputValue, setInputValue] = useState('')
  const [inputMode, setInputMode] = useState('guess')
  const [autocompleteMatches, setAutocompleteMatches] = useState([])
  const [autocompleteOpen, setAutocompleteOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // One entry per spent guess, in order — this is what fills the Diagnosis
  // boxes. The winning guess is included, flagged correct.
  const [guessLog, setGuessLog] = useState([])
  // Asked questions and their answers, shown under the hints in Assessment.
  const [qaLog, setQaLog] = useState([])
  const [closestNote, setClosestNote] = useState('')
  const [caseDate, setCaseDate] = useState('—')
  const [caseNumber, setCaseNumber] = useState('')
  const [resultModalOpen, setResultModalOpen] = useState(false)
  const [won, setWon] = useState(false)
  const [countdownText, setCountdownText] = useState('')
  const [wrongFlash, setWrongFlash] = useState('')
  const [sheetWarning, setSheetWarning] = useState('')
  const [shakeRow, setShakeRow] = useState(false)
  const [correctFlash, setCorrectFlash] = useState(false)
  const [noCase, setNoCase] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [resultTab, setResultTab] = useState('dist')
  // Live-generated note on what the last wrong guess actually is.
  const [guessExplain, setGuessExplain] = useState(null)

  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState
  const guessExplainTokenRef = useRef(0)
  const inputRef = useRef(null)
  const assessmentRef = useRef(null)

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
    let symptoms = [], answer = '', synonyms = [], explanation = '', author = ''

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
          // col 9 = author, added to the sheet layout upstream
          author = (row[9] || '').trim()
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
      symptoms, answer, synonyms, explanation, author,
      shown: 1, attemptsUsed: 0, guesses: [], solved: false, alreadyCompletedToday: false
    }

    if (saved) {
      newState.answer = saved.answer
      newState.explanation = saved.explanation
      newState.author = saved.author || author
      newState.attemptsUsed = saved.attemptsUsed
      newState.solved = saved.won
      newState.shown = symptoms.length
      newState.alreadyCompletedToday = true
      // Coming back to a finished case (back button, reload, revisit) lands
      // straight on the result popup — win or lose, matching the static site.
      setWon(saved.won)
      setResultModalOpen(true)
      if (saved.won && !isArchive) {
        submitGlobalDailyResult(dateStrForDayIndex(dayIndex), saved.attemptsUsed)
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
      if (gs.solved || gs.attemptsUsed >= MAX_ATTEMPTS) return
      setGameState(prev => {
        if (prev.shown < prev.symptoms.length) {
          return { ...prev, shown: Math.min(prev.shown + 1, prev.symptoms.length) }
        }
        return prev
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [loaded])

  // Keep the newest Q&A in view as it arrives.
  useEffect(() => {
    const el = assessmentRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [qaLog])

  // Declared before handleSubmit, which lists them as dependencies — a
  // useCallback referenced in a dep array must already be initialised.
  const showResult = useCallback((w, gs) => {
    const state = gs || gameStateRef.current
    setWon(w)
    saveDailyCompletionForIndex(dayIndex, w, state.attemptsUsed, state.answer, state.explanation, state.author)
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

  const submitQuestion = useCallback(async (question) => {
    const gs = gameStateRef.current
    const entryId = Date.now() + Math.random()
    setQaLog(prev => [...prev, { id: entryId, q: question, a: '', pending: true }])

    const gameFinished = gs.solved || gs.attemptsUsed >= MAX_ATTEMPTS
    const shownSymptoms = gs.symptoms.slice(0, gs.shown).map((s, i) => `${i + 1}. ${s}`).join('\n')

    let prompt
    if (gameFinished) {
      prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
The player just finished a diagnostic case. The correct diagnosis was: "${gs.answer}".
Explanation given to the player: "${gs.explanation}"
The player's follow-up question is: "${question}"

The case is over, so you may discuss the diagnosis, symptoms, and reasoning freely. Answer clearly and concisely (2-4 sentences), in plain language for a curious learner who isn't a medical professional.`
    } else {
      prompt = `You are a friendly neuroscience tutor inside an educational diagnostic game called Neurole.
A player is mid-way through guessing a clinical case and has NOT solved it yet. They have used ${gs.attemptsUsed} of ${MAX_ATTEMPTS} guesses so far.
Symptoms revealed to them so far:
${shownSymptoms}

The player's question is: "${question}"

CRITICAL RULE: Do NOT reveal, name, confirm, deny, or strongly hint at the specific name of the diagnosis under any circumstances, even if the player asks directly or tries to trick you into confirming a guess. Instead:
- Answer factual questions about the patient (medications, history, examination findings) in general terms
- Help them think through the symptoms they've already seen
- Explain relevant neuroscience/anatomy/physiology concepts behind the symptoms in general terms
- Encourage them to consider patterns, without naming or strongly implying the answer
- If they ask "is it X?" or try to get you to confirm/deny a specific condition, politely decline and redirect them to think about the symptom pattern instead, without confirming or denying anything about X
Keep your answer to 2-4 sentences, plain language, encouraging tone.`
    }

    let answer = await askNeuroleAIRaw(prompt)
      || "I can't reach an AI provider right now — try again in a moment."
    // Belt and braces: strip the diagnosis out of the reply while the case is
    // still open, whatever the model decided to say.
    if (!gameFinished) {
      answer = redactDiagnosis(answer, gs.answer, gs.synonyms)
    }
    setQaLog(prev => prev.map(e => e.id === entryId ? { ...e, a: answer, pending: false } : e))
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    const gs = gameStateRef.current
    const finished = gs.solved || gs.attemptsUsed >= MAX_ATTEMPTS
    const text = inputValue.trim()
    if (!text) return
    closeAutocomplete()

    // Once the case is over the only thing the row can do is ask, whatever the
    // toggle last said. Guarding on the state rather than the toggle means a
    // stale mode cannot spend a guess that no longer exists.
    if (inputMode === 'ask' || finished) {
      setInputValue('')
      submitQuestion(text.slice(0, MAX_QUESTION_CHARS))
      return
    }

    if (checkAnswer(text, gs)) {
      // attemptsUsed counts *wrong* guesses, so a first-try win leaves it at 0
      // and the popup reads "0 tries". Floor it at 1, exactly as the static
      // site does. Deliberately not switched to a true guess count: that would
      // shift every new result one bucket away from the distribution already
      // collected from live players.
      const newState = { ...gs, solved: true, attemptsUsed: Math.max(gs.attemptsUsed, 1) }
      setGameState(newState)
      gameStateRef.current = newState
      setGuessLog(prev => [...prev, { text, correct: true }])
      setClosestNote('')
      setGuessExplain(null)
      setCorrectFlash(true)
      setTimeout(() => setCorrectFlash(false), 600)
      showResult(true, newState)
    } else {
      const newAttempts = gs.attemptsUsed + 1
      const newGuesses = [...gs.guesses, text]
      const newState = {
        ...gs,
        attemptsUsed: newAttempts,
        guesses: newGuesses,
        shown: newAttempts >= MAX_ATTEMPTS ? gs.symptoms.length : Math.min(gs.shown + 1, gs.symptoms.length)
      }
      setGameState(newState)
      gameStateRef.current = newState
      setGuessLog(prev => [...prev, { text, correct: false }])
      setShakeRow(true)
      setTimeout(() => setShakeRow(false), 450)
      setWrongFlash(text)
      setTimeout(() => setWrongFlash(''), 1600)

      const closest = findClosestKnownDisorder(text, gs.answer, NEURO_DISORDERS)
      setClosestNote(closest ? `Read as: "${closest}" — not quite right.` : '')

      // Live note on what the guess actually is. Token-guarded so a slow reply
      // for an earlier guess can't overwrite the note for a newer one.
      const myToken = ++guessExplainTokenRef.current
      setGuessExplain({ pending: true, text: '' })
      explainWrongGuess(text, gs.answer).then(explainText => {
        if (myToken !== guessExplainTokenRef.current) return
        setGuessExplain(explainText ? { pending: false, text: explainText } : null)
      }).catch(() => {
        if (myToken === guessExplainTokenRef.current) setGuessExplain(null)
      })

      if (newAttempts >= MAX_ATTEMPTS) {
        showResult(false, newState)
      }
    }
    setInputValue('')
  }, [inputValue, inputMode, showResult, closeAutocomplete, submitQuestion])

  const handleModeChange = useCallback((mode) => {
    setInputMode(mode)
    closeAutocomplete()
    // Switching mode reinterprets whatever is half-typed, so clear it rather
    // than send a diagnosis to the tutor or a question to the checker.
    setInputValue('')
    inputRef.current?.focus()
  }, [closeAutocomplete])

  const handleInputChange = useCallback((e) => {
    const val = e.target.value
    setInputValue(val)
    // The disorder list is a list of answers — offering it while the player is
    // composing a question would hand them the answer key.
    const gs = gameStateRef.current
    const finished = gs.solved || gs.attemptsUsed >= MAX_ATTEMPTS
    if (inputMode !== 'guess' || finished) { closeAutocomplete(); return }
    const trimmed = val.trim().toLowerCase()
    if (!trimmed) { closeAutocomplete(); return }
    const matches = NEURO_DISORDERS.filter(name => name.toLowerCase().includes(trimmed))
    setAutocompleteMatches(matches.slice(0, 8))
    setAutocompleteOpen(matches.length > 0)
    setActiveIndex(-1)
  }, [inputMode, closeAutocomplete])

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
    inputRef.current?.focus()
  }, [closeAutocomplete])

  const handleShare = useCallback(async () => {
    const gs = gameStateRef.current
    const total = MAX_ATTEMPTS
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
      ? `${heading}\n${tries}\n\n${grid}\n\nI diagnosed it in ${used} ${used === 1 ? 'try' : 'tries'}. Can you beat that?\nneurole.org/daily-game`
      : `${heading}\n${tries}\n\n${grid}\n\nThis one stumped me. Think you can crack it?\nneurole.org/daily-game`
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url: 'https://neurole.org/daily-game', title: 'Neurole — The Daily Case' })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    } catch (err) {
      // Dismissing the native share sheet rejects — not an error worth showing.
      console.warn('Neurole: share cancelled or unavailable', err.message)
    }
  }, [dayIndex, isArchive])

  const gs = gameStateRef.current
  const dailyStats = getDailyStats()
  const totalSymptoms = gs.symptoms.length || MAX_ATTEMPTS
  const gameOver = gs.solved || gs.attemptsUsed >= MAX_ATTEMPTS
  // What the row is really doing right now: guessing is impossible once the
  // case is closed, so the toggle reads "Ask" regardless of its last setting.
  const effectiveMode = gameOver ? 'ask' : inputMode

  useEffect(() => {
    if (resultModalOpen) {
      const id = startCountdown(null, setCountdownText)
      renderGoogleSignIn('result-google-container', () => {
        const el = document.getElementById('result-google-container')
        if (el) el.innerHTML = `<p class="rmodal-signed">✓ Signed in — streak saved!</p>`
      })
      // Fetched win or lose — the Compare tab is just as relevant after a
      // loss, and the personal distribution is already on screen either way,
      // so this never delays the popup appearing.
      const dateKey = dateStrForDayIndex(dayIndex)
      fetchGlobalDailyDistribution(dateKey).then(global => {
        if (global && global.total) setGlobalDist(global)
      }).catch(() => {})
      return () => clearInterval(id)
    }
  }, [resultModalOpen, won, dayIndex])

  const [globalDist, setGlobalDist] = useState(null)
  const distData = globalDist || dailyStats.distribution
  const distLabel = globalDist ? `Guess Distribution — All Players (${globalDist.total.toLocaleString()})` : 'Guess Distribution — Your History'

  // Compare tab — how this play stacks up against everyone else today.
  let compareLine = ''
  let globalWinRate = null
  if (globalDist && globalDist.total) {
    const solved = globalDist.d.reduce((a, b) => a + b, 0)
    globalWinRate = Math.round((solved / globalDist.total) * 100) + '%'
    const used = gs.attemptsUsed || 0
    if (won) {
      const worse = globalDist.d.slice(used).reduce((a, b) => a + b, 0) + (globalDist.fail || 0)
      const pct = Math.round((worse / globalDist.total) * 100)
      compareLine = `You solved it in ${used} ${used === 1 ? 'try' : 'tries'} — faster than ${pct}% of today's players.`
    } else {
      const pct = Math.round((solved / globalDist.total) * 100)
      compareLine = `${pct}% of today's players solved it — you'll get the next one.`
    }
  }

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
      <div id="game-content">
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
          <div className={`case-open${correctFlash ? ' correct-flash' : ''}`}>
            <div className="case-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span id="case-number" style={{ fontFamily: 'var(--game-font)', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', background: 'var(--neuro-blue-deep)', color: 'var(--on-accent)', padding: '3px 10px', borderRadius: 20 }}>{caseNumber}</span>
                <span id="case-date">{caseDate}</span>
                {isArchive && (
                  <span id="archive-badge" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', border: '1px solid var(--rule)', color: 'var(--ink-soft)', padding: '2px 9px', borderRadius: 20 }}>From the archive</span>
                )}
                {gs.author && (
                  <span id="case-author-line" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '.03em', textTransform: 'none' }}>By {gs.author}</span>
                )}
              </div>
              <div className="attempts-dots" id="attempts-dots" aria-label={`${gs.attemptsUsed} of ${MAX_ATTEMPTS} guesses used`}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
                  const isWinningDot = gs.solved && i === gs.attemptsUsed - 1
                  const used = i < gs.attemptsUsed
                  return (
                    <span key={i} className={`attempt-dot${isWinningDot ? ' correct' : used ? ' used' : ''}`} />
                  )
                })}
              </div>
            </div>

            <div className="case-columns">
              <div className="diagnosis-col">
                <p className="col-title">Diagnosis</p>
                <div className="diagnosis-boxes" id="diagnosis-boxes">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
                    const entry = guessLog[i]
                    if (!entry) return <div key={i} className="diagnosis-box" />
                    return (
                      <div key={i} className={`diagnosis-box filled${entry.correct ? ' correct' : ''}`}>
                        <span className="diagnosis-guess-name">{entry.text}</span>
                        <span className="diagnosis-guess-cat">
                          {entry.correct ? 'Correct' : getDisorderCategory(entry.text)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {guessExplain && !gs.solved && (
                  <div className="guess-explain" id="guess-explain">
                    <p className="guess-explain-label">Why that&rsquo;s not it</p>
                    <p className="guess-explain-text" id="guess-explain-text">
                      {guessExplain.pending ? 'Thinking…' : guessExplain.text}
                    </p>
                  </div>
                )}
              </div>

              <div className="assessment-col">
                <p className="col-title">Assessment</p>
                <div className="assessment-lines" id="assessment-lines" ref={assessmentRef}>
                  <div id="assessment-hints">
                    {Array.from({ length: totalSymptoms }).map((_, i) => (
                      <div key={i} className={`assessment-line${i < gs.shown ? '' : ' locked'}`}>
                        <span className="hint-num">Hint {i + 1}</span>
                        {i < gs.shown ? gs.symptoms[i] : 'Locked — make a guess to reveal this hint'}
                      </div>
                    ))}
                  </div>
                  <div id="assessment-qa" aria-live="polite">
                    {qaLog.map(entry => (
                      <div key={entry.id} className="assessment-line qa new-reveal">
                        <div className="qa-q">{entry.q}</div>
                        <div className="qa-a">{entry.pending ? 'Thinking…' : entry.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* The row survives the end of the game in ask-only form. Questions
                were previously answered by a floating chat panel, which this
                input replaces — losing the row entirely at the final guess
                would take post-game questions with it, and that is when a
                player most wants to ask what they missed. */}
            <div id="guess-area">
                <div className={`unified-row${shakeRow ? ' shake' : ''}`} id="unified-row">
                  <div className="mode-toggle" id="mode-toggle" role="tablist" aria-label="Guess or ask a question">
                    {!gameOver && (
                      <button type="button" className={`mode-btn${inputMode === 'guess' ? ' active' : ''}`}
                        role="tab" aria-selected={inputMode === 'guess'}
                        onClick={() => handleModeChange('guess')}>Guess</button>
                    )}
                    <button type="button" className={`mode-btn${effectiveMode === 'ask' ? ' active' : ''}`}
                      role="tab" aria-selected={effectiveMode === 'ask'}
                      onClick={() => handleModeChange('ask')}>Ask</button>
                  </div>
                  <form className="unified-form" id="unified-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className={`autocomplete-list${autocompleteOpen ? ' open' : ''}`} role="listbox">
                      {autocompleteMatches.map((name, i) => (
                        <div key={name} role="option" aria-selected={i === activeIndex}
                          className={i === activeIndex ? 'active' : ''}
                          onMouseDown={(e) => { e.preventDefault(); handleAutocompleteSelect(name) }}>
                          {name}
                        </div>
                      ))}
                    </div>
                    <input ref={inputRef} className="unified-input" type="text" id="unified-input"
                      maxLength={effectiveMode === 'ask' ? MAX_QUESTION_CHARS : 80}
                      placeholder={effectiveMode === 'ask' ? 'Ask a question about this case…' : 'Type your diagnosis…'}
                      aria-label={effectiveMode === 'ask' ? 'Ask a question about this case' : 'Type your diagnosis'}
                      autoComplete="off"
                      value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} />
                    <button className="send-btn" type="submit" aria-label={effectiveMode === 'ask' ? 'Send question' : 'Submit diagnosis'} title="Submit">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  </form>
                </div>
                {closestNote && !gameOver && <div className="closest-note" id="closest-note">{closestNote}</div>}
            </div>

            {gameOver && (
              <div id="result-area">
                <div className={`result-banner${gs.solved ? '' : ' fail'}`}>
                  <h4>{gs.solved ? `Correct — it's ${gs.answer}.` : `The diagnosis was ${gs.answer}.`}</h4>
                  <p>{gs.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {loaded && !noCase && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 18, textAlign: 'center' }}>
            Educational use only — not medical advice. Assessment answers may be AI-generated.
          </p>
        )}
      </div>

      {/* Everything below is position:fixed and must escape <main>, which
          carries a transform for the first 250ms of every page — see Portal. */}
      <Portal>
      {wrongFlash && (
        <div id="wrong-flash" style={{
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

      {/* Layout comes entirely from style.css's .rmodal-* rules. The inline
          styles this block used to carry pinned the pre-redesign look and
          silently overrode the full-bleed card, Archivo Black type and
          coloured game cards the client shipped. Don't reintroduce them. */}
      <div className={`modal-backdrop rmodal-backdrop${resultModalOpen ? ' open' : ''}`} id="result-modal"
        style={{ display: resultModalOpen ? 'flex' : 'none' }}
        onClick={(e) => { if (e.target.id === 'result-modal') setResultModalOpen(false) }}>
        <div className="rmodal-card">

          <div className="rmodal-header">
            <span className="rmodal-title">The Daily Case</span>
            <button className="rmodal-close" aria-label="Close" onClick={() => setResultModalOpen(false)}>✕</button>
          </div>

          <div className="rmodal-hero">
            <div className="rmodal-icon" style={{ background: '#fff' }}>
              <img src="/daily-case-icon.png" alt="" width="40" height="43" style={{ objectFit: 'contain' }} />
            </div>
            <h3 className="rmodal-headline">{won ? 'Diagnosed.' : 'Not this time.'}</h3>
            <p className="rmodal-sub">
              {won ? `${gs.answer} — ${gs.attemptsUsed} ${gs.attemptsUsed === 1 ? 'try' : 'tries'}` : `The diagnosis was: ${gs.answer}`}
            </p>
          </div>

          <div className="rmodal-stats">
            {[
              { id: 'stat-played', val: dailyStats.played, label: 'Played' },
              { id: 'stat-win', val: dailyStats.winPct + '%', label: 'Win %' },
              { id: 'stat-streak', val: dailyStats.currentStreak, label: 'Streak' },
              { id: 'stat-maxstreak', val: dailyStats.bestStreak, label: 'Best' }
            ].map(s => (
              <div key={s.id} id={s.id} className="rmodal-stat">
                <div className="rmodal-stat-val">{s.val}</div>
                <div className="rmodal-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rmodal-section">
            <div className="rmodal-tabs">
              <button type="button" className={'rmodal-tab-btn' + (resultTab === 'dist' ? ' active' : '')}
                onClick={() => setResultTab('dist')}>Distribution</button>
              <button type="button" className={'rmodal-tab-btn' + (resultTab === 'compare' ? ' active' : '')}
                onClick={() => setResultTab('compare')}>Compare</button>
            </div>

            {resultTab === 'dist' ? (
              <div id="result-tab-dist">
                <div id="result-grid" className="rmodal-grid">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
                    const used = gs.attemptsUsed || 0
                    if (i < used - (won ? 1 : 0)) return '🟥'
                    else if (i === used - 1 && won) return '🟩'
                    else return '⬜'
                  }).join('')}
                </div>
                {renderDistribution(distData, distLabel)}
              </div>
            ) : (
              <div id="result-tab-compare">
                <p id="result-compare-line" style={{ fontFamily: 'var(--serif-body)', fontSize: 15, color: 'var(--rm-ink)', textAlign: 'center', margin: '8px 0 18px', lineHeight: 1.6 }}>
                  {compareLine || 'Comparing with today’s players…'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                  <div>
                    <div className="rmodal-stat-val" style={{ fontSize: 20 }}>{globalDist ? globalDist.total.toLocaleString() : '—'}</div>
                    <div className="rmodal-stat-label">Players Today</div>
                  </div>
                  <div>
                    <div className="rmodal-stat-val" style={{ fontSize: 20 }}>{globalWinRate ?? '—'}</div>
                    <div className="rmodal-stat-label">Solved It</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(gs.explanation || gs.author) && (
            <div className="rmodal-section" id="result-explanation-section">
              <p className="rmodal-section-label">Why</p>
              {gs.explanation && (
                <p id="result-explanation-text" style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--rm-ink)' }}>{gs.explanation}</p>
              )}
              {gs.author && (
                <p id="result-author-line" style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--rm-soft)' }}>By {gs.author}</p>
              )}
            </div>
          )}

          <div className="rmodal-section">
            <p id="next-case-countdown" className="rmodal-countdown">
              {isArchive
                ? <Link to="/archive" style={{ color: 'inherit' }}>← Back to the archive</Link>
                : countdownText}
            </p>
            <button type="button" id="share-btn" className="rmodal-cta" onClick={handleShare}>Share ↗</button>
            <div id="result-google-container"></div>
          </div>

          <div className="rmodal-games">
            <p className="rmodal-section-label">Play Today's Games</p>
            <div className="rmodal-games-grid">
              <Link to="/neuroanatomy" className="rmodal-game-card rmodal-game-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4.5C5 4.5 3.5 6 3.5 8c0 .9.3 1.7.8 2.3-.6.7-1.1 1.7-1.1 2.7 0 1.8 1.3 3.3 3 3.6.3 1.9 2 3.4 3.9 3.4h.4c.9 0 1.7-.3 2.4-.8" />
                  <path d="M17 4.5c2 0 3.5 1.5 3.5 3.5 0 .9-.3 1.7-.8 2.3.6.7 1.1 1.7 1.1 2.7 0 1.8-1.3 3.3-3 3.6-.3 1.9-2 3.4-3.9 3.4h-.4c-.9 0-1.7-.3-2.4-.8" />
                  <path d="M12 4.5V20" />
                  <circle cx="17.3" cy="6.3" r="1.5" fill="#fff" stroke="none" />
                </svg>
                <div className="rmodal-game-title">Map the Brain</div>
                <div className="rmodal-game-sub">Identify regions</div>
              </Link>
              <Link to="/archive" className="rmodal-game-card rmodal-game-neutral">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2.5h6v3H9z" /><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
                </svg>
                <div className="rmodal-game-title">Case Archive</div>
                <div className="rmodal-game-sub">Past cases</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </Portal>
    </main>
  )
}
