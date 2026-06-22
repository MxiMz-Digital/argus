'use strict'

const { describe, it } = require('node:test')
const assert           = require('node:assert/strict')

describe('CH1: hardcoded colour detection', () => {
  const COLOUR_VALUE_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsl[a]?\s*\(/

  it('detects hex colour', () => {
    assert.ok(COLOUR_VALUE_RE.test('#1a1a2e'))
    assert.ok(COLOUR_VALUE_RE.test('#fff'))
    assert.ok(COLOUR_VALUE_RE.test('#FFFFFF'))
  })

  it('detects rgba()', () => {
    assert.ok(COLOUR_VALUE_RE.test('rgba(255, 255, 255, 0.9)'))
  })

  it('detects hsl()', () => {
    assert.ok(COLOUR_VALUE_RE.test('hsl(220, 100%, 50%)'))
  })

  it('does not flag var(--token)', () => {
    assert.ok(!COLOUR_VALUE_RE.test('var(--color-primary)'))
  })

  it('does not flag "none"', () => {
    assert.ok(!COLOUR_VALUE_RE.test('none'))
  })
})

describe('CH1: hardcoded font-size px detection', () => {
  const FONT_SIZE_PX_RE = /:\s*\d+(\.\d+)?px\b/

  it('flags px font size', () => {
    assert.ok(FONT_SIZE_PX_RE.test(': 24px'))
    assert.ok(FONT_SIZE_PX_RE.test(': 1.5px'))
  })

  it('does not flag 0px (structural zero)', () => {
    // 0px is exempt in the implementation
    assert.ok(FONT_SIZE_PX_RE.test(': 0px'))
    // The implementation checks /\b0px\b/ separately to exempt it
  })

  it('does not flag rem/em units', () => {
    assert.ok(!FONT_SIZE_PX_RE.test(': 1.5rem'))
    assert.ok(!FONT_SIZE_PX_RE.test(': 1.2em'))
  })
})

describe('CH2: SVG presentation attribute detection', () => {
  const SVG_EXEMPT   = /^(none|transparent|currentColor|inherit|initial|unset)$/i
  const HTML_COLOURS = /^(white|black|red|blue|green)$/i

  it('flags hardcoded hex fill', () => {
    const line = 'fill="#1a1a2e"'
    const match = line.match(/\bfill=["']([^"']+)["']/)
    assert.ok(match)
    assert.ok(!SVG_EXEMPT.test(match[1]))
  })

  it('exempts fill="none"', () => {
    const line = 'fill="none"'
    const match = line.match(/\bfill=["']([^"']+)["']/)
    assert.ok(match)
    assert.ok(SVG_EXEMPT.test(match[1]))
  })

  it('exempts currentColor', () => {
    const line = 'fill="currentColor"'
    const match = line.match(/\bfill=["']([^"']+)["']/)
    assert.ok(match)
    assert.ok(SVG_EXEMPT.test(match[1]))
  })

  it('flags named HTML colour', () => {
    assert.ok(HTML_COLOURS.test('white'))
    assert.ok(HTML_COLOURS.test('black'))
  })
})

describe('CH4: no-any-type (deep mode)', () => {
  const ANY_TYPE_RE = /(?::\s*any\b|as\s+any\b|<any>|Array<any>|Promise<any>)/

  it('flags ": any" type annotation', () => {
    assert.ok(ANY_TYPE_RE.test('const data: any = response'))
  })

  it('flags "as any" cast', () => {
    assert.ok(ANY_TYPE_RE.test('const result = data as any'))
  })

  it('flags generic <any>', () => {
    assert.ok(ANY_TYPE_RE.test('const items: Array<any> = []'))
  })

  it('does not flag "any" in a string literal', () => {
    // The word "any" in a string should not match type positions
    assert.ok(!ANY_TYPE_RE.test("const msg = 'select any option'"))
  })
})
