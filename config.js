/* =====================================================================
   NEUROLE, CONFIG
   Fill these in with your own published Google Sheet CSV links.

   HOW TO CONNECT A GOOGLE SHEET:
   1. Open your Google Sheet.
   2. File > Share > Publish to web.
   3. Choose the specific SHEET/TAB (not "Entire document"),
      set format to "Comma-separated values (.csv)", click Publish.
   4. Copy the generated link and paste it below.
   5. Any edit you make in the Sheet will show up on the site
      automatically (Google re-publishes every few minutes; you can
      force it sooner with File > Publish to web > Republish).
===================================================================== */

window.NEUROLE_CONFIG = {

  // --- Daily Clinical Case game -------------------------------------
  // Columns expected (header row): 
  // Column layout (A→J): date | symptom_1 | symptom_2 | symptom_3 | symptom_4 | symptom_5 | answer | accepted_synonyms | explanation | author
  // Optional columns (K→P) power the "Ask about the case" feature - the
  // player can click up to 5 of these 6 categories to reveal case-specific
  // info before guessing. Leave a cell blank to disable that category for
  // that day's case (its button will be grayed out).
  //   K = vitals, L = physical exam, M = past medical history,
  //   N = medications, O = labs & imaging, P = social/family history
  DAILY_CASE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdap3vkFznafgNnu5r2kNXWxmEw_DJDtHMOA78NweNZG4c-xl8DLIaBEjijkoZLg/pub?output=csv",

  // --- Learn Regions (beginners section on Map the Brain) ---------
  // Columns expected (header row):
  // region | function_text | category (optional) | difficulty (optional)
  // One row per brain region you want shown in the "Learn regions" modal.
  LEARN_REGIONS_SHEET_CSV: "PASTE_YOUR_PUBLISHED_CSV_LINK_HERE_FOR_LEARN_REGIONS",

  // --- Neuroanatomy game ---------------------------------------------
  // The code reads columns by HEADER NAME (row 1), not by column letter.
  // so it doesn't matter which literal column something sits in, as long
  // as row 1 has these exact header names somewhere in it.
  //
  // REGION mode (image shown, guess which region is highlighted):
  //   region | image_url | choice_a | choice_b | choice_c | choice_d |
  //   correct_choice (K/L/M/N) | function_text ("Why", shown after answering)
  //
  // FUNCTION mode (same image, choices from a separate set of columns):
  //   Function A | Function B | Function C | Function D | Correct
  //   (containing literally "A", "B", "C", or "D") | function_text
  //   ("Which region?", shown after answering)
  //
  // Both modes pull their post-answer explanation from the same
  // function_text column, only the section label differs (Region mode
  // says "Why", Function mode says "Which region?").
  //
  // category (optional) | difficulty (optional) apply to both modes.
  NEUROANATOMY_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXmmePxb13QpA9xtiTHTweL24tBzyx22ANHHSjeZkzf5ZXMrx3yx5-bpUVNYGI9RK8J6xkjx6HeS6s/pub?output=csv",

  // --- The Synapse (Connections-style word grouping game) -------------
  // One row per day. Column headers (confirmed from your sheet):
  //   Date | green1 | green2 | green3 | green4 | yellow1 | yellow2 |
  //   yellow3 | yellow4 | red1 | red2 | red3 | red4 | purple1 | purple2 |
  //   purple3 | purple4 | Theme red | Theme yellow | Theme green | Theme purple
  // Date format matches your sheet exactly: M-D-YYYY, no leading zeros
  // (e.g. "8-4-2026" for August 4, 2026).
  SYNAPSE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5Za-nsdHnaneFXdg4MRGn_RCz-EcRVZ-SztPZjBM2Z8mYCX7-jHQg1vYFuV7lcOw9r7Y0fd7F3XjZ/pub?gid=0&single=true&output=csv",

  // --- Weekly fun fact -------------------------------------------------
  // Columns expected (header row):
  // week_start | fact | source_title | source_url
  FUN_FACT_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5v2wioFljU4L_xOk4s6OXxkZDRUx3vC7yca4z9_nVbj18F3neQgSeS0kFEz83yonJiudzPls7pBD2/pub?output=csv",

  // --- Google Sign-In ---------------------------------------------------
  // Powers the "Sign In" button (homepage) and the "save your streak"
  // sign-in inside both games' end-of-game popups. This uses Google's
  // real, official Sign-In, not a custom form, so players sign in
  // with their actual Google account.
  //
  // SETUP (free, ~5 minutes):
  //   1. Go to https://console.cloud.google.com/apis/credentials
  //   2. Create a project (if you don't have one already).
  //   3. Click "Create Credentials" -> "OAuth client ID".
  //      - Application type: "Web application"
  //      - Authorized JavaScript origins: add your site's URL
  //        (e.g. https://yoursite.netlify.app)
  //   4. Copy the Client ID it gives you (ends in .apps.googleusercontent.com)
  //   5. Paste it below.
  //
  // Until you do this, the Sign In buttons will show a message asking
  // you to finish this setup instead of a real Google sign-in screen.
  GOOGLE_CLIENT_ID: "583762713343-9qaunbi2idfuf9fdtdirhiehvprm9jp2.apps.googleusercontent.com",

  // --- "Ask a question" AI helper on both games ------------------------
  // The browser cannot keep a secret. Every option that pastes a provider key
  // into this file publishes that key to every visitor, and domain restriction
  // is not a substitute: it is enforced by an Origin/Referer header the caller
  // controls, so it deters casual copying and nothing more. Groq and OpenAI
  // keys cannot be domain-restricted at all.
  //
  // So there is one supported arrangement, not several: deploy ai-worker.js to
  // Cloudflare Workers, store the provider key in the Worker's environment as a
  // Secret, and point AI_ENDPOINT_URL at the Worker. The key then never reaches
  // the browser. GROQ_API_KEY, GEMINI_API_KEY and OPENAI_API_KEY have been
  // removed from this file, and the client has no direct-to-provider code path
  // left, so re-adding one of those fields will not do anything.

  // Deployed Cloudflare Worker URL. Until this is set, askNeuroleAIRaw()
  // returns null and the "Explain" tutor shows its canned fallback.
  AI_ENDPOINT_URL: "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE",

  // --- Social links -----------------------------------------------------
  SOCIAL: {
    instagram: "https://www.instagram.com/neurolegames/",
    email: "mailto:neurolegames@gmail.com",
    youtube: "https://www.youtube.com/@Neurolegames"
  },

  // --- Global Guess Distribution (Daily Case) ---------------------------
  // Powers the "Guess Distribution, All Players" bars in the end-of-game
  // popup, showing how everyone who played today's case did, not just you.
  // Uses Firebase Firestore, which is free for this kind of light usage
  // and needs no server of your own, the browser talks to it directly.
  //
  // SETUP (free, ~10 minutes):
  //   1. Go to https://console.firebase.google.com and create a project
  //      (any name, e.g. "neurole").
  //   2. In the left sidebar: Build -> Firestore Database -> Create database.
  //      Choose "Start in production mode", pick any region, click Enable.
  //   3. Go to Firestore -> Rules tab and replace the rules with:
  //
  //        rules_version = '2';
  //        service cloud.firestore {
  //          match /databases/{database}/documents {
  //            match /daily_stats/{day} {
  //              allow read: if true;
  //              allow write: if request.resource.data.diff(resource.data == null ? {} : resource.data).affectedKeys()
  //                             .hasOnly(['d1','d2','d3','d4','d5','fail']);
  //            }
  //          }
  //        }
  //
  //      This lets anyone read the daily totals (needed to show the bars)
  //      and only ever increment the five known counters, it can't be
  //      used to write arbitrary data. Click "Publish".
  //   4. Back in Project Overview, click the "</>" (web app) icon to
  //      register a web app. Skip Firebase Hosting, you don't need it.
  //   5. It'll show you a firebaseConfig object. Copy those values into
  //      FIREBASE_CONFIG below. (These values are meant to be public.
  //      unlike API keys elsewhere in this file, they're not secret;
  //      the Firestore Rules above are what actually control access.)
  //
  // Until this is filled in, the popup automatically falls back to
  // showing your own personal guess history instead, nothing breaks.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyAdbHOuaT5tucKUL_8oUs1dRQc_VJCPGWw",
    authDomain: "neurole-3abac.firebaseapp.com",
    projectId: "neurole-3abac",
    storageBucket: "neurole-3abac.firebasestorage.app",
    messagingSenderId: "68816405131",
    appId: "1:68816405131:web:c465646700c2c8c0bd4a8e"
  }
};
