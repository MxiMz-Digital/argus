'use strict'

const fs   = require('fs')
const path = require('path')
const { walk, readFile, readLines } = require('../walker')

function checkCodeHealth(ctx) {
  const { sites, config, flag } = ctx
  const pkgDir = config._pkgDir

  _checkHardcodedCSSValues(sites, pkgDir, flag)
  _checkSVGPresentationAttributes(sites, flag)
  _checkDeadCSS(sites, flag)
}

// CH4 is deep-mode only — called from runner when --deep is passed
function checkCodeHealthDeep(ctx) {
  const { sites, flag } = ctx
  _checkNoAnyType(sites, flag)
}

// ── CH1: Hardcoded values in CSS module files ─────────────────────────────────
//
// Design token violations — values that should reference var(--token) instead.
// Two tiers:
//   A) Direct colour/typography properties
//   B) Shorthand properties with embedded colour values
//
// Skips: tokens.css · CSS custom property definitions (--foo: ...) · comments ·
//        keyframe selectors · exempt keywords

const DIRECT_COLOUR_PROPS = new Set([
  'color', 'background-color', 'border-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline-color', 'caret-color', 'text-decoration-color', 'column-rule-color',
  'accent-color', 'fill', 'stroke',
])

const SHORTHAND_COLOUR_PROPS = new Set([
  'background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'outline', 'box-shadow', 'text-shadow', 'list-style',
])

