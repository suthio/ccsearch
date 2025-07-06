#!/usr/bin/env node
import { Server } from './server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function startServer(port: number = 3000) {
  const server = new Server()

  try {
    const actualPort = await server.start(port)
    console.log(`\nCCSearch is running at http://localhost:${actualPort}`)
    console.log('Press Ctrl+C to stop\n')

    await openBrowser(`http://localhost:${actualPort}`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }

  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    server.stop()
    process.exit(0)
  })
}

async function main() {
  // Get port from command line args if provided
  const portArg = process.argv.find((arg) => arg.startsWith('--port='))
  const port = portArg ? parseInt(portArg.split('=')[1]) : 3000
  await startServer(port)
}

async function openBrowser(url: string) {
  try {
    const platform = process.platform
    let command: string

    if (platform === 'darwin') {
      command = `open "${url}"`
    } else if (platform === 'win32') {
      command = `start "${url}"`
    } else {
      command = `xdg-open "${url}"`
    }

    await execAsync(command)
  } catch {
    console.log('Could not open browser automatically. Please open:', url)
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main()
}

export default startServer
