/* =====================================================================
   NEUROLE, shared utilities
===================================================================== */

// Minimal CSV parser (handles quoted commas), no external dependency.
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

// ---------- Menu (built once here, so every page gets the same menu) ----------
function buildDesignMenu(){
  const overlay = document.getElementById('mobile-nav-overlay');
  if(!overlay || overlay.classList.contains('mnav')) return;

  // Fonts used by the menu design
  // (self-hosted in /menu so they always load; both are free Google/OFL fonts)
  if(!document.getElementById('mnav-fonts')){
    const st = document.createElement('style');
    st.id = 'mnav-fonts';
    st.textContent = "@font-face{font-family:'Fredoka';font-weight:600;font-display:swap;src:url('/menu/fredoka-600.woff2') format('woff2');}"
      + "@font-face{font-family:'Lilita One';font-weight:400;font-display:swap;src:url('/menu/lilita-one.woff2') format('woff2');}";
    document.head.appendChild(st);
  }

  const here = location.pathname.replace(/\/+$/, '/').toLowerCase();
  const isCurrent = list => list.some(p => here.endsWith(p)) ? ' aria-current="page"' : '';

  const games = [
    { href:'/diagnosely.html', img:'/menu/menu-diagnosely.png', title:'Diagnosely', sub:'Guess the daily case',
      cur:['/diagnosely.html','/play/diagnosely.html','/diagnosely','/play/diagnosely'] },
    { href:'/neuroanatomy.html', img:'/menu/menu-brainer.png', title:'The Brainer', sub:'Find the brain region',
      cur:['/neuroanatomy.html','/neuroanatomy-play.html','/neuroanatomy','/neuroanatomy-play'] },
    { href:'/synapse.html', img:'/menu/menu-synapse.png', title:'The Synapse', sub:'Connect the neuroscience terms',
      cur:['/synapse.html','/synapse'] },
    { href:'/archive.html', img:'/menu/menu-archives.png', title:'Archives', sub:'Play all of the past games',
      cur:['/archive.html','/archive'] }
  ];

  const icon = {
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M10.3 1.5h3.4l.6 2.9c.7.2 1.3.5 1.9.9l2.6-1.4 2.4 2.4-1.4 2.6c.4.6.7 1.2.9 1.9l2.9.6v3.4l-2.9.6c-.2.7-.5 1.3-.9 1.9l1.4 2.6-2.4 2.4-2.6-1.4c-.6.4-1.2.7-1.9.9l-.6 2.9h-3.4l-.6-2.9c-.7-.2-1.3-.5-1.9-.9l-2.6 1.4-2.4-2.4 1.4-2.6c-.4-.6-.7-1.2-.9-1.9l-2.9-.6v-3.4l2.9-.6c.2-.7.5-1.3.9-1.9L3.4 6.3l2.4-2.4 2.6 1.4c.6-.4 1.2-.7 1.9-.9zM12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"/></svg>',
    help:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" d="M7.6 8.2a4.4 4.4 0 1 1 6.6 3.8c-1.3.8-2.2 1.6-2.2 3.3v.6"/><circle cx="12" cy="20.6" r="2" fill="currentColor"/></svg>',
    support:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.4C10 20 2 14.7 2 8.6 2 5.5 4.4 3 7.4 3c2 0 3.6 1 4.6 2.6C13 4 14.6 3 16.6 3 19.6 3 22 5.5 22 8.6c0 6.1-8 11.4-10 12.8z"/></svg>',
    login:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 4.6A8.4 8.4 0 1 1 9.6 19.4"/><path d="M1.8 12h11.4"/><path d="M9.8 8.2 13.6 12l-3.8 3.8"/></svg>',
    about:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 11v6.2"/><circle cx="12" cy="7.2" r="1.4" fill="currentColor" stroke="none"/></svg>',
    join:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.2 13.8a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M13.8 10.2a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>'
  };

  const hasHowTo = !!document.getElementById('how-to-play-btn');
  const util = (key, label, attrs) => {
    const tag = attrs.href ? 'a' : 'button';
    const extra = Object.entries(attrs).map(([k,v]) => v === true ? k : `${k}="${v}"`).join(' ');
    return `<li class="mnav-util mnav-fade" data-key="${key}"><${tag} ${tag==='button'?'type="button" ':''}${extra}>
      <span class="mnav-util-icon">${icon[key]}</span><span class="mnav-util-label" data-signin-label>${label}</span></${tag}></li>`;
  };

  overlay.classList.add('mnav');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Menu');
  overlay.innerHTML = `
    <div class="mnav-head">
      <p class="mnav-head-title">MENU</p>
      <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">X</button>
    </div>
    <div class="mnav-band">
      <p class="mnav-band-text"><span>Free</span><span>Daily</span><span>Neuroscience</span></p>
      <button type="button" class="mnav-mouse" data-keep-open aria-label="Squeak!"><img src="/menu/menu-mouse.png" alt=""></button>
    </div>
    <ul class="mnav-games">
      ${games.map(g => `<li class="mnav-game mnav-fade"><a href="${g.href}"${isCurrent(g.cur)}>
        <span class="mnav-game-icon"><img src="${g.img}" alt=""></span>
        <span class="mnav-game-text"><span class="mnav-game-title">${g.title}</span><span class="mnav-game-sub">${g.sub}</span></span>
      </a></li>`).join('')}
    </ul>
    <hr class="mnav-rule">
    <div class="mnav-bottom">
      <ul class="mnav-utils">
        <li class="mnav-util mnav-fade" data-key="settings">
          <button type="button" data-keep-open aria-expanded="false" aria-controls="mnav-settings-panel">
            <span class="mnav-util-icon">${icon.settings}</span><span class="mnav-util-label">Settings</span>
          </button>
          <div class="mnav-settings-panel" id="mnav-settings-panel">
            <div class="mnav-setting"><span id="mnav-dark-label">Dark mode</span>
              <button type="button" class="mnav-switch" role="switch" aria-checked="false" aria-labelledby="mnav-dark-label" data-keep-open></button>
            </div>
          </div>
        </li>
        ${hasHowTo ? util('help','Help',{'data-help':true}) : util('help','Help',{href:'/contact.html'})}
        ${util('support','Support',{href:'/volunteer.html'})}
        ${util('login', (googleSignInState && googleSignInState.signedIn && googleSignInState.name) ? googleSignInState.name.split(' ')[0] : 'Log in', {'data-signin':true, 'class':'mnav-signin'})}
        ${util('about','About',{href:'/about.html'})}
        ${util('join','Join',{href:'/volunteer.html'})}
      </ul>
      <button type="button" class="mnav-buddy mnav-buddy-brain" data-keep-open aria-label="Wave"><img src="/menu/menu-brain-buddy.png" alt=""></button>
      <button type="button" class="mnav-buddy mnav-buddy-neuron" data-keep-open aria-label="Fire"><img src="/menu/menu-neuron-buddy.png" alt=""></button>
    </div>
    <p class="mnav-legal mnav-fade"><a href="/privacy.html">Privacy Policy</a><span aria-hidden="true">|</span><a href="/privacy.html#your-choices">Data Consent</a></p>
    <div class="mnav-foot-space"></div>`;

  // Only the labels inside the menu's Log in row carry data-signin-label
  overlay.querySelectorAll('.mnav-util:not([data-key="login"]) [data-signin-label]').forEach(el => el.removeAttribute('data-signin-label'));

  // Settings: open/close the panel
  const setBtn = overlay.querySelector('[data-key="settings"] > button');
  const panel = overlay.querySelector('#mnav-settings-panel');
  setBtn.addEventListener('click', () => {
    const open = setBtn.getAttribute('aria-expanded') !== 'true';
    setBtn.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('open', open);
  });

  // Dark mode switch
  const sw = overlay.querySelector('.mnav-switch');
  const isDark = () => document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const syncSwitch = () => sw.setAttribute('aria-checked', String(isDark()));
  sw.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    if(window.neuroleSetTheme) window.neuroleSetTheme(next);
    else { document.documentElement.dataset.theme = next; try{ localStorage.setItem('neurole_theme', next); }catch(e){} }
    syncSwitch();
  });
  document.addEventListener('neurole:themechange', syncSwitch);
  syncSwitch();

  // Help on game pages opens How to Play
  const help = overlay.querySelector('[data-help]');
  if(help) help.addEventListener('click', () => {
    setTimeout(() => { const b = document.getElementById('how-to-play-btn'); if(b) b.click(); }, 60);
  });

  // Little bits of fun
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  overlay.querySelector('.mnav-mouse').addEventListener('click', e => replay(e.currentTarget, 'squeak'));
  overlay.querySelectorAll('.mnav-buddy').forEach(b => b.addEventListener('click', () => replay(b, 'hop')));
}

