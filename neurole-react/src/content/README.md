# Articles with built-in 3D brain figures

An article is **one Markdown file** in `articles/`. The filename is the URL:
`articles/the-memory-circuit.md` → `/articles/the-memory-circuit`.

There is no index to update, no route to register and no build step to run.
Drop the file in and it publishes; the **Articles** link appears in the site
nav by itself once at least one article exists.

Start by copying `articles/_TEMPLATE.md`. Files beginning with `_` are never
published, and `draft: yes` shows an article locally but never in production.

---

## Adding a 3D brain

One line, anywhere in the body:

```
{{brain: hippocampus, fornix | title=The memory circuit | camera=medial | cutaway=left}}
```

It renders as a button. The reader presses it, the model opens in a popup over
the article, and the **X** in the top-right corner closes it again.

Only the region list is required. Options after the first `|`:

| Option | Values |
|---|---|
| `title` | popup heading (default: the region names) |
| `button` | button wording (default: "View … in 3D") |
| `caption` | one line under the model |
| `camera` | `default` `right` `left` `medial` `anterior` `posterior` `superior` `inferior` |
| `cutaway` | `left` or `right` — removes that hemisphere |
| `spin` | `no` to stop the turntable |

Named structures render solid and violet; the rest of the brain drops to a
translucent shell for context, and the camera frames the structures rather than
the whole head. The **Highlight / Whole brain** toggle in the popup switches
between the two.

### Region names

About 90 spellings, listed in `src/data/brainRegions.js`. Capitalisation and
punctuation are ignored. A name that does not exist does not break anything —
the popup opens and names what it could not find.

To add one:

```bash
npm run brain:list hippo     # find the exact mesh names in brain.glb
npm run brain:check          # verify every region still matches something
```

`npm run brain:check` is worth running in CI. A region that matches zero meshes
is otherwise invisible until someone opens that popup.

---

## Notes for developers

**Mesh names are mangled by the loader.** three.js runs glTF node names through
`PropertyBinding.sanitizeNodeName`, which *deletes* reserved characters instead
of replacing them: `Hippocampus.r` arrives as `Hippocampusr`, and multi-primitive
meshes gain an index suffix. Matching is therefore prefix-based
(`meshMatchesAny`), not exact. Do not "fix" it back to exact matching — and note
that any validation reading names straight out of the `.glb` will pass while the
browser matches nothing.

**Hemisphere is geometric, not textual.** `cutaway` uses each mesh's position
along the derived left–right axis, with a midline band that leaves the corpus
callosum, third ventricle and pineal alone. The anatomical axes are measured
from the model at load time (laterality pairs for left–right, frontal vs
occipital lobe for front–back, cortex vs brainstem to settle which way is up),
so camera presets stay correct if the model is ever re-exported.

**The model is shared, its materials are not.** `brainModelCache` parses
`brain.glb` once and hands out clones. A viewer owns the materials it clones and
must dispose them; it must **never** dispose geometry, which belongs to the
cache and is reused by every popup opened afterwards.

**Import `BrainViewerLazy`, never `BrainViewer`.** A single static import of the
viewer pulls three.js and the Draco decoder into the main bundle for every page
on the site — that is a ~600 kB regression for people who only came to play the
daily case.

**One popup at a time.** Each viewer holds a WebGL context and browsers cap how
many can be live at once. The modal enforces this naturally; don't render
viewers inline in the article body.

**Licence.** The mesh is Z-Anatomy / BodyParts3D (© DBCLS) under CC BY-SA 4.0.
The attribution lives in `BrainModal` so every figure carries it automatically.
Keep it there.

In development, `window.__brain.report()` returns what the open figure actually
matched — the fastest way to tell a misspelled region from a camera pointing the
wrong way.
