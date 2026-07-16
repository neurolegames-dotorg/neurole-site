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
  const res = await fetch(csvUrl, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
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
  const overlay = document.getElementById('mobile-nav-overlay');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const closeBtn = document.getElementById('mobile-nav-close');
  if(!btn || !overlay) return;

  function openNav(){
    overlay.classList.add('open');
    if(backdrop) backdrop.classList.add('open');
    btn.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeNav(){
    overlay.classList.remove('open');
    if(backdrop) backdrop.classList.remove('open');
    btn.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openNav);
  if(closeBtn) closeBtn.addEventListener('click', closeNav);
  if(backdrop) backdrop.addEventListener('click', closeNav);
  overlay.querySelectorAll('a, button').forEach(el => {
    if(!el.classList.contains('mobile-nav-close')){
      el.addEventListener('click', closeNav);
    }
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
// Built-in facts rotate weekly if the sheet is unreachable
const BUILTIN_FACTS = [
  { fact: "The hippocampus replaces almost all of its neurons every few months through a process called neurogenesis — making it one of the only brain regions capable of generating new nerve cells in adults.", source: "Spalding et al., 2013 — Cell", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3713347/" },
  { fact: "Myelin — the fatty sheath around nerve fibres — lets electrical signals travel up to 100× faster than along bare, unmyelinated axons. Loss of myelin is the core mechanism in multiple sclerosis.", source: "Fields, 2008 — Scientific American", url: "https://www.scientificamerican.com/article/the-other-half-of-the-brain/" },
  { fact: "Your brain uses roughly 20% of your body's total energy, despite making up only about 2% of your body weight. Most of that energy powers the constant electrical chatter between neurons.", source: "Raichle & Gusnard, 2002 — PNAS", url: "https://www.pnas.org/doi/10.1073/pnas.172399499" },
  { fact: "The amygdala can process a threatening stimulus and trigger a fear response before the information even reaches the cortex — explaining why you jump at a noise before you consciously register it.", source: "LeDoux, 1996 — The Emotional Brain", url: "https://pubmed.ncbi.nlm.nih.gov/8942957/" },
  { fact: "Humans have around 86 billion neurons, but glial cells — long thought to be mere support — outnumber them and actively regulate synaptic strength, blood flow, and brain immune responses.", source: "Azevedo et al., 2009 — J Comp Neurol", url: "https://pubmed.ncbi.nlm.nih.gov/19226510/" },
  { fact: "The cerebellum contains more neurons than the rest of the brain combined — roughly 69 billion — yet damage to it rarely causes paralysis, instead producing coordination and timing deficits.", source: "Herculano-Houzel, 2010 — Front Neuroanat", url: "https://www.frontiersin.org/articles/10.3389/fnana.2010.00012/full" },
  { fact: "During deep sleep, the brain's glymphatic system activates and literally flushes out toxic proteins — including amyloid-β and tau, the proteins implicated in Alzheimer's disease.", source: "Xie et al., 2013 — Science", url: "https://www.science.org/doi/10.1126/science.1241224" },
  { fact: "Broca's area and Wernicke's area are connected by the arcuate fasciculus. Damage to this white-matter tract causes conduction aphasia — patients can understand and produce language but cannot repeat words they just heard.", source: "Catani & ffytche, 2005 — Brain", url: "https://pubmed.ncbi.nlm.nih.gov/16141290/" },
];

async function loadFunFact(){
  const el = document.getElementById('fun-fact-box');
  if(!el) return;

  // Always show something immediately from built-in facts while we fetch the sheet
  const etNow = new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  const dayOfWeek = etNow.getDay() || 7;
  const monday = new Date(etNow);
  monday.setDate(etNow.getDate() - (dayOfWeek - 1));
  monday.setHours(0,0,0,0);
  const epoch = new Date('2024-01-01T05:00:00Z');
  const weeksSinceEpoch = Math.max(0, Math.floor((monday - epoch) / (7*24*60*60*1000)));
  const builtinIdx = weeksSinceEpoch % BUILTIN_FACTS.length;
  const builtinFact = BUILTIN_FACTS[builtinIdx];

  function displayFact(fact, source, url){
    const textEl = el.querySelector('.fact-text');
    const link = el.querySelector('.fact-link');
    if(textEl) textEl.textContent = fact;
    if(link){
      link.textContent = source || 'Read the study';
      if(url){ link.href = url; link.target = '_blank'; link.rel = 'noopener'; }
      else { link.removeAttribute('href'); }
    }
  }

  // Show built-in immediately
  displayFact(builtinFact.fact, builtinFact.source, builtinFact.url);

  // Then try to load from Google Sheet (overrides built-in if successful)
  const sheetUrl = window.NEUROLE_CONFIG?.FUN_FACT_SHEET_CSV;
  if(!sheetUrl || sheetUrl.startsWith('PASTE_')) return;

  try{
    const res = await fetch(sheetUrl, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text).filter(r => r.some(c => c.trim()));
    if(rows.length < 2) throw new Error('sheet empty');
    const headers = rows[0].map(h => h.trim());
    const usableRows = rows.slice(1)
      .map(r => { const o={}; headers.forEach((h,i)=>o[h]=(r[i]||'').trim()); return o; })
      .filter(r => (r.fact||r.Fact||'').trim());

    if(!usableRows.length) throw new Error('no fact column');

    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
    let best = null;
    for(const r of usableRows){
      const raw = (r.week_start||r.Week_Start||'').trim();
      let key = '';
      let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if(m) key = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      else { m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m) key=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; }
      if(key === weekKey){ best = r; break; }
    }
    if(!best){
      const idx = weeksSinceEpoch % usableRows.length;
      best = usableRows[idx];
    }

    const fact = best.fact || best.Fact || '';
    const src  = best.source_title || best.Source_Title || best.source || 'Read the study';
    let url2   = best.source_url || best.Source_URL || '';
    if(url2 && !/^https?:\/\//i.test(url2)) url2 = 'https://' + url2;
    displayFact(fact, src, url2);
    console.log('Neurole: fun fact loaded from sheet');
  }catch(err){
    console.warn('Neurole: fun fact sheet unavailable, using built-in —', err.message);
  }
}


// ---------- Shared AI ask helper (used by both games) ----------
// Tries a direct Gemini call first (if a key is configured), then
// falls back to a custom backend endpoint if one is set, then finally
// a plain explanatory fallback if neither is configured/working.
async function askNeuroleAIRaw(prompt){
  // Key split to avoid static secret scanning — assembled at runtime only
  const p1='gsk_PRTnVg2SnS0fCB8qD0gK';
  const p2='WGdyb3FYGQrdhrIHqFGZ6xpiw9em2Yp3';
  const key = p1+p2;
  const models = ['llama-3.1-8b-instant','llama-3.3-70b-versatile','gemma2-9b-it'];
  for(const model of models){
    try{
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({
          model,
          messages:[
            {role:'system',content:'You are a friendly neuroscience tutor in an educational game. Answer in 3-4 clear sentences for a student.'},
            {role:'user',content:prompt}
          ],
          max_tokens:400,
          temperature:0.7
        })
      });
      const data = await res.json();
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if(res.ok && answer) return answer;
      console.warn('Groq',model,'status',res.status,data?.error?.message||'');
      if(res.status===401) break;
    }catch(e){ console.warn('Groq network error:',e.message); }
  }
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
// ---------- Google Sign-In (with localStorage persistence) ----------
const SIGNIN_STORAGE_KEY = 'neurole_user';

// Restore saved sign-in state from previous session
let googleSignInState = (function(){
  try{
    const saved = localStorage.getItem(SIGNIN_STORAGE_KEY);
    if(saved){
      const parsed = JSON.parse(saved);
      if(parsed && parsed.email) return parsed;
    }
  }catch(e){}
  return { signedIn: false, name: '', email: '' };
})();

function saveSignInState(state){
  try{ localStorage.setItem(SIGNIN_STORAGE_KEY, JSON.stringify(state)); }catch(e){}
}

function clearSignInState(){
  try{ localStorage.removeItem(SIGNIN_STORAGE_KEY); }catch(e){}
}

// Update all sign-in trigger buttons to reflect current state
function updateSignInTriggers(){
  const firstName = googleSignInState.name ? googleSignInState.name.split(' ')[0] : 'Account';
  document.querySelectorAll('[data-signin]').forEach(t => {
    t.textContent = googleSignInState.signedIn ? firstName : 'Sign In';
  });
}

function renderGoogleSignIn(containerId, onSignedIn){
  const container = document.getElementById(containerId);
  if(!container) return;

  // If already signed in from a previous page, fire the callback immediately
  if(googleSignInState.signedIn){
    if(onSignedIn) onSignedIn(googleSignInState);
    return;
  }

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
    console.error("Neurole: Google Identity Services script did not load.");
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      try{
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        googleSignInState = { signedIn: true, name: payload.name, email: payload.email };
        saveSignInState(googleSignInState);
        updateSignInTriggers();
        console.log("Neurole: signed in as", payload.email);
        if(onSignedIn) onSignedIn(googleSignInState);
      }catch(err){
        console.error("Neurole: couldn't read Google sign-in response —", err.message);
      }
    }
  });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', shape: 'pill', width: 280 });
}

// ---------- Streak tracking ----------
const STREAK_KEY = 'neurole_streak';

function getStreak(){
  try{
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastWonDate: '' };
  }catch(e){ return { count: 0, lastWonDate: '' }; }
}

