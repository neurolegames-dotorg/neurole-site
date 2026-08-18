# Neurole Site — Comprehensive Codebase Analysis

## Executive Summary

Neurole is an educational neuroscience gaming platform built with **React + Three.js**, featuring 4 playable games centered on brain anatomy, diagnostics, and learning. The codebase is well-structured but has several performance bottlenecks and missing optimizations, particularly in CSV data handling, 3D rendering efficiency, and state management.

---

## 1. OVERVIEW OF ALL GAMES

| Game | Type | Mechanics | Data Source | Key Files |
|------|------|-----------|------------|-----------|
| **Daily Case** | Daily Puzzle | Read 5 symptoms → guess diagnosis in ≤5 tries | Google Sheet CSV | `DailyGamePage.jsx`, `DailyGamePlayPage.jsx` |
| **Map the Brain** | Quiz | ID brain regions from images or function | Google Sheet CSV | `NeuroanatomyPage.jsx`, `NeuroanatomyPlayPage.jsx` |
| **Brain Lab** | 3D Explorer | Interactive 3D brain + Alzheimer's progression | Local GLB (4.65MB) | `BrainLabPage.jsx`, `BrainViewer.jsx` |
| **Synapse** | Daily Puzzle | Find 4 word groups (Connections-style) | Google Sheet CSV | `SynapsePage.jsx`, `synapse.js` |

### Game Distribution
- **Daily games**: 2 (Daily Case, Synapse) — rotate daily
- **Persistent games**: 2 (Map the Brain, Brain Lab) — always available
- **AI-enhanced**: 3 (Daily Case, Map the Brain, Synapse) — use Groq API with fallback

---

## 2. DETAILED NEUROANATOMY GAME ANALYSIS

### How It Works

```
User selects difficulty + category
         ↓
Fetch Google Sheet CSV (cached 10 min)
         ↓
Parse CSV → Question bank array
         ↓
Display question image + 4 choices
         ↓
User selects → Score + AI tutor available
         ↓
Next question or show results
         ↓
Update localStorage (best score, streaks)
```

### Data Flow

**Setup Phase**:
1. `NeuroanatomyPage.jsx` - Category/difficulty selection screen
2. User clicks "Play" → navigates to `NeuroanatomyPlayPage.jsx?category=X&difficulty=Y&count=Z`
3. `NeuroanatomyPlayPage` reads URL params, fetches CSV if needed

**CSV Caching**:
```js
// sessionStorage keys:
neurole_neuro_csv_cache    // actual CSV text
neurole_neuro_csv_time     // fetch timestamp

// Cache valid if: Date.now() - cached_time < 600000 (10 min)
```

**Question Structure**:
```js
{
  image_url: "path/to/brain-region.jpg",
  choice_a: "Amygdala",
  choice_b: "Hippocampus", 
  choice_c: "Thalamus",
  choice_d: "Cerebellum",
  correct_choice: "B",
  function_text: "Memory formation and spatial navigation...",
  category: "Deep Nuclei",
  difficulty: "Medium"
}
```

**Score Tracking**:
```js
// Best score per configuration
localStorage["neurole_neuro_best_{category}_{difficulty}_{count}"] = correctCount

// Aggregate stats
localStorage["neurole_neuro_stats"] = { 
  rounds: total_rounds_played,
  totalPct: sum_of_percentages 
}

// Streak (3+ correct rounds)
localStorage["neurole_neuro_streak"] = {
  count: current_streak,
  lastWonDate: "2026-08-17",
  "2026-08-17": 1,   // rounds won on this date
  "2026-08-16": 3
}
```

### Game Content

**Builtin Fallback** (5 questions, if sheet unavailable):
- Always playable; guarantees no blank screen
- Used when sheet URL is misconfigured or unreachable

**External Sheet Format** (user customizable):
- Any number of questions
- Headers: `image_url`, `choice_a/b/c/d`, `correct_choice`, `function_text`, `category`, `difficulty`
- Field names are case-insensitive + punctuation-forgiving

