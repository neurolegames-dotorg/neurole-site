/* =====================================================================
   NEUROLE — shared utilities
===================================================================== */

// Minimal CSV parser (handles quoted commas) — no external dependency.
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field+='"'; i++; } else { inQuotes=false; }
      } else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(field); field=''; }
      else if(c === '\n' || c === '\r'){
        if(field.length || row.length){ row.push(field); rows.push(row); row=[]; field=''; }
        if(c === '\r' && text[i+1] === '\n') i++;
      } else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}

// Looks up a column value regardless of how the header was capitalized/
// spaced in the Google Sheet (e.g. "Source URL", "source_url", "Source Url"
// all match). This is the #1 cause of "the sheet loaded but nothing shows up."
function findField(row, target){
  if(!row) return undefined;
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
  const t = norm(target);
  for(const k in row){
    if(norm(k) === t) return row[k];
  }
  return undefined;
}

async function fetchSheetAsObjects(csvUrl){
  if(!csvUrl || csvUrl.startsWith('PASTE_')){
    throw new Error('No Google Sheet connected yet.');
  }
  // Cache-bust: browsers (and sometimes Google's own CDN) can otherwise
  // serve a stale snapshot of the sheet from whenever it was first loaded.
  const bustedUrl = csvUrl + (csvUrl.includes('?') ? '&' : '?') + '_=' + Date.now();
  const res = await fetch(bustedUrl, { cache: 'no-store' });
  if(!res.ok) throw new Error('Could not load sheet (' + res.status + ')');
  const text = await res.text();
  const rows = parseCSV(text).filter(r => r.some(c => c.trim() !== ''));
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = (r[i] || '').trim());
    return obj;
  });
}

// ---------- Sign-in modal (lightweight placeholder) ----------
// ---------- Mobile hamburger nav toggle (phones only) ----------
function initMobileNav(){
  const btn = document.querySelector('.hamburger-btn');
  const nav = document.querySelector('.nav-left');
  if(!btn || !nav) return;
  btn.addEventListener('click', () => nav.classList.toggle('mobile-open'));
  // close it after tapping a link, so it doesn't stay open after navigating
  nav.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', () => nav.classList.remove('mobile-open'));
  });
}

function initSignIn(){
  const triggers = document.querySelectorAll('[data-signin]');
  const backdrop = document.getElementById('signin-modal');
  if(!triggers.length || !backdrop) return;
  const closeEls = backdrop.querySelectorAll('[data-close]');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      backdrop.classList.add('open');
      renderGoogleSignIn('signin-google-container', () => {
        backdrop.classList.remove('open');
        const firstName = googleSignInState.name ? googleSignInState.name.split(' ')[0] : 'Account';
        triggers.forEach(t => t.textContent = firstName);
      });
    });
  });
  closeEls.forEach(el => el.addEventListener('click', () => backdrop.classList.remove('open')));
  backdrop.addEventListener('click', e => { if(e.target === backdrop) backdrop.classList.remove('open'); });
}

