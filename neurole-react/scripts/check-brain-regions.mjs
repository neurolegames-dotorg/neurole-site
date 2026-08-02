/* Verifies that every region name in src/data/brainRegions.js actually
 * matches meshes inside public/brain.glb.
 *
 * Catches the failure that is otherwise invisible until someone opens a
 * popup: a typo'd or renamed structure that silently highlights nothing.
 *
 *   node scripts/check-brain-regions.mjs
 *
 * Exits non-zero if any region resolves to zero meshes.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { REGIONS, LOBES, resolveRegions, normalizeName, meshMatchesAny } from '../src/data/brainRegions.js'

const here = dirname(fileURLToPath(import.meta.url))
const glb = readFileSync(join(here, '..', 'public', 'brain.glb'))

let offset = 12
let gltf = null
while (offset < glb.length) {
  const length = glb.readUInt32LE(offset)
  const type = glb.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(glb.subarray(offset + 8, offset + 8 + length).toString('utf8'))
  offset += 8 + length
}

const RENDERED = new Set([
  'cortex', 'cerebellum', 'brainstem', 'deep_grey',
  'diencephalon', 'white_matter', 'ventricles',
])

/* three.js does not hand us the names as written in the file. GLTFLoader
   sanitises them — dots become underscores — and splits a multi-primitive
   mesh into one THREE.Mesh per primitive, suffixing each with its index.
   This check reproduces both, because validating the raw file names is
   exactly the mistake that let a silently-broken vocabulary ship: every
   region "resolved" on paper and matched nothing in the browser. */
function runtimeNamesFor(node) {
  // PropertyBinding.sanitizeNodeName DELETES these characters; it does not
  // substitute them. `Hippocampus.r` becomes `Hippocampusr`.
  const sanitized = (node.name || '').replace(/[\s.:/[\]]/g, (c) => (c === ' ' ? '_' : ''))
  const primitives = gltf.meshes?.[node.mesh]?.primitives?.length ?? 1
  return primitives > 1
    ? Array.from({ length: primitives }, (_, i) => `${sanitized}_${i}`)
    : [sanitized]
}

const meshes = (gltf.nodes || [])
  .filter((n) => RENDERED.has(n.extras?.bx_cat))
  .flatMap((n) =>
    runtimeNamesFor(n).map((name) => ({
      cat: n.extras.bx_cat,
      matchKey: normalizeName(name),
      regionKey: normalizeName(n.extras.bx_region || ''),
    }))
  )

function countMatches(name) {
  const r = resolveRegions([name])
  if (r.unknown.length) return { count: 0, unknown: true }
  const count = meshes.filter(
    (m) => meshMatchesAny(m.matchKey, r.meshNames) || r.regionFields.has(m.regionKey) || r.categories.has(m.cat)
  ).length
  return { count, unknown: false }
}

let failures = 0
const names = [...Object.keys(REGIONS), ...Object.keys(LOBES)]

for (const name of names) {
  const { count, unknown } = countMatches(name)
  if (unknown) { console.log(`  ✗ ${name} — not in the vocabulary index`); failures++ }
  else if (count === 0) { console.log(`  ✗ ${name} — matches NO meshes in brain.glb`); failures++ }
}

// Every `also` spelling must resolve to the same place as its primary key.
for (const [key, def] of Object.entries(REGIONS)) {
  for (const alt of def.also || []) {
    if (countMatches(alt).count !== countMatches(key).count) {
      console.log(`  ✗ alias "${alt}" does not resolve like "${key}"`)
      failures++
    }
  }
}

console.log(
  failures === 0
    ? `\n✓ all ${names.length} regions resolve against ${meshes.length} renderable meshes.`
    : `\n${failures} problem(s) found.`
)
process.exit(failures === 0 ? 0 : 1)