**Categories**:
- Random (all questions)
- Cortex (lobes, motor/sensory areas)
- Gyri (folds and ridges)
- Neuropsychology (frontal/temporal function)
- Custom (user-defined in sheet)

**Difficulty Levels**:
- Easy, Medium, Hard, All

---

## 3. PERFORMANCE BOTTLENECKS

### 🔴 CRITICAL ISSUES

#### 1. CSV Cache Invalidation Bug
**Location**: `NeuroanatomyPage.jsx:73-129`, `DailyGamePage.jsx:63-120`

**Problem**:
- Cache TTL is 10 minutes (hardcoded)
- If user keeps browser open >10 min, stale data is used silently
- No user feedback that data might be outdated

**Impact**: 
- Student plays with outdated questions if sheet was updated
- Streaks/stats may be wrong if cached after page edit

**Fix**:
```js
// Add freshness check
const age = Date.now() - cachedTime;
if (age > CACHE_TTL) {
  console.warn("Cache stale, refreshing in background...");
  fetchNewData().catch(() => console.log("Network error, using stale"));
}
```

---

#### 2. Neuroanatomy Re-entrancy Bug
**Location**: `NeuroanatomyPage.jsx:73-129` vs. `NeuroanatomyPlayPage.jsx:72-122`

**Problem**:
- `NeuroanatomyPage` has NO re-entrancy guard on `loadBank()`
- `NeuroanatomyPlayPage` has `bankLoadingRef` guard ✓
- React StrictMode (dev) double-invokes effects
- Result: Two simultaneous CSV fetches in dev mode

**Impact**:
- Dev environment: wasted network + double parsing
- Prod: not affected (single invocation), but inconsistent code

**Fix**:
```js
// Add to NeuroanatomyPage
const bankLoadingRef = useRef(false);  // Move out of state!

const loadBank = useCallback(async () => {
  if (bankLoadingRef.current) return;  // Prevent re-entry
  bankLoadingRef.current = true;
  // ... fetch logic ...
}, []);
```

---

#### 3. Image Loading Blocking
**Location**: `NeuroanatomyPage.jsx:150`, `NeuroanatomyPlayPage.jsx:xxx`

**Problem**:
- Question cards display images without error handling
- If `image_url` is broken, card shows broken image icon
- No fallback color/placeholder
- Lazy loading not implemented

**Impact**:
- Broken image URLs break UI flow
- Users see empty cards, think question didn't load
- No telemetry on which images fail

**Fix**:
```jsx
<img 
  src={getQuestionImageUrl(current)}
  loading="lazy"
  onError={(e) => e.target.src = "/placeholder-brain.jpg"}
  alt="Question visual"
/>
```

---

### 🟠 HIGH PERFORMANCE ISSUES

#### 4. Filter Scan on Every Render
**Location**: `NeuroanatomyPage.jsx:131-146`, `NeuroanatomyPlayPage.jsx:123-138`

**Problem**:
```js
const getFilteredBank = useCallback(() => {
  let bank = fullBank;  // ← Can be 100+ items
  if (selectedCategory !== 'Random') {
    bank = bank.filter(row => {  // ← O(n) scan
      const cat = findField(row, 'category').toLowerCase();
      return cat === selectedCategory.toLowerCase();
    });
  }
  if (selectedDifficulty !== 'all') {
    bank = bank.filter(row => {  // ← Another O(n) scan
      const diff = findField(row, 'difficulty').toLowerCase();
      return diff === selectedDifficulty.toLowerCase();
    });
  }
  return bank;
}, [fullBank, selectedCategory, selectedDifficulty]);
```

**Issue**: 
- Called on every render with filter state changes
- `findField()` is O(k) where k = object size
- Overall: O(n × k × 2) per render