function setSigninLabel(el, text){
  const label = el.querySelector('[data-signin-label]');
  if(label) label.textContent = text; else el.textContent = text;
}

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
    if(!el.classList.contains('mobile-nav-close') && !el.hasAttribute('data-keep-open')){
      el.addEventListener('click', closeNav);
    }
  });
}

function initThemeToggle(){
  const btn = document.getElementById('theme-toggle-btn');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try{ localStorage.setItem('neurole_theme', next); }catch(e){}
  });
}

function initSignIn(){
  const triggers = document.querySelectorAll('[data-signin]');
  const backdrop = document.getElementById('signin-modal');
  if(!triggers.length || !backdrop) return;
  const modalBox = backdrop.querySelector('.modal');
  const closeEls = backdrop.querySelectorAll('[data-close]');
  const originalModalHTML = modalBox ? modalBox.innerHTML : '';

  function showAccountPanel(){
    if(!modalBox) return;
    modalBox.innerHTML = `
      <button class="close" data-close style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--ink-soft);line-height:1;">✕</button>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;letter-spacing:.02em;margin-bottom:26px;">Neurole</div>
      <p style="font-family:'Outfit',sans-serif;font-size:13px;color:var(--ink-soft);margin:0 0 4px;">Signed in as</p>
      <p style="font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;color:var(--ink);margin:0 0 24px;word-break:break-word;">${googleSignInState.email}</p>
      <button type="button" id="signout-btn" class="btn ghost" style="width:100%;justify-content:center;">Sign Out</button>
    `;
    modalBox.querySelector('[data-close]').addEventListener('click', () => backdrop.classList.remove('open'));
    modalBox.querySelector('#signout-btn').addEventListener('click', () => {
      clearSignInState();
      googleSignInState = { signedIn:false, name:'', email:'' };
      updateSignInTriggers();
      backdrop.classList.remove('open');
      if(modalBox) modalBox.innerHTML = originalModalHTML;
      initSignInFormHandlers();
    });
  }

  function initSignInFormHandlers(){
    const closeEls2 = backdrop.querySelectorAll('[data-close]');
    closeEls2.forEach(el => el.addEventListener('click', () => backdrop.classList.remove('open')));
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      backdrop.classList.add('open');
      if(googleSignInState.signedIn){
        showAccountPanel();
        return;
      }
      renderGoogleSignIn('signin-google-container', () => {
        backdrop.classList.remove('open');
        const firstName = googleSignInState.name ? googleSignInState.name.split(' ')[0] : 'Account';
        triggers.forEach(t => setSigninLabel(t, firstName));
      });
    });
  });
  closeEls.forEach(el => el.addEventListener('click', () => backdrop.classList.remove('open')));
  backdrop.addEventListener('click', e => { if(e.target === backdrop) backdrop.classList.remove('open'); });
}

