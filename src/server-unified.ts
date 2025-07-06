import express from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

const app = express()
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ limit: '200mb', extended: true }))

// Claude conversation storage path
const CLAUDE_STORAGE_PATH = path.join(os.homedir(), '.claude')

interface Session {
  id: string
  project: string
  title: string
  created_at: string
  updated_at: string
  messages: any[]
}

interface SearchResult {
  sessionId: string
  sessionDate: string
  messageCount: number
  project: string
  highlights: Array<{
    messageIndex: number
    text: string
  }>
}

// Serve static files
const isDevelopment = process.env.NODE_ENV === 'development'

// In development mode, we'll proxy to Vite dev server
// In production mode, serve static files from dist
if (!isDevelopment) {
  // Serve static files from the dist directory
  const distPath = path.join(process.cwd(), 'dist')
  app.use(express.static(distPath))
}

// Get detailed projects info
app.get('/api/projects/detailed', async (req, res) => {
  try {
    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    const projectDirs = await fs.readdir(projectsPath).catch(() => [])

    const projects = []

    for (const projectDir of projectDirs) {
      if (projectDir.startsWith('.')) continue

      const projectPath = path.join(projectsPath, projectDir)
      const stat = await fs.stat(projectPath).catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      const files = await fs.readdir(projectPath).catch(() => [])
      const sessionFiles = files.filter((f) => f.endsWith('.jsonl'))

      let lastUpdated = new Date(0).toISOString()

      // Get the most recent update time
      for (const file of sessionFiles) {
        const fileStat = await fs.stat(path.join(projectPath, file)).catch(() => null)
        if (fileStat && fileStat.mtime.toISOString() > lastUpdated) {
          lastUpdated = fileStat.mtime.toISOString()
        }
      }

      projects.push({
        name: projectDir.split('-').pop() || projectDir,
        path: projectDir.replace(/-/g, '/'),
        sessionCount: sessionFiles.length,
        lastUpdated,
      })
    }

    // Sort projects by last updated time (most recent first)
    projects.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))

    res.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Full text search endpoint
app.get('/api/search/full', async (req, res) => {
  try {
    const query = req.query.q as string
    const projectFilter = req.query.project as string

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    console.log('Full text search in:', projectsPath)
    const projects = await fs.readdir(projectsPath).catch((err) => {
      console.error('Error reading projects directory:', err)
      return []
    })

    const results: SearchResult[] = []
    let totalFilesSearched = 0

    for (const project of projects) {
      if (
        projectFilter &&
        projectFilter !== 'all' &&
        !project.includes(projectFilter.replace(/\//g, '-'))
      ) {
        continue
      }

      const projectPath = path.join(projectsPath, project)
      const stat = await fs.stat(projectPath).catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      const files = await fs.readdir(projectPath).catch(() => [])

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue

        totalFilesSearched++

        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())

          const highlights: SearchResult['highlights'] = []
          let messageIndex = 0
          let sessionDate = new Date().toISOString()

          for (const line of lines) {
            try {
              const message = JSON.parse(line)

              if (messageIndex === 0 && (message.timestamp || message.ts)) {
                sessionDate = message.timestamp || message.ts || sessionDate
              }

              // Search in all possible text fields
              const searchFields = [
                'content',
                'text',
                'message',
                'input',
                'output',
                'query',
                'response',
              ]
              let found = false

              for (const field of searchFields) {
                if (
                  message[field] &&
                  typeof message[field] === 'string' &&
                  message[field].toLowerCase().includes(query.toLowerCase())
                ) {
                  const matchIndex = message[field].toLowerCase().indexOf(query.toLowerCase())
                  const start = Math.max(0, matchIndex - 100)
                  const end = Math.min(message[field].length, matchIndex + query.length + 100)
                  let highlight = message[field].substring(start, end)

                  highlight = highlight.replace(/\s+/g, ' ').trim()

                  if (start > 0) highlight = '...' + highlight
                  if (end < message[field].length) highlight = highlight + '...'

                  highlights.push({
                    messageIndex,
                    text: highlight,
                  })
                  found = true
                  break
                }
              }

              // Also search in nested objects (like tool calls)
              if (!found && message.tool_calls) {
                const toolCallsStr = JSON.stringify(message.tool_calls)
                if (toolCallsStr.toLowerCase().includes(query.toLowerCase())) {
                  highlights.push({
                    messageIndex,
                    text: `[Tool call containing "${query}"]`,
                  })
                }
              }

              messageIndex++
            } catch {
              // Skip invalid JSON lines
            }
          }

          if (highlights.length > 0) {
            results.push({
              sessionId: file.replace('.jsonl', ''),
              sessionDate,
              messageCount: highlights.length,
              project: project.replace(/-/g, '/'),
              highlights: highlights.slice(0, 5), // Show up to 5 highlights
            })
          }
        } catch {
          console.error(`Error processing file ${file}`)
        }
      }
    }

    console.log(
      `Full text search: searched ${totalFilesSearched} files, found ${results.length} results for query: "${query}"`,
    )
    res.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search conversations' })
  }
})

