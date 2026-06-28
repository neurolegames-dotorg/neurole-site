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
  DAILY_CASE_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbJCwDphyp0f-ee415a2D85RYkSedwYHl9BpaOto81ZGUtYcUrCJsfhxrTPb28Frsz62ZFGRYLkZBv/pub?output=csv",

  // --- Neuroanatomy game ---------------------------------------------
  // Columns expected (header row):
  // id | image_url | choice_a | choice_b | choice_c | choice_d | correct_choice | function_text
  NEUROANATOMY_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vThk7i3yWnqQjI8ZlYFofnESHARrGD5A5jdsQSVQMbmXpg6JL95dEuQO_JnOT5vD8bvtu-Of9OdxsdY/pub?output=csv",

  // --- Weekly fun fact -------------------------------------------------
  // Columns expected (header row):
  // week_start | fact | source_title | source_url
  FUN_FACT_SHEET_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_ck-HHRQxn-aD5K9Y57SHBEHB2pgtxFhIPpNgP-ChGX10_RJTxI29ujRSNIKfbHZAP15ohAlXM7Tu/pub?output=csv",

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
  GEMINI_API_KEY: "AQ.Ab8RN6JKGTLt-Z9PoFLc2OFMXTfmyt61IRA6HDd8pfe06b4FOQ",
  AI_ENDPOINT_URL: "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE",

  // --- Social links -----------------------------------------------------
  SOCIAL: {
    instagram: "https://www.instagram.com/neurolegames/",
    email: "mailto:neurolegames@gmail.com",
    youtube: "https://www.youtube.com/@Neurolegames"
  }
};
