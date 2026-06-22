'use strict'

const { describe, it } = require('node:test')
const assert           = require('node:assert/strict')

describe('SEO3: image alt detection', () => {
  const IMAGE_RE      = /<Image\b/
  const NO_ALT_RE     = /\balt=/
  const EMPTY_ALT_RE  = /\balt=["'`]["'`]/
  const TRIVIAL_ALT_RE = /\balt=["'`]image["'`]/i

  it('detects missing alt', () => {
    const line = '<Image src="/hero.jpg" width={800} height={400} />'
    assert.ok(IMAGE_RE.test(line))
    assert.ok(!NO_ALT_RE.test(line), 'alt should be missing')
  })

  it('detects empty alt=""', () => {
    const line = '<Image src="/logo.png" width={200} height={80} alt="" />'
    assert.ok(EMPTY_ALT_RE.test(line))
  })

  it('detects trivial alt="image"', () => {
    const line = '<Image src="/team.jpg" width={400} height={300} alt="image" />'
    assert.ok(TRIVIAL_ALT_RE.test(line))
  })

  it('passes meaningful alt text', () => {
    const line = '<Image src="/hero.jpg" alt="NRI associations across the globe" width={800} height={400} priority />'
    assert.ok(NO_ALT_RE.test(line))
    assert.ok(!EMPTY_ALT_RE.test(line))
    assert.ok(!TRIVIAL_ALT_RE.test(line))
  })
})

describe('SEO4: native img tag detection', () => {
  const NATIVE_IMG_RE = /(?:^|[^a-zA-Z<])<img\s/

  it('flags native <img> tag', () => {
    const line = '  <img src="/photo.jpg" alt="photo" />'
    assert.ok(NATIVE_IMG_RE.test(line))
  })

  it('does not flag Next.js <Image>', () => {
    const line = '  <Image src="/photo.jpg" alt="photo" width={400} height={300} />'
    assert.ok(!NATIVE_IMG_RE.test(line))
  })
})

describe('SEO2: h1 detection', () => {
  const H1_RE = /<h1[\s>]/g

  it('counts single h1 correctly', () => {
    const content = '<h1 className={styles.title}>Welcome</h1>'
    const count = (content.match(H1_RE) || []).length
    assert.equal(count, 1)
  })

  it('detects multiple h1 elements', () => {
    const content = '<h1>First</h1>\n<h1>Second</h1>'
    const count = (content.match(H1_RE) || []).length
    assert.equal(count, 2)
  })

  it('detects zero h1 elements', () => {
    const content = '<h2>Subtitle</h2><p>Content</p>'
    const count = (content.match(H1_RE) || []).length
    assert.equal(count, 0)
  })
})