**Impact**:
- Changing category/difficulty on 500-question sheet = visible lag
- Every state update re-scans entire bank

**Fix**: Use `useMemo()`
```js
const filteredBank = useMemo(() => {
  // ... same logic, but cached until dependencies change
}, [fullBank, selectedCategory, selectedDifficulty]);
```

---

#### 5. No Pagination
**Location**: All game pages

**Problem**:
- Fallback: 5 questions loaded into state
- External sheets: often 50-200 questions
- All questions parsed + stored in memory at once

**Impact**:
- Initial load slower (parsing time)
- Memory usage O(n × question_size)
- No scroll-based lazy loading

**Fix**:
```js
// Load 10 at a time
const [questions, setQuestions] = useState([]);
const [pageNum, setPageNum] = useState(0);

useEffect(() => {
  const start = pageNum * BATCH_SIZE;
  const batch = fullBank.slice(start, start + BATCH_SIZE);
  setQuestions(q => [...q, ...batch]);
}, [pageNum]);
```

---

#### 6. AI API Sequential Fallback
**Location**: `helpers.js:164-199` (`askNeuroleAIRaw`)

**Problem**:
```js
for (const model of models) {  // Tries: llama-3.1, llama-3.3, gemma2
  try {
    const res = await fetch(...);  // 30-60s timeout each
    if (res.ok && answer) return answer;
    if (res.status === 401) break;
  } catch (e) { console.warn(...); }
}
```

**Issue**:
- 3 models tried sequentially
- Network error on first → waits 30-60s, tries second, etc.
- Total latency: 2-3 min before returning null

**Impact**:
- User waits forever for AI tutor to respond
- Frustrating for slow/offline networks

**Fix**:
```js
const promises = models.map(model => 
  fetchWithTimeout(model, 15000)  // 15s each
);
const firstOk = await Promise.race(promises);
```

---

### 🟡 MEDIUM ISSUES

#### 7. BrainViewer Mesh Traversal Every Style Change
**Location**: `BrainViewer.jsx:128-208` (`applyStyle` function)

**Problem**:
```js
function applyStyle(stageIndex, mode, hl, cut) {
  // ... calculate effects ...
  for (const mesh of meshes) {  // 437 iterations!
    // Update every mesh's:
    // - opacity, color, scale, emissive, draw order, visibility
    // Done on EVERY stage/mode toggle
  }
}
```

**Issue**:
- Called every time user toggles between Surface/Translucent
- or every time Alzheimer's stage changes
- All 437 meshes traversed + re-styled

**Impact**:
- Dragging Brain Lab slider jank
- Could be 16-66ms per update (437 × 4 property writes)

**Fix**:
```js
// Cache commonly used combinations
const styleCache = new Map();
function getStyle(stage, mode, hl, cut) {
  const key = `${stage}-${mode}-${!!hl}-${cut}`;
  if (styleCache.has(key)) return styleCache.get(key);
  // compute and cache
}
```

---

#### 8. ResizeObserver Not Throttled
**Location**: `BrainViewer.jsx:367-383`

**Problem**:
```js
handleResize = () => {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  camera.aspect = cw / ch;
  camera.updateProjectionMatrix();
  renderer.setSize(cw, ch);
  // ... more work ...
}
window.addEventListener('resize', handleResize);
observer = new ResizeObserver(handleResize);
observer.observe(container);
```

**Issue**:
- ResizeObserver is debounced, but not triple-checked
- Runs on EVERY actual resize event
- Fast window drag = many recalculations

**Impact**:
- Potential frame drops during window resize
- ~50-100ms per resize calculation

**Fix**:
```js
let resizeTimeout;
handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // ... expensive calculations ...
  }, 300);
};
```

---

#### 9. No Error Boundary for BrainViewer
**Location**: `BrainViewerLazy.jsx`

**Problem**:
```js
<Suspense fallback={<Placeholder />}>
  <BrainViewer {...props} ref={ref} />
</Suspense>
```