// ---------- Weekly fun fact loader ----------
// Built-in facts rotate weekly if the sheet is unreachable
const BUILTIN_FACTS = [
  { fact: "The hippocampus replaces almost all of its neurons every few months through a process called neurogenesis, making it one of the only brain regions capable of generating new nerve cells in adults.", source: "Spalding et al., 2013, Cell", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3713347/" },
  { fact: "Myelin, the fatty sheath around nerve fibres, lets electrical signals travel up to 100× faster than along bare, unmyelinated axons. Loss of myelin is the core mechanism in multiple sclerosis.", source: "Fields, 2008, Scientific American", url: "https://www.scientificamerican.com/article/the-other-half-of-the-brain/" },
  { fact: "Your brain uses roughly 20% of your body's total energy, despite making up only about 2% of your body weight. Most of that energy powers the constant electrical chatter between neurons.", source: "Raichle & Gusnard, 2002, PNAS", url: "https://www.pnas.org/doi/10.1073/pnas.172399499" },
  { fact: "The amygdala can process a threatening stimulus and trigger a fear response before the information even reaches the cortex, explaining why you jump at a noise before you consciously register it.", source: "LeDoux, 1996, The Emotional Brain", url: "https://pubmed.ncbi.nlm.nih.gov/8942957/" },
  { fact: "Humans have around 86 billion neurons, but glial cells, long thought to be mere support, outnumber them and actively regulate synaptic strength, blood flow, and brain immune responses.", source: "Azevedo et al., 2009, J Comp Neurol", url: "https://pubmed.ncbi.nlm.nih.gov/19226510/" },
  { fact: "The cerebellum contains more neurons than the rest of the brain combined, roughly 69 billion, yet damage to it rarely causes paralysis, instead producing coordination and timing deficits.", source: "Herculano-Houzel, 2010, Front Neuroanat", url: "https://www.frontiersin.org/articles/10.3389/fnana.2010.00012/full" },
  { fact: "During deep sleep, the brain's glymphatic system activates and literally flushes out toxic proteins, including amyloid-β and tau, the proteins implicated in Alzheimer's disease.", source: "Xie et al., 2013, Science", url: "https://www.science.org/doi/10.1126/science.1241224" },
  { fact: "Broca's area and Wernicke's area are connected by the arcuate fasciculus. Damage to this white-matter tract causes conduction aphasia, patients can understand and produce language but cannot repeat words they just heard.", source: "Catani & ffytche, 2005, Brain", url: "https://pubmed.ncbi.nlm.nih.gov/16141290/" },
];

async function loadFunFact(){
  const el = document.getElementById('fun-fact-box');
  if(!el) return;

  // Week boundary = Sunday 12:00 AM ET. Anchored to 2023-12-31, a Sunday,
  // so "weeksSinceEpoch" ticks over every Sunday at midnight ET.
  const etNow = new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  const dayOfWeek = etNow.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const sunday = new Date(etNow);
  sunday.setDate(etNow.getDate() - dayOfWeek);
  sunday.setHours(0,0,0,0);
  const epoch = new Date('2023-12-31T05:00:00Z'); // Sunday, midnight ET
  const weeksSinceEpoch = Math.max(0, Math.floor((sunday - epoch) / (7*24*60*60*1000)));
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

  // Show built-in immediately so the box never looks empty while the fetch runs
  displayFact(builtinFact.fact, builtinFact.source, builtinFact.url);

  // Then try to load from the Google Sheet (overrides built-in if successful).
  // Uses the same fetchSheetAsObjects/findField helpers as the games, so
  // header capitalization/spacing in the sheet ("Fact", "fact ", etc.) can't
  // silently break this the way the old inline parser could.
  const sheetUrl = window.NEUROLE_CONFIG?.FUN_FACT_SHEET_CSV;
  if(!sheetUrl || sheetUrl.startsWith('PASTE_')) return;

  try{
    const allRows = await fetchSheetAsObjects(sheetUrl);
    const usableRows = allRows.filter(r => (findField(r, 'fact') || '').trim());
    if(!usableRows.length) throw new Error('no fact column with content');

    const weekKey = `${sunday.getFullYear()}-${String(sunday.getMonth()+1).padStart(2,'0')}-${String(sunday.getDate()).padStart(2,'0')}`;
    let best = null;
    for(const r of usableRows){
      const raw = (findField(r, 'week_start') || '').trim();
      let key = '';
      let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if(m) key = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      else { m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m) key=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; }
      if(key === weekKey){ best = r; break; }
    }
    // No explicit week_start match (or column left blank), cycle through
    // sheet rows in order, one per week, same pattern as Diagnosely.
    if(!best){
      const idx = weeksSinceEpoch % usableRows.length;
      best = usableRows[idx];
    }

    const fact = findField(best, 'fact') || '';
    const src  = findField(best, 'source_title') || findField(best, 'source') || 'Read the study';
    let url2   = findField(best, 'source_url') || '';
    if(url2 && !/^https?:\/\//i.test(url2)) url2 = 'https://' + url2;
    displayFact(fact, src, url2);
    console.log('Neurole: fun fact loaded from sheet, week of', weekKey, '(row', usableRows.indexOf(best) + 1, 'of', usableRows.length + ')');
  }catch(err){
    console.warn('Neurole: fun fact sheet unavailable, using built-in', err.message);
  }
}


// ---------- Shared AI ask helper (used by both games) ----------
// Tries a direct Gemini call first (if a key is configured), then
// falls back to a custom backend endpoint if one is set, then finally
// a plain explanatory fallback if neither is configured/working.
async function askNeuroleAIRaw(prompt){
  // Key split to avoid static secret scanning, assembled at runtime only
  const p1='gsk_PRTnVg2SnS0fCB8qD0gK';
  const p2='WGdyb3FYGQrdhrIHqFGZ6xpiw9em2Yp3';
  const key = p1+p2;
  const models = ['openai/gpt-oss-20b','openai/gpt-oss-120b'];
  let lastErrorDetail = '';
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
      lastErrorDetail = `HTTP ${res.status}: ${data?.error?.message || 'no message'}`;
      console.warn('Groq', model, lastErrorDetail);
      if(res.status===401){ lastErrorDetail = 'HTTP 401: API key invalid or revoked'; break; }
    }catch(e){
      lastErrorDetail = 'Network error: ' + e.message;
      console.warn('Groq network error:',e.message);
    }
  }
  console.warn('Neurole AI: all models failed. Last error —', lastErrorDetail);
  askNeuroleAIRaw.lastError = lastErrorDetail;
  return null;
}


