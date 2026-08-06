import pageStyle from './styles/NotFoundPage.css?raw';
import { usePageStyle } from '../hooks/usePageStyle';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Mirrors the static site's 404.html. Without a catch-all route react-router
// matches nothing and renders header + footer around an empty page, keeping
// whatever title the previous route set — so a mistyped URL looked like the
// site was broken rather than like a missing page.
export default function NotFoundPage() {
  usePageStyle(pageStyle);
  useDocumentHead({
    title: 'Page not found — Neurole',
    description: "That page doesn't exist. Play the Daily Case or Map the Brain instead.",
  });

  // useDocumentHead deliberately never tears its tags down, but robots has to
  // be undone: leaving noindex behind would suppress the next route the
  // visitor navigates to. Hence the local effect with a cleanup.
  useEffect(() => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    el.setAttribute('content', 'noindex, follow');
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  return (
    <main className="wrap nf-main">
      <p className="nf-code">Error 404</p>
      <h1>That page doesn't exist</h1>
      <p className="nf-lede">The link may be out of date, or the page may have moved. The games are all still here.</p>
      <div className="nf-links">
        <Link to="/">Home</Link>
        <Link to="/daily-game">The Daily Case</Link>
        <Link to="/neuroanatomy">Map the Brain</Link>
        <Link to="/synapse">Synapse</Link>
      </div>
    </main>
  );
}
