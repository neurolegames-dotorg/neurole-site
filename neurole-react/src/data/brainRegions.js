/* =====================================================================
   NEUROLE — BRAIN REGION VOCABULARY

   Translates the names a writer would actually use in an article
   ("hippocampus", "basal ganglia", "Broca's area") into the mesh names
   that exist inside public/brain.glb.

   WHY THIS FILE EXISTS
   The model is anatomically named, not colloquially named. There is no
   mesh called "amygdala" — it ships as four nuclei. There is no
   "Broca's area" — it is two parts of the inferior frontal gyrus. Without
   this layer, an article would have to spell out mesh names, which no one
   writing prose is going to do.

   HOW TO ADD A REGION
   Add one entry below. `meshes` holds EXACT base names from the model
   (the name minus any trailing `.l` / `.r`). To see every available name:

       node scripts/list-brain-meshes.mjs

   Keys are matched case-insensitively and ignore punctuation/spacing, so
   "basal ganglia", "Basal Ganglia" and "basal-ganglia" all work in an
   article. Add extra spellings to `also` and they become aliases.
   ===================================================================== */

/* Reduces any name — an article's region key or a mesh name — to a
   comparable base.

   ⚠️ Mesh names do NOT reach us as they appear in the .glb. three.js's
   GLTFLoader runs them through PropertyBinding.sanitizeNodeName, which
   DELETES reserved characters rather than replacing them. `Hippocampus.r`
   arrives as `Hippocampusr` — the laterality letter fused onto the word
   with no separator — and `…(Parahippocampal*).001` becomes `…001`.

   That is why matching is prefix-based (see meshMatchesAny below) instead
   of exact: there is no boundary left to split on. Matching on `\.[lr]$`
   looked right against the file and silently matched nothing at runtime. */
function peel(raw) {
  const tokens = String(raw || '')
    .toLowerCase()
    .replace(/[*'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  let side = null
  // Keep at least one token, so a structure genuinely named "R" survives.
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1]
    if (/^\d+$/.test(last)) { tokens.pop(); continue }
    if (last === 'l' || last === 'r') { side = side || last; tokens.pop(); continue }
    break
  }

  return { base: tokens.join(' '), side }
}

export function normalizeName(raw) {
  return peel(raw).base
}

/** 'l' | 'r' | null — only reliable for names that kept a separator.
 *  Hemisphere is assigned geometrically in brainModelCache instead; this
 *  is used solely to find laterality PAIRS when deriving the axes. */
export function sideOfName(raw) {
  return peel(raw).side
}

/* What may follow a structure's name in a runtime mesh name: a fused
   laterality letter, a Blender duplicate index, a primitive index, or a
   combination. Anything else means it is a different structure. */
const TRAILING_NOISE = /^[lr\d ]{0,6}$/

/**
 * Does a runtime mesh name refer to one of these structures?
 * Prefix match, but only when what follows is laterality/index noise — so
 * "hippocampusr" matches "hippocampus" while "hippocampal commissure"
 * does not.
 */
export function meshMatchesAny(matchKey, prefixes) {
  if (!prefixes) return false
  for (const p of prefixes) {
    if (!p) continue
    if (matchKey === p) return true
    if (matchKey.length > p.length && matchKey.startsWith(p) && TRAILING_NOISE.test(matchKey.slice(p.length))) {
      return true
    }
  }
  return false
}

/* ---------------------------------------------------------------------
   THE VOCABULARY
   `label`  — what the popup calls it
   `meshes` — exact base names in brain.glb
   `also`   — extra spellings a writer might use
   `note`   — shown as a caveat in the popup when the mapping is an
              approximation rather than a labelled structure
   ------------------------------------------------------------------ */
