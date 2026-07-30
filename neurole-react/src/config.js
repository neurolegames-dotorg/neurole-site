/* =====================================================================
   NEUROLE — SINGLE CONFIG SOURCE OF TRUTH

   This is now the ONLY place config/keys live. It replaces the previous
   split across src/config.js + public/config.js + a hardcoded key inside
   utils/helpers.js (which had drifted out of sync with each other).

   It both exports the object (ES import) and assigns window.NEUROLE_CONFIG,
   because the game pages read the global at call time.

   ⚠️ TEMPORARY: GROQ_API_KEY below ships to the browser in the JS bundle and
   is readable by anyone who visits the site. Moving it to a .env file will
   NOT fix that on its own — Vite inlines any VITE_* var into the client
   bundle just the same. The only real fix is to proxy AI calls through the
   server-side Cloudflare Worker (see ai-worker.js) and set AI_ENDPOINT_URL,
   so the key never leaves the server. Rotate this key when that's done.
   ===================================================================== */

const NEUROLE_CONFIG = {
  // --- Published Google Sheet CSV data sources -------------------------
  DAILY_CASE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdap3vkFznafgNnu5r2kNXWxmEw_DJDtHMOA78NweNZG4c-xl8DLIaBEjijkoZLg/pub?output=csv",
  LEARN_REGIONS_SHEET_CSV: "PASTE_YOUR_PUBLISHED_CSV_LINK_HERE_FOR_LEARN_REGIONS",
  NEUROANATOMY_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXmmePxb13QpA9xtiTHTweL24tBzyx22ANHHSjeZkzf5ZXMrx3yx5-bpUVNYGI9RK8J6xkjx6HeS6s/pub?output=csv",
  FUN_FACT_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5v2wioFljU4L_xOk4s6OXxkZDRUx3vC7yca4z9_nVbj18F3neQgSeS0kFEz83yonJiudzPls7pBD2/pub?output=csv",

  // --- AI (Groq is the only provider the site actually calls) ----------
  // Used by askNeuroleAIRaw() for the "Explain" tutor on both games.
  //
  // Deliberately EMPTY, matching the root static site's config.js. Anything
  // in this file is bundled into the public JS and served to every visitor,
  // so a key here is not a secret — it is a published credential. Route the
  // call through the Cloudflare Worker in ai-worker.js instead and set
  // AI_ENDPOINT_URL below; the Worker holds the key server-side.
  //
  // With both left empty, askNeuroleAIRaw() returns null and the "Explain"
  // tutor falls back to its canned explanation.
  GROQ_API_KEY: "",
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
