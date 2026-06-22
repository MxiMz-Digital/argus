'use strict'

const path                               = require('path')
const { resetCache, getFilesScanned }    = require('./walker')
const { isIgnored }                      = require('./suppression')
const { checkSecurity }                  = require('./checks/security')
const { checkSpeed }                     = require('./checks/speed')
const { checkSEO }                       = require('./checks/seo')
const { checkEfficiency }                = require('./checks/efficiency')
const { checkPerformance }               = require('./checks/performance')
const { checkCodeHealth, checkCodeHealthDeep } = require('./checks/code-health')

// ─── Staged-file helpers ──────────────────────────────────────────────────────

function getStagedFiles(root) {
  try {
    const { execSync } = require('child_process')
    const out = execSync('git diff --staged --name-only', { cwd: root, encoding: 'utf8' })
    return out.trim().split('\n').filter(Boolean).map(f => path.join(root, f))
  } catch {
    return []
  }
}

function getAffectedSites(stagedFiles, sites) {
  if (!stagedFiles.length) return sites
  const affected = sites.filter(s => stagedFiles.some(f => f.startsWith(s.root)))
  return affected.length > 0 ? affected : sites
}

// ─── Flagger factory ──────────────────────────────────────────────────────────
//
// Creates the flag() function passed to every check.
// Handles: suppression · rule on/off/warn · prototype pattern downgrade

function createFlagger(violations, config) {
  return function flag(dimension, rule, filePath, lineNumber, detail) {
    if (isIgnored(filePath, lineNumber)) return

    const ruleSetting = config.rules[rule]
    if (ruleSetting === false || ruleSetting === undefined) return

    let severity = ruleSetting === 'warn' ? 'warn' : 'error'

    // Downgrade to warn for prototype files — developers can hardcode during
    // active feature prototyping without the gatekeeper blocking their commit.
    if (severity === 'error' && config._matchesPrototype(filePath)) {
      severity = 'warn'
    }

    violations.push({
      dimension,
      rule,
      file:     path.relative(config._root, filePath),
      line:     lineNumber,
      detail,
      severity,
    })
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function run(config, options = {}) {
  const { staged = false, deep = false } = options

  resetCache()

  const stagedFiles = staged ? getStagedFiles(config._root) : []
  const sites       = staged ? getAffectedSites(stagedFiles, config._sites) : config._sites

  const violations = []
  const flag       = createFlagger(violations, config)

  const ctx = { root: config._root, sites, config, flag, stagedFiles }

  checkSecurity(ctx)
  checkSpeed(ctx)
  checkSEO(ctx)
  checkEfficiency(ctx)
  checkPerformance(ctx)
  checkCodeHealth(ctx)
  if (deep) checkCodeHealthDeep(ctx)

  const errors   = violations.filter(v => v.severity === 'error')
  const warnings = violations.filter(v => v.severity === 'warn')

  return {
    passed:     errors.length === 0,
    violations,
    errors,
    warnings,
    meta: {
      filesScanned: getFilesScanned(),
      sites:        sites.map(s => s.name),
      staged,
      deep,
      timestamp:    new Date().toISOString(),
    },
  }
}

module.exports = { run }