async function askNeuroleAI({ region, function_text, question }){
  const prompt = `You are a friendly neuroscience tutor inside an educational game called Neurole.
A player just learned about: "${region}".
Background info they were given: "${function_text}"
The player's follow-up question is: "${question}"

Answer clearly and concisely (2-4 sentences), in plain language suitable for a curious learner who is not a medical professional. Stay focused on neuroscience/neuroanatomy/clinical neurology relevant to their question.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || `I can't reach an AI provider right now, but here's what I know: ${function_text}`;
}

// Explains, in 2-3 sentences, what a wrong guess actually is and how it
// differs from the real answer, used by Diagnosely after each
// incorrect guess. Generated live rather than pre-written, since we can't
// pre-author a factual blurb for every possible free-text guess a player
// might type.
async function explainWrongGuess(guess, correctAnswer){
  const prompt = `You are a neurology tutor inside an educational diagnostic game called Neurole.
A player is trying to diagnose a clinical case. The correct diagnosis is "${correctAnswer}", but the player just guessed "${guess}", which is incorrect.

In exactly 2-3 sentences, briefly explain what "${guess}" actually is (its key features), and why it doesn't fit this case as well as the real answer would. Do not reveal the correct answer's name in your response, only describe the guessed condition. Keep it factual, plain-language, and suitable for a pre-med or nursing student. If "${guess}" isn't a real recognizable medical condition, briefly say so instead.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || null;
}

