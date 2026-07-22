/* =====================================================================
   NEUROLE — CONFIG
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
  // date | case_id | symptom_1 | symptom_2 | symptom_3 | symptom_4 | symptom_5 | answer | accepted_synonyms | explanation
  DAILY_CASE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdap3vkFznafgNnu5r2kNXWxmEw_DJDtHMOA78NweNZG4c-xl8DLIaBEjijkoZLg/pub?output=csv",

  // --- Learn Regions (beginners section on Map the Brain) ---------
  // Columns expected (header row):
  // region | function_text | category (optional) | difficulty (optional)
  // One row per brain region you want shown in the "Learn regions" modal.
  LEARN_REGIONS_SHEET_CSV: "PASTE_YOUR_PUBLISHED_CSV_LINK_HERE_FOR_LEARN_REGIONS",

  // --- Neuroanatomy game ---------------------------------------------
  // Columns expected (header row):
  // id | image_url | choice_a | choice_b | choice_c | choice_d | correct_choice | function_text
  NEUROANATOMY_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXmmePxb13QpA9xtiTHTweL24tBzyx22ANHHSjeZkzf5ZXMrx3yx5-bpUVNYGI9RK8J6xkjx6HeS6s/pub?output=csv",

  // --- Weekly fun fact -------------------------------------------------
  // Columns expected (header row):
  // week_start | fact | source_title | source_url
  FUN_FACT_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5v2wioFljU4L_xOk4s6OXxkZDRUx3vC7yca4z9_nVbj18F3neQgSeS0kFEz83yonJiudzPls7pBD2/pub?output=csv",

  // --- Google Sign-In ---------------------------------------------------
  // Powers the "Sign In" button (homepage) and the "save your streak"
  // sign-in inside both games' end-of-game popups. This uses Google's
  // real, official Sign-In — not a custom form — so players sign in
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
  // TWO WAYS TO MAKE THIS ACTUALLY WORK — pick one:
  //
  // OPTION A (easiest — recommended to start):
  //   Get a free Gemini API key at https://aistudio.google.com/apikey
  //   Paste it below as GEMINI_API_KEY.
  //   IMPORTANT — restrict the key so it can't be stolen/misused:
  //     Go to https://console.cloud.google.com/apis/credentials
  //     -> click your key -> under "Application restrictions" choose
  //     "Websites" -> add your site's domain (e.g. yoursite.netlify.app).
  //     This makes the key only work when called FROM your site.
  //   That's it — no backend needed. The games will call Gemini
  //   directly from the browser.
  //
  // OPTION B (more secure, more setup):
  //   Deploy ai-worker.js (included in this folder) to Cloudflare
  //   Workers, and paste the resulting URL into AI_ENDPOINT_URL below.
  //   Your key never touches the browser at all with this option.
  //   If both GEMINI_API_KEY and AI_ENDPOINT_URL are filled in, the
  //   games will use GEMINI_API_KEY (Option A) first.
  // OPTION A0 — Groq. Genuinely free, NO credit card required at all.
  // Runs an open-source model (Llama) instead of GPT/Gemini, but works
  // great for this kind of explanatory Q&A.
  // 1. Go to https://console.groq.com/keys
  // 2. Sign up (just an email/Google login, no payment info asked)
  // 3. Click "Create API Key", copy it, paste it below
  // If this is filled in, it's tried FIRST, before Gemini/OpenAI.
  GROQ_API_KEY: "",

  GEMINI_API_KEY: "AQ.Ab8RN6JKGTLt-Z9PoFLc2OFMXTfmyt61IRA6HDd8pfe06b4FOQ",

  // OPTION A2 — OpenAI, as a fallback if Gemini's account policy keeps
  // blocking you. Get a key at https://platform.openai.com/api-keys
  // (requires adding billing info, even for small usage).
  //
  // ⚠️ IMPORTANT SECURITY NOTE: unlike Google API keys, OpenAI keys
  // CANNOT be restricted to only work from your domain. Anyone who
  // views your page source can see this key and use it to rack up
  // charges on your account. This is fine for quick testing, but for
  // a real public launch, switch to ai-worker.js (Option B below)
  // instead, which keeps the OpenAI key server-side and hidden.
  OPENAI_API_KEY: "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",

  AI_ENDPOINT_URL: "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE",

  // --- Social links -----------------------------------------------------
  SOCIAL: {
    instagram: "https://www.instagram.com/neurolegames/",
    email: "mailto:neurolegames@gmail.com",
    youtube: "https://www.youtube.com/@Neurolegames"
  },

  // --- Global Guess Distribution (Daily Case) ---------------------------
  // Powers the "Guess Distribution — All Players" bars in the end-of-game
  // popup, showing how everyone who played today's case did, not just you.
  // Uses Firebase Firestore, which is free for this kind of light usage
  // and needs no server of your own — the browser talks to it directly.
  //
  // SETUP (free, ~10 minutes):
  //   1. Go to https://console.firebase.google.com and create a project
  //      (any name — e.g. "neurole").
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
  //      and only ever increment the five known counters — it can't be
  //      used to write arbitrary data. Click "Publish".
  //   4. Back in Project Overview, click the "</>" (web app) icon to
  //      register a web app. Skip Firebase Hosting — you don't need it.
  //   5. It'll show you a firebaseConfig object. Copy those values into
  //      FIREBASE_CONFIG below. (These values are meant to be public —
  //      unlike API keys elsewhere in this file, they're not secret;
  //      the Firestore Rules above are what actually control access.)
  //
  // Until this is filled in, the popup automatically falls back to
  // showing your own personal guess history instead — nothing breaks.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyAdbHOuaT5tucKUL_8oUs1dRQc_VJCPGWw",
    authDomain: "neurole-3abac.firebaseapp.com",
    projectId: "neurole-3abac",
    storageBucket: "neurole-3abac.firebasestorage.app",
    messagingSenderId: "68816405131",
    appId: "1:68816405131:web:c465646700c2c8c0bd4a8e"
  }
};
