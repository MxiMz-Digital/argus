#!/usr/bin/env node
'use strict'

const path        = require('path')
const fs          = require('fs')
const { loadConfig }                  = require('../src/config')
const { run }                         = require('../src/runner')
const { reportHuman, reportJSON }     = require('../src/reporter')

const startTime = Date.now()
const args      = process.argv.slice(2)

// ─── Sub-commands ─────────────────────────────────────────────────────────────

if (args.includes('init')) {
  _commandInit()
  process.exit(0)
}

if (args.includes('install-hook')) {
  _commandInstallHook()
  process.exit(0)
}

// ─── Flags ────────────────────────────────────────────────────────────────────

const JSON_MODE    = args.includes('--json')
const SUMMARY_ONLY = args.includes('--summary')
const STAGED_MODE  = args.includes('--staged')
const DEEP_MODE    = args.includes('--deep')

// ─── Run ──────────────────────────────────────────────────────────────────────

const root   = process.cwd()
let   config

try {
  config = loadConfig(root)
} catch (err) {
  console.error(`\n  argus: configuration error\n  ${err.message}\n`)
  process.exit(1)
}

const result = run(config, { staged: STAGED_MODE, deep: DEEP_MODE })
result.meta._startTime = startTime

if (JSON_MODE) {
  process.stdout.write(reportJSON(result) + '\n')
  process.exit(result.passed ? 0 : 1)
}

process.stdout.write(reportHuman(result, SUMMARY_ONLY))
process.exit(result.passed ? 0 : 1)

// ─── init — generate argus.config.js in the current directory ─────────────────

function _commandInit() {
  const dest = path.join(process.cwd(), 'argus.config.js')
  if (fs.existsSync(dest)) {
    console.log('  argus: argus.config.js already exists — not overwritten')
    return
  }
  const example = path.join(__dirname, '..', 'argus.config.example.js')
  fs.copyFileSync(example, dest)
  console.log('  ✅  argus.config.js created — edit to match your project structure')
}

// ─── install-hook — write pre-commit hook into .git/hooks/ ───────────────────

function _commandInstallHook() {
  const gitDir  = path.join(process.cwd(), '.git')
  const hooksDir = path.join(gitDir, 'hooks')

  if (!fs.existsSync(gitDir)) {
    console.error('  argus: not a git repository — run from your project root')
    process.exit(1)
  }

  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true })

  const hookPath    = path.join(hooksDir, 'pre-commit')
  const hookContent = `#!/bin/sh
# Installed by @mximz/argus — https://github.com/MXiMz-Digital/argus
# Runs Argus surface scan on staged files before every commit.
# To bypass (use sparingly): git commit --no-verify

./node_modules/.bin/argus --staged
`
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 })
  console.log(`  ✅  Argus pre-commit hook installed at ${path.relative(process.cwd(), hookPath)}`)
  console.log('  Every commit will now be scanned. Use  // argus-ignore  to suppress known exceptions.')
}
