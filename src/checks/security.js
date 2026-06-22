'use strict'

const fs   = require('fs')
const path = require('path')
const { walk, readFile, readLines } = require('../walker')

// ─── OWASP Top 10:2025 references ────────────────────────────────────────────
const OWASP = {
  A01: 'OWASP A01:2025 Broken Access Control',
  A02: 'OWASP A02:2025 Security Misconfiguration',
  A03: 'OWASP A03:2025 Software Supply Chain Failures',
}

function checkSecurity(ctx) {
  const { sites, config, flag } = ctx
  const pkgDir = config._pkgDir

  _checkNoSelectStar(sites, pkgDir, flag)
  _checkBuildClientInGSP(sites, flag)
  _checkNoUUIDInUrls(sites, flag)
  _checkPublicPrefixOnSecret(sites, flag)
  _checkUnpinnedDependency(ctx, flag)
}

// S1 — No select('*') — OWASP A01
function _checkNoSelectStar(sites, pkgDir, flag) {
  const scope = [
    ...walk(path.join(pkgDir, 'utils'), ['.ts']),
    ...sites.flatMap(s => walk(path.join(s.root, 'app'), ['.ts', '.tsx'])),
  ]
  const RE = /\.select\(\s*['"`]\*['"`]\s*\)/
  for (const file of scope) {
    readLines(file).forEach((line, i) => {
      if (RE.test(line)) {
        flag('Security', 'S1:no-select-star', file, i + 1,
          `select('*') exposes all columns — use explicit column constants from packages/types  ·  ${OWASP.A01}`)
      }
    })
  }
}

// S2 — createClient() must not co-exist with generateStaticParams — OWASP A02
// createClient() calls cookies() which throws at build time.
// createBuildClient() is the correct alternative.
function _checkBuildClientInGSP(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.ts', '.tsx'])) {
      const content = readFile(file)
      if (!content.includes('generateStaticParams')) continue
      if (!/\bcreateClient\s*\(\s*\)/.test(content)) continue
      if (/createBuildClient/.test(content)) continue
      readLines(file).forEach((line, i) => {
        const trimmed = line.trim()
        if (/\bcreateClient\s*\(\s*\)/.test(line) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          flag('Security', 'S2:build-client-in-gsp', file, i + 1,
            `createClient() alongside generateStaticParams — cookies() fails at build time; use createBuildClient()  ·  ${OWASP.A02}`)
        }
      })
    }
  }
}

// S3 — No UUID in public-facing href attributes — OWASP A01
const UUID_RE = /href=["'`][^"'`]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[^"'`]*["'`]/i
function _checkNoUUIDInUrls(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.tsx'])) {
      readLines(file).forEach((line, i) => {
        if (UUID_RE.test(line)) {
          flag('Security', 'S3:no-uuid-in-urls', file, i + 1,
            `UUID in public href — use human-readable slugs in all public URLs  ·  ${OWASP.A01}`)
        }
      })
    }
  }
}

// S4 — NEXT_PUBLIC_ must not prefix secret-category variable names — OWASP A02
// NEXT_PUBLIC_ exposes values to every browser bundle.
// SUPABASE_ANON_KEY and SUPABASE_URL are intentionally public — excluded.
const SECRET_NAME_RE = /NEXT_PUBLIC_\w*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)\w*/i
function _checkPublicPrefixOnSecret(sites, flag) {
  for (const site of sites) {
    for (const file of walk(site.root, ['.ts', '.tsx', '.js'])) {
      readLines(file).forEach((line, i) => {
        const trimmed = line.trim()
        if (SECRET_NAME_RE.test(line) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          flag('Security', 'S4:public-prefix-on-secret', file, i + 1,
            `NEXT_PUBLIC_ exposes this to every browser bundle — move to a server-only env var  ·  ${OWASP.A02}`)
        }
      })
    }
  }
}

// S5 — Unpinned dependencies in package.json — OWASP A03
// ^ ranges and wildcards allow automatic installation of potentially malicious minor/patch updates.
// Supply chain attacks in 2026 have exploited ^ ranges to push compromised updates.
// Flags: ^1.2.3, *, latest, >=1.0.0
// Allows: exact pins (1.2.3), tilde ranges (~1.2.3 — patch only)
const UNPINNED_RE = /^\^|^\*$|^latest$|^>=/
const PINNED_FIELDS = new Set(['dependencies', 'devDependencies', 'peerDependencies'])

function _checkUnpinnedDependency(ctx, flag) {
  const { config } = ctx
  const pkgFiles = []

  // Check root package.json
  const rootPkg = path.join(config._root, 'package.json')
  if (fs.existsSync(rootPkg)) pkgFiles.push(rootPkg)

  // Check each site's package.json
  for (const site of ctx.sites) {
    const sitePkg = path.join(site.root, 'package.json')
    if (fs.existsSync(sitePkg)) pkgFiles.push(sitePkg)
  }

  for (const pkgFile of pkgFiles) {
    let parsed
    try { parsed = JSON.parse(readFile(pkgFile)) }
    catch { continue }

    for (const field of PINNED_FIELDS) {
      const deps = parsed[field]
      if (!deps || typeof deps !== 'object') continue
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && UNPINNED_RE.test(version)) {
          // Find the line number in the raw file for accurate reporting
          const lines = readLines(pkgFile)
          const lineIdx = lines.findIndex(l => l.includes(`"${name}"`) && l.includes(version))
          flag('Security', 'S5:unpinned-dependency', pkgFile, lineIdx + 1,
            `"${name}": "${version}" — ^ ranges allow automatic updates that may introduce supply-chain compromises; consider pinning  ·  ${OWASP.A03}`)
        }
      }
    }
  }
}

module.exports = { checkSecurity }
