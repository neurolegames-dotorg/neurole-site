import { useEffect } from 'react';

// The static site gives every page its own <title>, description, canonical and
// Open Graph tags. An SPA serves one index.html for every route, so without
// this hook every page shares the homepage's metadata: search results and
// link previews for /about, /donate and every article all read "Free
// Neuroscience Games…".
//
// Usage — one call at the top of a page component:
//
//   useDocumentHead({
//     title: 'About Neurole — Free Neuroscience Education Platform',
//     description: 'Neurole is a free, volunteer-built…',
//     canonical: 'https://neurole.org/about',
//   });
//
// Fields left out keep whatever index.html declared. Nothing is torn down on
// unmount: the next route overwrites it, and a half-cleared head between
// routes is worse than a stale one.
//
// Note this only helps clients that run JavaScript. Crawlers that read the
// raw HTML — most social scrapers — still see index.html's defaults. Fixing
// that needs prerendering at build time, which is a separate job.

const SITE = 'https://neurole.org';

function setMeta(selector, attr, name, content) {
  if (!content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useDocumentHead({ title, description, canonical, image } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta('meta[name="description"]', 'name', 'description', description);

    if (canonical) {
      const href = canonical.startsWith('http') ? canonical : SITE + canonical;
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      setMeta('meta[property="og:url"]', 'property', 'og:url', href);
    }

    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    if (image) {
      const src = image.startsWith('http') ? image : SITE + image;
      setMeta('meta[property="og:image"]', 'property', 'og:image', src);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', src);
    }
  }, [title, description, canonical, image]);
}

export default useDocumentHead;
