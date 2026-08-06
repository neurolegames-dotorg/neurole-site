# Neurole Project — Agent Context

## Project
Neurole is a React + Vite web app for Alzheimer's education. It uses interactive 3D brain visualizations to show disease progression across 4 stages.

## Stack
- React 19, Vite 8, react-router-dom 7
- Three.js 0.185 (via npm)
- The brain.glb model (CC BY-SA 4.0) is from https://github.com/itayinbarr/brainproject

## Brain Lab Page (`/interactive/brain-lab`)

### Files
- `src/components/BrainViewer.jsx` — Three.js viewer: loads brain.glb, applies stage + view mode
- `src/pages/BrainLabPage.jsx` — layout with slider, stage info, view toggle, model attribution
- `src/pages/styles/BrainLabPage.css` — styling
- `public/brain.glb` — Draco-compressed brain model (~4.4 MB)

### How it works
1. Loads `brain.glb` via GLTFLoader + DRACOLoader. Three 0.185 resolves its own decoder
   through `new URL('../libs/draco/…', import.meta.url)`, which Vite bundles — no CDN,
   no `setDecoderPath()` needed.
2. Reads `child.userData.bx_cat` / `child.userData.bx_region` to filter and categorize.
   glTF node extras land directly on the Mesh (each node here has one primitive), so
   reading them off the mesh is correct; the parent lookup is only a fallback.
3. Meshes outside `SHOW_CATS` (tracts, arteries, veins, dura, cranial nerves) are
   disposed at load, not just hidden. They extend well past the brain, so leaving them
   in the scene inflates the bounding box and the camera fit renders the brain tiny.
4. Kept meshes are flattened onto one group via `Group.attach()` (preserves world
   transforms) so every mesh is a direct child with a known base position/scale.

### Two things about this GLB that will bite you
- **Materials are shared.** 13 materials across 437 meshes — material `2` alone is used
  by 129 primitives. Writing `mesh.material.color` restyles every mesh sharing it, so
  per-lobe coloring is impossible until you `.clone()` per mesh. We clone at load.
- **Every material has `emissiveFactor: [1,1,1]`.** Full-white emissive is added after
  lighting and ignores `material.color`, which renders the whole model as a flat white
  blob no matter what tint you set. We zero `emissive` at load.

### View modes (`viewMode` prop)
| Mode | Shell (cortex/cerebellum/brainstem) | White matter | Core (deep grey, diencephalon) | Ventricles |
|------|------|------|------|------|
| `surface` | opaque, FrontSide | hidden | hidden | hidden |
| `translucent` | 0.30, **BackSide** | 0.22, BackSide | opaque | opaque |

Translucent uses **backface rendering** for the shell. The cortex is ~128 separate
closed shells, so ordinary alpha stacks — even 0.085 opacity accumulates into a solid
wall. Culling front faces leaves one clean silhouette ghost and makes the interior
visible. Don't "fix" this by raising the opacity.

### Stage progression (`STAGE_ATROPHY`)
4 stages, Braak-style spread: temporal → +limbic/parietal/frontal → whole brain, with
cerebellum and brainstem relatively spared. Each stage gives a `dim` 0–1 per group:
- Color lerps CORTEX→CORTEX_LOST (or DEEP→DEEP_LOST) by `dim`
- Structures shrink by `dim * CORTEX_SHRINK` (0.20) or `DEEP_SHRINK` (0.14)
- `ventricle` is an **expansion** factor — ventricles dilate to fill the freed space
  (hydrocephalus ex vacuo). This is the most legible cue in translucent mode.

**Structures scale about their own centroid, not the brain's centre.** Scaling toward
the brain centre drags each structure inward by its own amount, so the largely-spared
cerebellum and brainstem visibly detach from the shrinking cerebrum and read as two
separate objects. `brainInfo.pivot` holds the local-origin→geometry-centre offset;
`applyStyle` uses it to pin that centre while the mesh scales around it.

### License
- Brain model: CC BY-SA 4.0 (Z-Anatomy / BodyParts3D / DBCLS). Attribution is rendered
  at the bottom of BrainLabPage — it is a license condition, don't drop it.
- Our code: standard project license.

## Routing
- `/interactive/brain-lab` — BrainLabPage (3D viewer + stage controls)
- `/interactive` — InteractivePage (links to brain lab and other tools)
- Header.jsx has nav links

## Dev server
`npm run dev` → http://localhost:5173
`npm run build` → production build to dist/
