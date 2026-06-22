'use strict'

const fs   = require('fs')
const path = require('path')

// ─── File cache — each file is read exactly once regardless of how many rules scan it ──

const FILE_CACHE  = new Map()
let   _filesScanned = 0

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', '.turbo', 'out', 'dist', '.cache',
  'coverage', '.nyc_output', '.parcel-cache', 'storybook-static', '.vercel',
])

function readFile(filePath) {
  if (!FILE_CACHE.has(filePath)) {
    try {
      FILE_CACHE.set(filePath, fs.readFileSync(filePath, 'utf8'))
      _filesScanned++
    } catch {
      FILE_CACHE.set(filePath, '')
    }
  }
  return FILE_CACHE.get(filePath)
}

function readLines(filePath) {
  return readFile(filePath).split('\n')
}

function walk(dir, exts) {
  const results = []
  const extSet  = new Set(Array.isArray(exts) ? exts : [exts])
  if (!fs.existsSync(dir)) return results
  ;(function recurse(current) {
    let entries
    try { entries = fs.readdirSync(current, { withFileTypes: true }) }
    catch { return }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (!SKIP_DIRS.has(entry.name)) recurse(full)
      } else if (entry.isFile() && extSet.has(path.extname(entry.name))) {
        results.push(full)
      }
    }
  })(dir)
  return results
}

// Resolve a path relative to the project root for clean output
function rel(filePath, root) {
  return path.relative(root, filePath)
}

function resetCache() {
  FILE_CACHE.clear()
  _filesScanned = 0
}

function getFilesScanned() {
  return _filesScanned
}

module.exports = { readFile, readLines, walk, rel, resetCache, getFilesScanned, SKIP_DIRS }
