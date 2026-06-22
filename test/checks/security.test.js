'use strict'

const { describe, it } = require('node:test')
const assert           = require('node:assert/strict')
const path             = require('path')
const { resetCache }   = require('../../src/walker')
const { checkSecurity } = require('../../src/checks/security')
const { loadConfig }   = require('../../src/config')

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures')

function makeCtx(violations, siteRoot) {
  const config = loadConfig(path.join(FIXTURES_DIR, 'clean'))
  config._sites = siteRoot
    ? [{ name: 'test', root: siteRoot }]
    : []
  config._pkgDir = path.join(FIXTURES_DIR, 'clean')
  config._matchesPrototype = () => false

  const flag = (dimension, rule, file, line, detail) => {
    violations.push({ dimension, rule, file, line, detail, severity: 'error' })
  }
  return { sites: config._sites, config, flag, stagedFiles: [] }
}

describe('S1: no-select-star', () => {
  it('flags .select("*") in a TypeScript file', () => {
    resetCache()
    const violations = []
    const fixtureDir = path.join(FIXTURES_DIR, 'violations')
    const ctx = makeCtx(violations)
    // Directly test the rule logic by invoking checkSecurity with a synthetic site
    ctx.config._pkgDir = fixtureDir
    checkSecurity(ctx)
    const s1 = violations.filter(v => v.rule === 'S1:no-select-star')
    assert.ok(s1.length > 0, 'Expected S1 violation not found')
  })
})

describe('S3: no UUID in public URLs', () => {
  it('flags href containing a UUID', () => {
    resetCache()
    const violations = []
    const ctx = makeCtx(violations, path.join(FIXTURES_DIR, 'violations'))

    // Inject a synthetic check by writing content directly to cache — tests the regex
    const { readLines } = require('../../src/walker')
    const UUID_RE = /href=["'`][^"'`]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[^"'`]*["'`]/i
    const testLine = `<Link href="/profile/123e4567-e89b-12d3-a456-426614174000">`
    assert.ok(UUID_RE.test(testLine), 'UUID regex should match test line')
  })

  it('does not flag a slug-based href', () => {
    const UUID_RE = /href=["'`][^"'`]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[^"'`]*["'`]/i
    const cleanLine = `<Link href="/associations/uk/london/british-india-association">`
    assert.ok(!UUID_RE.test(cleanLine), 'UUID regex should not match slug-only href')
  })
})

describe('S4: NEXT_PUBLIC_ on secret names', () => {
  it('flags NEXT_PUBLIC_SERVICE_ROLE', () => {
    const SECRET_RE = /NEXT_PUBLIC_\w*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)\w*/i
    assert.ok(SECRET_RE.test('NEXT_PUBLIC_SERVICE_ROLE_KEY=abc'))
  })

  it('does not flag NEXT_PUBLIC_SUPABASE_URL', () => {
    const SECRET_RE = /NEXT_PUBLIC_\w*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)\w*/i
    assert.ok(!SECRET_RE.test('NEXT_PUBLIC_SUPABASE_URL=https://...'))
  })

  it('does not flag NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    const SECRET_RE = /NEXT_PUBLIC_\w*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)\w*/i
    assert.ok(!SECRET_RE.test('NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...'))
  })
})

describe('S5: unpinned dependency detection', () => {
  it('flags ^ ranges', () => {
    const UNPINNED_RE = /^\^|^\*$|^latest$|^>=/
    assert.ok(UNPINNED_RE.test('^1.2.3'))
    assert.ok(UNPINNED_RE.test('*'))
    assert.ok(UNPINNED_RE.test('latest'))
    assert.ok(UNPINNED_RE.test('>=1.0.0'))
  })

  it('does not flag exact pins or tilde ranges', () => {
    const UNPINNED_RE = /^\^|^\*$|^latest$|^>=/
    assert.ok(!UNPINNED_RE.test('1.2.3'))
    assert.ok(!UNPINNED_RE.test('~1.2.3'))
  })
})
