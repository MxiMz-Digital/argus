/**
 * argus.config.js — @mximz/argus configuration
 *
 * Copy this file to your project root as `argus.config.js`.
 * All fields are optional — omit any you don't need to override.
 *
 * Generate this file automatically: npx @mximz/argus init
 */

/** @type {import('@mximz/argus').Config} */
module.exports = {

  // ── Directory structure ────────────────────────────────────────────────────
  // Where your platform sites live (relative to project root)
  sitesDir: 'sites',

  // Where your shared packages live (types, utils, ui)
  packagesDir: 'packages',

  // ── Component registry ────────────────────────────────────────────────────
  // Components that render <h1> internally.
  // Pages using these are not flagged for SEO2:missing-h1.
  h1Components: ['PageHero', 'SiteHero', 'HeroSection', 'PageHeader'],

  // Components that handle the LCP <Image> internally with priority={true}.
  // Pages using these are not flagged for PF1:hero-missing-priority.
  heroComponents: ['PageHero', 'SiteHero', 'HeroSection', 'PageHeader'],

  // ── Design token pattern ──────────────────────────────────────────────────
  // What counts as "using a design token" rather than hardcoding a value.
  // Matches CSS custom property syntax: var(--token-name)
  tokenPattern: 'var(--',

  // ── Prototype patterns ────────────────────────────────────────────────────
  // Files matching these glob patterns have CH1 (hardcoded colours) and PF2
  // (static inline styles) downgraded from errors to warnings.
  // Developers can hardcode values during active prototyping without the
  // gatekeeper blocking their commit. Full enforcement still runs in CI.
  prototypePatterns: [
    // '**/prototype/**',
    // '**/*.prototype.tsx',
    // '**/__sandbox__/**',
  ],

  // ── Core Web Vitals thresholds (ms / unitless) ────────────────────────────
  // Google tightened LCP to 2.0s in 2026. INP is now an equal ranking signal.
  // Update these values if Google revises the thresholds.
  cwv: {
    lcp: { good: 2000, poor: 4000 },  // Largest Contentful Paint (ms)
    inp: { good: 200,  poor: 500  },  // Interaction to Next Paint (ms)
    cls: { good: 0.1,  poor: 0.25 },  // Cumulative Layout Shift (unitless)
  },

  // ── Rule overrides ────────────────────────────────────────────────────────
  // true    = error  — blocks the commit
  // 'warn'  = warning — reported but does not block
  // false   = disabled — check is skipped entirely
  //
  // Omit any rule to keep the default severity.
  rules: {
    // Example overrides:
    // 'S5:unpinned-dependency':  true,   // promote to error in your project
    // 'CH3:dead-css':            false,  // disable if you use dynamic class names extensively
    // 'PF3:heavy-event-handler': false,  // disable if flagging too many false positives
  },

}
