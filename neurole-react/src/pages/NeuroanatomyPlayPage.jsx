import pageStyle from './styles/NeuroanatomyPlayPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useChatFab } from '../hooks/useChatFab';
import Portal from '../components/Portal';
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { FALLBACK_QUESTIONS } from '../games-data'
import {
  findField, parseCSV, askNeuroleAI, shuffle, recordMTBPlay
} from '../utils/helpers'

const LETTERS = ['A', 'B', 'C', 'D']
const CHOICE_KEYS = ['a', 'b', 'c', 'd']

export default function NeuroanatomyPlayPage() {
  usePageStyle(pageStyle);
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fabRef = useChatFab()

  const [fullBank, setFullBank] = useState([])
  const [bankReady, setBankReady] = useState(false)
  const [bankLoading, setBankLoading] = useState(false)

  // Round settings come from the URL and never change in-page.
  const selectedCategory = searchParams.get('category') || 'Random'
  const selectedDifficulty = searchParams.get('difficulty') || 'all'
  const roundCount = searchParams.get('count') || '10'

  const [qBank, setQBank] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [roundResults, setRoundResults] = useState([])
  const [current, setCurrent] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const [specimenAnim, setSpecimenAnim] = useState('')
  const [choicesAnim, setChoicesAnim] = useState('')
  const [scorePop, setScorePop] = useState(false)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiTitle, setAiTitle] = useState('Region')
  const [aiFunction, setAiFunction] = useState('—')
  const [aiChatLog, setAiChatLog] = useState([])
  const [aiChatInput, setAiChatInput] = useState('')

  const [resultOpen, setResultOpen] = useState(false)
  const [resultHeadline, setResultHeadline] = useState('')
  const [resultStats, setResultStats] = useState('')
  const [isNewBest, setIsNewBest] = useState(false)
  const [roundsPlayed, setRoundsPlayed] = useState(1)
  const [avgPct, setAvgPct] = useState(0)
  const [bestPct, setBestPct] = useState(0)
  const [streakCount, setStreakCount] = useState(0)
  const [noQuestions, setNoQuestions] = useState(false)

  const currentRef = useRef(current)
  currentRef.current = current
  const qIndexRef = useRef(qIndex)
  qIndexRef.current = qIndex
  const qBankRef = useRef(qBank)
  qBankRef.current = qBank
  const correctCountRef = useRef(correctCount)
  correctCountRef.current = correctCount

  // Re-entrancy guard in a ref, not state: setBankLoading is async, so a state
  // check can't stop a second call in the same tick (StrictMode double-invokes
  // the effect in dev, which double-fetched the sheet).
  const bankLoadingRef = useRef(false)

  const loadBank = useCallback(async () => {
    if (bankLoadingRef.current) return
    bankLoadingRef.current = true
    setBankLoading(true)
    try {
      let csvTxt = null
      try {
        const age = Date.now() - (parseInt(sessionStorage.getItem('neurole_neuro_csv_time') || '0'))
        if (age < 600000) csvTxt = sessionStorage.getItem('neurole_neuro_csv_cache')
      } catch { /* ignored: storage/API unavailable */ }
      if (!csvTxt) {
        const sheetUrl = window.NEUROLE_CONFIG?.NEUROANATOMY_SHEET_CSV
        if (sheetUrl && !sheetUrl.startsWith('PASTE_')) {
          const res = await fetch(sheetUrl + '&_cb=' + Date.now(), { cache: 'no-store' })
          if (res.ok) {
            csvTxt = await res.text()
            try {
              sessionStorage.setItem('neurole_neuro_csv_cache', csvTxt)
              sessionStorage.setItem('neurole_neuro_csv_time', String(Date.now()))
            } catch { /* ignored: storage/API unavailable */ }
          }
        }
      }
      if (csvTxt) {
        const allRows = parseCSV(csvTxt).filter(r => r.some(c => c.trim()))
        if (allRows.length > 1) {
          const headers = allRows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
          const dataRows = allRows.slice(1)
          const bank = dataRows.map(row => {
            const obj = {}
            headers.forEach((h, i) => obj[h] = (row[i] || '').trim())
            return obj
          }).filter(r => Object.values(r).some(v => v))
          setFullBank(bank.length ? bank : FALLBACK_QUESTIONS)
        } else {
          setFullBank(FALLBACK_QUESTIONS)
        }
      } else {
        setFullBank(FALLBACK_QUESTIONS)
      }
    } catch (err) {
      console.error("Neurole: couldn't load sheet —", err.message)
      setFullBank(FALLBACK_QUESTIONS)
    }
    setBankReady(true)
    setBankLoading(false)
    bankLoadingRef.current = false
  }, [])

  useEffect(() => { loadBank() }, [loadBank])

  const getFilteredBank = useCallback(() => {
    let bank = fullBank
    if (selectedCategory !== 'Random') {
      bank = bank.filter(row => {
        const cat = (findField(row, 'category') || '').trim().toLowerCase()
        return cat === selectedCategory.toLowerCase()
      })
    }
    if (selectedDifficulty !== 'all') {
      bank = bank.filter(row => {
        const diff = (findField(row, 'difficulty') || '').trim().toLowerCase()
        return diff === selectedDifficulty.toLowerCase()
      })
    }
    return bank
  }, [fullBank, selectedCategory, selectedDifficulty])

  function getQuestionImageUrl(q) {
    return q['imageurl'] || q['image_url'] || q['imageURL'] || q['image'] || q['img'] || q['url'] || findField(q, 'image_url') || ''
  }

  const startRound = useCallback(async () => {
    if (!bankReady) {
      if (!bankLoading) loadBank()
      let tries = 0
      while (!bankReady && tries < 30) {
        await new Promise(r => setTimeout(r, 300))
        tries++
      }
    }
    const bank = getFilteredBank()
    if (!bank.length) {
      setNoQuestions(true)
      setLoaded(true)
      return
    }
    const total = roundCount === 'all' ? bank.length : Math.min(parseInt(roundCount, 10), bank.length)
    const shuffled = shuffle(bank).slice(0, total)
    setQBank(shuffled)
    setQIndex(0)
    setCorrectCount(0)
    setRoundResults([])
    setAnswered(false)
    setCurrent(shuffled[0])
    setLoaded(true)
  }, [bankReady, bankLoading, loadBank, getFilteredBank, roundCount])

  useEffect(() => {
    if (bankReady && !loaded && !bankLoading) {
      startRound()
    }
  }, [bankReady, loaded, bankLoading, startRound])

  const showQuestion = useCallback((qIdx) => {
    setAnswered(false)
    const q = qBankRef.current[qIdx]
    setCurrent(q)
    setChoicesAnim('questionFade')
    setTimeout(() => setChoicesAnim(''), 300)
  }, [])

  const handleSelectChoice = useCallback((isCorrect, choiceText) => {
    if (answered) return
    setAnswered(true)
    let newCorrect = correctCountRef.current
    if (isCorrect) newCorrect++
    setCorrectCount(newCorrect)
    correctCountRef.current = newCorrect
    setRoundResults(prev => [...prev, isCorrect])
    setScorePop(true)
    setTimeout(() => setScorePop(false), 350)
    if (!isCorrect) {
      setChoicesAnim('wrong-shake')
      setTimeout(() => setChoicesAnim(''), 400)
    } else {
      setSpecimenAnim('correct-anim')
      setTimeout(() => setSpecimenAnim(''), 500)
    }
    setAiTitle(choiceText)
    const func = findField(currentRef.current, 'function_text') || ''
    setAiFunction(func)
    setAiChatLog([])
  }, [answered])

  const showResult = useCallback(() => {
    const total = qBankRef.current.length
    const cc = correctCountRef.current
    const pct = total ? Math.round((cc / total) * 100) : 0
    setResultHeadline(
      pct === 100 ? 'Perfect round.' : pct >= 80 ? 'Well mapped.' : pct >= 50 ? 'Round complete.' : 'Keep practicing.'
    )
    setResultStats(`${cc}/${total} correct — ${pct}%`)

    const bestKey = 'neurole_neuro_best_' + selectedCategory + '_' + selectedDifficulty + '_' + total
    let newIsBest = false
    let newBestPct = pct
    try {
      const prevBest = parseInt(localStorage.getItem(bestKey) || '0')
      if (cc > prevBest) {
        localStorage.setItem(bestKey, String(cc))
        newIsBest = prevBest > 0
      }
      newBestPct = total ? Math.round((Math.max(cc, prevBest) / total) * 100) : pct
    } catch { /* ignored: storage/API unavailable */ }
    setIsNewBest(newIsBest)
    setBestPct(newBestPct)

    let rPlayed = 1, aPct = pct
    try {
      const raw = localStorage.getItem('neurole_neuro_stats')
      const prev = raw ? JSON.parse(raw) : { rounds: 0, totalPct: 0 }
      rPlayed = prev.rounds + 1
      const totalPct = prev.totalPct + pct
      aPct = Math.round(totalPct / rPlayed)
      localStorage.setItem('neurole_neuro_stats', JSON.stringify({ rounds: rPlayed, totalPct }))
    } catch { /* ignored: storage/API unavailable */ }
    setRoundsPlayed(rPlayed)
    setAvgPct(aPct)

    const streak = recordMTBPlay()
    setStreakCount(streak.count)

    setResultOpen(true)
  }, [selectedCategory, selectedDifficulty])

  const handleNext = useCallback(() => {
    const nextIdx = qIndexRef.current + 1
    if (nextIdx >= qBankRef.current.length) {
      showResult()
      return
    }
    setQIndex(nextIdx)
    qIndexRef.current = nextIdx
    showQuestion(nextIdx)
  }, [showQuestion, showResult])

  const handleNewRound = useCallback(() => {
    setResultOpen(false)
    setQBank([])
    setQIndex(0)
    setCorrectCount(0)
    setCorrectCount(0)
    correctCountRef.current = 0
    setRoundResults([])
    setAnswered(false)
    setLoaded(false)
    startRound()
  }, [startRound])

  const handleResultClose = useCallback(() => {
    navigate('/neuroanatomy')
  }, [navigate])

  const handleAiChatSubmit = useCallback(async (e) => {
    e.preventDefault()
    const q = aiChatInput.trim()
    if (!q) return
    setAiChatLog(prev => [...prev, { role: 'user', text: q }])
    setAiChatInput('')
    setAiChatLog(prev => [...prev, { role: 'ai', text: '…' }])
    const regionName = aiTitle
    const funcText = aiFunction
    const result = await askNeuroleAI({ region: regionName, function_text: funcText, question: q })
    setAiChatLog(prev => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, text: result || 'AI unavailable right now.' } : msg))
  }, [aiChatInput, aiTitle, aiFunction])

  const currentQ = current
  const isLastQuestion = qIndex >= qBank.length - 1

  const getDifficultyClass = (diff) => {
    if (!diff) return ''
    return diff.toLowerCase()
  }

  const imgUrl = currentQ ? getQuestionImageUrl(currentQ) : ''

  if (!loaded) {
    return (
      <main className="wrap game-shell">
        <div style={{ textAlign: 'center', padding: 80, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>Loading questions…</div>
      </main>
    )
  }

  if (noQuestions) {
    return (
      <main className="wrap game-shell">
        <div style={{ textAlign: 'center', padding: '48px 20px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🧠</div>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, margin: '0 0 10px' }}>No questions found</h3>
          <p style={{ fontFamily: "'Outfit',sans-serif", color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.7, margin: '0 0 6px' }}>
            No "{selectedCategory}" questions available — try a different category or difficulty.
          </p>
          <Link className="btn" to="/neuroanatomy" style={{ display: 'inline-flex', marginTop: 20 }}>Back to setup →</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="wrap game-shell">
      <div id="game-split-container">
        <div id="game-play" style={{ display: 'block' }}>
          <div className="progress-bar-wrap" style={{ width: '100%', height: 6, background: 'rgba(145,118,184,.15)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div className="progress-bar-fill" style={{ width: Math.round((qIndex / qBank.length) * 100) + '%', height: '100%', borderRadius: 6, background: 'var(--neuro-blue-deep)', transition: 'width .5s cubic-bezier(.4,0,.2,1)' }}></div>
          </div>
          <div className="game-stats-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="game-stats-left" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="score-tag" style={{ fontFamily: 'var(--game-font)', fontSize: 13, fontWeight: 700, background: 'var(--neuro-blue-deep)', color: '#fff', padding: '5px 14px', borderRadius: 20 }}>Question {qIndex + 1} of {qBank.length}</span>
              <span className={`score-pill${scorePop ? ' pop' : ''}`} style={{ fontFamily: 'var(--game-font)', fontSize: 13, fontWeight: 700, background: '#fff', color: 'var(--ink)', border: '1.5px solid var(--rule)', padding: '5px 14px', borderRadius: 20 }}>Score: {correctCount}/{qIndex + (answered ? 1 : 0)}</span>
            </div>
            {currentQ && findField(currentQ, 'difficulty') && (
              <span className={`difficulty-badge ${getDifficultyClass(findField(currentQ, 'difficulty'))}`}
                style={{ fontFamily: 'var(--game-font)', fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 20, textTransform: 'capitalize' }}>
                {findField(currentQ, 'difficulty')}
              </span>
            )}
          </div>
          <div className="game-row">
            <div className="game-col-left">
              <div className={`specimen${specimenAnim ? ' ' + specimenAnim : ''}`} style={{ background: '#fff', border: '1px solid var(--rule)', padding: 14, marginBottom: 16, position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--neuro-blue-deep)' }}></div>
                {imgUrl ? (
                  <img src={imgUrl} alt="Brain region to identify" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: 'var(--paper-deep)', display: 'block' }}
                    onError={(e) => { console.error('Neurole: image failed ->', e.target.src) }}
                    onLoad={(e) => { console.log('Neurole: image loaded ->', e.target.src) }} />
                ) : (
                  <div style={{ width: '100%', height: 180, background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>Loading image…</div>
                )}
                <p className="cap" style={{ fontFamily: 'var(--game-font)', fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '8px 0 0', textAlign: 'center' }}>Which region is highlighted?</p>
              </div>
              <div className={`choices${choicesAnim ? ' ' + choicesAnim : ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 9 }}>
                {currentQ && (() => {
                  const correctLetter = (findField(currentQ, 'correct_choice') || '').trim().toUpperCase()
                  const rawChoices = CHOICE_KEYS.map(letter => ({
                    text: findField(currentQ, 'choice_' + letter),
                    isCorrect: letter.toUpperCase() === correctLetter
                  }))
                  const shuffledChoices = shuffle(rawChoices)
                  return shuffledChoices.map((choice, idx) => (
                    <button key={idx} className="choice-btn"
                      disabled={answered}
                      onClick={() => handleSelectChoice(choice.isCorrect, choice.text)}
                      style={{
                        fontFamily: 'var(--game-font)', fontSize: 16, fontWeight: 500,
                        border: '2px solid var(--rule)', borderRadius: 12, background: '#fff',
                        padding: '14px 14px 14px 50px', transition: 'all .15s',
                        color: 'var(--ink)', cursor: answered ? 'default' : 'pointer',
                        textAlign: 'left', position: 'relative'
                      }}>
                      <span className="choice-letter" style={{
                        fontFamily: 'var(--game-font)', fontSize: 12, fontWeight: 800,
                        width: 26, height: 26, lineHeight: '26px', borderRadius: 8,
                        background: 'var(--paper-deep)', color: 'var(--ink)',
                        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>{LETTERS[idx]}</span>
                      {choice.text}
                    </button>
                  ))
                })()}
              </div>
              <div className="next-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                {answered && (
                  <button className="btn ghost" onClick={handleNext}
                    style={{ fontFamily: 'var(--game-font)', fontSize: 14, fontWeight: 700, padding: '12px 28px', borderRadius: 12 }}>
                    {isLastQuestion ? 'See results →' : 'Next region →'}
                  </button>
                )}
              </div>
            </div>

            <div className="game-col-right" style={{ display: 'none' }}></div>
          </div>
        </div>
      </div>

      {/* Everything below is position:fixed and must escape <main>, which
          carries a transform for the first 250ms of every page — see Portal.
          Styling lives in .chat-fab in the page stylesheet, as on the Daily
          Case FAB. */}
      <Portal>
      <button ref={fabRef} className="chat-fab show" id="learn-fab" aria-label="Explain this region"
        onClick={() => setAiOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Explain
      </button>

      <div className="learn-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,25,.5)', display: aiOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 20 }}
        onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false) }}>
        <div className="learn-panel" style={{ width: 440, maxWidth: '100%', maxHeight: '82vh', background: 'var(--paper)', border: '2px solid var(--ink)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="learn-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--serif-display)', fontSize: 19 }}>{aiTitle}</h4>
            <button className="close" onClick={() => setAiOpen(false)} style={{ position: 'static', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
          </div>
          <div className="learn-body" style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.7, margin: '0 0 12px' }}>{aiFunction}</p>
            <div className="synapse-rule" style={{ margin: '14px 0' }}><span className="node"></span><span className="node"></span><span className="node"></span></div>
            <p className="score-tag" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', background: 'var(--paper-deep)', border: '1px solid var(--rule)', padding: '4px 11px', borderRadius: 20, display: 'inline-block' }}>Ask a question</p>
            <div className="chat-log" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {aiChatLog.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.role}`} style={{
                  fontSize: 14.5, padding: '9px 12px', borderRadius: 3,
                  background: msg.role === 'user' ? 'var(--paper-deep)' : '#fff',
                  border: msg.role === 'ai' ? '1px solid var(--rule)' : 'none',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>{msg.text}</div>
              ))}
            </div>
          </div>
          <form className="ask-row" onSubmit={handleAiChatSubmit} style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--rule)' }}>
            <input type="text" placeholder="e.g. what happens if this is damaged?"
              value={aiChatInput} onChange={(e) => setAiChatInput(e.target.value)}
              style={{ flex: 1, padding: '10px 11px', border: '1px solid var(--ink-soft)', fontFamily: 'var(--serif-body)' }} />
            <button className="btn" type="submit">Ask</button>
          </form>
        </div>
      </div>

      <div className={`modal-backdrop${resultOpen ? ' open' : ''}`} id="neuro-result-modal"
        style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,25,.5)', display: resultOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
        onClick={(e) => { if (e.target === e.currentTarget) handleResultClose() }}>
        <div className="rmodal-card" style={{ background: '#fff', maxWidth: 480, width: '100%', borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 40px rgba(0,0,0,.22)' }}>
          <div className="rmodal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--rule)' }}>
            <span className="rmodal-title" style={{ fontFamily: 'var(--serif-display)', fontSize: 18, fontWeight: 700 }}>Map the Brain</span>
            <button className="rmodal-close" aria-label="Close" onClick={handleResultClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
          </div>
          <div className="rmodal-hero" style={{ textAlign: 'center', padding: '24px 20px 12px' }}>
            <div className="rmodal-icon" style={{ marginBottom: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B4F94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}>
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
              </svg>
            </div>
            <h3 className="rmodal-headline" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, margin: '8px 0 4px' }}>{resultHeadline}</h3>
            <p className="rmodal-sub" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>{resultStats}</p>
          </div>
          {isNewBest && (
            <div id="neuro-best-banner" style={{ padding: '10px 24px', textAlign: 'center', borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--neuro-blue-deep)' }}>🏆 New personal best for this round type!</span>
            </div>
          )}
          <div className="rmodal-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--rule)' }}>
            <div className="rmodal-stat" style={{ textAlign: 'center', padding: '16px 4px', borderRight: '1px solid var(--rule)' }}>
              <div className="rmodal-stat-val" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, fontWeight: 700, color: 'var(--neuro-blue-deep)', lineHeight: 1 }}>{roundsPlayed}</div>
              <div className="rmodal-stat-label" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 4 }}>Rounds</div>
            </div>
            <div className="rmodal-stat" style={{ textAlign: 'center', padding: '16px 4px', borderRight: '1px solid var(--rule)' }}>
              <div className="rmodal-stat-val" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, fontWeight: 700, color: 'var(--neuro-blue-deep)', lineHeight: 1 }}>{avgPct}%</div>
              <div className="rmodal-stat-label" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 4 }}>Avg Score</div>
            </div>
            <div className="rmodal-stat" style={{ textAlign: 'center', padding: '16px 4px', borderRight: '1px solid var(--rule)' }}>
              <div className="rmodal-stat-val" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, fontWeight: 700, color: 'var(--neuro-blue-deep)', lineHeight: 1 }}>{streakCount}</div>
              <div className="rmodal-stat-label" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 4 }}>Streak</div>
            </div>
            <div className="rmodal-stat" style={{ textAlign: 'center', padding: '16px 4px' }}>
              <div className="rmodal-stat-val" style={{ fontFamily: 'var(--serif-display)', fontSize: 26, fontWeight: 700, color: 'var(--neuro-blue-deep)', lineHeight: 1 }}>{bestPct}%</div>
              <div className="rmodal-stat-label" style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 4 }}>Best</div>
            </div>
          </div>
          <div className="rmodal-section" style={{ padding: '16px 20px' }}>
            <div className="rmodal-grid" style={{ textAlign: 'center', fontSize: 24, letterSpacing: 4, marginBottom: 12 }}>
              {roundResults.map(r => r ? '🟩' : '🟥').join('')}
            </div>
            <p className="rmodal-section-label" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 16, textAlign: 'center' }}>Round Results</p>
          </div>
          <div className="rmodal-section" style={{ padding: '0 20px 16px', textAlign: 'center' }}>
            <button type="button" className="rmodal-cta" onClick={handleNewRound}
              style={{ fontFamily: 'var(--mono)', fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', padding: '11px 20px', border: '1.5px solid var(--ink)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', borderRadius: 8, width: '100%', marginBottom: 8 }}>
              Play Another Round ↗
            </button>
            <div id="neuro-google-container" style={{ marginTop: 8 }}></div>
          </div>
          <div className="rmodal-games" style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--rule)' }}>
            <p className="rmodal-section-label" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12 }}>Play Today's Games</p>
            <div className="rmodal-games-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link to="/daily-game" className="rmodal-game-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--rule)', textDecoration: 'none', color: 'inherit' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#8B2635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, flexShrink: 0 }}>
                  <polyline points="2,12 5,12 7,5 9,19 11,9 13,15 15,12 22,12" />
                </svg>
                <div>
                  <div className="rmodal-game-title" style={{ fontFamily: 'var(--serif-display)', fontSize: 14, fontWeight: 600 }}>The Daily Case</div>
                  <div className="rmodal-game-sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)' }}>Diagnose the case</div>
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
            <button className="rmodal-close-text" onClick={handleResultClose}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: 'var(--rm-soft)', cursor: 'pointer', padding: '12px 6px 0', textAlign: 'center', letterSpacing: '.03em' }}>Dismiss</button>
          </div>
        </div>
      </div>
      </Portal>
    </main>
  )
}
