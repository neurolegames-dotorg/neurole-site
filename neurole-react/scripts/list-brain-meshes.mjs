/* Lists every anatomical structure inside public/brain.glb.
 *
 * Use this when adding a region to src/data/brainRegions.js — the `meshes`
 * array there must hold EXACT base names as printed by this script.
 *
 *   node scripts/list-brain-meshes.mjs            # renderable structures
 *   node scripts/list-brain-meshes.mjs --all      # including arteries/nerves/dura
 *   node scripts/list-brain-meshes.mjs hippo      # filter by substring
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const glb = readFileSync(join(here, '..', 'public', 'brain.glb'))

// Walk the GLB container and pull out the JSON chunk (type 0x4E4F534A, "JSON").
let offset = 12
let gltf = null
while (offset < glb.length) {
  const length = glb.readUInt32LE(offset)
  const type = glb.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(glb.subarray(offset + 8, offset + 8 + length).toString('utf8'))
  offset += 8 + length
}
if (!gltf) {
  console.error('Could not find a JSON chunk in brain.glb')
  process.exit(1)
}

// Mirrors SHOW_CATS in BrainViewer.jsx — the categories actually rendered.
const RENDERED = new Set([
  'cortex', 'cerebellum', 'brainstem', 'deep_grey',
  'diencephalon', 'white_matter', 'ventricles',
])

const args = process.argv.slice(2)
const showAll = args.includes('--all')
const filter = args.find((a) => !a.startsWith('--'))?.toLowerCase()

const seen = new Map()
for (const node of gltf.nodes || []) {
  const cat = node.extras?.bx_cat || ''
  const region = node.extras?.bx_region || ''
  if (!showAll && !RENDERED.has(cat)) continue
  const name = node.name || ''
  // `.l` / `.r` are laterality suffixes; the vocabulary matches on the base.
  const base = name.replace(/\.[lr]$/i, '')
  if (!base) continue
  if (filter && !base.toLowerCase().includes(filter)) continue
  if (!seen.has(base)) seen.set(base, { cat, region, sides: new Set() })
  const m = name.match(/\.([lr])$/i)
  if (m) seen.get(base).sides.add(m[1].toLowerCase())
}

const rows = [...seen.entries()].sort(
  (a, b) => a[1].cat.localeCompare(b[1].cat) || a[0].localeCompare(b[0])
)

let lastCat = null
for (const [base, info] of rows) {
  if (info.cat !== lastCat) {
    console.log(`\n=== ${info.cat || '(uncategorised)'} ===`)
    lastCat = info.cat
  }
  const sides = info.sides.size ? `  [${[...info.sides].sort().join('/')}]` : ''
  console.log(`  ${base}${sides}`)
}

console.log(`\n${rows.length} structures${filter ? ` matching "${filter}"` : ''}.`)
console.log('Copy names EXACTLY into the `meshes` array in src/data/brainRegions.js.')