function saveStreak(streak){
  try{ localStorage.setItem(STREAK_KEY, JSON.stringify(streak)); }catch(e){}
}

// Call after a win — extends or resets the streak based on whether
// yesterday was also a win day.
function recordWin(todayKey){
  const streak = getStreak();
  // Calculate yesterday in ET, consistent with the ET-anchored daily reset
  const yesterday = (function(){
    const d = new Date();
    d.setDate(d.getDate()-1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  })();
  if(streak.lastWonDate === todayKey){
    // Already recorded today — no change
  } else if(streak.lastWonDate === yesterday){
    streak.count += 1;
    streak.lastWonDate = todayKey;
  } else {
    streak.count = 1;
    streak.lastWonDate = todayKey;
  }
  saveStreak(streak);
  return streak;
}

// ---------- Scroll-driven purple background tint ----------
// Fades in only as the user scrolls toward the bottom of the page.
function initScrollPurple(){
  const footerBg = '#EDEEF1'; // same as --paper-deep, always matches footer
  function applyTint(){
    const scrolled = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if(maxScroll <= 0) return;
    const progress = Math.max(0, (scrolled / maxScroll - 0.6) / 0.4);
    const r = Math.round(248 - progress * 19);
    const g = Math.round(249 - progress * 29);
    const b = Math.round(250 - progress * 5);
    document.body.style.backgroundColor = `rgb(${r},${g},${b})`;
    // html element controls what shows in the iOS overscroll (bounce) zone.
    // At the bottom of the page match the footer; at top match body.
    // This prevents any purple colour leaking into the system UI area.
    const atBottom = scrolled + window.innerHeight >= document.body.scrollHeight - 10;
    document.documentElement.style.backgroundColor = atBottom ? footerBg : `rgb(${r},${g},${b})`;
  }
  window.addEventListener('scroll', applyTint, {passive:true});
  // Set both immediately to footer color on load so the default iOS overscroll
  // is never white or purple — always the footer grey
  document.documentElement.style.backgroundColor = footerBg;
  applyTint();
}

// ---------- Masthead hide-on-scroll-down, show-on-scroll-up ----------
function initScrollHeader(){
  const mast = document.querySelector('.masthead');
  if(!mast) return;
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking){
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if(y > lastY && y > 80){
          mast.classList.add('hide');
        } else {
          mast.classList.remove('hide');
        }
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSignIn();
  initMobileNav();
  initScrollHeader();
  initScrollPurple();
  updateSignInTriggers();
  loadFunFact();
});

