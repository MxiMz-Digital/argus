'use strict'

const path = require('path')
const { walk, readFile } = require('../walker')

function checkSpeed(ctx) {
  const { sites, flag } = ctx
  _checkMissingRevalidate(sites, flag)
  _checkUseClientWithRevalidate(sites, flag)
}

// SP1 — generateStaticParams pages must declare revalidate explicitly.
// Without an explicit export, ISR revalidation interval is undefined —
// Next.js defaults to no revalidation (fully static) which may be unintentional.
function _checkMissingRevalidate(sites, flag) {
  for (const site of sites) {
    const pages = walk(path.join(site.root, 'app'), ['.tsx'])
      .filter(f => path.basename(f) === 'page.tsx')
    for (const file of pages) {
      const content = readFile(file)
      if (/generateStaticParams/.test(content) && !/export\s+const\s+revalidate/.test(content)) {
        flag('Speed', 'SP1:missing-revalidate', file, 1,
          'generateStaticParams present but no revalidate export — ISR interval is undefined; set explicitly (e.g. export const revalidate = 3600)',
          'Add below your imports: export const revalidate = 3600  (adjust the number to match how often this data changes)')
      }
    }
  }
}

// SP2 — 'use client' pages must not export revalidate.
// Client Components are never server-rendered in the traditional sense;
// revalidate on a Client Component page is ignored by Next.js at runtime,
// creating false confidence that ISR is in effect.
function _checkUseClientWithRevalidate(sites, flag) {
  for (const site of sites) {
    const pages = walk(path.join(site.root, 'app'), ['.tsx'])
      .filter(f => path.basename(f) === 'page.tsx')
    for (const file of pages) {
      const content = readFile(file)
      if (/^\s*['"]use client['"]/.test(content) && /export\s+const\s+revalidate/.test(content)) {
        flag('Speed', 'SP2:use-client-with-revalidate', file, 1,
          "'use client' page exports revalidate — this value is ignored by Next.js on Client Components; move data fetching to a Server Component parent",
          "Remove the revalidate export — move data fetching to a Server Component parent that wraps this Client Component page")
      }
    }
  }
}

module.exports = { checkSpeed }
