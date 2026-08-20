import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import RouteErrorBoundary from './components/RouteErrorBoundary';
// The landing page ships in the first bundle: it is what most visitors ask for,
// and lazy-loading it would only add a second round trip before anything paints.
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Every other page is a separate chunk, fetched when its route is first
// visited. Each one carries its own stylesheet as a raw string and the game
// pages are large, so bundling all nineteen together made the homepage pay for
// the neuroanatomy quiz, the archive and both game engines before it painted.
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DonatePage = lazy(() => import('./pages/DonatePage'));
const VolunteerPage = lazy(() => import('./pages/VolunteerPage'));
const InteractivePage = lazy(() => import('./pages/InteractivePage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const DailyGamePage = lazy(() => import('./pages/DailyGamePage'));
const DailyGamePlayPage = lazy(() => import('./pages/DailyGamePlayPage'));
const NeuroanatomyPage = lazy(() => import('./pages/NeuroanatomyPage'));
const NeuroanatomyPlayPage = lazy(() => import('./pages/NeuroanatomyPlayPage'));
const ArticlesIndexPage = lazy(() => import('./pages/ArticlesIndexPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const SynapsePage = lazy(() => import('./pages/SynapsePage'));
const SynapseArchivePage = lazy(() => import('./pages/SynapseArchivePage'));
const ImposterPage = lazy(() => import('./pages/ImposterPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

// Deliberately blank rather than a spinner. The masthead and footer are already
// on screen from Layout, chunks are small and same-origin, and a flashing
// placeholder between two rendered frames reads as a glitch rather than as
// progress. A page that genuinely takes time shows its own loading state.
const PageFallback = () => null;

// One Suspense boundary shared by every lazy route, rather than one per route,
// wrapped in an error boundary so a chunk that fails to arrive shows a page
// with a way out instead of unmounting the site to a blank screen.
const LazyPages = () => {
  const location = useLocation();
  return (
    <RouteErrorBoundary routeKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </RouteErrorBoundary>
  );
};

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route element={<LazyPages />}>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/volunteer" element={<VolunteerPage />} />
          <Route path="/interactive" element={<InteractivePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/daily-game" element={<DailyGamePage />} />
          <Route path="/daily-game-play" element={<DailyGamePlayPage />} />
          <Route path="/neuroanatomy" element={<NeuroanatomyPage />} />
          <Route path="/neuroanatomy-play" element={<NeuroanatomyPlayPage />} />
          <Route path="/synapse" element={<SynapsePage />} />
          <Route path="/synapse/archive" element={<SynapseArchivePage />} />
          {/* Imposter has no homepage card any more — Reva removed that section —
              but the route stays so the page is not orphaned mid-refinement. */}
          <Route path="/imposter" element={<ImposterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/articles" element={<ArticlesIndexPage />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
