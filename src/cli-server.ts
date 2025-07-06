#!/usr/bin/env node
// Server functionality for CLI
import { startServer } from './index'

export async function runServer(port: number) {
  await startServer(port)
}