export const REGIONS = {
  // --- Lobes (whole-lobe highlights use bx_region, see LOBES below) ---
  hippocampus: {
    label: 'Hippocampus',
    meshes: ['Hippocampus'],
  },
  amygdala: {
    label: 'Amygdala',
    meshes: ['Lateral nucleus', 'Basolateral complex', 'Central nucleus', 'Corticomedial group'],
    note: 'The model labels the amygdala by its four nuclear groups rather than as one structure.',
  },
  thalamus: {
    label: 'Thalamus',
    meshes: [
      'Anterior nuclei of thalamus', 'Mediodorsal nucleus', 'Pulvinar',
      'Ventral anterior nucleus', 'Ventral laterodorsal nucleus',
      'Ventral lateroventral nucleus', 'Intralaminar and lateral posterior nuclei',
    ],
  },
  hypothalamus: {
    label: 'Hypothalamus',
    meshes: [
      'Preoptic hypothalamus', 'Anterior hypothalamus', 'Tuberal hypothalamus',
      'Lateral hypothalamus', 'Posterior hypothalamus',
    ],
  },
  'basal ganglia': {
    label: 'Basal ganglia',
    also: ['striatum and pallidum'],
    meshes: [
      'Caudate nucleus', 'Putamen', 'Globus pallidus external', 'Globus pallidus internal',
      'Subthalamic nucleus', 'Substantia nigra', 'Nucleus accumbens',
    ],
  },
  striatum: {
    label: 'Striatum',
    meshes: ['Caudate nucleus', 'Putamen', 'Nucleus accumbens'],
  },
  'caudate nucleus': { label: 'Caudate nucleus', also: ['caudate'], meshes: ['Caudate nucleus'] },
  putamen: { label: 'Putamen', meshes: ['Putamen'] },
  'globus pallidus': {
    label: 'Globus pallidus',
    meshes: ['Globus pallidus external', 'Globus pallidus internal'],
  },
  'substantia nigra': { label: 'Substantia nigra', meshes: ['Substantia nigra'] },
  'subthalamic nucleus': { label: 'Subthalamic nucleus', meshes: ['Subthalamic nucleus'] },
  'nucleus accumbens': { label: 'Nucleus accumbens', meshes: ['Nucleus accumbens'] },
  'septal nuclei': { label: 'Septal nuclei', meshes: ['Septal nuclei'] },
  'red nucleus': { label: 'Red nucleus', meshes: ['Red nucleus'] },

  // --- Limbic / memory circuit ---
  fornix: { label: 'Fornix', meshes: ['Fornix'] },
  'parahippocampal gyrus': {
    label: 'Parahippocampal gyrus',
    meshes: ['Medial occipitotemporal gyrus (Parahippocampal*)'],
  },
  'cingulate gyrus': {
    label: 'Cingulate gyrus',
    also: ['cingulate cortex', 'cingulate'],
    meshes: [
      'Cingulate gyrus and sulcus (Middle anterior part)',
      'Cingulate gyrus and sulcus (Middle posterior part)',
      'Cingulate gyrus and sulcus (Posterior dorsal part)',
      'Cingulate gyrus (Posteroventral part*)',
    ],
  },
  'papez circuit': {
    label: 'Papez circuit',
    also: ['memory circuit'],
    meshes: [
      'Hippocampus', 'Fornix', 'Mamillary body', 'Anterior nuclei of thalamus',
      'Cingulate gyrus and sulcus (Middle anterior part)',
      'Medial occipitotemporal gyrus (Parahippocampal*)',
    ],
    note: 'Shown as its principal relays: hippocampus → fornix → mamillary bodies → anterior thalamus → cingulate → parahippocampal cortex.',
  },
  'mamillary body': { label: 'Mamillary bodies', also: ['mammillary body'], meshes: ['Mamillary body'] },

  // --- White matter ---
  'corpus callosum': { label: 'Corpus callosum', meshes: ['Corpus callosum'] },
  'anterior commissure': { label: 'Anterior commissure', meshes: ['Anterior commissure'] },
  'stria terminalis': { label: 'Stria terminalis', meshes: ['Stria terminalis'] },
  'white matter': {
    label: 'Cerebral white matter',
    meshes: ['White matter of telencephalon'],
  },

  // --- Ventricles ---
  ventricles: {
    label: 'Ventricular system',
    also: ['ventricular system'],
    meshes: ['Lateral ventricle', 'Third ventricle', 'Fourth ventricle', 'Aqueduct of midbrain'],
  },
  'lateral ventricle': { label: 'Lateral ventricles', meshes: ['Lateral ventricle'] },
  'choroid plexus': { label: 'Choroid plexus', meshes: ['Choroid plexus'] },

  // --- Cortex: motor / sensory ---
  'primary motor cortex': {
    label: 'Primary motor cortex',
    also: ['motor cortex', 'precentral gyrus', 'm1'],
    meshes: ['Precentral gyrus'],
  },
  'primary somatosensory cortex': {
    label: 'Primary somatosensory cortex',
    also: ['somatosensory cortex', 'postcentral gyrus', 's1'],
    meshes: ['Postcentral gyrus'],
  },
  'central sulcus': { label: 'Central sulcus', meshes: ['Central sulcus'] },
  'primary visual cortex': {
    label: 'Primary visual cortex',
    also: ['visual cortex', 'v1', 'calcarine cortex'],
    meshes: ['Calcarine sulcus', 'Cuneus', 'Lingual gyrus'],
    note: 'V1 lines the calcarine sulcus; the cuneus and lingual gyrus form its upper and lower banks.',
  },
  'primary auditory cortex': {
    label: 'Primary auditory cortex',
    also: ['auditory cortex', 'heschl’s gyrus', 'heschls gyrus'],
    meshes: ['Transverse temporal gyri'],
  },

  // --- Cortex: language (approximations — flagged) ---
  'brocas area': {
    label: "Broca's area",
    also: ['broca area', 'broca'],
    meshes: ['Opercular part of inferior frontal gyrus', 'Triangular part of inferior frontal gyrus'],
    note: "Broca's area is not a labelled structure in the model; it is shown as the pars opercularis and pars triangularis of the inferior frontal gyrus.",
  },
  'wernickes area': {
    label: "Wernicke's area",
    also: ['wernicke area', 'wernicke'],
    meshes: ['Superior temporal gyrus (Lateral part)', 'Supramarginal gyrus'],
    note: "Wernicke's area is not labelled in the model; this approximates it with the posterior superior temporal gyrus and supramarginal gyrus.",
  },

  // --- Cortex: named gyri and lobules ---
  'superior frontal gyrus': { label: 'Superior frontal gyrus', meshes: ['Superior frontal gyrus'] },
  'middle frontal gyrus': { label: 'Middle frontal gyrus', meshes: ['Middle frontal gyrus'] },
  'inferior frontal gyrus': {
    label: 'Inferior frontal gyrus',
    meshes: [
      'Opercular part of inferior frontal gyrus',
      'Triangular part of inferior frontal gyrus',
      'Orbital part of  inferior frontal gyrus',
    ],
  },
  'orbitofrontal cortex': {
    label: 'Orbitofrontal cortex',
    also: ['orbital gyri', 'gyrus rectus'],
    meshes: ['Orbital gyri', 'Orbital gyri (Frontomarginal gyrus and sulcus*)', 'Straight gyrus (Gyrus rectus)'],
  },
  'superior temporal gyrus': { label: 'Superior temporal gyrus', meshes: ['Superior temporal gyrus (Lateral part)'] },
  'middle temporal gyrus': { label: 'Middle temporal gyrus', meshes: ['Middle temporal gyrus'] },
  'inferior temporal gyrus': { label: 'Inferior temporal gyrus', meshes: ['Inferior temporal gyrus'] },
  'temporal pole': { label: 'Temporal pole', meshes: ['Temporal pole'] },
  'fusiform gyrus': {
    label: 'Fusiform gyrus',
    meshes: ['Lateral occipitotemporal gyrus'],
    note: 'Listed in the model under its alternative name, the lateral occipitotemporal gyrus.',
  },
  'angular gyrus': { label: 'Angular gyrus', meshes: ['Angular gyrus'] },
  'supramarginal gyrus': { label: 'Supramarginal gyrus', meshes: ['Supramarginal gyrus'] },
  'superior parietal lobule': { label: 'Superior parietal lobule', meshes: ['Superior parietal lobule'] },
  precuneus: { label: 'Precuneus', meshes: ['Precuneus'] },
  cuneus: { label: 'Cuneus', meshes: ['Cuneus'] },
  insula: {
    label: 'Insula',
    meshes: ['Insula (Subcentral gyrus and ant. and post. sulci*)', 'Circular sulcus of insula'],
  },

  // --- Brainstem & cerebellum ---
  brainstem: {
    label: 'Brainstem',
    meshes: ['Midbrain', 'Pons', 'Medulla oblongata'],
  },
  midbrain: { label: 'Midbrain', also: ['mesencephalon'], meshes: ['Midbrain'] },
  pons: { label: 'Pons', meshes: ['Pons'] },
  medulla: { label: 'Medulla oblongata', also: ['medulla oblongata'], meshes: ['Medulla oblongata'] },
  'superior colliculus': { label: 'Superior colliculus', meshes: ['Superior colliculus'] },
  'inferior colliculus': { label: 'Inferior colliculus', meshes: ['Inferior colliculus'] },
  cerebellum: {
    label: 'Cerebellum',
    // Whole-category highlight — see CATEGORY_REGIONS.
    category: 'cerebellum',
  },
  'cerebellar vermis': {
    label: 'Cerebellar vermis',
    also: ['vermis'],
    meshes: ['Lingula of cerebellum', 'Central lobule', 'Culmen', 'Declive', 'Folium of vermis',
      'Tuber of vermis', 'Pyramis of vermis', 'Uvula of vermis', 'Nodule of vermis'],
  },

  // --- Visual pathway ---
  'optic chiasm': { label: 'Optic chiasm', meshes: ['Optic chiasm'] },
  'optic tract': { label: 'Optic tract', meshes: ['Optic tract'] },
  'lateral geniculate body': {
    label: 'Lateral geniculate nucleus',
    also: ['lgn', 'lateral geniculate nucleus'],
    meshes: ['Lateral geniculate body'],
  },
  'visual pathway': {
    label: 'Visual pathway',
    meshes: ['Optic chiasm', 'Optic tract', 'Lateral geniculate body', 'Calcarine sulcus'],
  },

  // --- Endocrine ---
  'pituitary gland': {
    label: 'Pituitary gland',
    also: ['pituitary', 'hypophysis'],
    meshes: ['Adenohypophysis', 'Neurohypophysis'],
  },
  'pineal gland': { label: 'Pineal gland', also: ['pineal'], meshes: ['Pineal gland'] },
  habenula: { label: 'Habenula', meshes: ['Habenula'] },
}

