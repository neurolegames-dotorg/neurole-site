import { lazy, Suspense, forwardRef } from 'react'

/* three.js, the Draco decoder and the 4.65 MB model together dwarf the rest
   of the site. Importing the viewer lazily keeps all of it out of the main
   bundle, so someone reading an article or playing the daily case only
   downloads the 3D stack if they actually open a brain.

   Every consumer should import THIS, not BrainViewer directly — a single
   static import anywhere pulls three.js back into the main chunk. */
const BrainViewer = lazy(() => import('./BrainViewer'))

const Placeholder = () => (
  <div style={{
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'var(--ink-soft)', fontFamily: "'Outfit', sans-serif", fontSize: 14,
  }}>
    Loading 3D viewer…
  </div>
)

const BrainViewerLazy = forwardRef(function BrainViewerLazy(props, ref) {
  return (
    <Suspense fallback={<Placeholder />}>
      <BrainViewer {...props} ref={ref} />
    </Suspense>
  )
})

export default BrainViewerLazy
