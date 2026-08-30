# Contributor photos

Headshots for the Contributors section on the Join Us page.

Files here are served from the site root, so `reva-shrestha.jpg` in this folder
is reachable at **`/contributors/reva-shrestha.jpg`**. The React port keeps the
same URL (its copy lives in `neurole-react/public/contributors/`), so a photo
added to both places needs no path change when that port goes live.

## Adding a photo

1. Save the image here as `<first>-<last>.jpg`, all lowercase, hyphenated.
   Match the name in the roster exactly:

   | Contributor      | Filename                |
   |------------------|-------------------------|
   | Reva Shrestha    | `reva-shrestha.jpg`     |
   | Arnesh Mohanty   | `arnesh-mohanty.jpg`    |
   | Matt Gresham     | `matt-gresham.jpg`      |
   | Nima Gholipour   | `nima-gholipour.jpg`    |
   | Shritha Repala   | `shritha-repala.jpg`    |
   | Suleyman Akkaya  | `suleyman-akkaya.jpg`   |

2. In `volunteer.html`, find that person's `.contributor-card` and swap the two
   lines — uncomment the `<img>`, delete the `<span class="contributor-initials">`.

3. Mirror step 1 into `neurole-react/public/contributors/` on the React branch
   and set the `photo` field in `neurole-react/src/pages/VolunteerPage.jsx`, so
   the port matches. Its copy of this spec is `neurole-react/CONTRIBUTOR-PHOTOS.md`.

A contributor left at `photo: null` renders an initials avatar instead, so the
grid stays complete while photos are still arriving.

## Image spec

- **Square crop**, face centred. The card masks it to a circle.
- **288×288 px** — displayed at 72px, so this covers 3x displays.
- **JPEG, quality ~80**, under ~60 KB each. Use `.webp` only if you also keep a
  `.jpg`; the static page has no `<picture>` fallback.
- No transparency, no logos, no text baked into the image.
- Consistent lighting and crop tightness across the set matters more than any
  single photo — they sit side by side.

## Permission

Every person here is a named volunteer. Only add a photo the contributor has
actually agreed to publish, and use the name they want shown.
