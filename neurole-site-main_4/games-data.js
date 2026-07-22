/* =====================================================================
   NEUROLE — GAMES DATA
   Edit this array to add, remove, or update games shown on the homepage.
   - type: 'daily'  -> shown in the "Daily Game" section, one per date
   - type: 'normal' -> shown in the "All Games" grid, always visible
   - thumbnail: a local path (e.g. "/thumbnails/daily-case.jpg")
   - availableDate: required for daily games, format YYYY-MM-DD,
     matched against the player's local date.
===================================================================== */

/* =====================================================================
   NEUROLE — GAMES DATA
   Edit this array to add, remove, or update games shown on the homepage.
   - type: 'daily'  -> shown in the "Daily Game" section (just one entry —
     the actual day-to-day case content comes from your Google Sheet,
     read live inside daily-game.html, NOT from this file)
   - type: 'normal' -> shown in the "All Games" grid, always visible
===================================================================== */

const GAMES_DATA = [
  {
    id: "daily-case",
    title: "The Daily Case",
    icon: "stethoscope",
    url: "daily-game.html",
    type: "daily"
  },
  {
    id: "neuroanatomy",
    title: "Map the Brain",
    icon: "brain",
    url: "neuroanatomy.html",
    type: "normal"
  }
];

/* ---------- icon library ---------- */
const GAME_ICONS = {
  // Medical/clinical cross icon — Daily Case
  stethoscope: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5C4480" stroke-width="1.6">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M12 7v10M7 12h10"/>
    </svg>`,
  // Stethoscope / neuron icon — Map the Brain
  brain: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7E5FA6" stroke-width="1.6">
      <path d="M9 2a3 3 0 0 0-3 3v1.2A3 3 0 0 0 4 9v1a3 3 0 0 0 1 5.5V17a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3"/>
      <path d="M15 2a3 3 0 0 1 3 3v1.2a3 3 0 0 1 2 2.8v1a3 3 0 0 1-1 5.5V17a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3"/>
      <path d="M9 12h6M9 8h2M13 8h2M9 16h2M13 16h2"/>
    </svg>`
};

/* ---------- helpers ---------- */

function getTodayLocalDateStr(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodaysDailyGame(){
  return GAMES_DATA.find(g => g.type === 'daily') || null;
}

function getNormalGames(){
  return GAMES_DATA.filter(g => g.type === 'normal');
}

/* ---------- rendering ---------- */

function renderDailyGame(){
  const slot = document.getElementById('daily-game-slot');
  if(!slot) return;
  const game = getTodaysDailyGame();

  if(!game){
    slot.innerHTML = `
      <div class="game-card">
        <div class="icon">📅</div>
        <span class="tag">Daily</span>
        <h3>No case scheduled for today</h3>
        <p>Add a row to GAMES_DATA with today's date (${getTodayLocalDateStr()}) to publish a case.</p>
      </div>`;
    return;
  }

  slot.innerHTML = `
    <a class="game-card" href="${game.url}" style="text-decoration:none;">
      <div class="icon">${GAME_ICONS[game.icon] || ''}</div>
      <span class="tag">Daily · Diagnostic</span>
      <h3>${game.title}</h3>
      <p>A new patient walks in every day. Read the symptoms, guess the condition in five tries or fewer.</p>
      <span class="btn">Play today's case →</span>
    </a>`;
}

function renderAllGames(){
  const grid = document.getElementById('all-games-grid');
  if(!grid) return;
  const games = getNormalGames();

  grid.innerHTML = games.map(game => `
    <a class="game-card" href="${game.url}" style="text-decoration:none;">
      <div class="icon">${GAME_ICONS[game.icon] || ''}</div>
      <span class="tag">Untimed · Visual</span>
      <h3>${game.title}</h3>
      <p>Identify the highlighted brain region, then learn what it does.</p>
      <span class="btn">Play →</span>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderDailyGame();
  renderAllGames();
});
