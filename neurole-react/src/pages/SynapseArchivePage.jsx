import pageStyle from './styles/SynapsePage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Portal from '../components/Portal';
import {
  GROUP_ORDER, GROUP_COLORS, MAX_MISTAKES,
  loadSynapseArchive, loadSynapsePuzzleByDate, getSynapseSaved, saveSynapseCompletion,
  getSynapseStats, synShuffle, synShareText, synDateStr,
} from '../utils/synapse';

export default function SynapseArchivePage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: 'The Synapse Archive — Past Puzzles | Neurole',
    description: 'Play previous daily Synapse puzzles. Access the complete archive of word-connection games.',
    canonical: '/synapse/archive',
  });

  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState('');
  const [puzzles, setPuzzles] = useState([]);

  const [activePuzzle, setActivePuzzle] = useState(null);
  const [groups, setGroups] = useState({});
  const [order, setOrder] = useState([]);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [shaking, setShaking] = useState([]);
  const [msg, setMsg] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [shareLabel, setShareLabel] = useState('Share Result');

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

  useEffect(() => {
    const loadArchive = async () => {
      setArchiveLoading(true);
      setArchiveError('');
      try {
        const data = await loadSynapseArchive();
        setPuzzles(data);
      } catch (err) {
        console.warn('Neurole Synapse Archive: could not load puzzles —', err.message);
        setArchiveError('Could not load the archive. Please check your connection and try again.');
      } finally {
        setArchiveLoading(false);
      }
    };
    loadArchive();
  }, []);

  const playPuzzle = async (dateKey) => {
    try {
      const puzzle = await loadSynapsePuzzleByDate(dateKey);
      tilesRef.current = puzzle.tiles;
      setGroups(puzzle.groups);
      setActivePuzzle(dateKey);

      const saved = getSynapseSaved(dateKey);
      if (saved) {
        // Already completed
        setSolved(GROUP_ORDER.filter(c => puzzle.groups[c]));
        setMistakes(saved.mistakes || 0);
        setOrder([]);
        setGameOver(true);
        later(() => openResult(!!saved.won), 300);
      } else {
        // Fresh puzzle
        setOrder(synShuffle(puzzle.tiles.map(t => t.text)));
        setSolved([]);
        setMistakes(0);
        setGameOver(false);
        setResult(null);
      }
      setSelected([]);
      setShaking([]);
      guessHistory.current = [];
      wrongGuesses.current = [];
    } catch (err) {
      showMsg('Could not load puzzle', 2000);
      console.warn('Error loading puzzle:', err);
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
      setSolved([...ctx.solved, ...GROUP_ORDER.filter(c => !ctx.solved.includes(c) && groups[c])]);
      setOrder([]);
    }
    saveSynapseCompletion(activePuzzle, won, ctx.mistakes);
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
    const text = synShareText(activePuzzle, guessHistory.current);
    const url = 'https://neurole.org/synapse/archive';
    try {
      if (navigator.share) {
        await navigator.share({ text, url, title: 'The Synapse Archive' });
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
    : "Here were the groups.";

  return (
    <>
      <main className="wrap" style={{ padding: 0, maxWidth: 'none' }}>
        {!activePuzzle && (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '50px 20px' }}>
            <Link className="back-home" to="/synapse" style={{ marginBottom: 24 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Back to The Synapse
            </Link>

            <h1 style={{ fontFamily: "'Cormorant Garamond','Playfair Display',serif", fontSize: 'clamp(32px,6vw,44px)', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-.01em' }}>Synapse Archive</h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: 15.5, lineHeight: 1.7, margin: '0 0 30px', maxWidth: 600 }}>
              Play previous daily Synapse puzzles. Each puzzle can be solved or replayed at any time.
            </p>

            {archiveLoading && (
              <div style={{ textAlign: 'center', color: 'var(--ink-soft)', paddingTop: 40 }}>
                Loading archive…
              </div>
            )}

            {archiveError && (
              <div style={{ textAlign: 'center', color: 'var(--ink-soft)', paddingTop: 40 }}>
                {archiveError}
              </div>
            )}

            {!archiveLoading && !archiveError && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {puzzles.map((puzzle) => (
                  <button
                    key={puzzle.dateKey}
                    onClick={() => playPuzzle(puzzle.dateKey)}
                    style={{
                      background: 'var(--paper)',
                      border: '1.5px solid var(--rule)',
                      borderRadius: 12,
                      padding: 16,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7E5FA6'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--rule)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 4px' }}>
                          {puzzle.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {puzzle.dateKey}
                        </div>
                      </div>
                      {puzzle.saved && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          {Array.from({ length: 4 }, (_, i) => (
                            <span
                              key={i}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: i < (puzzle.saved.mistakes || 0) ? '#E8A499' : '#A7D8A0',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.keys(puzzle.groups).map(color => (
                        <span
                          key={color}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: GROUP_COLORS[color],
                            color: '#000',
                            opacity: 0.7,
                          }}
                        >
                          {puzzle.groups[color].theme || color}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activePuzzle && (
          <div className="syn-shell">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <button
                onClick={() => setActivePuzzle(null)}
                className="back-home"
                style={{ marginBottom: 0, position: 'static', cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Archive
              </button>
            </div>

            <p style={{ textAlign: 'center', fontFamily: "'Outfit',sans-serif", fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 18px' }}>
              {activePuzzle}
            </p>

            <div className="syn-solved" id="syn-solved">
              {solved.map(color => groups[color] && (
                <div key={color} className="syn-solved-row" style={{ background: GROUP_COLORS[color] }}>
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
                <Link to="/synapse" className="rmodal-game-card rmodal-game-synapse">
                  <img src="/synapse-icon.png" alt="" style={{ width: 28, height: 28 }} />
                  <div className="rmodal-game-title">The Synapse</div>
                  <div className="rmodal-game-sub">Today's puzzle</div>
                </Link>
                <Link to="/neuroanatomy" className="rmodal-game-card rmodal-game-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4.5C5 4.5 3.5 6 3.5 8c0 .9.3 1.7.8 2.3-.6.7-1.1 1.7-1.1 2.7 0 1.8 1.3 3.3 3 3.6.3 1.9 2 3.4 3.9 3.4h.4c.9 0 1.7-.3 2.4-.8" />
                    <path d="M17 4.5c2 0 3.5 1.5 3.5 3.5 0 .9-.3 1.7-.8 2.3.6.7 1.1 1.7 1.1 2.7 0 1.8-1.3 3.3-3 3.6-.3 1.9-2 3.4-3.9 3.4h-.4c-.9 0-1.7-.3-2.4-.8" /></svg>
                  <div className="rmodal-game-title">Map the Brain</div>
                  <div className="rmodal-game-sub">Neuroanatomy quiz</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
}
