import pageStyle from './styles/SynapsePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Portal from '../components/Portal';
import {
  GROUP_ORDER, GROUP_COLORS, MAX_MISTAKES,
  loadSynapsePuzzle, getSynapseSaved, saveSynapseCompletion,
  getSynapseStats, synShuffle, synShareText,
} from '../utils/synapse';

// Mirrors synapse.html: one page holding a start screen and the board, swapped
// in place. The puzzle is only fetched when Play is pressed, exactly as the
// static page does — landing on /synapse costs no network request.
export default function SynapsePage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: 'The Synapse — A Daily Word-Connection Puzzle | Neurole',
    description: 'A daily word-connection puzzle about the brain. Find the four hidden groups. Free, no account needed.',
    canonical: '/synapse',
  });

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [howToPlay, setHowToPlay] = useState(false);

  const [groups, setGroups] = useState({});
  const [dateKey, setDateKey] = useState('');
  const [order, setOrder] = useState([]);          // tile text, display order
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);        // group colours, in solve order
  const [mistakes, setMistakes] = useState(0);
  const [shaking, setShaking] = useState([]);
  const [msg, setMsg] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);      // { won } once the modal is due
  const [stats, setStats] = useState(null);
  const [shareLabel, setShareLabel] = useState('Share Result');

  // Kept in refs, not state: the submit handler reads them synchronously and
  // neither is ever rendered.
  const tilesRef = useRef([]);
  const guessHistory = useRef([]);
  const wrongGuesses = useRef([]);
  const timers = useRef([]);

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const showMsg = useCallback((text, ms) => {
    setMsg(text);
    if (ms) later(() => setMsg(cur => (cur === text ? '' : cur)), ms);
  }, [later]);

  const openResult = useCallback((won) => {
    setStats(getSynapseStats());
    setResult({ won });
  }, []);

  const play = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const puzzle = await loadSynapsePuzzle();
      tilesRef.current = puzzle.tiles;
      setGroups(puzzle.groups);
      setDateKey(puzzle.dateKey);

      const saved = getSynapseSaved(puzzle.dateKey);
      if (saved) {
        // Finished earlier today — show the full board and the result, not a
        // replayable game.
        setSolved(GROUP_ORDER.filter(c => puzzle.groups[c]));
        setMistakes(saved.mistakes || 0);
        setOrder([]);
        setGameOver(true);
        setStarted(true);
        later(() => openResult(!!saved.won), 300);
      } else {
        setOrder(synShuffle(puzzle.tiles.map(t => t.text)));
        setStarted(true);
      }
    } catch (err) {
      console.warn('Neurole Synapse: could not load puzzle —', err.message);
      setLoadError("Could not load today's puzzle. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTile = (text) => {
    if (gameOver) return;
    setSelected(prev =>
      prev.includes(text) ? prev.filter(t => t !== text)
        : prev.length < 4 ? [...prev, text] : prev);
  };

  const endGame = (won, ctx) => {
    setGameOver(true);
    if (!won) {
      // Reveal the groups the player never found, in sheet order.
      setSolved([...ctx.solved, ...GROUP_ORDER.filter(c => !ctx.solved.includes(c) && groups[c])]);
      setOrder([]);
    }
    saveSynapseCompletion(dateKey, won, ctx.mistakes);
    later(() => openResult(won), won ? 500 : 900);
  };

  const submit = () => {
    if (selected.length !== 4 || gameOver) return;

    const sorted = selected.slice().sort();
    const repeat = wrongGuesses.current.some(g => g.every((t, i) => t === sorted[i]));
    if (repeat) { showMsg('Already guessed!', 1500); return; }

    const involved = selected.map(text => tilesRef.current.find(t => t.text === text)?.group);
    guessHistory.current.push(involved);
    const unique = [...new Set(involved)];

    if (unique.length === 1) {
      const color = unique[0];
      const nextSolved = [...solved, color];
      setSolved(nextSolved);
      setOrder(prev => prev.filter(t => !selected.includes(t)));
      setSelected([]);
      showMsg('');
      if (nextSolved.length === 4) endGame(true, { solved: nextSolved, mistakes });
    } else {
      const next = mistakes + 1;
      setMistakes(next);
      wrongGuesses.current.push(sorted);

      const counts = {};
      involved.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      if (Math.max(...Object.values(counts)) === 3) showMsg('One away…', 1800);

      setShaking(selected);
      later(() => setShaking([]), 400);
      later(() => {
        setSelected([]);
        if (next >= MAX_MISTAKES) endGame(false, { solved, mistakes: next });
      }, 450);
    }
  };

  const share = async () => {
    const text = synShareText(dateKey, guessHistory.current);
    const url = 'https://neurole.org/synapse';
    try {
      if (navigator.share) {
        await navigator.share({ text, url, title: 'The Synapse' });
      } else {
        await navigator.clipboard.writeText(text);
        setShareLabel('Copied! ✓');
        later(() => setShareLabel('Share Result'), 2000);
      }
    } catch { /* dismissed or clipboard unavailable */ }
  };

  const headline = result?.won
    ? (mistakes === 0 ? 'Perfect!' : 'Solved it!')
    : 'Next time.';
  const resultSub = result?.won
    ? (mistakes === 0 ? 'No mistakes — well done.' : `${mistakes} ${mistakes === 1 ? 'mistake.' : 'mistakes.'}`)
    : "Here were today's groups.";

  return (
    <>
      <main className="wrap" style={{ padding: 0, maxWidth: 'none' }}>

        {!started && (
          <div id="syn-start" style={{ maxWidth: 460, margin: '0 auto', padding: '70px 20px 60px', textAlign: 'center' }}>
            <img src="/synapse-icon.png" alt="The Synapse" style={{ width: 88, height: 'auto', margin: '0 auto 20px', display: 'block' }} />
            <span className="section-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Daily · Word Puzzle</span>
            <h1 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 'clamp(32px,6vw,44px)', fontWeight: 700, margin: '6px 0 14px', letterSpacing: '-.01em' }}>The Synapse</h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: 15.5, lineHeight: 1.7, margin: '0 auto 26px', maxWidth: 400 }}>
              Find four groups of four. Each group shares something in common — some connections are obvious, some are a stretch.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn" style={{ borderRadius: 999, padding: '13px 30px' }} disabled={loading} onClick={play}>
                {loading ? 'Loading…' : "Play today's puzzle →"}
              </button>
              <button className="btn ghost" style={{ borderRadius: 999, padding: '13px 22px' }} onClick={() => setHowToPlay(true)}>How to play</button>
            </div>
            {loadError && (
              <div style={{ marginTop: 22, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>{loadError}</div>
            )}
          </div>
        )}

        {started && (
          <div className="syn-shell">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Link className="back-home" to="/" style={{ marginBottom: 0, position: 'static' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>Home
              </Link>
              <button aria-label="How to play" onClick={() => setHowToPlay(true)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid var(--rule)', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="14" y2="17" />
                </svg>
              </button>
            </div>

            <p style={{ textAlign: 'center', fontFamily: "'Outfit',sans-serif", fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 18px' }}>
              Create four groups of four.
            </p>

            <div className="syn-solved" id="syn-solved">
              {solved.map(color => groups[color] && (
                <div key={color} className="syn-solved-row" style={{ background: GROUP_COLORS[color] }}>
                  {/* The theme cell is sometimes left blank in the sheet; drop
                      the label rather than render an empty line above the words. */}
                  {groups[color].theme && <div className="theme">{groups[color].theme}</div>}
                  <div className="words">{groups[color].words.join(', ')}</div>
                </div>
              ))}
            </div>

            <div className="syn-msg" id="syn-msg">{msg}</div>

            <div className="syn-grid" id="syn-grid">
              {order.map(text => (
                <button key={text} type="button" data-text={text} disabled={gameOver}
                  className={'syn-tile'
                    + (selected.includes(text) ? ' selected' : '')
                    + (shaking.includes(text) ? ' shake' : '')}
                  onClick={() => toggleTile(text)}>
                  {text}
                </button>
              ))}
            </div>

            <div className="syn-mistakes">
              Mistakes remaining
              <span id="syn-dots" style={{ display: 'inline-flex', gap: 6 }}>
                {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                  <span key={i} className={'syn-dot' + (i < mistakes ? ' used' : '')}></span>
                ))}
              </span>
            </div>

            <div className="syn-actions">
              <button className="btn ghost" disabled={gameOver} onClick={() => setOrder(synShuffle(order))}>Shuffle</button>
              <button className="btn ghost" disabled={gameOver} onClick={() => setSelected([])}>Deselect All</button>
              <button className="btn" disabled={selected.length !== 4 || gameOver} onClick={submit}>Submit</button>
            </div>
          </div>
        )}

      </main>

      {/* Both overlays are fixed-position, so they must sit outside <main> —
          main's questionIn animation makes it a containing block for 250ms. */}
      <Portal>
        <div className={'modal-backdrop rmodal-backdrop' + (result ? ' open' : '')}
          onClick={e => { if (e.target === e.currentTarget) setResult(null); }}>
          <div className="rmodal-card">
            <div className="rmodal-header">
              <span className="rmodal-title">The Synapse</span>
              <button className="rmodal-close" onClick={() => setResult(null)}>✕</button>
            </div>
            <div className="rmodal-hero">
              <div className="rmodal-icon" style={{ background: '#5C9A57' }}>
                <img src="/synapse-icon.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
              <h3 className="rmodal-headline">{headline}</h3>
              <p className="rmodal-sub">{resultSub}</p>
            </div>
            <div className="rmodal-stats">
              <div className="rmodal-stat"><div className="rmodal-stat-val">{stats?.played ?? 0}</div><div className="rmodal-stat-label">Played</div></div>
              <div className="rmodal-stat"><div className="rmodal-stat-val">{stats?.winPct ?? 0}%</div><div className="rmodal-stat-label">Win %</div></div>
              <div className="rmodal-stat"><div className="rmodal-stat-val">{stats?.streak ?? 0}</div><div className="rmodal-stat-label">Streak</div></div>
              <div className="rmodal-stat"><div className="rmodal-stat-val">{stats?.best ?? 0}</div><div className="rmodal-stat-label">Best</div></div>
            </div>
            <div className="rmodal-section" style={{ textAlign: 'center' }}>
              <button className="rmodal-cta" onClick={share}>{shareLabel}</button>
            </div>
            <div className="rmodal-games">
              <div className="rmodal-games-grid">
                <Link to="/daily-game" className="rmodal-game-card">
                  <svg viewBox="0 0 24 24">
                    <rect x="1" y="1" width="10" height="10" rx="2.5" fill="#fff" />
                    <rect x="13" y="1" width="10" height="10" rx="2.5" fill="#fff" opacity=".55" />
                    <rect x="1" y="13" width="10" height="10" rx="2.5" fill="#fff" opacity=".55" />
                    <rect x="13" y="13" width="10" height="10" rx="2.5" fill="#fff" />
                  </svg>
                  <div className="rmodal-game-title">The Daily Case</div>
                  <div className="rmodal-game-sub">Diagnose the case</div>
                </Link>
                <Link to="/neuroanatomy" className="rmodal-game-card rmodal-game-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4.5C5 4.5 3.5 6 3.5 8c0 .9.3 1.7.8 2.3-.6.7-1.1 1.7-1.1 2.7 0 1.8 1.3 3.3 3 3.6.3 1.9 2 3.4 3.9 3.4h.4c.9 0 1.7-.3 2.4-.8" />
                    <path d="M17 4.5c2 0 3.5 1.5 3.5 3.5 0 .9-.3 1.7-.8 2.3.6.7 1.1 1.7 1.1 2.7 0 1.8-1.3 3.3-3 3.6-.3 1.9-2 3.4-3.9 3.4h-.4c-.9 0-1.7-.3-2.4-.8" />
                    <path d="M12 4.5V20" />
                    <circle cx="17.3" cy="6.3" r="1.5" fill="#fff" stroke="none" />
                  </svg>
                  <div className="rmodal-game-title">Map the Brain</div>
                  <div className="rmodal-game-sub">Learn a region</div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className={'htp-backdrop' + (howToPlay ? ' open' : '')}
          onClick={e => { if (e.target === e.currentTarget) setHowToPlay(false); }}>
          <div className="htp-panel">
            <button className="htp-close" aria-label="Close" onClick={() => setHowToPlay(false)}>✕</button>
            <div className="htp-brand">
              <img src="/synapse-icon.png" alt="" width="28" height="28" style={{ objectFit: 'contain' }} />
              <span>The Synapse</span>
            </div>
            <div className="htp-section">
              <p className="htp-section-title">How to Play</p>
              <p className="htp-line">Find groups of four items that share something in common.</p>
              <p className="htp-line">Select four tiles, then press Submit.</p>
              <p className="htp-line">Categories range from straightforward to tricky — some items could fit more than one group.</p>
            </div>
            <div className="htp-section">
              <p className="htp-section-title">Mistakes</p>
              <p className="htp-line">You get four mistakes before the puzzle ends. If you're one away from a correct group, we'll let you know.</p>
            </div>
            <div className="htp-section">
              <p className="htp-section-title">Tips</p>
              <p className="htp-line">Start with the group you're most confident about.</p>
              <p className="htp-line">Watch out for words that seem to belong to an obvious category — they're often a trap.</p>
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
}
