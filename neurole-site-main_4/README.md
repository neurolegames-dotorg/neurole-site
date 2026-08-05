# Neurole — setup guide

This is a static site (no build step). Open `index.html` in a browser to preview, or upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc).

## Files
- `index.html` — homepage (hero, weekly fun fact, two game cards, footer)
- `daily-game.html` — "The Daily Case" clinical diagnosis game
- `neuroanatomy.html` — "Map the Brain" region ID game + AI Q&A panel
- `volunteer.html`, `donate.html`, `faq.html` — supporting pages
- `style.css` — all shared styling/design tokens
- `script.js` — shared sign-in modal + fun-fact loader
- `config.js` — **the only file you need to edit regularly**
- `assets/neuron-hero.webp` — your hero image

## 1. Connect Google Sheets

For each game, create a Google Sheet tab with the exact header row described below, then:
`File > Share > Publish to web` → pick that specific sheet/tab → format **CSV** → Publish → copy the link into `config.js`.

**Daily Case sheet** — one row per day:
`date | case_id | symptom_1 | symptom_2 | symptom_3 | symptom_4 | symptom_5 | answer | accepted_synonyms | explanation`
- `date` must be `YYYY-MM-DD` and match the day you want it to appear.
- `accepted_synonyms` — alternate acceptable spellings, separated by `;`.

**Neuroanatomy sheet** — one row per question:
`id | image_url | choice_a | choice_b | choice_c | choice_d | correct_choice | function_text`
- `image_url` can be a direct image link (e.g. an image hosted in Google Drive set to "anyone with the link," or any public image URL).
- `correct_choice` is the letter `A`, `B`, `C`, or `D`.

**Fun fact sheet** — one row per week:
`week_start | fact | source_title | source_url`

If a sheet link is left as the placeholder, or today has no matching row, the games fall back to a small built-in sample set so the site never breaks.

## 2. AI answers in "Map the Brain"

Browsers can't safely hold an Anthropic API key, so `neuroanatomy.html` calls `AI_ENDPOINT_URL` from `config.js`, which should point to a tiny backend you control (a Cloudflare Worker, Vercel/Netlify function, or similar) that:
1. Accepts `POST { region, function_text, question }`
2. Calls the Anthropic API server-side with your key
3. Returns `{ answer: "..." }`

See `/anthropic_api_in_artifacts` style examples for the request shape — same `/v1/messages` endpoint, just called from your server instead of the browser.

## 3. Sign-in

The "Sign In" button currently opens a placeholder modal. Wire the form in `script.js` (`initSignIn`) up to whatever auth you choose (Firebase Auth, Supabase, Auth0, etc).

## 4. Social links & donations

Edit `SOCIAL` in `config.js` for Instagram/email/YouTube, and replace the donate button link in `donate.html` with your Stripe/Donorbox/PayPal link.