// Original search endpoint (for backward compatibility)
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    // Get all project directories
    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    console.log('Searching in:', projectsPath)
    const projects = await fs.readdir(projectsPath).catch((err) => {
      console.error('Error reading projects directory:', err)
      return []
    })
    console.log('Found projects:', projects.length)

    const results: SearchResult[] = []
    let totalFilesSearched = 0

    // Search through each project
    for (const project of projects) {
      const projectPath = path.join(projectsPath, project)
      const stat = await fs.stat(projectPath).catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      // Get all JSONL files in the project
      const files = await fs.readdir(projectPath).catch(() => [])

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue

        totalFilesSearched++

        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())

          const highlights: SearchResult['highlights'] = []
          let messageIndex = 0
          let sessionDate = new Date().toISOString()

          // Parse each line as a separate JSON object
          for (const line of lines) {
            try {
              const message = JSON.parse(line)

              // Get session date from first message
              if (messageIndex === 0 && (message.timestamp || message.ts)) {
                sessionDate = message.timestamp || message.ts || sessionDate
              }

              // Search in various possible fields
              const searchFields = ['content', 'text', 'message', 'input', 'output']

              for (const field of searchFields) {
                if (
                  message[field] &&
                  typeof message[field] === 'string' &&
                  message[field].toLowerCase().includes(query.toLowerCase())
                ) {
                  // Extract context around the match
                  const matchIndex = message[field].toLowerCase().indexOf(query.toLowerCase())
                  const start = Math.max(0, matchIndex - 100)
                  const end = Math.min(message[field].length, matchIndex + query.length + 100)
                  let highlight = message[field].substring(start, end)

                  // Clean up the highlight
                  highlight = highlight.replace(/\s+/g, ' ').trim()

                  // Add ellipsis if truncated
                  if (start > 0) highlight = '...' + highlight
                  if (end < message[field].length) highlight = highlight + '...'

                  highlights.push({
                    messageIndex,
                    text: highlight,
                  })
                  break // Only take the first match per message
                }
              }

              messageIndex++
            } catch {
              // Skip invalid JSON lines
              // Skip invalid JSON lines
            }
          }

          if (highlights.length > 0) {
            results.push({
              sessionId: file.replace('.jsonl', ''),
              sessionDate,
              messageCount: highlights.length,
              highlights: highlights.slice(0, 3), // Limit to first 3 highlights
            })
          }
        } catch {
          console.error(`Error processing file ${file}`)
        }
      }
    }

    console.log(
      `Searched ${totalFilesSearched} files, found ${results.length} results for query: "${query}"`,
    )
    res.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search conversations' })
  }
})