// ---------- Weekly fun fact loader ----------
async function loadFunFact(){
  const el = document.getElementById('fun-fact-box');
  if(!el) return;
  try{
    const rows = await fetchSheetAsObjects(window.NEUROLE_CONFIG.FUN_FACT_SHEET_CSV);
    const usableRows = rows.filter(r => (findField(r,'fact') || '').trim());
    if(!usableRows.length){
      console.warn("Neurole: Fun Fact sheet loaded but no row had text in a 'fact' column.", rows);
      throw new Error('no usable rows (fact column empty/missing on every row)');
    }

    // Prefer the most recent row whose week_start is today or earlier;
    // if no dates parse validly, just use the last row added.
    const today = new Date();
    let best = usableRows[usableRows.length - 1];
    let foundDated = false;
    usableRows.forEach(r => {
      const d = new Date(findField(r,'week_start'));
      if(!isNaN(d) && d <= today){ best = r; foundDated = true; }
    });
    console.log("Neurole: fun fact row selected ->", best, foundDated ? "(matched by week_start)" : "(no valid week_start found — used most recent row instead)");

    el.querySelector('.fact-text').textContent = findField(best,'fact');

    const link = el.querySelector('.fact-link');
    let url = (findField(best,'source_url') || '').trim();
    if(url && !/^https?:\/\//i.test(url)) url = 'https://' + url; // tolerate missing https://

    if(url){
      link.textContent = findField(best,'source_title') || 'Read the study';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
    } else {
      console.warn("Neurole: this fact row has no source_url filled in.", best);
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.textContent = 'No source link provided for this fact';
    }
  }catch(err){
    console.error("Neurole: couldn't load Fun Fact sheet —", err.message);
    el.querySelector('.fact-text').textContent =
      "Myelin — the fatty sheath around nerve fibers — lets electrical signals travel up to 100x faster than along bare, unmyelinated axons.";
    const link = el.querySelector('.fact-link');
    link.textContent = 'Hartline & McIlwain, 2007 — "Mechanisms of Myelin Repair" (NIH/PMC)';
    link.href = 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2730787/';
    link.target = '_blank';
    link.rel = 'noopener';
  }
}

// ---------- Shared AI ask helper (used by both games) ----------
// Tries a direct Gemini call first (if a key is configured), then
// falls back to a custom backend endpoint if one is set, then finally
// a plain explanatory fallback if neither is configured/working.
async function askNeuroleAIRaw(prompt){
  const cfg = window.NEUROLE_CONFIG || {};

  // Option A0: Groq — free, no credit card required at all.
  if(cfg.GROQ_API_KEY && !cfg.GROQ_API_KEY.startsWith('PASTE_')){
    try{
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${cfg.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content;
      if(res.ok && answer) return answer;
      console.error("Neurole: Groq call failed — HTTP " + res.status, data);
    }catch(err){
      console.error("Neurole: Groq request error —", err.message);
    }
  }

  // Option A: direct Gemini call from the browser
  if(cfg.GEMINI_API_KEY && !cfg.GEMINI_API_KEY.startsWith('PASTE_')){
    try{
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cfg.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await res.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if(res.ok && answer) return answer;
      console.error("Neurole: Gemini call failed — HTTP " + res.status, data);
    }catch(err){
      console.error("Neurole: Gemini request error —", err.message);
    }
  }

  // Option A2: direct OpenAI call from the browser (no service-account
  // restriction like Gemini had — simpler if Google's policy is blocking you)
  if(cfg.OPENAI_API_KEY && !cfg.OPENAI_API_KEY.startsWith('PASTE_')){
    try{
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${cfg.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content;
      if(res.ok && answer) return answer;
      console.error("Neurole: OpenAI call failed — HTTP " + res.status, data);
    }catch(err){
      console.error("Neurole: OpenAI request error —", err.message);
    }
  }

  // Option B: your own backend (e.g. ai-worker.js on Cloudflare)
  if(cfg.AI_ENDPOINT_URL && !cfg.AI_ENDPOINT_URL.startsWith('PASTE_')){
    try{
      const res = await fetch(cfg.AI_ENDPOINT_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if(data.answer) return data.answer;
      console.error("Neurole: backend endpoint returned no answer —", data);
    }catch(err){
      console.error("Neurole: backend endpoint error —", err.message);
    }
  }

  console.warn("Neurole: no AI provider configured/working — see config.js (GEMINI_API_KEY, OPENAI_API_KEY, or AI_ENDPOINT_URL).");
  return null;
}

async function askNeuroleAI({ region, function_text, question }){
  const prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
A player just learned about: "${region}".
Background info they were given: "${function_text}"
The player's follow-up question is: "${question}"

Answer clearly and concisely (2-4 sentences), in plain language suitable for a curious learner who is not a medical professional. Stay focused on neuroscience/neuroanatomy/clinical neurology relevant to their question.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || `I can't reach an AI provider right now — but here's what I know: ${function_text}`;
}

// ---------- Google Sign-In (shared across all pages) ----------
// Renders a real "Sign in with Google" button into the given container
// element id. Requires GOOGLE_CLIENT_ID to be set in config.js — if it's
// still the placeholder, shows a setup message instead.
let googleSignInState = { signedIn: false, name: '', email: '' };

function renderGoogleSignIn(containerId, onSignedIn){
  const container = document.getElementById(containerId);
  if(!container) return;

  const clientId = window.NEUROLE_CONFIG?.GOOGLE_CLIENT_ID;
  if(!clientId || clientId.startsWith('PASTE_')){
    container.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--ink-soft);text-align:center;">
      Google Sign-In isn't set up yet — add GOOGLE_CLIENT_ID in config.js to enable this.
    </p>`;
    return;
  }

  if(typeof google === 'undefined' || !google.accounts){
    container.innerHTML = `<p style="font-family:var(--mono);font-size:11.5px;color:var(--ink-soft);text-align:center;">
      Couldn't load Google Sign-In (check your internet connection or ad blocker).
    </p>`;
    console.error("Neurole: Google Identity Services script (accounts.google.com/gsi/client) did not load.");
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      try{
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        googleSignInState = { signedIn: true, name: payload.name, email: payload.email };
        console.log("Neurole: signed in as", payload.email);
        if(onSignedIn) onSignedIn(googleSignInState);
      }catch(err){
        console.error("Neurole: couldn't read Google sign-in response —", err.message);
      }
    }
  });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', shape: 'pill', width: 280 });
}

document.addEventListener('DOMContentLoaded', () => {
  initSignIn();
  initMobileNav();
  loadFunFact();
});
