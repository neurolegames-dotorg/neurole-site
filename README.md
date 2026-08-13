# Neurole

Alzheimer's-education site with interactive 3D brain visualizations and free
neuroscience games (daily diagnosis puzzle, brain anatomy quiz, Synapse,
Imposter).

> **This README is a pointer only.** The full setup and organization guide is
> **[WEBSITE-SETUP-AND-ORGANIZATION.md](WEBSITE-SETUP-AND-ORGANIZATION.md)** —
> read that for the directory layout, what changed during the React migration,
> and how to deploy on Vercel.

## Quick start

```bash
cd neurole-react
npm install
npm run dev      # http://localhost:5173
npm run lint     # oxlint
npm run build    # vite build → dist/
```

## Repo layout (short version)

- `neurole-react/` — the actual website (React 19 + Vite SPA, deployed on Vercel).
- `assets/` — images, zip snapshots, and xlsx question-bank backups. Never deployed.
- Root — config, ignore lists, and docs only. No web pages or images live here.

## Deployment

The site deploys from `neurole-react/` as its own Vercel project (framework
Vite, output `dist/`). The AI tutor runs on a Cloudflare Worker sourced from
`neurole-react/scripts/ai-worker.js`. See the setup guide for details.
