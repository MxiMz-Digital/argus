'use strict'

const fs   = require('fs')
const path = require('path')
const { walk, readFile, readLines } = require('../walker')

function checkSEO(ctx) {
  const { sites, config, flag } = ctx
  const h1Components = config.h1Components || []

  for (const site of sites) {
    _checkMetadata(site, flag)
    _checkH1(site, h1Components, flag)
    _checkImageAlt(site, flag)
    _checkNativeImg(site, flag)
  }
}

// SEO1 — Every route must have metadata.
// Client Components ('use client') cannot export metadata — the check
// falls back to a layout.tsx in the same directory. (auth) route group
// layouts require robots: { index: false } to keep auth pages out of search.
function _checkMetadata(site, flag) {
  const pages = walk(path.join(site.root, 'app'), ['.tsx'])
    .filter(f => path.basename(f) === 'page.tsx')

  for (const file of pages) {
    const content = readFile(file)
    if (/^\s*['"]use client['"]/.test(content)) continue

    const hasMetadata = /generateMetadata|export\s+const\s+metadata\b/.test(content)
    if (!hasMetadata) {
      const layoutFile    = path.join(path.dirname(file), 'layout.tsx')
      const layoutContent = fs.existsSync(layoutFile) ? readFile(layoutFile) : ''
      if (!/generateMetadata|export\s+const\s+metadata\b/.test(layoutContent)) {
        flag('SEO', 'SEO1:missing-metadata', file, 1,
          'No generateMetadata() or metadata export — every public page needs a unique title + description for search indexing')
      }
    }
  }

  // (auth) route group layouts must opt auth pages out of indexing
  for (const layoutFile of walk(path.join(site.root, 'app'), ['.tsx']).filter(f => path.basename(f) === 'layout.tsx')) {
    if (!path.dirname(layoutFile).includes('(auth)')) continue
    const content = readFile(layoutFile)
    if (!/generateMetadata|export\s+const\s+metadata\b/.test(content)) {
      flag('SEO', 'SEO1:missing-auth-metadata', layoutFile, 1,
        '(auth) route group layout missing metadata — add robots: { index: false, follow: false } to prevent auth pages being indexed')
    }
  }
}

// SEO2 — Exactly one <h1> per page.
// h1Components: known shared components that render <h1> internally.
// Pages using one of these are not flagged for a missing h1.
function _checkH1(site, h1Components, flag) {
  const pages = walk(path.join(site.root, 'app'), ['.tsx'])
    .filter(f => path.basename(f) === 'page.tsx')

  for (const file of pages) {
    const content = readFile(file)
    const count   = (content.match(/<h1[\s>]/g) || []).length

    if (count > 1) {
      flag('SEO', 'SEO2:multiple-h1', file, 1,
        `${count} <h1> elements in one page — only one primary heading per page (multiple h1s confuse search engines)`)
    }
    if (count === 0) {
      const hasH1Component = h1Components.some(c => content.includes(c))
      if (!hasH1Component) {
        flag('SEO', 'SEO2:missing-h1', file, 1,
          `No <h1> and no recognised h1-bearing component (${h1Components.join(', ')}) — every page needs one primary heading`)
      }
    }
  }
}

// SEO3 — <Image> must have a meaningful alt prop.
// Empty alt (alt="") is valid for decorative images — those should be
// wrapped in aria-hidden="true" containers and suppressed with argus-ignore.
function _checkImageAlt(site, flag) {
  for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
    const lines = readLines(file)
    lines.forEach((line, i) => {
      if (!/<Image\b/.test(line)) return
      if (/^\s*(?:\{?\s*\/\*|\/\/)/.test(line)) return

      const window = lines.slice(i, i + 10).join(' ')
      if (!/\balt=/.test(window)) {
        flag('SEO', 'SEO3:image-no-alt', file, i + 1,
          '<Image> missing alt prop — describe what the image shows; decorative images use alt="" inside aria-hidden container')
      } else if (/\balt=["'`]["'`]/.test(window) || /\balt=["'`]image["'`]/i.test(window)) {
        flag('SEO', 'SEO3:image-empty-alt', file, i + 1,
          'alt="" or alt="image" — write a meaningful description; empty alt defeats screen readers and degrades page quality signals')
      }
    })
  }
}

// SEO4 — Native <img> instead of Next.js <Image>.
// Next.js <Image> provides automatic WebP/AVIF conversion, lazy loading,
// responsive srcset, and prevents layout shift — all ranking factors.
function _checkNativeImg(site, flag) {
  for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
    readLines(file).forEach((line, i) => {
      const trimmed = line.trim()
      if (/(?:^|[^a-zA-Z<])<img\s/.test(line) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        flag('SEO', 'SEO4:native-img-tag', file, i + 1,
          '<img> tag — replace with Next.js <Image> for automatic WebP/AVIF · lazy loading · responsive srcset · layout-shift prevention')
      }
    })
  }
}

module.exports = { checkSEO }
