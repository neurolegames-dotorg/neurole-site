import { parseArticle } from './articleFormat'

/* =====================================================================
   ARTICLE REGISTRY

   Every .md file in src/content/articles/ becomes an article at
   /articles/<filename>. There is NO index to maintain — dropping a file
   in that folder publishes it, deleting it unpublishes it.

   Articles are bundled at build time rather than fetched at runtime, so
   the text is in the page for search engines and the article still reads
   if the network drops mid-session.
   ===================================================================== */

const files = import.meta.glob('../content/articles/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function slugFromPath(path) {
  return path.split('/').pop().replace(/\.md$/i, '')
}

const ALL = Object.entries(files)
  .map(([path, raw]) => parseArticle(raw, slugFromPath(path)))
  // Files starting with `_` are templates/examples, never published.
  .filter((a) => !a.slug.startsWith('_'))
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title))

/** Published articles, newest first. Drafts are hidden in production only,
 *  so `draft: yes` still previews on a local dev server. */
export function listArticles() {
  return import.meta.env.PROD ? ALL.filter((a) => !a.draft) : ALL
}

export function getArticle(slug) {
  return ALL.find((a) => a.slug === slug) || null
}