**Issue**:
- Only handles loading state
- No error boundary
- If WebGL fails or GLB is corrupted, whole component crashes
- Fallback just says "could not load" with no retry

**Impact**:
- Brain Lab completely broken for affected users
- No telemetry on which browsers fail

**Fix**:
```jsx
<ErrorBoundary fallback={
  <div>
    Brain viewer failed to load. 
    <button onClick={retry}>Retry</button>
  </div>
}>
  <Suspense fallback={<Placeholder />}>
    <BrainViewer {...props} ref={ref} />
  </Suspense>
</ErrorBoundary>
```

---

## 4. BRAIN VIEWER & 3D RENDERING DEEP DIVE

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     BrainViewerLazy (Lazy Component)         │
│                    [Suspense + Code Splitting]               │
└────────────────────────────────┬─────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────┐
│                  BrainViewer (React Component)               │
│                  [Three.js + requestAnimationFrame]          │
└────────────────────────────────┬─────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────┐
│            brainModelCache (Module Singleton)                │
│                                                              │
│  loadBrainTemplate() ──→ [Parse GLB once per page load]     │
│  instantiateBrain() ──→ [Clone for each viewer]             │
│  cameraVectorFor() ──→ [Camera presets in anatomical axes]  │
└──────────────────────────────────────────────────────────────┘
                                 ↓
                    ┌─────────────────────────┐
                    │   brain.glb (4.65 MB)  │
                    │  437 Draco-compressed   │
                    │  meshes (filtered to:   │
                    │  cortex, cerebellum,   │
                    │  brainstem, deep grey, │
                    │  white matter)         │
                    └─────────────────────────┘
```

### Pipeline: GLB Loading

**1. First Load** (`loadBrainTemplate()`):
```js
const loader = new GLTFLoader();
const draco = new DRACOLoader();
loader.setDRACOLoader(draco);

const gltf = await loader.loadAsync('/brain.glb');  // ← 4.65 MB
draco.dispose();  // ← Free worker pool (not needed after parse)

// Filter: keep only showable categories
const keep = [];
gltf.scene.traverse(child => {
  const cat = child.userData.bx_cat;
  if (SHOW_CATS.has(cat)) keep.push(child);  // ← Categories to render
  else { child.geometry?.dispose(); child.removeFromParent(); }
});

// Derive anatomical axes from geometry
const axes = deriveAxes(entries);  // ← Right, front, up vectors

// Flatten all meshes to centered group
const brain = new THREE.Group();
brain.attach(...all_meshes);  // ← Preserves world transforms

return { group: brain, maxDim, axes, meshCount: 437 };
```

**Cached result reused**: templatePromise stored module-level ✓

**2. Subsequent Viewers** (`instantiateBrain(template)`):
```js
const group = template.group.clone(true);  // ← Shallow clone (shared geometry)

// Clone materials per mesh (not shared!)
group.traverse(child => {
  if (!child.isMesh) return;
  const src = child.material;
  const mat = src.clone();  // ← Each mesh gets own material
  mat.emissive?.setScalar(0);  // ← Fix: GLB shipped emissive [1,1,1]
  child.material = mat;
  ownedMaterials.push(mat);
});

return { group, meshes, ownedMaterials };
```

**Key insight**: Geometry is shared (reference), materials are cloned per viewer.
- Disposing a viewer's materials is safe
- Disposing a viewer's geometry would break all other viewers ❌

### Axis Derivation (Clever!)

**Why it's needed**:
- three.js GLTFLoader sanitizes mesh names via PropertyBinding
- `Hippocampus.r` → `Hippocampusr` (separator deleted)
- Can't rely on naming convention; must derive from geometry

**How it works**:
```js
// Find genuine left/right pairs
const stems = new Map();
for (const mesh of entries) {
  const name = mesh.name.toLowerCase();
  if (name.endsWith('l') || name.endsWith('r')) {
    const stem = name.slice(0, -1);
    stems.set(stem, { l: [...], r: [...] });
  }
}