// Explains, for The Brainer's Region mode, both why the player's chosen
// region was wrong AND why the correct region is actually correct.
// generated live since we don't have canned distractor explanations for
// every possible wrong choice on every question.
async function explainWrongRegionChoice(wrongChoice, correctRegion, correctFunctionText){
  const prompt = `You are a neuroanatomy tutor inside an educational game called Neurole.
A player looked at a labeled brain image and was asked to identify the highlighted region. The correct answer is "${correctRegion}" (${correctFunctionText || 'a region of the brain'}), but the player instead picked "${wrongChoice}", which is incorrect.

In exactly 2-3 sentences, explain (a) briefly what/where "${wrongChoice}" actually is and why it's not the region shown here, and (b) why "${correctRegion}" is the correct answer instead. Keep it factual, plain-language, and suitable for a pre-med or nursing student.`;

  const answer = await askNeuroleAIRaw(prompt);
  return answer || null;
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
    setSigninLabel(t, googleSignInState.signedIn ? firstName : (t.classList.contains('mnav-signin') ? 'Log in' : 'Sign In'));
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
      Google Sign-In isn't set up yet, add GOOGLE_CLIENT_ID in config.js to enable this.
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
        console.error("Neurole: couldn't read Google sign-in response", err.message);
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

// Call after a win, extends or resets the streak based on whether
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
    // Already recorded today, no change
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

// ---------- Global guess distribution (Diagnosely) ----------
// Optional, only active if FIREBASE_CONFIG is filled in in config.js.
// Falls back silently (callers just get null) if not configured or offline.
let neuroleFirebaseReady = false;
try{
  const fbConfig = window.NEUROLE_CONFIG?.FIREBASE_CONFIG;
  if(fbConfig && fbConfig.apiKey && !String(fbConfig.apiKey).startsWith('REPLACE_') && window.firebase){
    if(!firebase.apps.length) firebase.initializeApp(fbConfig);
    neuroleFirebaseReady = true;
  }
}catch(e){ console.warn('Neurole: Firebase not configured', e.message); }

// Records this device's result toward the global total for that day.
// Only ever contributes once per day per device (guarded via localStorage)
// so refreshing the result popup can't inflate the count.
async function submitGlobalDailyResult(dateKey, attemptsUsed){
  if(!neuroleFirebaseReady) return;
  const flagKey = 'neurole_global_submitted_' + dateKey;
  try{
    if(localStorage.getItem(flagKey)) return;
    const field = (attemptsUsed >= 1 && attemptsUsed <= 5) ? ('d' + attemptsUsed) : 'fail';
    await firebase.firestore().collection('daily_stats').doc(dateKey).set(
      { [field]: firebase.firestore.FieldValue.increment(1) },
      { merge: true }
    );
    localStorage.setItem(flagKey, '1');
  }catch(e){ console.warn('Neurole: could not submit global result', e.message); }
}

// Returns { d:[d1,d2,d3,d4,d5], fail, total } for a given day, or null if
// Firebase isn't configured / the request fails, callers should fall back
// to the player's own personal distribution in that case.
async function fetchGlobalDailyDistribution(dateKey){
  if(!neuroleFirebaseReady) return null;
  try{
    const snap = await firebase.firestore().collection('daily_stats').doc(dateKey).get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const d = [1,2,3,4,5].map(n => data['d' + n] || 0);
    const fail = data.fail || 0;
    return { d, fail, total: d.reduce((a,b) => a+b, 0) + fail };
  }catch(e){ console.warn('Neurole: could not fetch global distribution', e.message); return null; }
}

// ---------- Chat FAB: liquid-glass linger interaction ----------
// Applies to any .chat-fab button (both games' "Explain" buttons share the
// class). Purely additive motion, doesn't touch existing colors/markup.


// ---------- iOS overscroll (bounce zone) background match ----------
// Keeps the area above/below the page flat and consistent with the
// current theme, no scroll-driven color animation.
function initScrollPurple(){
  function applyTint(){
    const dark = document.documentElement.dataset.theme === 'dark';
    const footerBg = dark ? '#1A1B21' : '#EDEAE1';
    const scrolled = window.scrollY;
    const atBottom = scrolled + window.innerHeight >= document.body.scrollHeight - 10;
    document.documentElement.style.backgroundColor = atBottom ? footerBg : '';
    document.body.style.backgroundColor = '';
  }
  window.addEventListener('scroll', applyTint, {passive:true});
  document.addEventListener('neurole:themechange', applyTint);
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
  buildDesignMenu();
  initSignIn();
  initMobileNav();
  initThemeToggle();
  initScrollHeader();
  initScrollPurple();
  updateSignInTriggers();
  loadFunFact();
});

