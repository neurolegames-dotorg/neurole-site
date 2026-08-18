import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { loadBrainTemplate, instantiateBrain, cameraVectorFor } from '../lib/brainModelCache'
import { CAMERA_PRESETS, meshMatchesAny } from '../data/brainRegions'

/* Tints. The GLB ships 13 materials shared across 437 meshes and every one
   carries emissiveFactor [1,1,1]; the cache zeroes that at load so these
   colours are actually visible and can differ structure by structure. */
const CORTEX = new THREE.Color('#e9b4a7')
const CORTEX_LOST = new THREE.Color('#87808a')
const DEEP = new THREE.Color('#d59a90')
const DEEP_LOST = new THREE.Color('#7b747e')
const VENTRICLE = new THREE.Color('#8ab6da')

/* Highlight palette for article figures. Deliberately one saturated colour
   against a desaturated ghost — hue alone never carries the meaning, so it
   still reads for colour-blind viewers. Change here to restyle every figure. */
const HIGHLIGHT = new THREE.Color('#7f56d9')
const GHOST = new THREE.Color('#9c94a6')

// Per-stage tissue loss, 0..1 per anatomical group. Follows the usual
// Braak-style spread: entorhinal/temporal first, then limbic and parietal,
// then frontal, with cerebellum and brainstem relatively spared until late.
// `ventricle` is an expansion factor, not a loss — the ventricles dilate to
// fill the space left by atrophied tissue (hydrocephalus ex vacuo), which is
// the most recognisable sign on a real scan.
const STAGE_ATROPHY = [
  { frontal: 0, temporal: 0, parietal: 0, occipital: 0, limbic: 0, insula: 0, other: 0, deep: 0, cerebellum: 0, brainstem: 0, ventricle: 0 },
  { frontal: 0, temporal: 0.55, parietal: 0, occipital: 0, limbic: 0.30, insula: 0.20, other: 0.05, deep: 0, cerebellum: 0, brainstem: 0, ventricle: 0.15 },
  { frontal: 0.50, temporal: 0.80, parietal: 0.45, occipital: 0.25, limbic: 0.50, insula: 0.45, other: 0.25, deep: 0.20, cerebellum: 0, brainstem: 0, ventricle: 0.40 },
  { frontal: 0.80, temporal: 0.95, parietal: 0.75, occipital: 0.55, limbic: 0.70, insula: 0.70, other: 0.50, deep: 0.45, cerebellum: 0.35, brainstem: 0.15, ventricle: 0.75 },
]

// How much of its radius a fully atrophied structure gives up.
const CORTEX_SHRINK = 0.20
const DEEP_SHRINK = 0.14
const VENTRICLE_GROWTH = 0.55

function groupFor(cat, region) {
  if (cat === 'ventricles') return 'ventricles'
  if (cat === 'cerebellum') return 'cerebellum'
  if (cat === 'brainstem') return 'brainstem'
  if (cat === 'deep_grey' || cat === 'white_matter' || cat === 'diencephalon') return 'deep'

  // cat === 'cortex' — split by lobe so atrophy can spread regionally.
  const r = (region || '').toLowerCase()
  if (r.includes('frontal')) return 'frontal'
  if (r.includes('temporal')) return 'temporal'
  if (r.includes('parietal')) return 'parietal'
  if (r.includes('occipital')) return 'occipital'
  if (r.includes('limbic')) return 'limbic'
  if (r.includes('insula')) return 'insula'
  // 'Telencephalon' — unlabelled cortical remainder. Given a modest share of
  // the diffuse late-stage loss rather than staying pristine forever.
  return 'other'
}

// How a structure is drawn, as opposed to how it atrophies.
//   shell — outer surface you see in surface mode
//   wm    — white matter, wraps the core and would hide it if drawn solid
//   core  — deep grey + diencephalon, the structures translucent mode reveals
function renderClassFor(cat) {
  if (cat === 'ventricles') return 'ventricles'
  if (cat === 'white_matter') return 'wm'
  if (cat === 'deep_grey' || cat === 'diencephalon') return 'core'
  return 'shell'
}

function isHighlighted(info, highlight) {
  return (
    meshMatchesAny(info.matchKey, highlight.meshNames) ||
    highlight.regionFields?.has(info.regionKey) ||
    highlight.categories?.has(info.cat)
  )
}

/**
 * props
 *   stage      0-3 atrophy progression preset
 *   viewMode   'surface' | 'translucent'
 *   highlight  { meshNames, regionFields, categories } from resolveRegions(),
 *              or null. When set, matched structures render solid and
 *              everything else drops to a ghost shell.
 *   camera     preset name from CAMERA_PRESETS ('medial', 'superior', …)
 *   cutaway    'l' | 'r' — hide that hemisphere so the midline is visible
 *   autoRotate slow turntable, used in article popups
 */
