'use strict'

const path = require('path')
const { walk, readFile, readLines } = require('../walker')

function checkPerformance(ctx) {
  const { sites, config, flag } = ctx
  const heroComponents = config.heroComponents || []

  _checkHeroMissingPriority(sites, heroComponents, flag)
  _checkStaticInlineStyle(sites, flag)
  _checkHeavyEventHandler(sites, flag)
}

// PF1 — First <Image> on a page should carry the priority prop (LCP candidate).
// Google tightened LCP to 2.0s in 2026 (was 2.5s). Unprioritised hero images
// are the most common cause of failing LCP scores.
//
// heroComponents: pages using these are excluded — the component handles
// priority internally. Any <Image> on those pages is a secondary image.
function _checkHeroMissingPriority(sites, heroComponents, flag) {
  for (const site of sites) {
    const pages = walk(path.join(site.root, 'app'), ['.tsx'])
      .filter(f => path.basename(f) === 'page.tsx')

    for (const file of pages) {
      const content = readFile(file)
      if (heroComponents.some(c => content.includes(c))) continue

      const lines    = readLines(file)
      let   firstImg = -1
      for (let i = 0; i < lines.length; i++) {
        if (/<Image\b/.test(lines[i])) { firstImg = i; break }
      }
      if (firstImg === -1) continue

      const block = lines.slice(firstImg, firstImg + 10).join(' ')
      if (!/\bpriority\b/.test(block)) {
        flag('Performance', 'PF1:hero-missing-priority', file, firstImg + 1,
          'First <Image> missing priority prop — the LCP image must load eagerly; Google tightened the LCP threshold to 2.0s in 2026')
      }
    }
  }
}

// PF2 — Static string literals in inline style={{}} must move to a CSS class.
//
// Allowed:
//   style={{ color: accentColor }}              — unquoted variable ref ✓
//   style={{ stroke: 'var(--token)' }}          — CSS custom property ✓
//   style={{ '--section-accent': color }}       — CSS var assignment ✓
//   style={{ color: SEVERITY_META.green.color }}— object property ref ✓
//
// Flagged:
//   style={{ color: 'red' }}                    — quoted literal ✗
//   style={{ fontSize: '14px' }}               — quoted literal ✗
//   style={{ objectFit: 'cover' }}             — quoted literal ✗
//
// Detection: flag only when inline style contains a quoted non-token string.
const INLINE_STYLE_RE  = /style=\{\{([^}]+)\}\}/
const HAS_TOKEN        = /var\(--/
const HAS_QUOTED_VALUE = /:\s*['"][^'"]*['"]/

function _checkStaticInlineStyle(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
      readLines(file).forEach((line, i) => {
        const match = INLINE_STYLE_RE.exec(line)
        if (!match) return
        if (HAS_TOKEN.test(line)) return
        if (!HAS_QUOTED_VALUE.test(match[1])) return
        flag('Performance', 'PF2:static-inline-style', file, i + 1,
          'Quoted literal in inline style={{}} — move to a CSS module class using a design token (inline styles defeat browser stylesheet caching)')
      })
    }
  }
}

// PF3 — Heavy synchronous operations inside event handlers (INP heuristic).
// INP (Interaction to Next Paint) became an equal Google ranking signal in March 2026.
// 43% of sites fail the 200ms threshold. Heavy synchronous work on the main thread
// is the primary cause.
//
// This is a static heuristic — flags loops (for/while/forEach) and sort/filter chains
// inside onClick/onChange/onSubmit handlers as candidates for async refactoring.
// Warning only — cannot measure actual duration statically.
const EVENT_HANDLER_RE = /\bon(?:Click|Change|Submit|KeyDown|KeyUp|KeyPress|MouseMove|Scroll)\s*=\s*\{/
const HEAVY_OP_RE      = /\b(?:for|while|\.forEach|\.map|\.filter|\.reduce|\.sort|\.find)\b/

function _checkHeavyEventHandler(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
      const lines = readLines(file)
      lines.forEach((line, i) => {
        if (!EVENT_HANDLER_RE.test(line)) return
        // Look ahead 15 lines for heavy operations within the handler body
        const handlerBlock = lines.slice(i, i + 15).join('\n')
        if (HEAVY_OP_RE.test(handlerBlock)) {
          flag('Performance', 'PF3:heavy-event-handler', file, i + 1,
            'Potential heavy synchronous operation inside event handler — move to useMemo/useCallback or a Web Worker to protect INP (Google threshold: 200ms)')
        }
      })
    }
  }
}

module.exports = { checkPerformance }
