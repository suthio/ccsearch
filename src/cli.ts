#!/usr/bin/env node
import { Command } from 'commander'
import { SessionFileReader } from './utils/fileReader'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const program = new Command()
const fileReader = new SessionFileReader()

interface ExportOptions {
  output?: string
  project?: string
  last?: string
  interactive?: boolean
}

program
  .name('ccsearch')
  .description('CLI for CCSearch - Export and search Claude sessions')
  .version('0.0.1')
  .option('--port <number>', 'Port to run the web server on', '3000')

program
  .command('export')
  .description('Export Claude sessions')
  .option('-o, --output <file>', 'Output file path', 'ccsearch-export.json')
  .option('-p, --project <project>', 'Filter by project path')
  .option('-l, --last <n>', 'Export last n sessions')
  .option('-i, --interactive', 'Interactive mode - select sessions to export')
  .action(async (options: ExportOptions) => {
    try {
      // eslint-disable-next-line no-console
      console.log('Loading sessions...')
      let sessions = await fileReader.getAllSessions()

      // Filter by project if specified
      if (options.project) {
        sessions = sessions.filter((s) => s.project?.includes(options.project!))
        // eslint-disable-next-line no-console
        console.log(`Filtered to ${sessions.length} sessions matching project: ${options.project}`)
      }

      // Sort by updated_at descending
      sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

      // Interactive mode
      if (options.interactive) {
        sessions = await selectSessionsInteractively(sessions)
      } else if (options.last) {
        // Take last n sessions
        const n = parseInt(options.last)
        sessions = sessions.slice(0, n)
        // eslint-disable-next-line no-console
        console.log(`Selected last ${sessions.length} sessions`)
      }

      if (sessions.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No sessions to export')
        return
      }

      // Normalize paths for cross-platform compatibility
      const normalizedSessions = sessions.map((session) => {
        const normalizedSession = { ...session }
        // Remove filepath property for privacy
        if ('filepath' in normalizedSession) {
          delete normalizedSession.filepath
        }

        if (session.project) {
          const match = session.project.match(/github\.com\/[\w-]+\/[\w-]+/)
          if (match) {
            normalizedSession.project = match[0]
          } else {
            const parts = session.project.split('/')
            normalizedSession.project = parts.slice(-3).join('/')
          }
        }
        return normalizedSession
      })

      // Create export data
      const exportData = {
        version: '1.1',
        exportDate: new Date().toISOString(),
        sessionCount: normalizedSessions.length,
        exportedFrom: process.platform,
        sessions: normalizedSessions,
      }

      // Write to file
      const outputPath = path.resolve(options.output!)
      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))
      // eslint-disable-next-line no-console
      console.log(`\n✅ Exported ${sessions.length} sessions to: ${outputPath}`)

      // Show summary
      // eslint-disable-next-line no-console
      console.log('\nExported sessions:')
      sessions.forEach((session, idx) => {
        const title = session.title || 'Untitled Session'
        const project = session.project ? ` (${getProjectDisplayName(session.project)})` : ''
        // eslint-disable-next-line no-console
        console.log(`  ${idx + 1}. ${title}${project}`)
      })
    } catch (error) {
       
      console.error('Error exporting sessions:', error)
      process.exit(1)
    }
  })

program
  .command('search <query>')
  .description('Search Claude sessions')
  .option('-p, --project <project>', 'Filter by project path')
  .action(async (query: string, options: { project?: string }) => {
    try {
      // eslint-disable-next-line no-console
      console.log(`Searching for: "${query}"...`)
      const sessions = await fileReader.getAllSessions()

      let results = sessions.filter((session) => {
        const inTitle = session.title?.toLowerCase().includes(query.toLowerCase())
        const inMessages = session.messages.some((msg) =>
          msg.content.toLowerCase().includes(query.toLowerCase()),
        )
        const inProject = session.project?.toLowerCase().includes(query.toLowerCase())

        return inTitle || inMessages || inProject
      })

      // Filter by project if specified
      if (options.project) {
        results = results.filter((s) => s.project?.includes(options.project!))
      }

      // eslint-disable-next-line no-console
      console.log(`\nFound ${results.length} sessions:`)
      results.forEach((session, idx) => {
        const title = session.title || 'Untitled Session'
        const project = session.project ? ` (${getProjectDisplayName(session.project)})` : ''
        const date = new Date(session.updated_at).toLocaleDateString()
        // eslint-disable-next-line no-console
        console.log(`\n${idx + 1}. ${title}${project} - ${date}`)
        // eslint-disable-next-line no-console
        console.log(`   ID: ${session.id}`)
      })
    } catch (error) {
       
      console.error('Error searching sessions:', error)
      process.exit(1)
    }
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function selectSessionsInteractively(sessions: any[]): Promise<any[]> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  // eslint-disable-next-line no-console
  console.log('\nAvailable sessions:')
  sessions.forEach((session, idx) => {
    const title = session.title || 'Untitled Session'
    const project = session.project ? ` (${getProjectDisplayName(session.project)})` : ''
    const date = new Date(session.updated_at).toLocaleDateString()
    // eslint-disable-next-line no-console
    console.log(`  ${idx + 1}. ${title}${project} - ${date}`)
  })

  return new Promise((resolve) => {
    rl.question('\nEnter session numbers to export (comma-separated, e.g., 1,3,5): ', (answer) => {
      rl.close()

      if (!answer.trim()) {
        resolve([])
        return
      }

      const indices = answer
        .split(',')
        .map((s) => parseInt(s.trim()) - 1)
        .filter((i) => i >= 0 && i < sessions.length)

      const selected = indices.map((i) => sessions[i])
      // eslint-disable-next-line no-console
      console.log(`\nSelected ${selected.length} sessions`)
      resolve(selected)
    })
  })
}

function getProjectDisplayName(project: string): string {
  const parts = project.split('/')
  if (parts.length >= 2) {
    return parts.slice(-2).join('/')
  }
  return parts[parts.length - 1]
}

// If no command specified, start the server
if (process.argv.length === 2 || (process.argv.length === 4 && process.argv[2] === '--port')) {
  // Try to start server using different methods
  const port = program.opts().port || 3000
  
  // First, try the runner script (for npm package)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawn } = require('child_process')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    const runnerPath = path.join(__dirname, 'server-runner.js')
    
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    if (require('fs').existsSync(runnerPath)) {
      const child = spawn('node', [runnerPath, port], {
        stdio: 'inherit'
      })
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      child.on('error', (err: any) => {
         
        console.error('Failed to start server:', err)
        process.exit(1)
      })
      
      child.on('exit', (code: number) => {
        process.exit(code || 0)
      })
    }
  } catch {
    // Continue to try dynamic import
  }
  
  // Fall back to dynamic import
  import('./cli-server-wrapper')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((module: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      module.runServer(parseInt(port)).catch((error: any) => {
         
        console.error('Failed to start server:', error)
         
        console.error('Server functionality may not be available in this build.')
        process.exit(1)
      })
    })
    .catch(() => {
      // Try original cli-server as last resort
      import('./cli-server')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((module2: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          module2.runServer(parseInt(port)).catch((error2: any) => {
             
            console.error('Failed to start server:', error2)
             
        console.error('Server functionality may not be available in this build.')
            process.exit(1)
          })
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((error2: any) => {
           
          console.error('Server module not available:', error2)
           
          console.error('Please use the export or search commands.')
          process.exit(1)
        })
    })
} else {
  program.parse(process.argv)
}