// Right axis: from left hemisphere center to right hemisphere center
const leftCentroid = centroidOf(stems.get('l'));
const rightCentroid = centroidOf(stems.get('r'));
const rightAxis = rightCentroid.sub(leftCentroid).normalize();

// Front axis: from occipital to frontal
const frontalCentroid = centroidOf(entries.filter(e => e.region.includes('Frontal')));
const occipitalCentroid = centroidOf(entries.filter(e => e.region.includes('Occipital')));
let frontAxis = frontalCentroid.sub(occipitalCentroid).normalize();
frontAxis.addScaledVector(rightAxis, -frontAxis.dot(rightAxis));  // ← Orthogonalize

// Up axis: cross product
let upAxis = new THREE.Vector3().crossVectors(frontAxis, rightAxis).normalize();

// Sign check: cortex should be above brainstem
const cortexCentroid = centroidOf(entries.filter(e => e.cat === 'cortex'));
const brainstemCentroid = centroidOf(entries.filter(e => e.cat === 'brainstem'));
if (upAxis.dot(cortexCentroid.sub(brainstemCentroid)) < 0) upAxis.negate();

return { right: rightAxis, up: upAxis, front: frontAxis, derived: true };
```

**Result**: Anatomically correct axes, auto-derived from model geometry ✓

### Styling System (applyStyle)

**Input**:
- `stage` (0-3): Alzheimer's atrophy progression
- `mode` ('surface' | 'translucent'): Render mode
- `hl` (highlight): Structures to emphasize (null for whole brain)
- `cut` ('l' | 'r' | null): Hemisphere to hide

**Output**: Per-mesh updates (opacity, color, emissive, scale, side, order)

**Data**: `STAGE_ATROPHY` array
```js
[
  { frontal: 0, temporal: 0, ..., ventricle: 0 },      // Stage 0 (healthy)
  { frontal: 0, temporal: 0.55, ..., ventricle: 0.15 }, // Stage 1
  { frontal: 0.50, temporal: 0.80, ..., ventricle: 0.40 }, // Stage 2
  { frontal: 0.80, temporal: 0.95, ..., ventricle: 0.75 }, // Stage 3
]
```
- Follows Braak staging: entorhinal/temporal → limbic → frontal

**Per-mesh logic**:
```js
const groupName = groupFor(mesh.cat, mesh.region);  // e.g., 'temporal', 'brainstem'
const dimFactor = STAGE_ATROPHY[stage][groupName];  // 0-1

// Render class: 'shell' (cortex), 'core' (deep), 'wm' (white matter), 'ventricles'
const renderClass = renderClassFor(mesh.cat);

// In surface mode: only shell visible
// In translucent mode: core + ventricles become visible

// Color interpolation
const color = CORTEX.clone().lerp(CORTEX_LOST, dim);  // ← Desaturate as atrophies
const scale = 1 - dim * CORTEX_SHRINK;  // ← Shrink ~20% at full atrophy

// Position: shrink about mesh's own center (pivot), not brain center
mesh.position = basePos + pivot * (1 - scale);
mesh.scale = baseScale * scale;
```

**Transparency handling**:
```js
// Toggling transparency requires shader recompilation
const wasTransparent = mat.transparent;
mat.transparent = (opacity < 1 || forceTransparent);
if (wasTransparent !== mat.transparent) mat.needsUpdate = true;  // ← Only rebuild if changed!
```

**Article figure mode** (highlight set):
```js
// Highlighted structures: opaque, saturated, emissive, high draw order
if (isHighlighted(mesh, hl)) {
  opacity = 1;
  color = HIGHLIGHT;
  emissive = 0.42;
  order = 10;
}
// Everything else: ghost silhouette
else {
  opacity = 0.1;
  color = GHOST;
  side = THREE.BackSide;  // ← Only back faces to avoid wall effect
  depthWrite = false;     // ← Ghost doesn't occlude
}
```

### Rendering Loop

**Initialization** (`boot()`):
```js
// WebGL context
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));  // ← Cap at 2x
renderer.toneMapping = THREE.ACESFilmicToneMapping;     // ← Realistic lighting

