# Neurole — Website Setup & Organization

Single source of truth for how the Neurole repo is organized, what was moved
where (and why), and how to deploy each piece. Read this before touching the
folder layout or the platform configs.

---

## 1. The short version

Two directories matter, plus a handful of root-level config files:

```
neurole/  (repo root — NO web pages, NO images, NO .html/.js/.jsx at the root)
├─ neurole-react/   → THE WEBSITE. React 19 + Vite SPA, deployed to Vercel.
├─ assets/          → Designated dump/archive folder. Images, zips, xlsx.
│                     Never deployed anywhere. Not the source for the site.
├─ .gitignore       Private repo rules (node_modules, env, notes, dist, wrangler)
├─ .vercelignore    Vercel  exclude list (root deploy)
├─ .assetsignore    Cloudflare Workers Static Assets exclude list
├─ _config.yml      GitHub Pages (Jekyll) exclude list
├─ vercel.json      Root Vercel project config (legacy static site)
├─ wrangler.jsonc   Cloudflare Worker config (legacy root deploy)
├─ CNAME            GitHub Pages custom domain (legacy)
└─ *.md             Documentation / notes only — never a page
```

Everything a browser ever needs lives under `neurole-react/`. The repo root is
no longer a deployable website.

---

## 2. Directory layout (the chosen structure)

### `neurole-react/` — the actual website
- React 19 + Vite 8 + react-router-dom 7. All pages are components.
- `src/pages/` — one `.jsx` per route (Home, DailyGame, Neuroanatomy, Synapse,
  Imposter, About, Contact, Donate, Volunteer, Interactive, BrainLab, Archive,
  Privacy, Terms, Articles, NotFound).
- `src/components/` — Layout, Header, Footer, Portal, ScrollToTop, SignInModal.
- `src/utils/helpers.js` — CSV parsing, answer checking, streak/stat utils, AI
  client.
- `src/config.js` — the single config source of truth (sheet CSVs, AI endpoint,
  Google/Firebase client IDs). No secret keys live here.
- `src/games-data.js` — fallback question banks & disorder lists used when the
  published Google Sheet CSVs disagree or are unreachable.
- `src/style.css` — the shared stylesheet (ported from the old static site).
- `public/` — static assets copied verbatim into the build: favicons, icons,
  `brain.glb`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `theme-init.js`.
- `scripts/ai-worker.js` — the Cloudflare Worker source (Groq backend). This is
  NOT an app script; it is pasted into Cloudflare Workers, see §5.
- `dist/` — build output (gitignored).

### `assets/` — the designated dump folder
- Every image owned by the project, plus old archives and question-bank files.
- Currently holds: all favicon/logo/mascot PNGs + SVGs, `neuron-hero.webp`,
  the `neurole-site-main_*.zip` site snapshots, `neurole_17.zip`,
  `neurole_21.zip`, and the three `Neurole_*.xlsx` banks.
- **Not** the source for anything the site serves. The React app copies the
  images it needs into its own `public/`. `assets/` is excluded from Vercel,
  GitHub Pages, and Cloudflare — see below.
- Rationale: one home for non-code files so the root stays clean and nothing
  get deployed by accident.

### Repo root (leftovers only)
- `style.css` was removed — the app's `src/style.css` is the live copy.
- `robots.txt` / `sitemap.xml` / `site.webmanifest` were moved into
  `neurole-react/public/` so the deployed site actually serves them.
- Old static site is gone: every `.html`, `.js`, and image was moved into
  `neurole-react/` or `assets/`; `neurole-site-main_4/` was deleted entirely.

---

## 3. What changed (the big re-org, 2026-08)

Standalone static HTML/JS (root) → React SPA (`neurole-react/`).

| Old location (deleted)                     | New home                                                    |
| ------------------------------------------ | ------------------------------------------------------------ |
| `index.html`, `about.html`, `contact.html` | `neurole-react/src/pages/<X>Page.jsx`                        |
| `daily-game.html` / `daily-game-play.html` | `NeuroleReact/src/pages/DailyGamePage.jsx` + `DailyGamePlayPage.jsx` |
| `neuroanatomy.html` / `neuroanatomy-play.html` | `NeuroanatomyPage.jsx` + `NeuroanatomyPlayPage.jsx`       |
| `synapse.html`                              | `SynapsePage.jsx`                                            |
| `imposter.html`                             | `ImposterPage.jsx` (new, ported)                             |
| `interactive.html`                          | `InteractivePage.jsx` + `BrainLabPage.jsx`                   |
| `archive.html`, `404.html`                  | `ArchivePage.jsx` + `NotFoundPage.jsx`                       |
| `config.js`                                 | `neurole-react/src/config.js`                                |
| `games-data.js`                             | `neurole-react/src/games-data.js`                            |
| `script.js`, `theme-init.js`                | logic in React components; `theme-init.js` → `neurole-react/public/` |
| `style.css`                                 | `neurole-react/src/style.css`                                |
| `ai-worker.js`                              | `neurole-react/scripts/ai-worker.js`                         |
| all root images                             | `assets/`                                                    |
| `neurole-site-main_4/` folder               | deleted (duplicate snapshot)                                 |
| `*.zip`, `*.xlsx` at root                   | `assets/`                                                    |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | `neurole-react/public/`                                  |