// Get session detail
app.get('/api/session/:id', async (req, res) => {
  try {
    const sessionId = req.params.id
    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    const projects = await fs.readdir(projectsPath).catch(() => [])

    for (const project of projects) {
      const projectPath = path.join(projectsPath, project)
      const sessionFile = path.join(projectPath, `${sessionId}.jsonl`)

      try {
        // Get file stats for fallback timestamps
        const stats = await fs.stat(sessionFile)
        const fileBirthtime = stats.birthtime.toISOString()
        const fileMtime = stats.mtime.toISOString()

        const content = await fs.readFile(sessionFile, 'utf-8')
        const lines = content.split('\n').filter((line) => line.trim())

        const messages = lines
          .map((line) => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter(Boolean)

        const session = {
          id: sessionId,
          project: project.replace(/-/g, '/'),
          created_at: messages[0]?.timestamp || messages[0]?.ts || fileBirthtime,
          updated_at:
            messages[messages.length - 1]?.timestamp ||
            messages[messages.length - 1]?.ts ||
            fileMtime,
          messages,
        }

        return res.json(session)
      } catch {
        // Continue searching in other projects
      }
    }

    res.status(404).json({ error: 'Session not found' })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const projectFilter = req.query.project as string
    const sessions: Session[] = []

    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    const projects = await fs.readdir(projectsPath).catch(() => [])

    for (const project of projects) {
      const projectPath = path.join(projectsPath, project)
      const stat = await fs.stat(projectPath).catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      const files = await fs.readdir(projectPath).catch(() => [])

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue

        try {
          const filePath = path.join(projectPath, file)
          const stats = await fs.stat(filePath)
          const fileBirthtime = stats.birthtime.toISOString()
          const fileMtime = stats.mtime.toISOString()

          const content = await fs.readFile(filePath, 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())

          if (lines.length > 0) {
            const firstLine = JSON.parse(lines[0])
            const lastLine = JSON.parse(lines[lines.length - 1])

            const session: Session = {
              id: file.replace('.jsonl', ''),
              project: project.replace(/-/g, '/'),
              title: `Session ${file.substring(0, 8)}`,
              created_at: firstLine.timestamp || firstLine.ts || fileBirthtime,
              updated_at: lastLine.timestamp || lastLine.ts || fileMtime,
              messages: lines
                .map((line) => {
                  try {
                    return JSON.parse(line)
                  } catch {
                    return null
                  }
                })
                .filter(Boolean),
            }

            if (
              !projectFilter ||
              projectFilter === 'all' ||
              session.project.includes(projectFilter)
            ) {
              sessions.push(session)
            }
          }
        } catch {
          console.error(`Error reading session ${file}`)
        }
      }
    }

    // Sort by updated_at descending
    sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    // Add preview and message count
    const sessionsWithMeta = sessions.map((session) => {
      // Generate a better preview that includes multiple messages
      let preview = ''
      const maxPreviewLength = 300
      const messagesToInclude = 5 // Include up to 5 messages in preview

      // Collect relevant messages for preview
      const previewMessages: string[] = []
      let currentLength = 0

      for (let i = 0; i < Math.min(session.messages.length, messagesToInclude); i++) {
        const msg = session.messages[i]

        // Handle different message formats
        let role = 'System'
        let content = ''

        if (msg.role) {
          role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'
        } else if (msg.type) {
          // Handle type-based messages
          if (msg.type === 'user') role = 'User'
          else if (msg.type === 'assistant') role = 'Assistant'
          else role = 'System'
        }

        // Extract content from various formats
        if (msg.content && typeof msg.content === 'string') {
          content = msg.content
        } else if (msg.text && typeof msg.text === 'string') {
          content = msg.text
        } else if (msg.summary) {
          content = msg.summary
        } else if (msg.message && msg.message.content) {
          content =
            typeof msg.message.content === 'string'
              ? msg.message.content
              : msg.message.content.map((c: any) => c.text || '').join(' ')
        }

        content = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()

        // Truncate individual message if too long
        const maxMsgLength = 100
        const truncatedContent =
          content.length > maxMsgLength ? content.substring(0, maxMsgLength) + '...' : content

        const msgPreview = `${role}: ${truncatedContent}`

        if (currentLength + msgPreview.length > maxPreviewLength) {
          // Add truncated version if there's some space left
          const remainingSpace = maxPreviewLength - currentLength
          if (remainingSpace > 20) {
            previewMessages.push(msgPreview.substring(0, remainingSpace) + '...')
          }
          break
        }

        previewMessages.push(msgPreview)
        currentLength += msgPreview.length + 3 // +3 for " | " separator
      }

      preview = previewMessages.join(' | ')

      return {
        ...session,
        messageCount: session.messages.length,
        preview,
      }
    })

    res.json({ total: sessionsWithMeta.length, sessions: sessionsWithMeta.slice(0, 50) })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

// Get projects
app.get('/api/projects', async (req, res) => {
  try {
    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    const projects = await fs.readdir(projectsPath).catch(() => [])

    const projectNames = projects.filter((p) => !p.startsWith('.')).map((p) => p.replace(/-/g, '/'))

    res.json(projectNames)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Open in Claude
app.post('/api/open-claude', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    const command = `claude --resume ${sessionId}`
    await execAsync(command)

    res.json({ success: true, message: 'Opening session in Claude' })
  } catch (error) {
    console.error('Error opening Claude:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to open Claude. Make sure Claude CLI is installed.',
    })
  }
})

// Export sessions
app.post('/api/export', async (req, res) => {
  try {
    const { projectFilter } = req.body
    const sessions = []

    const projectsPath = path.join(CLAUDE_STORAGE_PATH, 'projects')
    const projects = await fs.readdir(projectsPath).catch(() => [])

    for (const project of projects) {
      if (
        projectFilter &&
        projectFilter !== 'all' &&
        !project.includes(projectFilter.replace(/\//g, '-'))
      ) {
        continue
      }

      const projectPath = path.join(projectsPath, project)
      const stat = await fs.stat(projectPath).catch(() => null)
      if (!stat || !stat.isDirectory()) continue

      const files = await fs.readdir(projectPath).catch(() => [])

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue

        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())

          sessions.push({
            id: file.replace('.jsonl', ''),
            project: project.replace(/-/g, '/'),
            content: lines,
          })
        } catch {
          console.error(`Error exporting session ${file}`)
        }
      }
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessionCount: sessions.length,
      sessions,
    }

    res.json(exportData)
  } catch (error) {
    console.error('Error exporting sessions:', error)
    res.status(500).json({ error: 'Failed to export sessions' })
  }
})

// Import sessions
app.post('/api/import', async (req, res) => {
  try {
    const { data } = req.body

    if (!data || !data.sessions) {
      return res.status(400).json({ error: 'Invalid import data' })
    }

    res.json({
      success: true,
      message: `Import functionality is not available in this version`,
      importedCount: 0,
    })
  } catch (error) {
    console.error('Error importing sessions:', error)
    res.status(500).json({ error: 'Failed to import sessions' })
  }
})

// Catch-all handler for SPA routing (must be last)
if (!isDevelopment) {
  app.get('*', (req, res) => {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html')
    res.sendFile(indexPath)
  })
}

// Start server
const port = process.env.PORT || 3210
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
  if (isDevelopment) {
    console.log('Running in development mode.')
    console.log('API endpoints available at http://localhost:3210/api/*')
    console.log('Please run "npm run dev:client" in another terminal for the web UI.')
  } else {
    console.log('Running in production mode. Serving static files from dist/')
  }
})
