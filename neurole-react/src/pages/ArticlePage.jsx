import pageStyle from './styles/ArticlePage.css?raw'
import { usePageStyle } from '../hooks/usePageStyle'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getArticle } from '../lib/articles'
import { parseInline } from '../lib/articleFormat'
import BrainModal from '../components/BrainModal'

export default function ArticlePage() {
  usePageStyle(pageStyle)
  const { slug } = useParams()
  const article = getArticle(slug)
  const [figure, setFigure] = useState(null)

  // The app has no per-route <title> anywhere else; articles at least set
  // their own, since they are the pages most likely to be linked and shared.
  // Runs before the missing-article early return so hook order stays stable
  // across both branches.
  useEffect(() => {
    if (!article) return
    const previous = document.title
    document.title = `${article.title} — Neurole`
    return () => { document.title = previous }
  }, [article])

  if (!article) {
    return (
      <main className="article-main wrap">
        <h1>Article not found</h1>
        <p className="article-dek">
          No article matches “{slug}”. <Link to="/articles">See all articles →</Link>
        </p>
      </main>
    )
  }

  return (
    <>
      <div className="page-hero"><div className="wrap">
        <Link className="back-home" to="/articles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Articles
        </Link>
        <h1>{article.title}</h1>
        {article.dek && <p>{article.dek}</p>}
      </div></div>

      <main className="article-main wrap">
        <div className="article-meta">
          {article.author && <span>By {article.author}</span>}
          {article.date && <span>{formatDate(article.date)}</span>}
          {article.readingTime && <span>{article.readingTime}</span>}
          {article.draft && <span className="article-draft">Draft — not published</span>}
        </div>

        <article className="article-body">
          {article.blocks.map((block, i) => renderBlock(block, i, setFigure))}
        </article>

        <p className="article-foot">
          Educational use only — not medical advice.
        </p>
      </main>

      {figure && <BrainModal figure={figure} onClose={() => setFigure(null)} />}
    </>
  )
}

function renderBlock(block, i, openFigure) {
  const key = `b${i}`

  switch (block.type) {
    case 'h':
      return <Heading key={key} level={block.level} text={block.text} />

    case 'p':
      return <p key={key}>{parseInline(block.text, key)}</p>

    case 'quote':
      return <blockquote key={key}>{parseInline(block.text, key)}</blockquote>

    case 'hr':
      return <hr key={key} />

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag key={key}>
          {block.items.map((item, j) => (
            <li key={`${key}-${j}`}>{parseInline(item, `${key}-${j}`)}</li>
          ))}
        </Tag>
      )
    }

    case 'brain': {
      const label = block.button || `View ${block.title || block.regions.join(' and ')} in 3D`
      return (
        <p className="article-figure" key={key}>
          <button type="button" className="article-brain-btn" onClick={() => openFigure(block)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 2 3 3 0 0 0 3-2 3 3 0 0 0 2-5 3 3 0 0 0-2-5 3 3 0 0 0-3-3Z" />
              <path d="M12 4v15" />
            </svg>
            {label}
          </button>
        </p>
      )
    }

    default:
      return null
  }
}

function Heading({ level, text }) {
  const Tag = `h${Math.min(4, Math.max(2, level))}`
  return <Tag>{text}</Tag>
}

function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
