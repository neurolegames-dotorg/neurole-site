# Contributor photos

Headshots for the Contributors section on the Join Us page.

**The images themselves go in `public/contributors/`.** This doc lives outside
`public/` on purpose — anything inside it is copied verbatim into `dist/` and
served publicly, and a spec file has no business being on the live site.

Vite serves `public/` from the site root, so `bhavya.jpg` in that folder is
reachable at **`/contributors/bhavya.jpg`**. The static site keeps the same URL
(its copy lives in `contributors/` at the repo root on the `contributors-section`
branch), so a photo added to both places needs no path change.

## Current state

Intake is **still open** — Arnesh asked the workspace on 2026-08-30 for names and
descriptions, with a deadline of **September 5th**. Expect this table to grow.

| Contributor | Filename | Photo | Bio |
|---|---|---|---|
| Reva Shrestha *(Founder)* | `reva-shrestha.jpg` | — | — |
| Arnesh Mohanty | `arnesh-mohanty.jpg` | ✅ | ✅ |
| Bhavya | `bhavya.jpg` | ✅ | ✅ |
| Daiana Salcedo Rioja | `daiana-salcedo-rioja.jpg` | ✅ | ✅ |
| Matt Gresham | `matt-gresham.jpg` | — | — |
| Nima Gholipour | `nima-gholipour.jpg` | — | — |
| Shritha Repala | `shritha-repala.jpg` | — | — |
| Suleyman Akkaya | `suleyman-akkaya.jpg` | — | — |

Anyone still at `photo: null` renders an initials avatar, so the grid stays
whole while the rest arrive.

**Open questions:** Bhavya's surname is unconfirmed — her Slack name is a handle
and her own description gives only "Bhavya". Vijval R asked to be credited in
#web-dev on 2026-08-24 but has sent neither a photo nor a description, so they
are not listed. Both need Reva.

## Adding a photo

1. Save the image in `public/contributors/` under the filename above.
2. In `src/pages/VolunteerPage.jsx`, set that person's `photo` and `bio`:

   ```js
   {
     name: 'Nima Gholipour',
     role: 'Contributor',
     photo: '/contributors/nima-gholipour.jpg',
     bio: "…their own words…",
   },
   ```

3. Mirror both into the static site: drop the same file in `contributors/` and
   uncomment that card's `<img>` in `volunteer.html`.

## Image spec

- **Square crop**, face centred. Cards render it at 72px with a 16px corner
  radius — a rounded square, not a circle.
- **288×288 px** — 4x the rendered size, so it stays sharp on retina displays.
- **JPEG, quality ~85**, under ~60 KB. The three in the repo are 14–20 KB.
- No transparency, no logos, no text baked into the image.
- Consistent framing across the set matters more than any single photo — they
  sit side by side.

If someone sends a screenshot with their description written around the photo
(two of the first three did), crop the face out to a square rather than using
the screenshot as-is.

## Permission

Everyone here is a named volunteer who opted in — Reva asked in #announcements
on 2026-08-16 for anyone "interested in your name being published" to send a
photo and description. Only add a photo the contributor actually sent for this,
and use the name they gave for themselves.
