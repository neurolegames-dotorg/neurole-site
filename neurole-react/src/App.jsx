import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import DonatePage from './pages/DonatePage';
import VolunteerPage from './pages/VolunteerPage';
import InteractivePage from './pages/InteractivePage';
import BrainLabPage from './pages/BrainLabPage';
import ArchivePage from './pages/ArchivePage';
import DailyGamePage from './pages/DailyGamePage';
import DailyGamePlayPage from './pages/DailyGamePlayPage';
import NeuroanatomyPage from './pages/NeuroanatomyPage';
import NeuroanatomyPlayPage from './pages/NeuroanatomyPlayPage';
import ArticlesIndexPage from './pages/ArticlesIndexPage';
import ArticlePage from './pages/ArticlePage';
import SynapsePage from './pages/SynapsePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/volunteer" element={<VolunteerPage />} />
        <Route path="/interactive" element={<InteractivePage />} />
        <Route path="/interactive/brain-lab" element={<BrainLabPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/daily-game" element={<DailyGamePage />} />
        <Route path="/daily-game-play" element={<DailyGamePlayPage />} />
        <Route path="/neuroanatomy" element={<NeuroanatomyPage />} />
        <Route path="/neuroanatomy-play" element={<NeuroanatomyPlayPage />} />
        <Route path="/synapse" element={<SynapsePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/articles" element={<ArticlesIndexPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
export default App;
