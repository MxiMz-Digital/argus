# Contributing to @mximz/argus

Thank you for your interest. Contributions are welcome.

## Adding a new rule

1. Choose the correct dimension file in `src/checks/`
2. Write a function `_checkYourRule(ctx, flag)` following the existing patterns
3. Call it from the dimension's main `checkXxx()` function
4. Use the rule ID format: `DIM#:kebab-name` (e.g. `CH5:no-barrel-re-export`)
5. Add test cases in `test/checks/` covering at least one violation and one clean case
6. Document the rule in `README.md` and `CHANGELOG.md`

## Rule ID convention

| Prefix | Dimension |
|---|---|
| `S` | Security |
| `SP` | Speed |
| `SEO` | SEO |
| `EF` | Efficiency |
| `PF` | Performance |
| `CH` | Code Health |

## Running tests

```bash
node --test test/checks/*.test.js
```

Zero external test dependencies — Node.js built-in test runner only.

## Suppression markers

New rules must respect `// argus-ignore` and `// argus-ignore-next-line` via the `isIgnored()` function in `src/suppression.js`. The `flag()` function in `src/runner.js` calls `isIgnored()` automatically — just call `flag()` and suppression is handled.

## Pull request checklist

- [ ] New rule has tests (clean + violation fixtures)
- [ ] Rule documented in README.md rules table
- [ ] CHANGELOG.md updated under `## [Unreleased]`
- [ ] `node --test test/checks/*.test.js` passes with zero failures
- [ ] Rule ID follows `DIM#:kebab-name` convention
- [ ] Default severity is justified in the PR description

## Code style

- CommonJS (`require`/`module.exports`) — not ESM
- No external runtime dependencies — pure Node.js ≥20
- Named constants for all regex patterns
- Violation messages are actionable — tell the developer exactly what to do
