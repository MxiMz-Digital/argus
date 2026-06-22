<p align="center">
  <img src="https://raw.githubusercontent.com/MxiMz-Digital/argus/main/logo.svg" alt="Argus logo — peacock eye" width="90" height="90">
</p>

# @mximz/argus

**Zero-dependency SSSEP code health auditor for Next.js monorepos.**

[![npm](https://img.shields.io/npm/v/@mximz/argus)](https://www.npmjs.com/package/@mximz/argus)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/MXiMz-Digital/argus/badge)](https://securityscorecards.dev/viewer/?uri=github.com/MXiMz-Digital/argus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Argus enforces six dimensions of code quality — **Security · Speed · SEO · Efficiency · Performance · Code Health** — with zero runtime dependencies, in under 3 seconds, at every commit.

Named after Argus Panoptes — the hundred-eyed giant of Greek mythology who never slept.

---

## Why Argus

Most linters enforce language syntax. Argus enforces **architectural discipline** — the rules that prevent design system drift, SEO regressions, and supply chain vulnerabilities in production Next.js + Supabase applications.

| Tool | What it catches |
|---|---|
| ESLint / Biome | JavaScript / TypeScript syntax rules |
| Stylelint | CSS syntax rules |
| **Argus** | Design token violations · OWASP-mapped security · Core Web Vitals patterns · Dead CSS · Supabase query safety |

They are complementary. Argus covers what generic linters cannot.

Argus is also different from AI-powered code review tools. It is deterministic and rule-based — same input, same output, every time, with no API key and no model required. An AI reviewer catches logic errors and design judgment calls; Argus catches specific architectural violations at commit speed. They solve different problems and work well together.

---

## What it looks like

Run `npx @mximz/argus --summary` for a dashboard view:

```
════════════════════════════════════════════════════════════════════════════
  SUMMARY  ·  159 files scanned  ·  0.13s
────────────────────────────────────────────────────────────────────────────
  🔴  Security        ░░░░░░░░░░░░░░░░░░░░ 23 warnings
  🟡  Speed           ✓ clean
  🟠  SEO             ✓ clean
  🔵  Efficiency      ✓ clean
  🟣  Performance     ░░░░░░░ 7 warnings
  🟢  Code Health     ✓ clean
────────────────────────────────────────────────────────────────────────────
  Warnings do not block commits — but address them before they accumulate.
════════════════════════════════════════════════════════════════════════════
```

Run `npx @mximz/argus` for the full report with file-level detail:

```
🔴  SECURITY  (1 warning shown of 23)
────────────────────────────────────────────────────────────────────────────
  ⚠️  WARN  [S5:unpinned-dependency]
  package.json:17
  "stylelint": "^17.13.0" — ^ ranges allow automatic updates that may
  introduce supply-chain compromises; consider pinning
  · OWASP A03:2025 Software Supply Chain Failures

🟣  PERFORMANCE  (1 error shown of 7)
────────────────────────────────────────────────────────────────────────────
  🚨  ERROR  [PF1:hero-missing-priority]
  sites/your-app/app/(public)/page.tsx:14
  First <Image> in file is missing priority — LCP threshold is 2.0s in 2026
```

---

## Quick start

```bash
# Scan your project — zero config required
npx @mximz/argus

# Install as a dev dependency
npm install --save-dev @mximz/argus

# Generate a config file
npx @mximz/argus init

# Install the pre-commit hook
npx @mximz/argus install-hook
```

---

## CLI flags

```bash
npx @mximz/argus              # full report
npx @mximz/argus --summary    # summary table only
npx @mximz/argus --json       # machine-readable JSON (CI pipelines)
npx @mximz/argus --staged     # staged files only (fast pre-commit mode)
npx @mximz/argus --deep       # include deep checks (CH4: no-any-type)
```

---

## Rules

### Security — OWASP Top 10:2025 mapped

| Rule | Default | OWASP | Description |
|---|---|---|---|
| `S1:no-select-star` | error | A01 | `select('*')` exposes all columns — use explicit column constants |
| `S2:build-client-in-gsp` | error | A02 | `createClient()` alongside `generateStaticParams` — use `createBuildClient()` |
| `S3:no-uuid-in-urls` | error | A01 | UUIDs in public `href` — use slugs only |
| `S4:public-prefix-on-secret` | error | A02 | `NEXT_PUBLIC_` on secret-category env var names |
| `S5:unpinned-dependency` | warn | A03 | `^` ranges allow supply chain injection |

### Speed

| Rule | Default | Description |
|---|---|---|
| `SP1:missing-revalidate` | error | `generateStaticParams` page with no `revalidate` export |
| `SP2:use-client-with-revalidate` | warn | `revalidate` on a Client Component is silently ignored |

### SEO

| Rule | Default | Description |
|---|---|---|
| `SEO1:missing-metadata` | error | No `generateMetadata()` or `metadata` export |
| `SEO1:missing-auth-metadata` | error | `(auth)` layout missing `robots: { index: false }` |
| `SEO2:missing-h1` / `multiple-h1` | error | Every page needs exactly one `<h1>` |
| `SEO3:image-no-alt` / `image-empty-alt` | error | `<Image>` missing or empty `alt` |
| `SEO4:native-img-tag` | error | `<img>` instead of Next.js `<Image>` |

### Efficiency

| Rule | Default | Description |
|---|---|---|
| `EF1:console-log` | error | `console.log/debug/info` in production code |
| `EF2:unresolved-debt` | warn | TODO / FIXME / HACK in comments |

### Performance — Core Web Vitals 2026

| Rule | Default | Description |
|---|---|---|
| `PF1:hero-missing-priority` | error | First `<Image>` missing `priority` — LCP threshold is 2.0s in 2026 |
| `PF2:static-inline-style` | error | Quoted literal in `style={{}}` — use a CSS class |
| `PF3:heavy-event-handler` | warn | Heavy synchronous ops in event handlers — protects INP (200ms) |

### Code Health

| Rule | Default | Description |
|---|---|---|
| `CH1:hardcode-colour` | error | Hex / rgba / hsl in CSS modules instead of `var(--token)` |
| `CH1:hardcode-font-*` | error | Hardcoded font-size px / font-family string / font-weight number |
| `CH2:svg-*` | error | SVG `fill=` / `stroke=` / `fontFamily=` with hardcoded values |
| `CH3:dead-css` | warn | CSS class defined in module but never referenced in TSX |
| `CH4:no-any-type` | warn | TypeScript `any` type (deep mode only) |

---

## Configuration

```js
// argus.config.js
module.exports = {
  sitesDir:    'sites',
  packagesDir: 'packages',

  h1Components:   ['PageHero', 'SiteHero'],
  heroComponents: ['PageHero', 'SiteHero'],

  // Downgrade CH1/PF2 from error to warn on prototype files
  prototypePatterns: ['**/prototype/**'],

  // Core Web Vitals thresholds (update when Google revises)
  cwv: {
    lcp: { good: 2000, poor: 4000 },
    inp: { good: 200,  poor: 500  },
    cls: { good: 0.1,  poor: 0.25 },
  },

  rules: {
    'S5:unpinned-dependency': true,   // promote to error
    'CH3:dead-css':           false,  // disable entirely
  },
}
```

---

## Suppressing known exceptions

```tsx
// argus-ignore
const result = await supabase.from('table').select('*')

// argus-ignore-next-line
<img src="/legacy.png" alt="legacy" />
```

```css
/* argus-ignore */
color: #1a1a2e;
```

---

## Programmatic API

```js
const argus = require('@mximz/argus')

const result = argus.run({ root: process.cwd(), staged: true })

console.log(result.passed)      // boolean
console.log(result.errors)      // blocking violations
console.log(result.warnings)    // non-blocking
console.log(result.meta)        // filesScanned, sites, timestamp
```

---

## GitHub Actions CI

```yaml
- name: Argus SSSEP audit
  run: npx @mximz/argus --json
```

See [.github/workflows/](https://github.com/MXiMz-Digital/argus/tree/main/.github/workflows) for a complete example workflow.

---

## Pre-commit hook

```bash
npx @mximz/argus install-hook
```

Writes `.git/hooks/pre-commit`. Runs `argus --staged` on every `git commit`. Bypass sparingly with `git commit --no-verify`.

---

## Limitations

- **Static pattern analysis, not AST parsing.** Argus reads code as text. Multiline JSX edge cases may produce false positives — use `// argus-ignore` where appropriate.
- **CH3 (dead CSS) flags dynamic class names** — `styles[computedKey]`, `clsx()` usage. Suppress with `// argus-ignore` on the CSS selector.
- **`git commit --no-verify` bypasses the hook.** The pre-commit hook is friction, not a hard guarantee. Your CI pipeline is the real enforcement gate.
- **Next.js + Supabase oriented.** Several rules (S1, S2, SP1) are specific to this stack. Teams on other frameworks should disable irrelevant rules via config.

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.

## Credits

Conceived and directed by **Rani Wilfred**, MXiMz Digital LLP.
Lead technology: **Claude Code** (Anthropic) — `claude-sonnet-4-6`.

## License

MIT — MXiMz Digital LLP
