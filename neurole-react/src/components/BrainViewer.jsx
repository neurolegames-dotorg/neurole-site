import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const GLB_URL = '/brain.glb'

// The GLB ships only 13 materials shared across 437 meshes, and every one of
// them carries emissiveFactor [1,1,1]. Full-white emissive is added after
// lighting and ignores material.color, which is why the model rendered as a
// flat white blob. We clone per mesh and zero the emissive at load so these
// tints are actually visible and can differ lobe by lobe.
const CORTEX = new THREE.Color('#e9b4a7')
const CORTEX_LOST = new THREE.Color('#87808a')
const DEEP = new THREE.Color('#d59a90')
const DEEP_LOST = new THREE.Color('#7b747e')
const VENTRICLE = new THREE.Color('#8ab6da')

// Categories we render. Everything else in the model (arteries, veins, dura,
// cranial nerves, tracts) is dropped at load — it is not part of the lesson and
// it extends well past the brain, which used to blow out the bounding box and
// leave the brain rendering tiny in the middle of the canvas.
const SHOW_CATS = new Set([
  'cortex', 'cerebellum', 'brainstem', 'deep_grey',
  'diencephalon', 'white_matter', 'ventricles',
])

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

const BrainViewer = forwardRef(function BrainViewer(
  { stage = 0, viewMode = 'surface', className = '' },
  ref
) {
  const containerRef = useRef(null)
  const stateRef = useRef(null)
  const destroyedRef = useRef(false)
  const [status, setStatus] = useState('loading')

  useImperativeHandle(ref, () => ({
    get scene() { return stateRef.current?.scene },
  }))

  useEffect(() => {
    destroyedRef.current = false
    const container = containerRef.current
    if (!container) return

    let renderer, scene, camera, controls, dracoLoader
    let frameId, observer, handleResize
    const meshes = []
    const disposables = []

    function applyStyle(stageIndex, mode) {
      const eff = STAGE_ATROPHY[stageIndex] || STAGE_ATROPHY[0]
      const translucent = mode === 'translucent'

      for (const mesh of meshes) {
        const info = mesh.userData.brainInfo
        const dim = eff[info.group] ?? 0

        let opacity, color, scale
        let side = THREE.FrontSide

        if (info.render === 'ventricles') {
          // Ventricles do not waste away, they enlarge to fill the space the
          // atrophied tissue leaves behind. Only legible with the cortex out of
          // the way, so they stay hidden in surface mode.
          opacity = translucent ? 1 : 0
          color = VENTRICLE
          scale = 1 + eff.ventricle * VENTRICLE_GROWTH
        } else if (info.render === 'core') {
          // Deep grey + diencephalon. Fully opaque so the interior depth-sorts
          // correctly against itself; only the outer shell is alpha-blended.
          opacity = translucent ? 1 : 0
          color = DEEP.clone().lerp(DEEP_LOST, dim)
          scale = 1 - dim * DEEP_SHRINK
        } else {
          // Outer shell (cortex/cerebellum/brainstem) and the white matter
          // wrapped around the core.
          //
          // Alpha stacks: ~128 separate cortical shells means even 0.09 opacity
          // piles up into a solid wall. Rendering backfaces only in translucent
          // mode culls every front-facing layer between the camera and the
          // interior, so one clean silhouette ghost remains and you can
          // actually see through it.
          const wm = info.render === 'wm'
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
        // shrinking cerebrum and read as two separate objects. Thinning in
        // place keeps it one brain and still widens the sulci.
        mesh.scale.copy(info.baseScale).multiplyScalar(scale)
        mesh.position.copy(info.basePos).add(
          info.pivot.clone().multiplyScalar(1 - scale)
        )

        const mat = mesh.material
        const wasTransparent = mat.transparent
        mat.color.copy(color)
        mat.opacity = opacity
        mat.transparent = opacity < 1
        mat.depthWrite = opacity >= 1
        mat.side = side
        // Flipping .transparent needs a program rebuild; .color/.opacity/.side
        // do not. Only flag it when it actually changed, so toggling modes
        // doesn't recompile a few hundred shaders at once.
        if (wasTransparent !== mat.transparent) mat.needsUpdate = true
        mesh.visible = opacity > 0.01
      }
    }

    async function boot() {
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

      // Soft, mostly diffuse lighting. The previous rig (ambient 0.6 + two
      // directionals at 1.8/0.5 on top of exposure 1.2) clipped to white.
      scene.add(new THREE.HemisphereLight(0xfff2ee, 0x2a2230, 0.75))
      const key = new THREE.DirectionalLight(0xffffff, 1.1)
      key.position.set(1, 1.4, 1.2)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffd9cc, 0.35)
      fill.position.set(-1.2, 0.3, -0.9)
      scene.add(fill)

      const loader = new GLTFLoader()
      dracoLoader = new DRACOLoader()
      loader.setDRACOLoader(dracoLoader)

      const gltf = await loader.loadAsync(GLB_URL)
      if (destroyedRef.current) return

      // Sort meshes into keep/drop before touching the scene graph, so the
      // bounding box below only ever sees anatomy we actually render.
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

      scene.add(gltf.scene)
      const box = new THREE.Box3().setFromObject(gltf.scene)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      // Flatten every kept mesh onto one group placed at the anatomical centre.
      // `attach` preserves world transforms, so each mesh's local position ends
      // up as its offset from that centre — the coordinate space the atrophy
      // maths in applyStyle assumes.
      const brain = new THREE.Group()
      brain.position.copy(center)
      scene.add(brain)
      for (const { mesh } of keep) brain.attach(mesh)
      gltf.scene.removeFromParent()
      brain.position.set(0, 0, 0)

      for (const { mesh, cat, region } of keep) {
        // Materials are shared 30-to-1 in this file, so styling a mesh would
        // restyle every other mesh using the same one. Clone per mesh.
        const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        const mat = src ? src.clone() : new THREE.MeshStandardMaterial()
        mat.emissive?.setScalar(0)
        mat.emissiveIntensity = 0
        mat.metalness = 0.05
        mat.roughness = 0.62
        mat.side = THREE.FrontSide
        mesh.material = mat
        disposables.push(mat, mesh.geometry)

        // Offset from the mesh's local origin to the centre of its own
        // geometry, in parent space. applyStyle uses this to pin that centre
        // in place while the mesh scales around it.
        mesh.geometry.computeBoundingBox()
        const pivot = mesh.geometry.boundingBox
          .getCenter(new THREE.Vector3())
          .multiply(mesh.scale)
          .applyQuaternion(mesh.quaternion)

        mesh.userData.brainInfo = {
          group: groupFor(cat, region),
          render: renderClassFor(cat),
          basePos: mesh.position.clone(),
          baseScale: mesh.scale.clone(),
          pivot,
        }
        meshes.push(mesh)
      }

      // Frame the brain so it fills the viewport. Fit against whichever of
      // width/height is tighter, otherwise it under-fills on wide canvases.
      const vFov = THREE.MathUtils.degToRad(camera.fov)
      const fitH = (maxDim / 2) / Math.tan(vFov / 2)
      const fitW = fitH / camera.aspect
      const dist = Math.max(fitH, fitW) * 1.15
      camera.position.set(dist * 0.55, dist * 0.22, dist * 0.8)
      controls.target.set(0, 0, 0)
      controls.minDistance = dist * 0.35
      controls.maxDistance = dist * 3
      controls.update()

      stateRef.current = { scene, camera, renderer, controls, applyStyle }

      applyStyle(stage, viewMode)
      setStatus('done')

      handleResize = () => {
        const cw = container.clientWidth || 400
        const ch = container.clientHeight || 400
        camera.aspect = cw / ch
        camera.updateProjectionMatrix()
        renderer.setSize(cw, ch)
      }
      window.addEventListener('resize', handleResize)
      observer = new ResizeObserver(handleResize)
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
      setStatus('error')
    })

    return () => {
      destroyedRef.current = true
      cancelAnimationFrame(frameId)
      // The old cleanup passed a fresh arrow function here, so the real resize
      // handler was never removed and leaked on every unmount.
      if (handleResize) window.removeEventListener('resize', handleResize)
      if (observer) observer.disconnect()
      if (controls) controls.dispose()
      if (dracoLoader) dracoLoader.dispose()
      for (const d of disposables) d?.dispose?.()
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  useEffect(() => {
    stateRef.current?.applyStyle?.(stage, viewMode)
  }, [stage, viewMode])

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
          pointerEvents: 'none',
        }}>
          {status === 'error' ? 'Failed to load brain model' : 'Loading brain model…'}
        </div>
      )}
    </div>
  )
})

export default BrainViewer
