import pageStyle from './styles/ImposterPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Portal from '../components/Portal';

// Ported from imposter.html — a pass-and-play party word game. Everyone gets
// the same secret word except one imposter, who has to bluff through a round
// of one-word clues. Word lists: the player's own (persisted in localStorage,
// same key as the static page), or one of the built-in neuroscience/AP-bio
// banks. These were hardcoded lists on the static page with a `sheetUrl: null`
// seam for a future Google Sheet; the seam is kept here so a sheet-backed list
// drops in the same way the other games fetch theirs.
const WORD_SOURCES = {
  custom: { label: 'Custom', words: [] },
  neuroscience: {
    label: 'Neuroscience',
    words: ['Hippocampus','Amygdala','Cerebellum','Thalamus','Hypothalamus','Corpus Callosum','Frontal Lobe','Occipital Lobe','Temporal Lobe','Parietal Lobe','Brainstem','Basal Ganglia',"Broca's Area","Wernicke's Area",'Synapse','Neuron','Neurotransmitter','Action Potential','Myelin Sheath','Dendrite','Axon','Dopamine','Serotonin',"Alzheimer's Disease","Parkinson's Disease",'Epilepsy','Stroke','Migraine','Concussion','Aphasia']
  },
  apbio: {
    label: 'AP Biology',
    words: ['Mitochondria','Photosynthesis','Osmosis','Enzyme','Chromosome','Meiosis','Mitosis','Ribosome','ATP','DNA Replication','Natural Selection','Homeostasis','Cellular Respiration','Chlorophyll','Gene Expression','Punnett Square','Allele','Ecosystem','Phospholipid Bilayer','Transcription']
  }
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const CUSTOM_STORAGE_KEY = 'neurole_imposter_custom_words';

export default function ImposterPage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: 'Imposter, A Party Word Game | Neurole',
    description: 'Imposter, a free party word game. Add your own words or use our neuroscience word banks, then play pass-and-play with friends to find the imposter.',
    canonical: '/imposter',
  });

  const [screen, setScreen] = useState('landing'); // landing | setup | reveal | discuss | results
  const [playerCount, setPlayerCount] = useState(4);
  const [category, setCategory] = useState(null); // 'custom' | 'neuroscience' | 'apbio' | null
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');
  const [secretWord, setSecretWord] = useState('');
  const [imposterIndex, setImposterIndex] = useState(-1);
  const [currentReveal, setCurrentReveal] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [howToPlay, setHowToPlay] = useState(false);

  // Restore the player's saved custom words on mount, like the static page.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_STORAGE_KEY);
      if (saved) setCustomInput(saved);
    } catch { /* private mode — ignore */ }
  }, []);

  const players = Array.from({ length: playerCount }, (_, i) => 'Player ' + (i + 1));

  const getActiveWordList = useCallback(() => {
    if (!category) return [];
    if (category === 'custom') {
      return customInput.split(/[,\n]/).map(w => w.trim()).filter(Boolean);
    }
    return WORD_SOURCES[category].words;
  }, [category, customInput]);

  const pickCategory = (key) => {
    setCategory(prev => prev === key ? null : key);
    setError('');
  };

  const startGame = () => {
    if (!category) {
      setError('Pick a word list first.');
      return;
    }
    const words = getActiveWordList();
    if (words.length < 4) {
      setError(category === 'custom'
        ? 'Add at least 4 words, separated by commas or one per line.'
        : 'This word list needs at least 4 words.');
      return;
    }
    if (category === 'custom') {
      try { localStorage.setItem(CUSTOM_STORAGE_KEY, customInput); } catch { /* ignore */ }
    }
    setSecretWord(words[Math.floor(Math.random() * words.length)]);
    setImposterIndex(Math.floor(Math.random() * playerCount));
    setCurrentReveal(0);
    setRevealed(false);
    setError('');
    setScreen('reveal');
  };

  const nextPlayer = () => {
    const next = currentReveal + 1;
    if (next >= playerCount) {
      setScreen('discuss');
    } else {
      setCurrentReveal(next);
      setRevealed(false);
    }
  };

  const revealAll = () => setScreen('results');

  const playAgain = () => {
    const words = getActiveWordList();
    if (words.length < 4) { setScreen('setup'); return; }
    setSecretWord(words[Math.floor(Math.random() * words.length)]);
    setImposterIndex(Math.floor(Math.random() * playerCount));
    setCurrentReveal(0);
    setRevealed(false);
    setScreen('reveal');
  };

  const newSetup = () => setScreen('setup');

  const startDisabled = !category;

  return (
    <>
      <main className="wrap" style={{ padding: 0, maxWidth: 'none' }}>
        <div className="imp-shell">

          {/* ===== Landing ===== */}
          {screen === 'landing' && (
            <div className="imp-popup-screen">
              <div style={{ maxWidth: 420, width: '100%', padding: 20, textAlign: 'center', boxSizing: 'border-box' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: '#6935A8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/><path d="M2 2l20 20"/></svg>
                </div>
                <span className="section-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>Party · Word Game</span>
                <h1 style={{ fontFamily: "'Libre Franklin',sans-serif", fontSize: 'clamp(30px,6vw,40px)', fontWeight: 700, margin: '6px 0 12px', letterSpacing: '-.01em' }}>Imposter</h1>
                <p style={{ color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.7, margin: '0 auto 32px', maxWidth: 380 }}>Everyone gets the same secret word, except one imposter. Take turns giving one-word clues, then vote who's faking it.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn" style={{ borderRadius: 999, padding: '13px 30px' }} onClick={() => setScreen('setup')}>Play →</button>
                  <button className="btn ghost" style={{ borderRadius: 999, padding: '13px 22px' }} onClick={() => setHowToPlay(true)}>How to play</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== Setup ===== */}
          {screen === 'setup' && (
            <div style={{ paddingTop: 36 }}>
              <button className="back-home" onClick={() => setScreen('landing')} style={{ marginBottom: 22, position: 'static', display: 'inline-flex', background: 'none', border: 'none', padding: 0, color: 'var(--ink)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Back
              </button>
              <h2 style={{ fontFamily: "'Libre Franklin',sans-serif", fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Choose a word list</h2>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, margin: '0 0 22px' }}>Tap a category to select it.</p>

              {/* Custom */}
              <div className={'imp-cat-card' + (category === 'custom' ? ' selected' : '')}>
                <button type="button" className="imp-cat-header" onClick={() => pickCategory('custom')}>
                  <span className="imp-cat-header-left">
                    <span className="imp-cat-icon" style={{ background: '#6935A8' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </span>
                    <span>
                      <span className="imp-cat-title">Custom</span>
                      <span className="imp-cat-sub">Write your own words</span>
                    </span>
                  </span>
                  <span className="imp-cat-check"></span>
                </button>
                <div className="imp-cat-body">
                  <div className="imp-custom-box">
                    <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Type words separated by commas or one per line — e.g. Hippocampus, Amygdala, Cerebellum, Synapse"></textarea>
                    <p className="imp-custom-hint">Need at least 4 words. We'll pick one at random each round.</p>
                  </div>
                </div>
              </div>

              {/* Neuroscience */}
              <div className={'imp-cat-card' + (category === 'neuroscience' ? ' selected' : '')}>
                <button type="button" className="imp-cat-header" onClick={() => pickCategory('neuroscience')}>
                  <span className="imp-cat-header-left">
                    <span className="imp-cat-icon" style={{ background: '#5B3F94' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2a4 4 0 0 0-4 4c-1.5.5-2.5 2-2.5 3.5 0 1 .4 1.9 1 2.5-.6.6-1 1.5-1 2.5 0 1.8 1.3 3.3 3 3.5.3 1.5 1.6 2.5 3.5 2.5a3 3 0 0 0 3-3V6a4 4 0 0 0-3-4Z"/><path d="M14.5 2a4 4 0 0 1 4 4c1.5.5 2.5 2 2.5 3.5 0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5 0 1.8-1.3 3.3-3 3.5-.3 1.5-1.6 2.5-3.5 2.5a3 3 0 0 1-3-3V6a4 4 0 0 1 3-4Z"/></svg>
                    </span>
                    <span>
                      <span className="imp-cat-title">Neuroscience</span>
                      <span className="imp-cat-sub">Anatomy, concepts &amp; conditions</span>
                    </span>
                  </span>
                  <span className="imp-cat-check"></span>
                </button>
                <div className="imp-cat-body">
                  <div className="imp-word-preview">{WORD_SOURCES.neuroscience.words.join(' · ')}</div>
                </div>
              </div>

              {/* AP Biology */}
              <div className={'imp-cat-card' + (category === 'apbio' ? ' selected' : '')}>
                <button type="button" className="imp-cat-header" onClick={() => pickCategory('apbio')}>
                  <span className="imp-cat-header-left">
                    <span className="imp-cat-icon" style={{ background: '#2F8A5C' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 2.5 4.5L9 13l-1.5 1.5A5 5 0 0 0 12 22a5 5 0 0 0 4.5-7.5L15 13l1.5-1.5C18 10.5 19 9 19 7a5 5 0 0 0-6-5Z"/></svg>
                    </span>
                    <span>
                      <span className="imp-cat-title">AP Biology</span>
                      <span className="imp-cat-sub">Cells, genetics &amp; more</span>
                    </span>
                  </span>
                  <span className="imp-cat-check"></span>
                </button>
                <div className="imp-cat-body">
                  <div className="imp-word-preview">{WORD_SOURCES.apbio.words.join(' · ')}</div>
                </div>
              </div>

              <div className="imp-error" style={{ display: error ? 'block' : 'none' }}>{error || ' '}</div>

              <div className="imp-field" style={{ marginTop: 24 }}>
                <label>Number of players</label>
                <div className="imp-stepper">
                  <button type="button" aria-label="Fewer players" disabled={playerCount <= MIN_PLAYERS} onClick={() => setPlayerCount(p => Math.max(MIN_PLAYERS, p - 1))}>−</button>
                  <span className="imp-count">{playerCount}</span>
                  <button type="button" aria-label="More players" disabled={playerCount >= MAX_PLAYERS} onClick={() => setPlayerCount(p => Math.min(MAX_PLAYERS, p + 1))}>+</button>
                </div>
              </div>

              <button className="btn imp-start-btn" style={{ borderRadius: 999, padding: '14px 36px', width: '100%', justifyContent: 'center', boxSizing: 'border-box' }} disabled={startDisabled} onClick={startGame}>Start game →</button>
            </div>
          )}

          {/* ===== Pass & reveal ===== */}
          {screen === 'reveal' && (
            <div>
              <div className="imp-progress">Player {currentReveal + 1} of {playerCount}</div>
              <div className="imp-reveal-card">
                {!revealed ? (
                  <>
                    <p className="imp-pass-name">{players[currentReveal]}</p>
                    <p className="imp-pass-sub">Pass the device, then tap below</p>
                    <button type="button" className="imp-tap-target" onClick={() => setRevealed(true)}>Tap to reveal your word</button>
                  </>
                ) : (
                  <>
                    {currentReveal === imposterIndex ? (
                      <>
                        <p className="imp-role-word is-imposter">You're the Imposter</p>
                        <p className="imp-role-sub">You don't know the word. Listen closely and try to blend in when it's your turn.</p>
                      </>
                    ) : (
                      <>
                        <p className="imp-role-word">{secretWord}</p>
                        <p className="imp-role-sub">That's the secret word. Give a one-word clue on your turn, don't say the word itself.</p>
                      </>
                    )}
                    <button type="button" className="btn ghost" style={{ borderRadius: 999, marginTop: 22 }} onClick={nextPlayer}>Got it, pass to next →</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ===== Discuss ===== */}
          {screen === 'discuss' && (
            <div style={{ textAlign: 'center', paddingTop: 50 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--paper-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-5.4A8.38 8.38 0 0 1 3.5 11.5 8.5 8.5 0 1 1 21 11.5z"/></svg>
              </div>
              <h2 style={{ fontFamily: "'Libre Franklin',sans-serif", fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>Time to talk</h2>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.7, margin: '0 auto 30px', maxWidth: 360 }}>Going around the group, each player says one word related to the secret word (no repeats). The imposter has to bluff. When you're ready, vote out loud, then reveal.</p>
              <button type="button" className="btn" style={{ borderRadius: 999, padding: '13px 30px' }} onClick={revealAll}>Reveal the imposter →</button>
            </div>
          )}

          {/* ===== Results ===== */}
          {screen === 'results' && (
            <div style={{ paddingTop: 40 }}>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <span className="section-eyebrow" style={{ justifyContent: 'center', display: 'flex' }}>The word was</span>
                <h2 style={{ fontFamily: "'Libre Franklin',sans-serif", fontSize: 'clamp(26px,6vw,34px)', fontWeight: 800, margin: '6px 0 0' }}>{secretWord}</h2>
              </div>
              <ul className="imp-vote-list">
                {players.map((name, i) => (
                  <li key={i} className={i === imposterIndex ? 'was-imposter' : ''}>
                    <span>{name}</span><span className="tag">{i === imposterIndex ? 'Imposter' : ''}</span>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn" style={{ borderRadius: 999, flex: 1, justifyContent: 'center' }} onClick={playAgain}>Play again →</button>
                <button type="button" className="btn ghost" style={{ borderRadius: 999, flex: 1, justifyContent: 'center' }} onClick={newSetup}>New setup</button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Fixed-position overlay — must escape <main> (see Portal). */}
      <Portal>
        <div className={'imp-htp-backdrop' + (howToPlay ? ' open' : '')} onClick={(e) => { if (e.target === e.currentTarget) setHowToPlay(false); }}>
          <div className="imp-htp-panel">
            <button onClick={() => setHowToPlay(false)} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
            <h3>🕵️ How to play Imposter</h3>
            <h4>Setup</h4>
            <p>Pick how many people are playing and choose a word list. One player will secretly be the imposter.</p>
            <h4>Reveal</h4>
            <p>Pass the device around. Each player privately taps to see the secret word, except the imposter, who sees "You're the Imposter" instead.</p>
            <h4>Clue round</h4>
            <p>Going around the group out loud, each player says one word related to the secret word. No repeats. The imposter has to bluff without knowing the word.</p>
            <h4>Vote</h4>
            <p>After a round (or two), discuss and vote out loud on who you think the imposter is. Tap "Reveal the imposter" to confirm.</p>
            <p style={{ marginTop: 18 }}>
              <Link to="/" style={{ textDecoration: 'underline' }} onClick={() => setHowToPlay(false)}>Back to home</Link>
            </p>
          </div>
        </div>
      </Portal>
    </>
  );
}