const BrainViewer = forwardRef(function BrainViewer(
  {
    stage = 0,
    viewMode = 'surface',
    highlight = null,
    camera: cameraPreset = 'default',
    cutaway = null,
    autoRotate = false,
    className = '',
  },
  ref
) {
  const containerRef = useRef(null)
  const stateRef = useRef(null)
  const destroyedRef = useRef(false)
  const [status, setStatus] = useState('loading')

  // Latest props, readable from inside the one-time boot effect without
  // making it re-run (a re-run would re-create the WebGL context).
  const propsRef = useRef({ stage, viewMode, highlight, cameraPreset, cutaway, autoRotate })
  propsRef.current = { stage, viewMode, highlight, cameraPreset, cutaway, autoRotate }

  useImperativeHandle(ref, () => ({
    get scene() { return stateRef.current?.scene },
    resetView() { stateRef.current?.resetView?.() },
  }))

  useEffect(() => {
    destroyedRef.current = false
    const container = containerRef.current
    if (!container) return

    let renderer, scene, camera, controls
    let frameId, observer, handleResize, resizeTimeout
    let meshes = []
    let ownedMaterials = []

    function applyStyle(stageIndex, mode, hl, cut) {
      const eff = STAGE_ATROPHY[stageIndex] || STAGE_ATROPHY[0]
      const translucent = mode === 'translucent'
      const focusing = !!hl && (hl.meshNames?.size || hl.regionFields?.size || hl.categories?.size)

      for (const mesh of meshes) {
        const info = mesh.userData.brainInfo
        if (!info) continue
        const group = groupFor(info.cat, info.region)
        const render = renderClassFor(info.cat)
        const dim = eff[group] ?? 0

        let opacity, color, scale
        let side = THREE.FrontSide
        let depthWrite = true
        // Highlighted structures are lit from within so they stay legible
        // through the surrounding ghost, which is otherwise thick enough
        // to wash out anything deep like the hippocampus.
        let emissive = 0
        // Draw order within the transparent pass. The ghost writes no depth,
        // so anything drawn after it is never occluded by it — this is what
        // makes a highlighted structure genuinely visible rather than merely
        // "somewhere behind the fog". Highlights still depth-sort against
        // each other, so a multi-structure figure keeps its real 3D layering.
        let order = 0
        let forceTransparent = false

        if (cut && info.side === cut) {
          // Hemisphere removed so the midline structures are visible.
          opacity = 0
          color = CORTEX
          scale = 1
        } else if (focusing) {
          // Article figure mode: the named structures read solid, everything
          // else collapses to a single translucent silhouette for context.
          if (isHighlighted(info, hl)) {
            opacity = 1
            color = HIGHLIGHT
            scale = 1
            emissive = 0.42
            order = 10
            forceTransparent = true
          } else if (render === 'core' || render === 'ventricles' || render === 'wm') {
            // Interior bulk would sit between the camera and the highlight.
            opacity = 0
            color = GHOST
            scale = 1
          } else {
            // Backfaces only: ~128 cortical shells at any front-facing opacity
            // stack into a solid wall, so culling front faces leaves one clean
            // silhouette you can actually see the highlight through.
            opacity = 0.1
            color = GHOST
            scale = 1
            side = THREE.BackSide
            depthWrite = false
          }
        } else if (render === 'ventricles') {
          // Ventricles do not waste away, they enlarge to fill the space the
          // atrophied tissue leaves behind. Only legible with the cortex out of
          // the way, so they stay hidden in surface mode.
          opacity = translucent ? 1 : 0
          color = VENTRICLE
          scale = 1 + eff.ventricle * VENTRICLE_GROWTH
        } else if (render === 'core') {
          // Deep grey + diencephalon. Fully opaque so the interior depth-sorts
          // correctly against itself; only the outer shell is alpha-blended.
          opacity = translucent ? 1 : 0
          color = DEEP.clone().lerp(DEEP_LOST, dim)
          scale = 1 - dim * DEEP_SHRINK
        } else {
          const wm = render === 'wm'
          if (translucent) {
            opacity = wm ? 0.22 : 0.3
            side = THREE.BackSide
          } else {
            opacity = wm ? 0 : 1
          }
          color = CORTEX.clone().lerp(CORTEX_LOST, translucent ? dim * 0.7 : dim)
          scale = 1 - dim * CORTEX_SHRINK
        }

        // Shrink each structure about its OWN centre so it stays anatomically
        // anchored. Scaling toward the middle of the brain instead would drag
        // every structure inward by its own amount, and since the cerebellum
        // and brainstem are largely spared they would visibly detach from the
        // shrinking cerebrum and read as two separate objects.
        mesh.scale.copy(info.baseScale).multiplyScalar(scale)
        mesh.position.copy(info.basePos).add(
          info.pivot.clone().multiplyScalar(1 - scale)
        )

        const mat = mesh.material
        const wasTransparent = mat.transparent
        mat.color.copy(color)
        if (mat.emissive) {
          mat.emissive.copy(color).multiplyScalar(emissive)
          mat.emissiveIntensity = 1
        }
        mat.opacity = opacity
        // A fully opaque highlight is still flagged transparent so it joins
        // the transparent pass and can be ordered after the ghost.
        mat.transparent = forceTransparent || opacity < 1
        mat.depthWrite = opacity >= 1 ? true : depthWrite
        mat.side = side
        mesh.renderOrder = order
        // Flipping .transparent needs a program rebuild; .color/.opacity/.side
        // do not. Only flag it when it actually changed, so toggling modes
        // doesn't recompile a few hundred shaders at once.
        if (wasTransparent !== mat.transparent) mat.needsUpdate = true
        mesh.visible = opacity > 0.01
      }
    }

    async function boot() {
      if (!container.isConnected) return
      const w = container.clientWidth || 400
      const h = container.clientHeight || 400

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(w, h)
      renderer.setClearColor(0x000000, 0)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.0
      container.appendChild(renderer.domElement)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(35, w / h, 0.01, 100)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.autoRotateSpeed = 0.8

      // Soft, mostly diffuse lighting. A brighter rig (ambient 0.6 + two
      // directionals at 1.8/0.5 on top of exposure 1.2) clipped to white.
      scene.add(new THREE.HemisphereLight(0xfff2ee, 0x2a2230, 0.75))
      const key = new THREE.DirectionalLight(0xffffff, 1.1)
      key.position.set(1, 1.4, 1.2)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffd9cc, 0.35)
      fill.position.set(-1.2, 0.3, -0.9)
      scene.add(fill)

      const template = await loadBrainTemplate()
      if (destroyedRef.current) return

      const inst = instantiateBrain(template)
      meshes = inst.meshes
      ownedMaterials = inst.ownedMaterials
      scene.add(inst.group)

      const { maxDim, axes } = template

      // Distance at which something `span` across fills the viewport, for the
      // CURRENT aspect. Fit against whichever of width/height is tighter,
      // otherwise it under-fills on wide canvases.
      function distanceFor(span) {
        const vFov = THREE.MathUtils.degToRad(camera.fov)
        const fitH = (span / 2) / Math.tan(vFov / 2)
        const fitW = fitH / camera.aspect
        return Math.max(fitH, fitW) * 1.15
      }

      // What the camera should look at, and how wide a view it needs.
      // With a highlight, frame the highlighted structures rather than the
      // whole head — a hippocampus fitted to a full-brain view is a few
      // pixels across, which is the difference between a figure that
      // teaches something and one that just looks like a brain.
      function framing(hl) {
        if (hl) {
          // Box3.expandByObject reads matrixWorld, and applyStyle has just
          // rewritten every mesh's position and scale. Without this the box
          // is measured from stale matrices and the camera targets empty space.
          scene.updateMatrixWorld(true)
          const box = new THREE.Box3()
          let any = false
          for (const mesh of meshes) {
            const info = mesh.userData.brainInfo
            if (info && mesh.visible && isHighlighted(info, hl)) { box.expandByObject(mesh); any = true }
          }
          if (any && !box.isEmpty()) {
            const size = box.getSize(new THREE.Vector3())
            const extent = Math.max(size.x, size.y, size.z)
            // A single small nucleus needs surrounding anatomy to be locatable;
            // a circuit spanning half the brain is already its own context and
            // only needs breathing room. Slide between the two rather than
            // applying one multiplier that leaves big figures tiny on screen.
            const relative = Math.min(1, extent / maxDim)
            const margin = 2.8 + (1.25 - 2.8) * relative
            return {
              target: box.getCenter(new THREE.Vector3()),
              span: Math.max(extent * margin, maxDim * 0.4),
            }
          }
        }
        return { target: new THREE.Vector3(0, 0, 0), span: maxDim }
      }

      let baseDist = distanceFor(maxDim)

      function placeCamera(presetName, hl) {
        const preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.default
        const dir = cameraVectorFor(preset, axes)
        const { target, span } = framing(hl)

        baseDist = distanceFor(span)
        controls.target.copy(target)
        camera.position.copy(target).addScaledVector(dir, baseDist)
        controls.minDistance = baseDist * 0.25
        controls.maxDistance = distanceFor(maxDim) * 3
        controls.update()
      }

      stateRef.current = {
        scene, camera, renderer, controls,
        // Style first, then frame: framing() measures only meshes that are
        // actually visible, so a cutaway hemisphere never drags the camera
        // toward anatomy the reader cannot see.
        applyStyle: (s, mode, hl, cut) => { applyStyle(s, mode, hl, cut) },
        restyleAndFrame: (s, mode, hl, cut, preset) => {
          applyStyle(s, mode, hl, cut)
          placeCamera(preset, hl)
        },
        resetView: () => {
          const q = propsRef.current
          applyStyle(q.stage, q.viewMode, q.highlight, q.cutaway)
          placeCamera(q.cameraPreset, q.highlight)
        },
      }

      const p = propsRef.current
      applyStyle(p.stage, p.viewMode, p.highlight, p.cutaway)
      placeCamera(p.cameraPreset, p.highlight)
      controls.autoRotate = !!p.autoRotate
      setStatus('done')

      // Re-fit on resize. The framing above depends on aspect, so a viewer
      // that changes size after load — a popup opening, a phone rotating —
      // would otherwise keep its original, now-wrong framing and zoom limits.
      // Scaling by the ratio preserves whatever angle and zoom the reader
      // had already dialled in.
      // Throttle resize to prevent excessive recalculations during drag events.
      let resizeTimeout = null
      const doResize = () => {
        const cw = container.clientWidth || 400
        const ch = container.clientHeight || 400
        if (!cw || !ch) return
        camera.aspect = cw / ch
        camera.updateProjectionMatrix()
        renderer.setSize(cw, ch)

        const q = propsRef.current
        const { target, span } = framing(q.highlight)
        const next = distanceFor(span)
        if (next > 0 && baseDist > 0 && Math.abs(next - baseDist) > baseDist * 0.001) {
          // Move along the existing view direction so the reader keeps the
          // angle and relative zoom they had, only re-fitted to the new aspect.
          const offset = camera.position.clone().sub(target).multiplyScalar(next / baseDist)
          camera.position.copy(target).add(offset)
          baseDist = next
          controls.minDistance = baseDist * 0.25
          controls.maxDistance = distanceFor(maxDim) * 3
        }
        controls.update()
      }
      handleResize = () => {
        // Throttle: only execute once per 100ms during rapid resize events
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(doResize, 100)
      }
      window.addEventListener('resize', handleResize)
      observer = new ResizeObserver(() => {
        // ResizeObserver fires frequently during drag; throttle similarly
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(doResize, 100)
      })
      observer.observe(container)

      const animateFrame = () => {
        if (destroyedRef.current) return
        controls.update()
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(animateFrame)
      }
      animateFrame()
    }

    boot().catch((err) => {
      console.error('[BrainViewer]', err)
      if (!destroyedRef.current) setStatus('error')
    })

    return () => {
      destroyedRef.current = true
      if (resizeTimeout) clearTimeout(resizeTimeout)
      cancelAnimationFrame(frameId)
      if (handleResize) window.removeEventListener('resize', handleResize)
      if (observer) observer.disconnect()
      if (controls) controls.dispose()
      // Materials are cloned per viewer, so they are ours to free. Geometry is
      // NOT — it belongs to the shared template in brainModelCache and is
      // reused by every viewer opened after this one. Disposing it here would
      // blank out every later popup.
      for (const m of ownedMaterials) m?.dispose?.()
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
      stateRef.current = null
    }
  }, [])

  // Stage and view-mode changes restyle in place. The Brain Lab slider runs
  // through these, and yanking the camera back on every step would fight the
  // reader mid-drag.
  useEffect(() => {
    stateRef.current?.applyStyle?.(stage, viewMode, highlight, cutaway)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, viewMode])

  // A different structure, cutaway or angle is a different figure, so re-frame.
  useEffect(() => {
    stateRef.current?.restyleAndFrame?.(stage, viewMode, highlight, cutaway, cameraPreset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, cutaway, cameraPreset])

  useEffect(() => {
    const c = stateRef.current?.controls
    if (c) c.autoRotate = !!autoRotate
  }, [autoRotate])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%', height: '100%', position: 'relative',
        overflow: 'hidden', borderRadius: 12, cursor: 'grab',
      }}
    >
      {status !== 'done' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
          color: 'var(--ink-soft)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
          pointerEvents: 'none', textAlign: 'center', padding: 16,
        }}>
          {status === 'error'
            ? 'The 3D brain could not be loaded. The article continues below.'
            : 'Loading brain model…'}
        </div>
      )}
    </div>
  )
})

export default BrainViewer