// Camera (35° FOV, tight near/far plane)
camera = new THREE.PerspectiveCamera(35, w/h, 0.01, 100);

// Lighting: soft + diffuse
scene.add(new THREE.HemisphereLight(0xfff2ee, 0x2a2230, 0.75));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(1, 1.4, 1.2);
scene.add(key);
// ... fill light ...

// Controls: orbit with damping
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotateSpeed = 0.8;
```

**Frame loop**:
```js
const animateFrame = () => {
  if (destroyed) return;
  controls.update();           // ← Apply damping
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animateFrame);
};
animateFrame();
```

**Cleanup** (on unmount):
```js
cancelAnimationFrame(frameId);
for (const m of ownedMaterials) m?.dispose();  // ← Viewer's materials
// Do NOT dispose renderer.domElement, scene, geometry (shared template!)
renderer.dispose();
renderer.domElement.remove();
```

### Performance Profile

| Metric | Value | Notes |
|--------|-------|-------|
| GLB size | 4.65 MB | Draco-compressed |
| Parse time | 500-2000 ms | Depends on device CPU |
| Mesh count | 437 | Filtered (no arteries/veins) |
| Materials per viewer | ~437 clones | Shared geometry, owned materials |
| Frame rate | 60 FPS | Estimated (437 meshes, simple lighting) |
| Memory per viewer | ~10-20 MB | GLB + THREE.js context |

**Bottlenecks**:
1. First load: 500-2000ms to parse GLB
2. Stage/mode toggle: ~50-100ms (437 mesh updates + potential shader recompile)
3. Resize: ~50-100ms (aspect + camera + renderer update)
4. No frustum culling (all meshes in view always)

---

## 5. SUMMARY OF ALL PERFORMANCE ISSUES

### Priority Matrix

| Severity | Issue | Location | Type | Impact |
|----------|-------|----------|------|--------|
| 🔴 Critical | CSV cache invalidation | Daily/Neuro pages | Logic | Stale data used silently |
| 🔴 Critical | Re-entrancy bug (NeuroanatomyPage) | NeuroanatomyPage | Consistency | Dev double-fetch |
| 🔴 Critical | Image loading blocking | Neuro pages | UX | Broken images block cards |
| 🟠 High | Filter scan O(n) every render | Neuro pages | Perf | Lag on 100+ questions |
| 🟠 High | No pagination | All game pages | Memory | Load all questions upfront |
| 🟠 High | AI API sequential fallback | helpers.js | Perf | 2-3 min timeout on network error |
| 🟡 Medium | Mesh traversal every style | BrainViewer | Perf | Slider drag jank |
| 🟡 Medium | ResizeObserver not throttled | BrainViewer | Perf | Fast resize lag |
| 🟡 Medium | No error boundary | BrainViewerLazy | Reliability | Crashes on WebGL fail |

---

## 6. DATA STRUCTURES & FORMATS

### CSV Question Format

**Google Sheet Columns** (case-insensitive, punctuation-forgiving):
```
| image_url | choice_a | choice_b | choice_c | choice_d | correct_choice | function_text | category | difficulty |
|-----------|----------|----------|----------|----------|-----------------|----------------|----------|-----------|
| /path.jpg | Option 1 | Option 2 | Option 3 | Option 4 | A/B/C/D        | Explanation   | Category | Easy/Med  |
```

**Parsing**:
```js
const rows = parseCSV(csvText);  // O(n)
const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
const questions = rows.slice(1).map(row => {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i].trim());
  return obj;
});
```

**Retrieval**:
```js
findField(q, 'image_url')      // Searches with normalization
findField(q, 'function_text')  // Returns first matching key
```

### Region Mapping System

**Problem**: 
- Model has 437 meshes with anatomical names (e.g., "Hippocampusr")
- Writers use colloquial names (e.g., "basal ganglia", "memory circuit")

**Solution**: Three-layer resolution

1. **Normalization** (`peel()` function):
```js
function peel(raw) {
  const tokens = String(raw)
    .toLowerCase()
    .replace(/[*'']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ');

  let side = null;
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (/^\d+$/.test(last)) { tokens.pop(); continue; }
    if (last === 'l' || last === 'r') { side = last; tokens.pop(); continue; }
    break;
  }

  return { base: tokens.join(' '), side };
}
```

2. **Region Definition** (brainRegions.js):
```js
{
  label: 'Basal ganglia',           // Display name
  meshes: [
    'Caudate nucleus',
    'Putamen',
    'Globus pallidus external',
    'Globus pallidus internal',
    'Subthalamic nucleus',
    'Substantia nigra',
    'Nucleus accumbens'
  ],
  also: ['striatum and pallidum'],  // Aliases
  note: 'The model labels the amygdala by its four nuclear groups...'
}
```

3. **Matching** (`meshMatchesAny()`):
```js
function meshMatchesAny(meshName, prefixes) {
  // meshName: 'Caudate nucleus' (from model)
  // prefixes: ['Caudate nucleus'] (from region definition)
  
  for (const p of prefixes) {
    if (meshName === p) return true;
    // Prefix match + trailing noise (laterality/index)
    if (meshName.startsWith(p) && /^[lr\d ]{0,6}$/.test(meshName.slice(p.length))) {
      return true;
    }
  }
  return false;
}
```

**Result**: User writes "basal ganglia" → resolves to 7 meshes ✓

### Streak & Score Tracking

**Daily Streak**:
```js
// localStorage key: neurole_neuro_streak
{
  count: 5,                  // Current streak
  lastWonDate: "2026-08-17", // Last winning date
  "2026-08-17": 2,          // Rounds won on this date
  "2026-08-16": 1,
  "2026-08-15": 3
}

