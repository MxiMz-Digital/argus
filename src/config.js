'use strict'

const fs   = require('fs')
const path = require('path')

// ─── Core Web Vitals 2026 thresholds (Google, updated March 2026) ─────────────
// LCP tightened to 2.0s. INP promoted to equal ranking signal.
const CWV_2026 = {
  lcp: { good: 2000, poor: 4000 },
  inp: { good: 200,  poor: 500  },
  cls: { good: 0.1,  poor: 0.25 },
}

// ─── Default configuration ────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  // Directory structure
  sitesDir:     'sites',
  packagesDir:  'packages',

  // Components that render <h1> internally — pages using these aren't flagged
  // for a missing h1 (the component owns the heading hierarchy).
  h1Components: ['PageHero', 'SiteHero', 'HeroSection', 'PageHeader'],

  // Components that handle the LCP <Image> internally with priority={true}.
  // Pages using these aren't flagged for PF1 (the component owns LCP).
  heroComponents: ['PageHero', 'SiteHero', 'HeroSection', 'PageHeader'],

  // What constitutes a design token reference vs a hardcoded value.
  // Matches CSS custom property syntax: var(--token-name)
  tokenPattern: 'var(--',

  // Files matching these glob patterns have CH1/PF2 downgraded from 'error'
  // to 'warn' — prototypes can use hardcoded values without blocking commits.
  // Example: ['**/prototype/**', '**/*.prototype.tsx', '**/__sandbox__/**']
  prototypePatterns: [],

  // Core Web Vitals thresholds (ms / unitless). Update here when Google revises.
  cwv: CWV_2026,

  // Rule severity: true = error (blocks commit), 'warn' = warning only, false = disabled.
  rules: {
    // ── Security (OWASP Top 10:2025 mapped) ──────────────────────────────────
    'S1:no-select-star':          true,   // A01 Broken Access Control
    'S2:build-client-in-gsp':     true,   // A02 Security Misconfiguration
    'S3:no-uuid-in-urls':         true,   // A01 Broken Access Control
    'S4:public-prefix-on-secret': true,   // A02 Security Misconfiguration
    'S5:unpinned-dependency':     'warn', // A03 Supply Chain Failures

    // ── Speed ─────────────────────────────────────────────────────────────────
    'SP1:missing-revalidate':        true,
    'SP2:use-client-with-revalidate': 'warn',

    // ── SEO ───────────────────────────────────────────────────────────────────
    'SEO1:missing-metadata':    true,
    'SEO1:missing-auth-metadata': true,
    'SEO2:missing-h1':          true,
    'SEO2:multiple-h1':         true,
    'SEO3:image-no-alt':        true,
    'SEO3:image-empty-alt':     true,
    'SEO4:native-img-tag':      true,

    // ── Efficiency ────────────────────────────────────────────────────────────
    'EF1:console-log':       true,
    'EF2:unresolved-debt':   'warn',

    // ── Performance ───────────────────────────────────────────────────────────
    'PF1:hero-missing-priority': true,
    'PF2:static-inline-style':   true,
    'PF3:heavy-event-handler':   'warn',  // INP heuristic — warning only

    // ── Code Health ───────────────────────────────────────────────────────────
    'CH1:hardcode-colour':          true,
    'CH1:hardcode-colour-shorthand': true,
    'CH1:hardcode-font-size':       true,
    'CH1:hardcode-font-family':     true,
    'CH1:hardcode-font-weight':     true,
    'CH2:svg-stroke-hardcode':      true,
    'CH2:svg-fill-hardcode':        true,
    'CH2:svg-named-colour':         true,
    'CH2:svg-fontfamily-hardcode':  true,
    'CH3:dead-css':                 'warn', // warn by default — dynamic class refs cause false positives
    'CH4:no-any-type':              'warn', // deep-mode check
  },
}

// ─── Glob → RegExp (no dependencies) ─────────────────────────────────────────

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g,   '[^/]*')
    .replace(/\x00/g, '.*')
    .replace(/\?/g,   '[^/]')
  return new RegExp(escaped)
}

function matchesPrototype(filePath, patterns) {
  return patterns.some(p => globToRegex(p).test(filePath))
}

// ─── Config loader ────────────────────────────────────────────────────────────

function loadConfig(root, configPath) {
  const projectRoot = root || process.cwd()
  const cfgFile = configPath
    ? path.resolve(configPath)
    : path.join(projectRoot, 'argus.config.js')

  let userConfig = {}
  if (fs.existsSync(cfgFile)) {
    try {
      userConfig = require(cfgFile)
    } catch (err) {
      throw new Error(`Failed to load argus.config.js: ${err.message}`)
    }
  }

  // Deep-merge rules (user overrides default, doesn't replace the whole object)
  const mergedRules = Object.assign({}, DEFAULT_CONFIG.rules, userConfig.rules || {})
  const mergedCwv   = Object.assign({}, DEFAULT_CONFIG.cwv,   userConfig.cwv   || {})

  const config = Object.assign({}, DEFAULT_CONFIG, userConfig, {
    rules: mergedRules,
    cwv:   mergedCwv,
  })

  // Resolve directories relative to project root
  config._root   = projectRoot
  config._sites  = discoverSites(projectRoot, config.sitesDir)
  config._pkgDir = path.join(projectRoot, config.packagesDir)

  config._matchesPrototype = (filePath) =>
    config.prototypePatterns.length > 0 && matchesPrototype(filePath, config.prototypePatterns)

  return config
}

function discoverSites(root, sitesDir) {
  const dir = path.join(root, sitesDir)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({ name: d.name, root: path.join(dir, d.name) }))
}

module.exports = { loadConfig, DEFAULT_CONFIG, CWV_2026 }