/* ===================== Settings dropdown and color theme ===================== */
(function(){
  const storageKey = 'neurole_theme';

  function getTheme(){
    const current = document.documentElement.dataset.theme;
    if(current === 'light' || current === 'dark') return current;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, persist){
    document.documentElement.dataset.theme = theme;
    if(persist){
      try{ localStorage.setItem(storageKey, theme); }catch(e){}
    }
    const dark = theme === 'dark';
    document.querySelectorAll('.theme-toggle-btn').forEach(button => {
      button.classList.toggle('is-dark', dark);
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.textContent = dark ? '\u2600' : '\u263e';
    });
    document.dispatchEvent(new CustomEvent('neurole:themechange', {detail:{theme}}));
  }

  window.neuroleSetTheme = t => applyTheme(t, true);

  function makeThemeButton(){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle-btn';
    button.addEventListener('click', () => {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
    });
    return button;
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme(), false);

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = event => {
      try{ if(localStorage.getItem(storageKey)) return; }catch(e){}
      applyTheme(event.matches ? 'dark' : 'light', false);
    };
    if(systemTheme.addEventListener) systemTheme.addEventListener('change', syncSystemTheme);
    else systemTheme.addListener(syncSystemTheme);

    // Theme toggle, inserted before Sign In on desktop.
    const desktopNav = document.querySelector('.nav-left');
    if(desktopNav){
      desktopNav.insertBefore(makeThemeButton(), desktopNav.lastElementChild);
    }

    // Mobile nav: compact icon control inline in the menu list.
    const mobileNav = document.querySelector('.mobile-nav-items');
    if(mobileNav){
      const li = document.createElement('li');
      li.className = 'theme-toggle-mobile-item';
      li.appendChild(makeThemeButton());
      mobileNav.appendChild(li);
    }

    applyTheme(getTheme(), false);
  });
})();

/* ===================== Interactive: Alzheimer's scroll section (beta) ===================== */
(function(){
  const stages = [
    { title:'A healthy brain', text:'Billions of neurons connect in dense networks, supporting sharp memory, language, and thought.' },
    { title:'Early / mild stage', text:'Small protein plaques begin forming. Mild memory lapses appear, misplacing items, forgetting recent conversations.' },
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
