---
title: Your article title
dek: One sentence under the title saying what the reader will get.
author: Neurole
date: 2026-07-31
draft: yes
---

Copy this file, rename it, and write. **The filename becomes the URL** —
`the-memory-circuit.md` publishes at `/articles/the-memory-circuit`. Nothing
else needs editing; there is no index or route to update.

Delete `draft: yes` from the top when it is ready to go live. While it is
there, the article shows on your own machine but never on the real site.

## Writing

Blank line between paragraphs. You can use **bold**, *italic*, `code`, and
[links](https://neurole.org). Headings, lists, quotes, dividers and the brain
button below are the whole feature set — tables and images are not supported
yet, so if you need one, ask a developer to add it rather than pasting HTML.

- Bullet lists work
- One item per line

1. So do numbered lists
2. Same idea

> Indent a line with `>` for a pull quote.

Three dashes on their own line give you a divider:

---

## Adding a 3D brain

Put a line like this anywhere. It becomes a button; the reader presses it,
the brain opens in a popup over the article, and the X in the top-right
corner closes it again.

{{brain: hippocampus, fornix, mamillary body | title=The memory circuit | camera=medial | cutaway=left | caption=The hippocampus projects through the fornix to the mamillary bodies.}}

Only the region list is required — everything after the first `|` is optional:

{{brain: cerebellum}}

### The options

- `title` — heading inside the popup. Defaults to the region names.
- `button` — the button's wording in the article. Defaults to "View … in 3D".
- `caption` — one line under the model.
- `camera` — `default`, `right`, `left`, `medial`, `anterior`, `posterior`, `superior` or `inferior`.
- `cutaway` — `left` or `right`, removing that hemisphere. Pair with `camera=medial` to see midline structures.
- `spin` — `no` turns off the slow turntable.

### Which region names can I use?

Anything in `src/data/brainRegions.js` — around 90 spellings, including
`hippocampus`, `amygdala`, `thalamus`, `hypothalamus`, `basal ganglia`,
`striatum`, `substantia nigra`, `corpus callosum`, `fornix`, `ventricles`,
`primary motor cortex`, `primary visual cortex`, `Broca's area`,
`Wernicke's area`, `insula`, `cerebellum`, `brainstem`, `pons`, `midbrain`,
`frontal lobe`, `temporal lobe`, and so on. Capitalisation and punctuation
do not matter.

If you type a name that does not exist, nothing breaks — the popup opens and
tells you which name it could not find, so you can fix the spelling.

To add a region that is not in the list yet, run:

```
node scripts/list-brain-meshes.mjs <search term>
```

and add an entry to `src/data/brainRegions.js` using the exact names it prints.
