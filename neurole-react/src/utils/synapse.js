// The Synapse — daily word-grouping puzzle.
//
// Ported from synapse.html, which the client rebuilt as a single self-contained
// page (start screen ↔ game screen in place) — there is no separate play page
// any more, and nothing links to synapse-play.html.
//
// Storage keys and the date format are kept byte-compatible with the static
// site on purpose: a visitor who plays on neurole.org today and lands on the
// React build tomorrow keeps their streak.
import { fetchSheetAsObjects, findField } from './helpers';
import NEUROLE_CONFIG from '../config';

// Sheet order, easiest → hardest. Also the reveal order when a game is lost.
export const GROUP_ORDER = ['green', 'yellow', 'red', 'purple'];

export const GROUP_COLORS = {
  green: '#A7D8A0',
  yellow: '#F0E17E',
  red: '#E8A499',
  purple: '#C9B3E8',
};

export const GROUP_EMOJI = {
  green: '🟩', yellow: '🟨', red: '🟥', purple: '🟪',
};

export const MAX_MISTAKES = 4;
const KEY_PREFIX = 'neurole_synapse_';

// M-D-YYYY, matching the sheet's Date column and the static site's storage key.
// Not zero-padded — '8-5-2026', not '08-05-2026'.
export function synDateStr(d) {
  const dt = d || new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getFullYear();
}

export function parseSynDateStr(s) {
  const parts = String(s).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(NaN);
  return new Date(parts[2], parts[0] - 1, parts[1]);
}

export function synShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Throws only when the puzzle is genuinely unplayable — i.e. a group is short
// of words. A blank theme is NOT fatal here, which is a deliberate difference
// from synapse.html: that page requires `words.length === 4 && theme`, so one
// empty label cell takes the whole game down. It did exactly that on
// 2026-08-05, when "Theme purple" was left blank and neurole.org/synapse showed
// "Could not load today's puzzle" despite all 16 words being present. The label
// is cosmetic and is only revealed once a group is solved, so a missing one
// costs a caption, not a playable puzzle.
export async function loadSynapsePuzzle() {
  const rows = await fetchSheetAsObjects(NEUROLE_CONFIG.SYNAPSE_SHEET_CSV);
  if (!rows || !rows.length) throw new Error('Sheet returned no rows.');

  const todayStr = synDateStr();
  // Falls back to the most recent row so a missed publishing day still plays.
  const row = rows.find(r => (findField(r, 'Date') || '').trim() === todayStr) || rows[rows.length - 1];

  const groups = {};
  for (const color of GROUP_ORDER) {
    const words = [1, 2, 3, 4].map(n => (findField(row, color + n) || '').trim()).filter(Boolean);
    const theme = (findField(row, 'Theme ' + color) || '').trim();
    if (words.length === 4) groups[color] = { theme, words };
  }
  if (Object.keys(groups).length !== 4) {
    throw new Error(`Puzzle row is missing data (found ${Object.keys(groups).length} of 4 groups).`);
  }

  const tiles = [];
  for (const color of GROUP_ORDER) {
    for (const word of groups[color].words) tiles.push({ text: word, group: color });
  }

  return { groups, tiles, dateKey: (findField(row, 'Date') || '').trim() || todayStr };
}

export function getSynapseSaved(dateKey) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + dateKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSynapseCompletion(dateKey, won, mistakes) {
  try {
    localStorage.setItem(KEY_PREFIX + dateKey, JSON.stringify({ won, mistakes }));
  } catch (err) {
    console.warn("Neurole Synapse: couldn't save result —", err.message);
  }
}

// Played / win% / current streak / best streak, derived entirely from the
// stored per-day results so there is no separate counter to drift.
export function getSynapseStats() {
  let played = 0, wins = 0, best = 0, streak = 0;
  try {
    const entries = Object.keys(localStorage)
      .filter(k => k.startsWith(KEY_PREFIX))
      .map(k => {
        const dateStr = k.slice(KEY_PREFIX.length);
        let data = null;
        try { data = JSON.parse(localStorage.getItem(k)); } catch { /* corrupt entry */ }
        return { date: parseSynDateStr(dateStr), won: !!(data && data.won) };
      })
      .filter(e => !Number.isNaN(e.date.getTime()))
      .sort((a, b) => a.date - b.date);

    played = entries.length;
    wins = entries.filter(e => e.won).length;

    let run = 0, prev = null;
    for (const e of entries) {
      if (!e.won) { run = 0; prev = null; continue; }
      run = prev && Math.round((e.date - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = e.date;
    }

    // Current streak walks backwards from today. A missing entry for *today*
    // specifically is not a break — the day simply isn't played yet.
    const cursor = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3650; i++) {
      const raw = localStorage.getItem(KEY_PREFIX + synDateStr(cursor));
      if (!raw) {
        if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
        break;
      }
      let data = null;
      try { data = JSON.parse(raw); } catch { /* corrupt entry */ }
      if (!data || !data.won) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } catch { /* storage unavailable */ }

  return { played, wins, streak, best, winPct: played ? Math.round(wins / played * 100) : 0 };
}

export function synShareText(dateKey, guessHistory) {
  const rows = guessHistory.map(g => g.map(c => GROUP_EMOJI[c] || '⬜').join(''));
  return `The Synapse — ${dateKey}\n${rows.join('\n')}\n\nhttps://neurole.org/synapse`;
}