const COLOUR_VALUE_RE    = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsl[a]?\s*\(/
const FONT_SIZE_PX_RE    = /:\s*\d+(\.\d+)?px\b/
const FONT_FAMILY_STR_RE = /:\s*['"][^'"]+['"]/
const FONT_WEIGHT_NUM_RE = /:\s*[1-9]\d{2}\b/

const EXEMPT_KEYWORDS = new Set([
  'none', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'currentcolor', 'currentColor', 'transparent', '0', '0px', 'normal',
  'bold', 'auto', 'medium',
])

function _checkHardcodedCSSValues(sites, pkgDir, flag) {
  const cssScopes = [
    ...sites.flatMap(s => walk(path.join(s.root, 'app'), ['.module.css'])),
    ...walk(path.join(pkgDir, 'ui'), ['.css']).filter(f => !f.endsWith('tokens.css')),
  ]

  for (const file of cssScopes) {
    readLines(file).forEach((line, i) => {
      const t = line.trim()
      if (!t || /^\/\*/.test(t) || /^\*/.test(t) || /^--/.test(t)) return
      if (/^\d+%\s*\{/.test(t) || /^from\b/.test(t) || /^to\b/.test(t)) return

      const colonIdx = t.indexOf(':')
      if (colonIdx === -1) return
      const prop  = t.slice(0, colonIdx).trim().toLowerCase()
      const value = t.slice(colonIdx + 1).replace(/;.*$/, '').trim()

      if (value.startsWith('var(--')) return
      if (EXEMPT_KEYWORDS.has(value.toLowerCase())) return

      if (DIRECT_COLOUR_PROPS.has(prop) && COLOUR_VALUE_RE.test(value)) {
        flag('Code Health', 'CH1:hardcode-colour', file, i + 1,
          `Hardcoded colour on '${prop}' — replace with var(--token)  ·  ${t.slice(0, 68)}`)
      }
      if (SHORTHAND_COLOUR_PROPS.has(prop) && COLOUR_VALUE_RE.test(value)) {
        flag('Code Health', 'CH1:hardcode-colour-shorthand', file, i + 1,
          `Hardcoded colour in '${prop}' shorthand — extract to var(--token)  ·  ${t.slice(0, 60)}`)
      }
      if (prop === 'font-size' && FONT_SIZE_PX_RE.test(line) && !/\b0px\b/.test(value)) {
        flag('Code Health', 'CH1:hardcode-font-size', file, i + 1,
          `Hardcoded font-size in px — replace with var(--font-size-*)  ·  ${t.slice(0, 68)}`)
      }
      if (prop === 'font-family' && FONT_FAMILY_STR_RE.test(value)) {
        flag('Code Health', 'CH1:hardcode-font-family', file, i + 1,
          `Hardcoded font-family string — replace with var(--font-*)  ·  ${t.slice(0, 68)}`)
      }
      if (prop === 'font-weight' && FONT_WEIGHT_NUM_RE.test(value)) {
        flag('Code Health', 'CH1:hardcode-font-weight', file, i + 1,
          `Hardcoded font-weight number — replace with var(--font-weight-*)  ·  ${t.slice(0, 68)}`)
      }
    })
  }
}

// ── CH2: SVG presentation attributes with hardcoded values ────────────────────
//
// SVG presentation attributes bypass CSS cascading — they must use
// style={{ prop: 'var(--token)' }} to respect the design system.
// Structural value fill="none" is the only accepted exception.

const SVG_EXEMPT    = /^(none|transparent|currentColor|inherit|initial|unset)$/i
const HTML_COLOURS  = /^(white|black|red|blue|green|yellow|orange|purple|gray|grey|pink|brown|navy|teal|gold|silver|maroon|lime|aqua|cyan|fuchsia|magenta|olive|coral|salmon|crimson|indigo|violet)$/i

function _checkSVGPresentationAttributes(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
      readLines(file).forEach((line, i) => {
        const strokeMatch = line.match(/\bstroke=["']([^"']+)["']/)
        if (strokeMatch && !SVG_EXEMPT.test(strokeMatch[1])) {
          flag('Code Health', 'CH2:svg-stroke-hardcode', file, i + 1,
            `SVG stroke="${strokeMatch[1]}" hardcoded — use style={{ stroke: 'var(--token)' }} so it respects the design system`)
        }

        const fillMatch = line.match(/\bfill=["']([^"']+)["']/)
        if (fillMatch && !SVG_EXEMPT.test(fillMatch[1])) {
          flag('Code Health', 'CH2:svg-fill-hardcode', file, i + 1,
            `SVG fill="${fillMatch[1]}" hardcoded — use style={{ fill: 'var(--token)' }}  (fill="none" is the only exempt value)`)
        }

        const namedFill = line.match(/\bfill=["']([\w]+)["']/)
        if (namedFill && HTML_COLOURS.test(namedFill[1])) {
          flag('Code Health', 'CH2:svg-named-colour', file, i + 1,
            `SVG fill="${namedFill[1]}" is a named HTML colour — use style={{ fill: 'var(--token)' }}`)
        }
        const namedStroke = line.match(/\bstroke=["']([\w]+)["']/)
        if (namedStroke && HTML_COLOURS.test(namedStroke[1])) {
          flag('Code Health', 'CH2:svg-named-colour', file, i + 1,
            `SVG stroke="${namedStroke[1]}" is a named HTML colour — use style={{ stroke: 'var(--token)' }}`)
        }

        if (/\bfontFamily=["']/.test(line)) {
          flag('Code Health', 'CH2:svg-fontfamily-hardcode', file, i + 1,
            "SVG fontFamily= prop hardcoded — use style={{ fontFamily: 'var(--font-*)' }}")
        }
      })
    }
  }
}

// ── CH3: Dead CSS — classes defined in a CSS module but never referenced ──────
//
// Search strategy:
//   1. TSX/TS files in the same directory as the CSS module
//   2. TSX/TS files in the parent directory (catches layouts importing components)
//
// Detects: styles.className · styles['className'] · styles["className"]
//
// Limitation: dynamic access (styles[`variant-${x}`], clsx) not detected.
// Use argus-ignore on false positives.

function _checkDeadCSS(sites, flag) {
  for (const site of sites) {
    for (const cssFile of walk(path.join(site.root, 'app'), ['.module.css'])) {
      const dir       = path.dirname(cssFile)
      const parentDir = path.dirname(dir)

      const collectTsx = (d) => {
        if (!fs.existsSync(d)) return []
        return fs.readdirSync(d)
          .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
          .map(f => path.join(d, f))
      }

      const tsxFiles   = [...new Set([...collectTsx(dir), ...collectTsx(parentDir)])]
      if (tsxFiles.length === 0) continue

      const tsxContent = tsxFiles.map(readFile).join('\n')

      readLines(cssFile).forEach((line, i) => {
        const match = line.match(/^\s*\.([a-zA-Z][a-zA-Z0-9_-]*)/)
        if (!match) return
        const cls  = match[1]
        const used = tsxContent.includes(`styles.${cls}`) ||
                     tsxContent.includes(`styles['${cls}']`) ||
                     tsxContent.includes(`styles["${cls}"]`)
        if (!used) {
          flag('Code Health', 'CH3:dead-css', cssFile, i + 1,
            `.${cls} defined but never referenced in TSX — delete it or check for dynamic usage (use argus-ignore if intentional)`)
        }
      })
    }
  }
}

// ── CH4: No TypeScript 'any' type (deep mode only) ────────────────────────────
//
// 'any' defeats TypeScript's type safety entirely. Common in Supabase query
// return types when column constants are not used.
// Note: flags 'any' in type positions — not in string literals or comments.

const ANY_TYPE_RE  = /(?::\s*any\b|as\s+any\b|<any>|Array<any>|Promise<any>|Record<[^,]+,\s*any>)/
const COMMENT_RE   = /^\s*(?:\/\/|\/\*|\*)/

function _checkNoAnyType(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.ts', '.tsx'])) {
      readLines(file).forEach((line, i) => {
        if (COMMENT_RE.test(line)) return
        if (ANY_TYPE_RE.test(line)) {
          flag('Code Health', 'CH4:no-any-type', file, i + 1,
            "'any' type defeats TypeScript — use a specific type from packages/types, or 'unknown' with a type guard")
        }
      })
    }
  }
}

module.exports = { checkCodeHealth, checkCodeHealthDeep }
