import { createElement as h, Fragment } from 'react'

/* =====================================================================
   NEUROLE — ARTICLE FORMAT

   Parses the Markdown files in src/content/articles/ into blocks the
   article page can render. Deliberately a SMALL, fixed subset of
   Markdown rather than a full parser: everything it accepts is listed
   below, so a writer can learn it in a minute and a developer can debug
   it by reading this one file.

   Output is React elements, never HTML strings — nothing an article
   contains can inject markup into the page.

   SUPPORTED
     ---            frontmatter block at the very top (title, dek, …)
     ## / ###       headings
     plain lines    paragraphs (blank line separates)
     - or *         bullet list
     1.             numbered list
     >              pull quote
     ---            horizontal rule (after the frontmatter)
     **bold**  *italic*  `code`  [text](https://url)

     {{brain: ...}} a button that opens the 3D brain popup — see below
   ===================================================================== */

/* ---------------------------------------------------------------------
   THE BRAIN DIRECTIVE

   Put this on its own line anywhere in the article body:

     {{brain: hippocampus, fornix | title=The memory circuit | camera=medial}}

   Everything after `brain:` and before the first `|` is a comma-separated
   list of region names — the vocabulary lives in src/data/brainRegions.js.
   Everything after that is optional `key=value`, separated by `|`:

     title    heading shown inside the popup       (default: the region names)
     button   the button's label in the article    (default: "View <title> in 3D")
     caption  one line under the model             (default: none)
     camera   default | right | left | medial | anterior | posterior |
              superior | inferior | oblique        (default: default)
     cutaway  left | right — hides that hemisphere so you can see the
              midline. Pairs well with camera=medial.
     spin     yes | no — slow turntable            (default: yes)

   Unknown region names do not fail the build; the page renders a visible
   warning next to the button so the mistake is obvious while writing.
   ------------------------------------------------------------------ */
const BRAIN_RE = /^\{\{\s*brain\s*:\s*([\s\S]+?)\}\}$/i

function parseBrainDirective(line) {
  const m = line.trim().match(BRAIN_RE)
  if (!m) return null

  const [regionPart, ...optionParts] = m[1].split('|')
  const regions = regionPart.split(',').map((s) => s.trim()).filter(Boolean)

  const opts = {}
  for (const part of optionParts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim().toLowerCase()
    const value = part.slice(eq + 1).trim()
    if (key) opts[key] = value
  }

  const cutRaw = (opts.cutaway || '').toLowerCase()
  const cutaway = cutRaw.startsWith('l') ? 'l' : cutRaw.startsWith('r') ? 'r' : null

  return {
    type: 'brain',
    regions,
    title: opts.title || '',
    button: opts.button || '',
    caption: opts.caption || '',
    camera: (opts.camera || 'default').toLowerCase(),
    cutaway,
    // Any explicit "no"/"false"/"off" turns the turntable off; default is on.
    spin: !/^(no|false|off|0)$/i.test(opts.spin || ''),
  }
}

/* ---------------------------------------------------------------------
   FRONTMATTER
   ------------------------------------------------------------------ */
function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  if (!text.startsWith('---')) return { meta: {}, body: text }

  const end = text.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: text }

  const block = text.slice(3, end)
  const body = text.slice(end + 4).replace(/^\n/, '')
  const meta = {}
  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim().toLowerCase()
    let value = trimmed.slice(colon + 1).trim()
    // Quotes are optional; strip them so `title: "A: B"` behaves.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) value = value.slice(1, -1)
    if (key) meta[key] = value
  }
  return { meta, body }
}

/* ---------------------------------------------------------------------
   INLINE FORMATTING
   Scans left to right for the first of the four patterns, emits the text
   before it, then recurses on the remainder. Returns React nodes.
   ------------------------------------------------------------------ */
const INLINE_RE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/

function parseInline(text, keyPrefix = 'i') {
  const nodes = []
  let rest = String(text)
  let i = 0

  while (rest) {
    const m = rest.match(INLINE_RE)
    if (!m) { nodes.push(rest); break }

    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    const key = `${keyPrefix}-${i++}`

    if (m[1]) nodes.push(h('strong', { key }, m[2]))
    else if (m[3]) nodes.push(h('em', { key }, m[4]))
    else if (m[5]) nodes.push(h('code', { key }, m[6]))
    else if (m[7]) {
      const href = m[9]
      // Only http(s), mail and in-site links — never javascript: or data:.
      const safe = /^(https?:|mailto:|\/|#)/i.test(href)
      nodes.push(
        safe
          ? h('a', {
              key, href,
              ...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
            }, m[8])
          : m[8]
      )
    }

    rest = rest.slice(m.index + m[0].length)
  }

  return nodes.length === 1 ? nodes[0] : h(Fragment, null, ...nodes)
}

/* ---------------------------------------------------------------------
   BLOCK PARSER
   ------------------------------------------------------------------ */
function parseBody(body) {
  const lines = body.split('\n')
  const blocks = []
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'p', text: paragraph.join(' ').trim() })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push(list)
    list = null
  }
  const flushAll = () => { flushParagraph(); flushList() }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) { flushAll(); continue }

    const brain = parseBrainDirective(line)
    if (brain) { flushAll(); blocks.push(brain); continue }

    if (/^(-{3,}|_{3,})$/.test(line)) { flushAll(); blocks.push({ type: 'hr' }); continue }

    const heading = line.match(/^(#{2,4})\s+(.*)$/)
    if (heading) {
      flushAll()
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2].trim() })
      continue
    }

    if (line.startsWith('>')) {
      flushAll()
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') })
      continue
    }

    const bullet = line.match(/^[-*]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = !!numbered
      if (!list || list.ordered !== ordered) { flushList(); list = { type: 'list', ordered, items: [] } }
      list.items.push((bullet || numbered)[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushAll()
  return blocks
}

/**
 * Parses one raw article file.
 * `slug` comes from the filename, so an article is added by dropping in a
 * file — there is no index to keep in sync.
 */
export function parseArticle(raw, slug) {
  const { meta, body } = parseFrontmatter(raw)
  const blocks = parseBody(body)
  return {
    slug,
    title: meta.title || slug,
    dek: meta.dek || meta.description || '',
    author: meta.author || '',
    date: meta.date || '',
    readingTime: meta.readingtime || estimateReadingTime(body),
    draft: /^(yes|true|1)$/i.test(meta.draft || ''),
    meta,
    blocks,
  }
}

function estimateReadingTime(body) {
  const words = body.replace(/\{\{[\s\S]*?\}\}/g, ' ').split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 220))} min read`
}

export { parseInline }
