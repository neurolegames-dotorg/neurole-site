/* =====================================================================
   NEUROLE — SINGLE CONFIG SOURCE OF TRUTH

   This is now the ONLY place config/keys live. It replaces the previous
   split across src/config.js + public/config.js + a hardcoded key inside
   utils/helpers.js (which had drifted out of sync with each other).

   It both exports the object (ES import) and assigns window.NEUROLE_CONFIG,
   because the game pages read the global at call time.

   ⚠️ NO PROVIDER API KEYS IN THIS FILE. Everything here is bundled into the
   client JS and served to every visitor, so a key placed here is not a secret
   but a published credential. Moving it to a .env file does NOT help — Vite
   inlines any VITE_* var into the bundle just the same. AI calls go through
   the Cloudflare Worker in ai-worker.js via AI_ENDPOINT_URL, which is the only
   arrangement where the key never leaves the server.

   The Firebase block near the bottom is the one exception, and only because
   Firebase web config values are public identifiers by design — Firestore
   security rules, not secrecy, are what gate access there.
   ===================================================================== */

const NEUROLE_CONFIG = {
  // --- Published Google Sheet CSV data sources -------------------------
  DAILY_CASE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdap3vkFznafgNnu5r2kNXWxmEw_DJDtHMOA78NweNZG4c-xl8DLIaBEjijkoZLg/pub?output=csv",
  LEARN_REGIONS_SHEET_CSV: "PASTE_YOUR_PUBLISHED_CSV_LINK_HERE_FOR_LEARN_REGIONS",
  NEUROANATOMY_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXmmePxb13QpA9xtiTHTweL24tBzyx22ANHHSjeZkzf5ZXMrx3yx5-bpUVNYGI9RK8J6xkjx6HeS6s/pub?output=csv",
  FUN_FACT_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5v2wioFljU4L_xOk4s6OXxkZDRUx3vC7yca4z9_nVbj18F3neQgSeS0kFEz83yonJiudzPls7pBD2/pub?output=csv",
  // One row per puzzle date. Columns: Date (M-D-YYYY), green1..4, yellow1..4,
  // red1..4, purple1..4, and a "Theme <colour>" per group.
  SYNAPSE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5Za-nsdHnaneFXdg4MRGn_RCz-EcRVZ-SztPZjBM2Z8mYCX7-jHQg1vYFuV7lcOw9r7Y0fd7F3XjZ/pub?output=csv",

  // --- AI ---------------------------------------------------------------
  // Used by askNeuroleAIRaw() for the "Explain" tutor on both games.
  //
  // There is no GROQ_API_KEY field here any more, and adding one back will not
  // do anything: askNeuroleAIRaw() has no direct-to-provider path left. The
  // Worker is the only route, which is the only way the key stays server-side.
  //
  // Left empty, askNeuroleAIRaw() returns null and the "Explain" tutor falls
  // back to its canned explanation.
  //
  // Deployed Cloudflare Worker URL. When set, askNeuroleAIRaw() routes
  // through it and no key is needed in the browser.
  AI_ENDPOINT_URL: "",

  // --- Public identifiers (safe to expose by design) -------------------
  GOOGLE_CLIENT_ID: "583762713343-9qaunbi2idfuf9fdtdirhiehvprm9jp2.apps.googleusercontent.com",

  SOCIAL: {
    instagram: "https://www.instagram.com/neurolegames/",
    email: "mailto:neurolegames@gmail.com",
    youtube: "https://www.youtube.com/@Neurolegames"
  },

  // Firebase web config is a public client identifier, not a secret —
  // access is controlled by Firestore security rules, so keep those locked down.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyAdbHOuaT5tucKUL_8oUs1dRQc_VJCPGWw",
    authDomain: "neurole-3abac.firebaseapp.com",
    projectId: "neurole-3abac",
    storageBucket: "neurole-3abac.firebasestorage.app",
    messagingSenderId: "68816405131",
    appId: "1:68816405131:web:c465646700c2c8c0bd4a8e"
  }
};

// The game pages read window.NEUROLE_CONFIG at call time.
if (typeof window !== 'undefined') window.NEUROLE_CONFIG = NEUROLE_CONFIG;

export default NEUROLE_CONFIG;
