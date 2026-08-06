import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { normalizeName, sideOfName } from '../data/brainRegions'

/* =====================================================================
   BRAIN MODEL CACHE

   brain.glb is 4.65 MB and decodes into 437 Draco-compressed meshes. An
   article can open the 3D popup many times in one reading session, so
   parsing it per popup would be wasteful and visibly slow.

   This module parses it exactly ONCE per page load and hands out cheap
   clones. Clones share geometry by reference, so:

     ⚠️ A VIEWER MUST NEVER DISPOSE GEOMETRY. It belongs to the template
     and disposing it would blank out every popup opened afterwards.
     Viewers own only the materials they clone, and must dispose those.

   The cache also derives the model's ANATOMICAL AXES from the geometry
   itself rather than assuming an orientation convention — see below.
   ===================================================================== */

const GLB_URL = '/brain.glb'

// Categories we render. Everything else in the file (arteries, veins, dura,
// cranial nerves, tracts) is dropped at parse time — it is not part of any
// lesson and it extends well past the brain, which blows out the bounding
// box and leaves the brain rendering tiny in the middle of the canvas.
export const SHOW_CATS = new Set([
  'cortex', 'cerebellum', 'brainstem', 'deep_grey',
  'diencephalon', 'white_matter', 'ventricles',
])

let templatePromise = null

function centroidOf(entries) {
  const sum = new THREE.Vector3()
  let n = 0
  for (const e of entries) { sum.add(e.center); n++ }
  return n ? sum.divideScalar(n) : null
}

/**
 * Works out which way is right / up / front for THIS model, by measuring it.
 *
 * Hard-coding axes would mean guessing the exporter's convention, and would
 * silently produce wrong camera angles if the model were ever re-exported.
 * Instead:
 *   right — from the centre of all `.l` meshes toward the centre of all `.r`
 *   front — from the occipital lobe toward the frontal lobe
 *   up    — their cross product, with the sign settled by checking that the
 *           corpus callosum really does end up above the medulla
 */
function deriveAxes(entries) {
  const fallback = {
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    front: new THREE.Vector3(0, 0, 1),
    derived: false,
  }

  // Find genuine laterality pairs. The loader fuses the side letter onto the
  // name ("Hippocampusl" / "Hippocampusr"), so a trailing l or r is only
  // trustworthy when BOTH variants of the same stem exist — that rules out
  // structures whose real name simply happens to end in one of those letters.
  const stems = new Map()
  for (const e of entries) {
    const n = (e.rawName || '').toLowerCase()
    const last = n.slice(-1)
    if (last !== 'l' && last !== 'r') continue
    const stem = n.slice(0, -1)
    if (!stems.has(stem)) stems.set(stem, { l: [], r: [] })
    stems.get(stem)[last].push(e)
  }

  const left = []
  const right = []
  for (const pair of stems.values()) {
    if (pair.l.length && pair.r.length) { left.push(...pair.l); right.push(...pair.r) }
  }

  const frontal = entries.filter((e) => e.region === 'Frontal lobe')
  const occipital = entries.filter((e) => e.region === 'Occipital lobe')
  if (!left.length || !right.length || !frontal.length || !occipital.length) return fallback

  const rightAxis = centroidOf(right).sub(centroidOf(left))
  if (rightAxis.lengthSq() < 1e-9) return fallback
  rightAxis.normalize()

  const frontAxis = centroidOf(frontal).sub(centroidOf(occipital))
  if (frontAxis.lengthSq() < 1e-9) return fallback
  // Remove any left/right component so the two axes are truly perpendicular.
  frontAxis.addScaledVector(rightAxis, -frontAxis.dot(rightAxis)).normalize()

  const upAxis = new THREE.Vector3().crossVectors(frontAxis, rightAxis).normalize()

  // A cross product gives a line, not a direction, so it can come out upside
  // down. Settle it against something that is unambiguously higher: the whole
  // cortex sits above the whole brainstem. Categories are used rather than
  // named structures because names arrive mangled by the loader — an earlier
  // version compared against 'Corpus callosum', never matched `Corpus_callosum`,
  // and silently left the model inverted.
  const superior = centroidOf(entries.filter((e) => e.cat === 'cortex'))
  const inferior = centroidOf(entries.filter((e) => e.cat === 'brainstem'))
  if (superior && inferior && upAxis.dot(superior.sub(inferior)) < 0) upAxis.negate()

  return { right: rightAxis, up: upAxis, front: frontAxis, derived: true }
}

/**
 * Parses brain.glb once and resolves to a reusable template.
 * Safe to call from anywhere; concurrent callers share one in-flight parse.
 */