/* Whole-lobe highlights. These match on the model's `bx_region` field
   rather than mesh names, because a lobe is ~40 separate meshes. */
export const LOBES = {
  'frontal lobe': { label: 'Frontal lobe', region: 'Frontal lobe' },
  'parietal lobe': { label: 'Parietal lobe', region: 'Parietal lobe' },
  'temporal lobe': { label: 'Temporal lobe', region: 'Temporal lobe' },
  'occipital lobe': { label: 'Occipital lobe', region: 'Occipital lobe' },
  'limbic lobe': { label: 'Limbic lobe', region: 'Limbic lobe' },
}

/* Whole-category highlights, matched on `bx_cat`. */
export const CATEGORY_REGIONS = {
  cerebellum: 'cerebellum',
  cortex: 'cortex',
  'deep grey matter': 'deep_grey',
  diencephalon: 'diencephalon',
}

/* ---------------------------------------------------------------------
   CAMERA PRESETS
   Expressed in ANATOMICAL terms, not raw XYZ. The viewer derives the
   real axes from the model itself at load time (it compares the centres
   of the `.l` and `.r` meshes, and of the frontal and occipital lobes),
   so these stay correct even if the model's orientation changes.
     right/left      — lateral view of that side
     anterior        — from the front      posterior — from behind
     superior        — from above          inferior  — from below
     medial          — midline/sagittal, best paired with cutaway
   ------------------------------------------------------------------ */
