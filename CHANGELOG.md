# Changelog

All notable changes to `@mximz/argus` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-06-22

### Added

**Six SSSEP audit dimensions — 20 rules out of the box:**

- **Security** (S1–S5) — OWASP Top 10:2025 mapped
  - S1: `no-select-star` — explicit column constants only (OWASP A01)
  - S2: `build-client-in-gsp` — `createBuildClient()` in `generateStaticParams` (OWASP A02)
  - S3: `no-uuid-in-urls` — slugs only in public URLs (OWASP A01)
  - S4: `public-prefix-on-secret` — `NEXT_PUBLIC_` never on secrets (OWASP A02)
  - S5: `unpinned-dependency` — `^` ranges flagged as supply chain risk (OWASP A03)

- **Speed** (SP1–SP2)
  - SP1: `missing-revalidate` — ISR pages must declare revalidate explicitly
  - SP2: `use-client-with-revalidate` — revalidate on Client Components is silently ignored

- **SEO** (SEO1–SEO4)
  - SEO1: `missing-metadata` / `missing-auth-metadata`
  - SEO2: `missing-h1` / `multiple-h1`
  - SEO3: `image-no-alt` / `image-empty-alt`
  - SEO4: `native-img-tag`

- **Efficiency** (EF1–EF2)
  - EF1: `console-log` — debug statements in production code
  - EF2: `unresolved-debt` — TODO/FIXME/HACK in comments

- **Performance** (PF1–PF3) — Core Web Vitals 2026 aligned
  - PF1: `hero-missing-priority` — LCP image must load eagerly (2.0s threshold)
  - PF2: `static-inline-style` — quoted literals in `style={{}}` defeat CSS caching
  - PF3: `heavy-event-handler` — heavy synchronous ops in event handlers (INP signal)

- **Code Health** (CH1–CH4)
  - CH1: hardcoded colour / font-size / font-family / font-weight in CSS modules
  - CH2: SVG presentation attributes with hardcoded values
  - CH3: dead CSS classes (defined but never referenced in TSX)
  - CH4: `no-any-type` (deep mode only)

**Architecture:**
- Zero runtime dependencies — pure Node.js ≥20
- Library-first: `require('@mximz/argus')` for programmatic use
- CLI: `npx @mximz/argus` with `--json`, `--summary`, `--staged`, `--deep` flags
- `argus init` — generates `argus.config.js`
- `argus install-hook` — installs pre-commit hook
- Suppression: `// argus-ignore` / `// argus-ignore-next-line`
- `prototypePatterns` — downgrade CH1/PF2 to warnings for prototype files
- Per-site scoping in `--staged` mode (monorepo efficiency)
- npm provenance via Sigstore on every release
- 45 tests — Node built-in test runner, zero test dependencies

---

*See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.*