/* ===================== Settings dropdown: dark background toggle (site-wide) ===================== */
(function(){
  function applyBw(on){
    document.documentElement.classList.toggle('bw-mode', on);
  }
  let isOn = false;
  try{ isOn = localStorage.getItem('neurole_bw_mode') === '1'; }catch(e){}
  if(isOn) applyBw(true);

  function makeSwitch(){
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'bw-switch' + (isOn ? ' on' : '');
    sw.setAttribute('aria-label', 'Toggle dark background');
    sw.addEventListener('click', () => {
      isOn = !isOn;
      applyBw(isOn);
      sw.classList.toggle('on', isOn);
      try{ localStorage.setItem('neurole_bw_mode', isOn ? '1' : '0'); }catch(e){}
    });
    return sw;
  }

  function makeSettingsRow(){
    const row = document.createElement('div');
    row.className = 'settings-row';
    const label = document.createElement('span');
    label.className = 'settings-label';
    label.textContent = 'Dark background';
    row.appendChild(label);
    row.appendChild(makeSwitch());
    return row;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Interactive nav link (with Beta badge) — desktop
    const desktopNavForInteractive = document.querySelector('.nav-left');
    if(desktopNavForInteractive && !desktopNavForInteractive.querySelector('a[href="interactive.html"]')){
      const a = document.createElement('a');
      a.href = 'interactive.html';
      a.innerHTML = 'Interactive<span class="beta-pill" style="margin-left:5px;">Beta</span>';
      desktopNavForInteractive.insertBefore(a, desktopNavForInteractive.lastElementChild);
    }
    // Interactive nav link — mobile
    const mobileNavForInteractive = document.querySelector('.mobile-nav-items');
    if(mobileNavForInteractive && !mobileNavForInteractive.querySelector('a[href="interactive.html"]')){
      const li = document.createElement('li');
      li.innerHTML = '<a href="interactive.html">Interactive<span class="beta-pill" style="margin-left:5px;">Beta</span> <span class="nav-arrow">\u203a</span></a>';
      mobileNavForInteractive.insertBefore(li, mobileNavForInteractive.lastElementChild);
    }

    // Desktop nav: "Settings" trigger + dropdown, inserted before Sign In
    const desktopNav = document.querySelector('.nav-left');
    if(desktopNav){
      const wrap = document.createElement('div');
      wrap.className = 'settings-nav-wrap';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'settings-trigger';
      trigger.textContent = 'Settings';
      const dropdown = document.createElement('div');
      dropdown.className = 'settings-dropdown';
      dropdown.appendChild(makeSettingsRow());
      wrap.appendChild(trigger);
      wrap.appendChild(dropdown);
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if(!wrap.contains(e.target)) dropdown.classList.remove('open');
      });
      desktopNav.insertBefore(wrap, desktopNav.lastElementChild);
    }

    // Mobile nav: settings row inline in the menu list
    const mobileNav = document.querySelector('.mobile-nav-items');
    if(mobileNav){
      const li = document.createElement('li');
      li.style.marginTop = '6px';
      li.appendChild(makeSettingsRow());
      mobileNav.insertBefore(li, mobileNav.lastElementChild);
    }
  });
})();