export const CAMERA_PRESETS = {
  default: { right: 0.55, up: 0.22, front: 0.8 },
  right: { right: 1, up: 0.05, front: 0 },
  left: { right: -1, up: 0.05, front: 0 },
  lateral: { right: 1, up: 0.05, front: 0 },
  medial: { right: -0.25, up: 0.1, front: 0.02 },
  anterior: { right: 0, up: 0.1, front: 1 },
  posterior: { right: 0, up: 0.1, front: -1 },
  superior: { right: 0.05, up: 1, front: 0.05 },
  inferior: { right: 0.05, up: -1, front: 0.05 },
  oblique: { right: 0.55, up: 0.22, front: 0.8 },
}

/* ---------------------------------------------------------------------
   LOOKUP
   ------------------------------------------------------------------ */

// Built once: every spelling (key + `also` entries) → its region record.
const INDEX = (() => {
  const idx = new Map()
  for (const [key, def] of Object.entries(REGIONS)) {
    const record = { ...def, key }
    idx.set(normalizeName(key), record)
    for (const alt of def.also || []) idx.set(normalizeName(alt), record)
  }
  for (const [key, def] of Object.entries(LOBES)) {
    idx.set(normalizeName(key), { ...def, key })
  }
  for (const [key, cat] of Object.entries(CATEGORY_REGIONS)) {
    if (!idx.has(normalizeName(key))) {
      idx.set(normalizeName(key), { key, label: key, category: cat })
    }
  }
  return idx
})()

export function lookupRegion(name) {
  return INDEX.get(normalizeName(name)) || null
}

/**
 * Turns the names written in an article into something the viewer can match.
 * Unknown names are returned separately rather than silently dropped, so the
 * page can surface a visible warning instead of rendering a blank highlight.
 */
export function resolveRegions(names) {
  const meshNames = new Set()
  const regionFields = new Set()
  const categories = new Set()
  const labels = []
  const notes = []
  const unknown = []

  for (const raw of names) {
    const name = String(raw).trim()
    if (!name) continue
    const found = lookupRegion(name)
    if (!found) { unknown.push(name); continue }

    labels.push(found.label)
    if (found.note) notes.push(found.note)
    for (const m of found.meshes || []) meshNames.add(normalizeName(m))
    if (found.region) regionFields.add(normalizeName(found.region))
    if (found.category) categories.add(found.category)
  }

  return { meshNames, regionFields, categories, labels, notes, unknown }
}

/** Every spelling an article may use — powers the authoring cheat-sheet. */
export function allRegionNames() {
  return [...INDEX.keys()].sort()
}