// Logic: If today's date ≠ lastWonDate and today ≠ yesterday, streak breaks
```

**Best Score** (per category/difficulty/count):
```js
localStorage["neurole_neuro_best_Random_all_10"] = 9  // 9/10 correct
localStorage["neurole_neuro_best_Cortex_Easy_5"] = 5  // 5/5 perfect
```

**Aggregate Stats**:
```js
localStorage["neurole_neuro_stats"] = {
  rounds: 42,
  totalPct: 3456  // Sum of all round %s
  // Average: 3456 / 42 = 82%
}
```

### Synapse Date Format

**Storage Key**: `neurole_synapse_${dateKey}`

**Date Key Format**: `M-D-YYYY` (e.g., `8-17-2026` not `08-17-2026`)
- Not zero-padded
- Matches Google Sheet's Date column
- Allows byte-compatible migration from static site

**Stored Data**:
```js
{
  won: true,      // Did player win?
  mistakes: 2     // How many wrong groups guessed?
}
```

---

## 7. RECOMMENDATIONS & QUICK WINS

### Immediate Fixes (1-2 hours)

1. **Add useMemo to filtering** (Neuroanatomy pages)
   ```js
   const filteredBank = useMemo(() => {
     // ... getFilteredBank logic ...
   }, [fullBank, selectedCategory, selectedDifficulty]);
   ```
   Impact: Eliminates O(n) filter scans on render

2. **Add re-entrancy guard to NeuroanatomyPage**
   ```js
   const bankLoadingRef = useRef(false);
   // Same pattern as NeuroanatomyPlayPage
   ```
   Impact: Prevents double-fetch in React StrictMode dev

3. **Add image error handling**
   ```jsx
   <img onError={(e) => e.target.src = '/placeholder.jpg'} ... />
   ```
   Impact: Broken images no longer block card display

4. **Throttle BrainViewer resize**
   ```js
   handleResize = debounce(() => { /* expensive work */ }, 300);
   ```
   Impact: Smoother window resize performance

---

### Short-term Improvements (1-2 days)

5. **Implement cache versioning**
   - Add config version hash to cache key
   - Auto-invalidate when config.js changes
   - Prevents stale data bugs

6. **Add Promise.race() to AI API**
   - Try 3 models in parallel (not sequential)
   - 15s timeout per model
   - Reduces fallback latency from 2-3min to 15-45s

7. **Add error boundary for BrainViewer**
   ```jsx
   <ErrorBoundary>
     <Suspense fallback={...}>
       <BrainViewer ... />
     </Suspense>
   </ErrorBoundary>
   ```
   Impact: Graceful degradation on WebGL failure

8. **Add Sentry error tracking**
   - Captures CSV fetch failures
   - Tracks which browsers fail BrainViewer
   - Telemetry on broken image URLs

---

### Medium-term Optimization (1-2 weeks)

9. **Paginate Neuroanatomy questions**
   - Load 10 at a time
   - Lazy-load on scroll or "next round"
   - Reduces initial parse time

10. **Cache applyStyle results**
    - Common (stage, mode) combos pre-computed
    - Skip meshes that don't change
    - Brain Lab slider drag becomes smooth

11. **Unify state management**
    - Consider Zustand for cross-page state (streaks, stats)
    - Eliminates localStorage async/try-catch scattered throughout

12. **Add quiz analytics**
    - Per-question difficulty distribution
    - Student misconceptions tracking
    - Used for content iteration

---

## Files Reference

### Core Pages
- `neurole-react/src/pages/NeuroanatomyPage.jsx` — Quiz setup screen
- `neurole-react/src/pages/NeuroanatomyPlayPage.jsx` — Quiz play screen
- `neurole-react/src/pages/DailyGamePage.jsx` — Daily Case setup
- `neurole-react/src/pages/DailyGamePlayPage.jsx` — Daily Case play
- `neurole-react/src/pages/BrainLabPage.jsx` — 3D explorer
- `neurole-react/src/pages/SynapsePage.jsx` — Synapse puzzle

### Components
- `neurole-react/src/components/BrainViewer.jsx` — Three.js renderer
- `neurole-react/src/components/BrainViewerLazy.jsx` — Lazy wrapper

### Libraries
- `neurole-react/src/lib/brainModelCache.js` — GLB parsing & caching
- `neurole-react/src/data/brainRegions.js` — Region definitions (50+)
- `neurole-react/src/utils/helpers.js` — CSV, AI, streak utilities
- `neurole-react/src/utils/synapse.js` — Synapse puzzle logic
- `neurole-react/src/games-data.js` — Game metadata & fallback data

### Configuration
- `neurole-react/src/config.js` — API keys, sheet URLs

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                         │
│  entry: main.jsx                                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────────┐
        │       App.jsx (Router)           │
        │  - /daily-game                   │
        │  - /neuroanatomy                 │
        │  - /interactive/brain-lab        │
        │  - /synapse                      │
        └──────────────────┬───────────────┘
                          ↓
           ┌──────────────────────────────┐
           │  Game Pages (5 routes)       │
           │  + Lazy Components           │
           └──────┬───────────┬───────┬──┘
                  ↓           ↓       ↓
            ┌─────────┐ ┌────────┐ ┌──────────┐
            │ Neurole │ │ Brain  │ │ Synapse  │
            │ AI API  │ │ Model  │ │  Sheets  │
            │ (Groq)  │ │ Cache  │ │  (CSV)   │
            └─────────┘ └────────┘ └──────────┘
```

---

**Document generated**: August 17, 2026
**Last updated**: Codebase reviewed in full
**Status**: Ready for optimization sprint