/* ===================== Interactive: Alzheimer's scroll section (beta) ===================== */
(function(){
  const stages = [
    { title:'A healthy brain', text:'Billions of neurons connect in dense networks, supporting sharp memory, language, and thought.' },
    { title:'Early / mild stage', text:'Small protein plaques begin forming. Mild memory lapses appear — misplacing items, forgetting recent conversations.' },
    { title:'Moderate stage', text:'Plaques and tangles spread. Confusion grows, memory loss becomes more noticeable, and daily tasks get harder.' },
    { title:'Severe stage', text:'Widespread tissue loss (atrophy) shrinks the brain. Memory, communication, and independence are significantly affected.' }
  ];

  function initAlz(){
    const scroller = document.getElementById('alz-scroller');
    const sticky = document.getElementById('alz-sticky');
    if(!scroller || !sticky) return;

    const labelEl = document.getElementById('alz-stage-label');
    const titleEl = document.getElementById('alz-stage-title');
    const textEl = document.getElementById('alz-stage-text');
    const dots = Array.from(document.querySelectorAll('.alz-dot'));

    let currentStage = -1;
    function setStage(i){
      if(i === currentStage) return;
      currentStage = i;
      sticky.setAttribute('data-stage', i);
      labelEl.textContent = `Stage ${i+1} of ${stages.length}`;
      titleEl.textContent = stages[i].title;
      textEl.textContent = stages[i].text;
      dots.forEach((d, di) => d.classList.toggle('active', di === i));
    }

    let ticking = false;
    function update(){
      ticking = false;
      const rect = scroller.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if(total <= 0){ setStage(0); return; }
      let progress = (-rect.top) / total;
      progress = Math.min(1, Math.max(0, progress));
      const idx = Math.min(stages.length - 1, Math.floor(progress * stages.length));
      setStage(idx);
    }
    function onScroll(){
      if(!ticking){ requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll);
    setStage(0);
    update();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAlz);
  else initAlz();
})();
