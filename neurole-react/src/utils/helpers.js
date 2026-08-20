export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function findField(row, target) {
  if (!row) return undefined;
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = norm(target);
  for (const k in row) {
    if (norm(k) === t) return row[k];
  }
  return undefined;
}

export async function fetchSheetAsObjects(csvUrl) {
  if (!csvUrl || csvUrl.startsWith('PASTE_')) {
    throw new Error('No Google Sheet connected yet.');
  }
  const res = await fetch(csvUrl, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) throw new Error('Could not load sheet (' + res.status + ')');
  const text = await res.text();
  const rows = parseCSV(text).filter(r => r.some(c => c.trim() !== ''));
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || '').trim());
    return obj;
  });
}

export const LAUNCH_DATE_ET = '2026-07-10';

export function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function getDayIndex() {
  const [ty, tm, td] = todayStr().split('-').map(Number);
  const [ly, lm, ld] = LAUNCH_DATE_ET.split('-').map(Number);
  return Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(ly, lm - 1, ld)) / (864e5));
}

export function dateStrForDayIndex(idx) {
  const [ly, lm, ld] = LAUNCH_DATE_ET.split('-').map(Number);
  return new Date(Date.UTC(ly, lm - 1, ld + idx)).toISOString().slice(0, 10);
}

export function normalize(s) { return s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ''); }

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyMatches(guess, target) {
  const g = normalize(guess), t = normalize(target);
  if (!g || !t) return false;
  if (g === t) return true;
  const threshold = Math.min(3, Math.max(1, Math.round(t.length * 0.18)));
  return levenshtein(g, t) <= threshold;
}

export function startCountdown(el, setText) {
  function tick() {
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const midnight = new Date(etNow); midnight.setDate(midnight.getDate() + 1); midnight.setHours(0, 0, 0, 0);
    const diff = midnight - etNow;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    const text = `Next case in ${h}h ${m}m ${s}s`;
    if (setText) setText(text);
    else if (el) el.textContent = text;
  }
  tick();
  const id = setInterval(tick, 1000);
  return id;
}

// The Worker in ai-worker.js is the only route to a provider. It holds the key
// in its environment; set AI_ENDPOINT_URL in config.js to its deployed URL.
//
// There used to be a fallback here that called api.groq.com directly with
// cfg.GROQ_API_KEY. It was dormant only because that field was left empty — the
// moment anyone filled it in, the key would ship inside the JS bundle, readable
// in view-source, in DevTools and in the Authorization header of every request.
// A browser cannot hold a secret, so the fallback is gone rather than left as a
// footgun with a warning comment on it.
export async function askNeuroleAIRaw(prompt) {
  const cfg = (typeof window !== 'undefined' && window.NEUROLE_CONFIG) || {};
  const endpoint = (cfg.AI_ENDPOINT_URL || '').trim();
  if (!endpoint || endpoint.startsWith('PASTE_')) {
    console.warn('Neurole: AI_ENDPOINT_URL is not configured — deploy ai-worker.js and set it in config.js.');
    return null;
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    const answer = (data?.answer || data?.choices?.[0]?.message?.content || '').trim();
    if (res.ok && answer) return answer;
    console.warn('Neurole AI worker status', res.status, data?.error || '');
  } catch (e) { console.warn('Neurole AI worker error:', e.message); }
  return null;
}

export async function askNeuroleAI({ region, function_text, question }) {
  const prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
A player just learned about: "${region}".
Background info they were given: "${function_text}"
The player's follow-up question is: "${question}"

Answer clearly and concisely (2-4 sentences), in plain language suitable for a curious learner who is not a medical professional. Stay focused on neuroscience/neuroanatomy/clinical neurology relevant to their question.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || `I can't reach an AI provider right now — but here's what I know: ${function_text}`;
}