Also fixed during the re-org:
- `/imposter` route added to `App.jsx`; footer + homepage now link to Imposter.
- Lint was cleaned to 0 warnings (`oxlint`); build passes (`vite build`).
- Deleted dead share URLs that pointed at `.html` pages (share text now uses
  `https://neurole.org/daily-game`).
- Removed stale prefetch/stale-hash leftovers in `dist/` (gitignored anyway).

---

## 4. Deploying the website on Vercel

The website (`neurole-react/`) is deployed as **its own Vercel project**. Do
NOT wire it to the repo root.

### Vercel project settings
| Setting            | Value                                              |
| ------------------ | -------------------------------------------------- |
| Root Directory     | `neurole-react`                                    |
| Framework Preset   | `Vite`                                             |
| Build Command      | `npm run build` (already set in `neurole-react/vercel.json`) |
| Output Directory   | `dist` (already set)                               |
| Install Command    | `npm install` (default)                            |
| Node Version       | 20+ (React 19 / Vite 8 require modern Node)        |

`neurole-react/vercel.json` already declares framework/build/output and the SPA
rewrite rule:
```json
{ "source": "/((?!api/|assets/|.*\\.[a-zA-Z0-9]+$).*)", "destination": "/index.html" }
```
This sends unknown paths (e.g. `/daily-game`, `/imposter`) to the router while
letting real files (`/assets/*`, `/brain.glb`, `/favicon.png`) through.

### Domain
- Add the custom domain in Vercel → Project → Settings → Domains.
- The root `CNAME` is only for GitHub Pages and can be ignored on Vercel.

### How a deploy happens
- Push to `main` (or whatever branch Vercel is set to watch) → Vercel builds
  `neurole-react` and serves `dist/`.

---

## 5. The AI tutor backend (Cloudflare Worker)

The "Explain"/tutor buttons call `AI_ENDPOINT_URL` in
`neurole-react/src/config.js`. The worker source is
`neurole-react/scripts/ai-worker.js` and its header has the full 5-minute setup
guide. In short:

1. workers.cloudflare.com → Create a Worker → paste the file as the code.
2. Add a Secret `GROQ_API_KEY` (from console.groq.com). Optional
   `OPENAI_API_KEY` as fallback.
3. Deploy, copy the worker URL, put it in `AI_ENDPOINT_URL`.
4. The `ALLOWED_ORIGINS` array in the worker lists which frontends may call it
   — add any new site origin or you'll get 403s.

If `AI_ENDPOINT_URL` is empty, the tutor falls back to canned explanations.

---

## 6. Content: question banks & the daily case source

The games do not read local xlsx files. They fetch published Google Sheet CSVs
configured in `neurole-react/src/config.js`:
- `DAILY_CASE_SHEET_CSV` — daily diagnosis puzzle.
- `NEUROANATOMY_SHEET_CSV` — Map the Brain question bank.
- `SYNAPSE_SHEET_CSV` — Synapse puzzle data.
- `FUN_FACT_SHEET_CSV` — weekly fun fact.

How to publish a sheet: Sheet → File → Share → *Publish to web* → pick the tab →
format **CSV** → copy the link. If today's row is missing or the CSV is
unreachable, the app falls back to the built-in `games-data.js`.

> The `*.xlsx` files in `assets/` are backups for editing. They are never
> served and never read by the site.

---

## 7. The three platform exclude lists — keep in sync

There are three "ignore" cousins; each platform honours only its own:

| File               | Platform                        |
| ------------------ | ------------------------------- |
| `.vercelignore`    | Vercel (repo-root deploy only)  |
| `.assetsignore`    | Cloudflare Workers Static Assets |
| `_config.yml`      | GitHub Pages (Jekyll `exclude`) |

All three must keep excluding the same things:
- `assets/` (images + zips + xlsx)
- `*.zip`, `*.xlsx`
- `neurole-react/` (it is its own Vercel project; serving it from the root
  would expose the whole codebase)
- tooling/doc files (`wrangler.jsonc`, `package.json`, `*.md`, config files)

If you add a new non-web file at the root, add it to ALL THREE lists (or use
the globs already there) — otherwise it gets published on one platform.

---

## 8. Local development & checks

```bash
cd neurole-react
npm install          # first time only
npm run dev          # http://localhost:5173
npm run lint         # oxlint — should be 0 warnings
npm run build        # vite build → dist/
npm run preview      # serve the production build locally
```

Useful helpers:
- `npm run brain:list` / `npm run brain:check` — inspect the brain.glb model.

---

## 9. Git workflow

- The branch for this re-org is `sidebar-slide-in`; the default branch is the
  GitHub Pages deployment branch for the legacy root.
- `git pull` first, then push; Vercel picks up the React app automatically.
- Keep the repo root clean of html/image/js/zip/xlsx files as described above.

---

## 10. Common gotchas

- **Don't put any HTML at the root.** The root is not deployed as a site; pages
  live in `neurole-react/src/pages/`.
- **Don't add Mono of the banks/zips outside `assets/`.** They'd be served
  somewhere.
- **`AI_ENDPOINT_URL` is the only AI switch.** No provider keys belong in
  `config.js`; any key there is bundled into the client and public.
- `dist/`, `node_modules/`, `.wrangler`, `.env*` are gitignored (see root
  `.gitignore` and `neurole-react/.gitignore`).