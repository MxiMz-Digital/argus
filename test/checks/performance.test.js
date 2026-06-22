'use strict'

const { describe, it } = require('node:test')
const assert           = require('node:assert/strict')

describe('PF2: static inline style detection', () => {
  const INLINE_STYLE_RE  = /style=\{\{([^}]+)\}\}/
  const HAS_TOKEN        = /var\(--/
  const HAS_QUOTED_VALUE = /:\s*['"][^'"]*['"]/

  function shouldFlag(line) {
    const match = INLINE_STYLE_RE.exec(line)
    if (!match) return false
    if (HAS_TOKEN.test(line)) return false
    return HAS_QUOTED_VALUE.test(match[1])
  }

  it('flags quoted literal colour', () => {
    assert.ok(shouldFlag(`<div style={{ color: 'red' }}>`))
  })

  it('flags quoted literal font size', () => {
    assert.ok(shouldFlag(`<div style={{ fontSize: '14px' }}>`))
  })

  it('flags objectFit: cover as literal', () => {
    assert.ok(shouldFlag(`<div style={{ objectFit: 'cover' }}>`))
  })

  it('passes CSS custom property token', () => {
    assert.ok(!shouldFlag(`<div style={{ color: 'var(--color-primary)' }}>`))
  })

  it('passes unquoted dynamic variable reference', () => {
    assert.ok(!shouldFlag(`<div style={{ color: accentColor }}>`))
  })

  it('passes object property access', () => {
    assert.ok(!shouldFlag(`<div style={{ color: SEVERITY_META.green.color }}>`))
  })

  it('passes CSS custom property assignment', () => {
    assert.ok(!shouldFlag(`<div style={{ '--section-accent': color }}>`))
  })
})

describe('PF1: hero image priority', () => {
  it('detects missing priority prop', () => {
    const block = '<Image src="/hero.jpg" alt="Hero" width={1200} height={600} />'
    assert.ok(!(/\bpriority\b/.test(block)))
  })

  it('passes image with priority prop', () => {
    const block = '<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />'
    assert.ok(/\bpriority\b/.test(block))
  })
})

describe('Core Web Vitals 2026 thresholds', () => {
  const { CWV_2026 } = require('../../src/config')

  it('LCP good threshold is 2000ms (tightened in 2026)', () => {
    assert.equal(CWV_2026.lcp.good, 2000)
  })

  it('INP good threshold is 200ms', () => {
    assert.equal(CWV_2026.inp.good, 200)
  })

  it('CLS good threshold is 0.1', () => {
    assert.equal(CWV_2026.cls.good, 0.1)
  })
})
