#!/usr/bin/env node
const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

async function build() {
  try {
    // Build the TUI bundle
    await esbuild.build({
      entryPoints: [path.join(__dirname, '../src/tui/index.tsx')],
      bundle: true,
      platform: 'node',
      target: 'node21',
      format: 'esm',
      outfile: path.join(__dirname, '../dist/tui.mjs'),
      external: [
        'react',
        'ink',
        'ink-text-input',
        'ink-spinner',
        'chalk',
        'figures',
        'conf'
      ],
      jsx: 'automatic',
      logLevel: 'info'
    })

    // Copy tui-runner.mjs to dist
    const runnerSrc = path.join(__dirname, '../src/tui-runner.mjs')
    const runnerDest = path.join(__dirname, '../dist/tui-runner.mjs')
    fs.copyFileSync(runnerSrc, runnerDest)

    console.log('✅ TUI built successfully')
  } catch (error) {
    console.error('❌ TUI build failed:', error)
    process.exit(1)
  }
}

build()