// Explains, in 2-3 sentences, what a wrong guess actually is and how it
// differs from the real answer — used by The Daily Case after each incorrect
// guess. Generated live rather than pre-written, since we can't pre-author a
// factual blurb for every possible free-text guess a player might type.
export async function explainWrongGuess(guess, correctAnswer) {
  const prompt = `You are a neurology tutor inside an educational diagnostic game called Neurole.
A player is trying to diagnose a clinical case. The correct diagnosis is "${correctAnswer}", but the player just guessed "${guess}", which is incorrect.

In exactly 2-3 sentences, briefly explain what "${guess}" actually is (its key features), and why it doesn't fit this case as well as the real answer would. Do not reveal the correct answer's name in your response — only describe the guessed condition. Keep it factual, plain-language, and suitable for a pre-med or nursing student. If "${guess}" isn't a real recognizable medical condition, briefly say so instead.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || null;
}

export const STREAK_KEY = 'neurole_neuro_streak';

export function getStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastWonDate: '' };
  } catch { return { count: 0, lastWonDate: '' }; }
}

export function saveStreak(streak) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(streak)); } catch { /* ignored: storage/API unavailable */ }
}

export function recordWin(todayKey) {
  const streak = getStreak();
  const yesterday = (function () {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  })();
  // Already recorded a win today — leave the streak untouched.
  if (streak.lastWonDate !== todayKey) {
    if (streak.lastWonDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastWonDate = todayKey;
  }
  saveStreak(streak);
  return streak;
}

export function dailyStorageKey() {
  return 'neurole_daily_' + todayStr();
}

export function dailyStorageKeyForIndex(idx) {
  return 'neurole_daily_' + dateStrForDayIndex(idx);
}

export function saveDailyCompletionForIndex(idx, won, attemptsUsed, answer, explanation, author) {
  try {
    localStorage.setItem(dailyStorageKeyForIndex(idx), JSON.stringify({
      won, attemptsUsed, answer, explanation, author
    }));
  } catch (err) { console.warn("Neurole: couldn't save daily completion to localStorage", err.message); }
}

export function getSavedDailyCompletionForIndex(idx) {
  try {
    const raw = localStorage.getItem(dailyStorageKeyForIndex(idx));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveDailyCompletion(won, attemptsUsed, answer, explanation, author) {
  saveDailyCompletionForIndex(getDayIndex(), won, attemptsUsed, answer, explanation, author);
}

export function getSavedDailyCompletion() {
  return getSavedDailyCompletionForIndex(getDayIndex());
}

export function getDailyStats() {
  const currentIdx = Math.max(0, getDayIndex());
  let played = 0, wins = 0, distribution = [0, 0, 0, 0, 0];
  let bestStreak = 0, runStreak = 0, streakBeforeToday = 0;
  for (let i = 0; i <= currentIdx; i++) {
    if (i === currentIdx) streakBeforeToday = runStreak;
    let rec = null;
    try {
      const raw = localStorage.getItem(dailyStorageKeyForIndex(i));
      rec = raw ? JSON.parse(raw) : null;
    } catch { /* ignored: storage/API unavailable */ }
    if (rec) {
      played++;
      if (rec.won) {
        wins++;
        runStreak++;
        const a = rec.attemptsUsed;
        if (a >= 1 && a <= 5) distribution[a - 1]++;
      } else {
        runStreak = 0;
      }
      if (runStreak > bestStreak) bestStreak = runStreak;
    } else {
      runStreak = 0;
    }
  }
  let todayPlayed = false;
  try { todayPlayed = !!localStorage.getItem(dailyStorageKeyForIndex(currentIdx)); } catch { /* ignored: storage/API unavailable */ }
  const currentStreak = todayPlayed ? runStreak : streakBeforeToday;
  return {
    played, wins,
    winPct: played ? Math.round((wins / played) * 100) : 0,
    currentStreak, bestStreak, distribution
  };
}

export function getStreakCount() {
  return { count: getDailyStats().currentStreak };
}

let neuroleFirebaseReady = false;
try {
  const fbConfig = window.NEUROLE_CONFIG?.FIREBASE_CONFIG;
  if (fbConfig && fbConfig.apiKey && !String(fbConfig.apiKey).startsWith('REPLACE_') && window.firebase) {
    if (!firebase.apps.length) firebase.initializeApp(fbConfig);
    neuroleFirebaseReady = true;
  }
} catch (e) { console.warn('Neurole: Firebase not configured', e.message); }

export async function submitGlobalDailyResult(dateKey, attemptsUsed) {
  if (!neuroleFirebaseReady) return;
  const flagKey = 'neurole_global_submitted_' + dateKey;
  try {
    if (localStorage.getItem(flagKey)) return;
    const field = (attemptsUsed >= 1 && attemptsUsed <= 5) ? ('d' + attemptsUsed) : 'fail';
    await firebase.firestore().collection('daily_stats').doc(dateKey).set(
      { [field]: firebase.firestore.FieldValue.increment(1) },
      { merge: true }
    );
    localStorage.setItem(flagKey, '1');
  } catch (e) { console.warn('Neurole: could not submit global result', e.message); }
}

export async function fetchGlobalDailyDistribution(dateKey) {
  if (!neuroleFirebaseReady) return null;
  try {
    const snap = await firebase.firestore().collection('daily_stats').doc(dateKey).get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const d = [1, 2, 3, 4, 5].map(n => data['d' + n] || 0);
    const fail = data.fail || 0;
    return { d, fail, total: d.reduce((a, b) => a + b, 0) + fail };
  } catch (e) { console.warn('Neurole: could not fetch global distribution', e.message); return null; }
}

export function getDisorderCategory(guess) {
  const g = guess.toLowerCase();
  const cats = [
    { label: 'Neurodegenerative', words: ['alzheimer', 'parkinson', 'huntington', 'als', 'dementia', 'lewy', 'msa', 'psp', 'ftd', 'prion', 'creutzfeldt'] },
    { label: 'Cerebrovascular', words: ['stroke', 'tia', 'aneurysm', 'subarachnoid', 'hemorrhage', 'ischemia', 'infarct', 'lacunar', 'carotid'] },
    { label: 'Demyelinating', words: ['multiple sclerosis', 'ms', 'guillain', 'nmo', 'adem', 'devic'] },
    { label: 'Movement disorder', words: ['dystonia', 'tremor', 'chorea', 'tic', 'tourette', 'ataxia', 'cerebellar'] },
    { label: 'Epilepsy', words: ['epilepsy', 'seizure', 'absence', 'tonic', 'clonic', 'status'] },
    { label: 'Headache disorder', words: ['migraine', 'cluster', 'tension', 'trigeminal'] },
    { label: 'Peripheral nerve', words: ['neuropathy', 'neuritis', 'myopathy', 'myasthenia', 'lambert', 'radiculopathy', 'carpal', 'brachial'] },
    { label: 'Infection / Inflammation', words: ['meningitis', 'encephalitis', 'abscess', 'vasculitis', 'sarcoid', 'autoimmune'] },
    { label: 'Psychiatric', words: ['schizophrenia', 'bipolar', 'depression', 'anxiety', 'ocd', 'psychosis'] },
    { label: 'Tumour', words: ['glioma', 'glioblastoma', 'meningioma', 'metastasis', 'lymphoma', 'tumour', 'tumor'] },
    { label: 'Metabolic', words: ['wilson', 'wernicke', 'hepatic', 'uremic', 'hypoxic', 'metabolic'] },
    { label: 'Sleep disorder', words: ['narcolepsy', 'sleep apnoea', 'insomnia', 'rem', 'parasom'] },
    { label: 'Genetic / Developmental', words: ['tuberous', 'neurofibromatosis', 'rett', 'fragile', 'tay', 'gaucher', 'niemann'] },
  ];
  for (const cat of cats) {
    if (cat.words.some(w => g.includes(w))) return cat.label;
  }
  return 'Neurological condition';
}

export const SIGNIN_STORAGE_KEY = 'neurole_user';

export let googleSignInState = (function () {
  try {
    const saved = localStorage.getItem(SIGNIN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email) return parsed;
    }
  } catch { /* ignored: storage/API unavailable */ }
  return { signedIn: false, name: '', email: '' };
})();

export function saveSignInState(state) {
  try { localStorage.setItem(SIGNIN_STORAGE_KEY, JSON.stringify(state)); } catch { /* ignored: storage/API unavailable */ }
}

export function clearSignInState() {
  try { localStorage.removeItem(SIGNIN_STORAGE_KEY); } catch { /* ignored: storage/API unavailable */ }
}

export function updateSignInTriggers() {
  const firstName = googleSignInState.name ? googleSignInState.name.split(' ')[0] : 'Account';
  document.querySelectorAll('[data-signin]').forEach(t => {
    t.textContent = googleSignInState.signedIn ? firstName : 'Sign In';
  });
}

export function renderGoogleSignIn(containerId, onSignedIn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (googleSignInState.signedIn) {
    if (onSignedIn) onSignedIn(googleSignInState);
    return;
  }
  const clientId = window.NEUROLE_CONFIG?.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.startsWith('PASTE_')) {
    container.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--ink-soft);text-align:center;">
      Google Sign-In isn't set up yet — add GOOGLE_CLIENT_ID in config.js to enable this.
    </p>`;
    return;
  }
  if (typeof google === 'undefined' || !google.accounts) {
    container.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--ink-soft);text-align:center;">
      Couldn't load Google Sign-In (check your internet connection or ad blocker).
    </p>`;
    console.error("Neurole: Google Identity Services script did not load.");
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        googleSignInState = { signedIn: true, name: payload.name, email: payload.email };
        saveSignInState(googleSignInState);
        updateSignInTriggers();
        console.log("Neurole: signed in as", payload.email);
        if (onSignedIn) onSignedIn(googleSignInState);
      } catch (err) {
        console.error("Neurole: couldn't read Google sign-in response", err.message);
      }
    }
  });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', shape: 'pill', width: 280 });
}

export function checkAnswer(guess, state) {
  if (!guess.trim()) return false;
  if (fuzzyMatches(guess, state.answer)) return true;
  return state.synonyms.some(syn => fuzzyMatches(guess, syn));
}

export function findClosestKnownDisorder(guess, answer, disorders) {
  const g = normalize(guess);
  if (!g) return null;
  let best = null, bestDist = Infinity;
  disorders.forEach(name => {
    const dist = levenshtein(g, normalize(name));
    if (dist < bestDist) { bestDist = dist; best = name; }
  });
  const threshold = Math.min(3, Math.max(1, Math.round(best ? normalize(best).length * 0.18 : 1)));
  return (best && bestDist <= threshold && !fuzzyMatches(guess, answer)) ? best : null;
}

export function recordMTBPlay() {
  const d = new Date();
  const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const yesterday = (() => { const d2 = new Date(); d2.setDate(d2.getDate() - 1); return `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`; })();
  let streak = { count: 0, best: 0, lastPlayedDate: '' };
  try {
    const raw = localStorage.getItem('neurole_neuro_streak');
    if (raw) streak = JSON.parse(raw);
  } catch { /* ignored: storage/API unavailable */ }
  // Already played today — the streak stands as-is.
  if (streak.lastPlayedDate !== todayKey) {
    if (streak.lastPlayedDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastPlayedDate = todayKey;
  }
  if (streak.count > (streak.best || 0)) streak.best = streak.count;
  try { localStorage.setItem('neurole_neuro_streak', JSON.stringify(streak)); } catch { /* ignored: storage/API unavailable */ }
  return streak;
}

export const BUILTIN_FACTS = [
  { fact: "The hippocampus replaces almost all of its neurons every few months through a process called neurogenesis — making it one of the only brain regions capable of generating new nerve cells in adults.", source: "Spalding et al., 2013 — Cell", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3713347/" },
  { fact: "Myelin — the fatty sheath around nerve fibres — lets electrical signals travel up to 100× faster than along bare, unmyelinated axons. Loss of myelin is the core mechanism in multiple sclerosis.", source: "Fields, 2008 — Scientific American", url: "https://www.scientificamerican.com/article/the-other-half-of-the-brain/" },
  { fact: "Your brain uses roughly 20% of your body's total energy, despite making up only about 2% of your body weight. Most of that energy powers the constant electrical chatter between neurons.", source: "Raichle & Gusnard, 2002 — PNAS", url: "https://www.pnas.org/doi/10.1073/pnas.172399499" },
  { fact: "The amygdala can process a threatening stimulus and trigger a fear response before the information even reaches the cortex — explaining why you jump at a noise before you consciously register it.", source: "LeDoux, 1996 — The Emotional Brain", url: "https://pubmed.ncbi.nlm.nih.gov/8942957/" },
  { fact: "Humans have around 86 billion neurons, but glial cells — long thought to be mere support — outnumber them and actively regulate synaptic strength, blood flow, and brain immune responses.", source: "Azevedo et al., 2009 — J Comp Neurol", url: "https://pubmed.ncbi.nlm.nih.gov/19226510/" },
  { fact: "The cerebellum contains more neurons than the rest of the brain combined — roughly 69 billion — yet damage to it rarely causes paralysis, instead producing coordination and timing deficits.", source: "Herculano-Houzel, 2010 — Front Neuroanat", url: "https://www.frontiersin.org/articles/10.3389/fnana.2010.00012/full" },
  { fact: "During deep sleep, the brain's glymphatic system activates and literally flushes out toxic proteins — including amyloid-β and tau, the proteins implicated in Alzheimer's disease.", source: "Xie et al., 2013 — Science", url: "https://www.science.org/doi/10.1126/science.1241224" },
  { fact: "Broca's area and Wernicke's area are connected by the arcuate fasciculus. Damage to this white-matter tract causes conduction aphasia — patients can understand and produce language but cannot repeat words they just heard.", source: "Catani & ffytche, 2005 — Brain", url: "https://pubmed.ncbi.nlm.nih.gov/16141290/" },
];

export async function loadFunFact() {
  const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayOfWeek = etNow.getDay();
  const sunday = new Date(etNow);
  sunday.setDate(etNow.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  const epoch = new Date('2023-12-31T05:00:00Z');
  const weeksSinceEpoch = Math.max(0, Math.floor((sunday - epoch) / (7 * 24 * 60 * 60 * 1000)));
  const builtinIdx = weeksSinceEpoch % BUILTIN_FACTS.length;
  const builtinFact = BUILTIN_FACTS[builtinIdx];

  const sheetUrl = window.NEUROLE_CONFIG?.FUN_FACT_SHEET_CSV;
  if (sheetUrl && !sheetUrl.startsWith('PASTE_')) {
    try {
      const allRows = await fetchSheetAsObjects(sheetUrl);
      const usableRows = allRows.filter(r => (findField(r, 'fact') || '').trim());
      if (usableRows.length) {
        const weekKey = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
        let best = null;
        for (const r of usableRows) {
          const raw = (findField(r, 'week_start') || '').trim();
          let key = '';
          let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (m) key = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
          else { m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) key = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
          if (key === weekKey) { best = r; break; }
        }
        if (!best) {
          const idx = weeksSinceEpoch % usableRows.length;
          best = usableRows[idx];
        }
        const fact = findField(best, 'fact') || '';
        const src = findField(best, 'source_title') || findField(best, 'source') || 'Read the study';
        let url2 = findField(best, 'source_url') || '';
        if (url2 && !/^https?:\/\//i.test(url2)) url2 = 'https://' + url2;
        return { fact, source: src, link: url2 };
      }
    } catch (err) {
      console.warn('Neurole: fun fact sheet unavailable, using built-in —', err.message);
    }
  }
  return { fact: builtinFact.fact, source: builtinFact.source, link: builtinFact.url };
}

export function shuffle(arr) {
  const a = arr.slice();
  let seed = Date.now();
  for (let i = a.length - 1; i > 0; i--) {
    seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
    const j = Math.abs(seed) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