export function loadBrainTemplate() {
  if (templatePromise) return templatePromise

  templatePromise = (async () => {
    const loader = new GLTFLoader()
    const draco = new DRACOLoader()
    loader.setDRACOLoader(draco)

    let gltf
    try {
      gltf = await loader.loadAsync(GLB_URL)
    } finally {
      // The decoder's worker pool is only needed during parse. Geometry stays.
      draco.dispose()
    }

    // Sort into keep/drop before touching the scene graph, so the bounding
    // box below only ever sees anatomy we actually render.
    const keep = []
    const drop = []
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return
      const p = child.parent
      const cat = child.userData.bx_cat || p?.userData.bx_cat || ''
      const region = child.userData.bx_region || p?.userData.bx_region || ''
      if (SHOW_CATS.has(cat)) keep.push({ mesh: child, cat, region })
      else drop.push(child)
    })

    for (const mesh of drop) {
      mesh.geometry?.dispose()
      mesh.removeFromParent()
    }

    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    // Flatten every kept mesh onto one group placed at the anatomical centre.
    // `attach` preserves world transforms, so each mesh's local position ends
    // up as its offset from that centre — the coordinate space the atrophy
    // maths in the viewer assumes.
    const brain = new THREE.Group()
    brain.position.copy(center)
    for (const { mesh } of keep) brain.attach(mesh)
    brain.position.set(0, 0, 0)

    const entries = []
    for (const { mesh, cat, region } of keep) {
      const name = mesh.name || ''

      mesh.geometry.computeBoundingBox()
      // Offset from the mesh's local origin to the centre of its own geometry,
      // in parent space. The viewer uses this to pin that centre in place
      // while the mesh scales around it.
      const pivot = mesh.geometry.boundingBox
        .getCenter(new THREE.Vector3())
        .multiply(mesh.scale)
        .applyQuaternion(mesh.quaternion)

      entries.push({
        mesh, cat, region,
        rawName: name,
        matchKey: normalizeName(name),
        // Hemisphere is filled in geometrically once the axes are known.
        side: null,
        // Human-readable label for the debug report and any future picking UI.
        base: name.replace(/[._]?\d+$/, '').replace(/[._][lr]$/i, ''),
        regionKey: normalizeName(region),
        center: mesh.position.clone().add(pivot),
        pivot,
        basePos: mesh.position.clone(),
        baseScale: mesh.scale.clone(),
      })
    }

    const axes = deriveAxes(entries)

    // Assign hemisphere by position, not by name. Names lose their `.l`/`.r`
    // separator in the loader, and midline structures (corpus callosum, third
    // ventricle, pineal) have no side at all — a name-based guess would put
    // them in a hemisphere and let `cutaway` delete them.
    const midlineBand = maxDim * 0.02
    for (const e of entries) {
      const offset = e.center.dot(axes.right)
      e.side = Math.abs(offset) < midlineBand ? null : (offset > 0 ? 'r' : 'l')
    }

    // Stamp the per-mesh facts onto the template so clones inherit them and
    // no viewer has to recompute any of this.
    for (const e of entries) {
      e.mesh.userData.brainInfo = {
        cat: e.cat,
        region: e.region,
        base: e.base,
        side: e.side,
        matchKey: e.matchKey,
        regionKey: e.regionKey,
        basePos: e.basePos,
        baseScale: e.baseScale,
        pivot: e.pivot,
      }
    }

    return { group: brain, maxDim, axes, meshCount: entries.length }
  })()

  // A failed load must not poison the cache — let the next viewer retry.
  templatePromise.catch(() => { templatePromise = null })

  return templatePromise
}

/**
 * A fresh scene graph for one viewer, sharing the template's geometry.
 * Materials are cloned per mesh: the source file reuses 13 materials across
 * 437 meshes, so styling one mesh would otherwise restyle dozens of others.
 * Every material returned here is owned by the caller and must be disposed.
 */
export function instantiateBrain(template) {
  const group = template.group.clone(true)
  const meshes = []
  const ownedMaterials = []

  group.traverse((child) => {
    if (!child.isMesh) return

    // Object3D.copy() deep-clones userData through JSON.stringify, which turns
    // our Vector3s into plain {x,y,z} objects and strips their methods. Rebuild
    // them here or every read of .pivot/.basePos in the viewer throws.
    const info = child.userData.brainInfo
    if (info) {
      info.basePos = toVector3(info.basePos)
      info.baseScale = toVector3(info.baseScale)
      info.pivot = toVector3(info.pivot)
    }

    const src = Array.isArray(child.material) ? child.material[0] : child.material
    const mat = src ? src.clone() : new THREE.MeshStandardMaterial()
    // Every material in the file carries emissiveFactor [1,1,1]. Full-white
    // emissive is added after lighting and ignores material.color, which is
    // why the model rendered as a flat white blob before this was zeroed.
    mat.emissive?.setScalar(0)
    mat.emissiveIntensity = 0
    mat.metalness = 0.05
    mat.roughness = 0.62
    mat.side = THREE.FrontSide
    child.material = mat
    ownedMaterials.push(mat)
    meshes.push(child)
  })

  return { group, meshes, ownedMaterials }
}

function toVector3(v) {
  return v?.isVector3 ? v : new THREE.Vector3(v?.x || 0, v?.y || 0, v?.z || 0)
}

/** Camera offset for a named preset, in the model's own anatomical axes. */
export function cameraVectorFor(preset, axes) {
  const p = preset || { right: 0.55, up: 0.22, front: 0.8 }
  return new THREE.Vector3()
    .addScaledVector(axes.right, p.right || 0)
    .addScaledVector(axes.up, p.up || 0)
    .addScaledVector(axes.front, p.front || 0)
    .normalize()
}
