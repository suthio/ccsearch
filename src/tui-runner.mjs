#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import the pre-built TUI bundle
const { runTUI } = await import(join(__dirname, '..', 'dist', 'tui.mjs'))
runTUI()
