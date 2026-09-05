# Contributor photos

Headshots for the Contributors section on the Join Us page (`volunteer.html`).

Files here are served from the site root, so `bhavya.jpg` in this folder is
reachable at **`/contributors/bhavya.jpg`**. The React port keeps the same URL
(its copy lives in `neurole-react/public/contributors/`), so a photo added to
both places needs no path change when that port goes live.

## Current state

Intake closed **5 September 2026**. Afifa Zahid sent a description that day but no
photo yet; Matt asked her for one in DM.

| Contributor | Filename | Photo | Bio |
|---|---|---|---|
| Reva Shrestha *(Founder)* | `reva-shrestha.jpg` | — | — |
| Afifa Zahid | `afifa-zahid.jpg` | — | ✅ |
| Arnesh Mohanty | `arnesh-mohanty.jpg` | ✅ | ✅ |
| Bhavya | `bhavya.jpg` | ✅ | ✅ |
| Daiana Salcedo Rioja | `daiana-salcedo-rioja.jpg` | ✅ | ✅ |
| Matt Gresham | `matt-gresham.jpg` | ✅ | ✅ |
| Nima Gholipour | `nima-gholipour.jpg` | — | — |
| Shritha Repala | `shritha-repala.jpg` | — | — |
| Suleyman Akkaya | `suleyman-akkaya.jpg` | — | — |

Cards still waiting render an initials avatar, so the grid stays whole while the
rest arrive.

**Open questions:** Bhavya's surname is unconfirmed — her Slack name is a handle
and her own description gives only "Bhavya". Vijval R asked to be credited in
#web-dev on 2026-08-24 but has sent neither a photo nor a description, so they
are not listed. Both need Reva.

## Adding a photo

1. Save the image here under the filename above.
2. In `volunteer.html`, find that person's `.contributor-card` and:
   - uncomment the `<img>` line, delete the `<span class="contributor-initials">`;
   - uncomment the `<p class="contributor-bio">` and paste their description.
3. Mirror both into the React port — same file in
   `neurole-react/public/contributors/`, and set `photo` and `bio` in
   `neurole-react/src/pages/VolunteerPage.jsx`. Its copy of this spec is
   `neurole-react/CONTRIBUTOR-PHOTOS.md`.

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
