import pageStyle from './styles/ArticlePage.css?raw'
import { usePageStyle } from '../hooks/usePageStyle'
import { useDocumentHead } from '../hooks/useDocumentHead';
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listArticles } from '../lib/articles'

export default function ArticlesIndexPage() {
  usePageStyle(pageStyle)
  useDocumentHead({
    title: "Articles — Neurole",
    description: "Long-form writing on how the brain works, with interactive 3D figures you can open on any structure mentioned in the text.",
    canonical: "/articles",
  });
  const articles = listArticles()

  useEffect(() => {
    const previous = document.title
    document.title = 'Articles — Neurole'
    return () => { document.title = previous }
  }, [])

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Home
        </Link>
        <h1>Articles</h1>
        <p>Neuroscience explained, with the anatomy you can turn around in your hands.</p>
      </div></div>

      <main className="article-main wrap">
        {articles.length === 0 ? (
          <p className="article-dek">
            No articles yet. Add a <code>.md</code> file to{' '}
            <code>src/content/articles/</code> and it appears here automatically.
          </p>
        ) : (
          <ul className="article-list">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link to={`/articles/${a.slug}`}>
                  <h2>{a.title}{a.draft && <span className="article-draft">Draft</span>}</h2>
                  {a.dek && <p>{a.dek}</p>}
                  <div className="article-meta">
                    {a.author && <span>By {a.author}</span>}
                    {a.date && <span>{a.date}</span>}
                    {a.readingTime && <span>{a.readingTime}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
