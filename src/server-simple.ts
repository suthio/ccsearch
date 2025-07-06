import express from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

const app = express()
// Increase body parser limit to handle large imports (200MB)
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ limit: '200mb', extended: true }))

// Serve static files from dist when available (for production)
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// For development, serve the index.html file
const indexPath = path.join(__dirname, '..', 'index.html')

// Serve index.html for client-side routing
const serveIndex = async (req: express.Request, res: express.Response) => {
  try {
    // Check if we have a built dist version
    const distIndexPath = path.join(distPath, 'index.html')
    await fs.access(distIndexPath)
    res.sendFile(distIndexPath)
  } catch {
    // Otherwise serve the development index.html
    try {
      await fs.access(indexPath)
      res.sendFile(indexPath)
    } catch {
      res
        .status(404)
        .send('Index.html not found. Please run npm run build or ensure index.html exists.')
    }
  }
}

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

              // Search in tool_result content
              if (
                !found &&
                message.message &&
                message.message.content &&
                Array.isArray(message.message.content)
              ) {
                for (const contentItem of message.message.content) {
                  if (
                    contentItem.type === 'tool_result' &&
                    contentItem.content &&
                    typeof contentItem.content === 'string' &&
                    contentItem.content.toLowerCase().includes(query.toLowerCase())
                  ) {
                    const matchIndex = contentItem.content
                      .toLowerCase()
                      .indexOf(query.toLowerCase())
                    const start = Math.max(0, matchIndex - 100)
                    const end = Math.min(
                      contentItem.content.length,
                      matchIndex + query.length + 100,
                    )
                    let highlight = contentItem.content.substring(start, end)

                    highlight = highlight.replace(/\s+/g, ' ').trim()

                    if (start > 0) highlight = '...' + highlight
                    if (end < contentItem.content.length) highlight = highlight + '...'

                    highlights.push({
                      messageIndex,
                      text: highlight,
                    })
                    found = true
                    break
                  }
                }
              }

              messageIndex++
            } catch (parseError) {
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
        } catch (error) {
          console.error(`Error processing file ${file}:`, error)
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

              // Search in tool_result content
              if (
                highlights.length === 0 &&
                message.message &&
                message.message.content &&
                Array.isArray(message.message.content)
              ) {
                for (const contentItem of message.message.content) {
                  if (
                    contentItem.type === 'tool_result' &&
                    contentItem.content &&
                    typeof contentItem.content === 'string' &&
                    contentItem.content.toLowerCase().includes(query.toLowerCase())
                  ) {
                    const matchIndex = contentItem.content
                      .toLowerCase()
                      .indexOf(query.toLowerCase())
                    const start = Math.max(0, matchIndex - 100)
                    const end = Math.min(
                      contentItem.content.length,
                      matchIndex + query.length + 100,
                    )
                    let highlight = contentItem.content.substring(start, end)

                    highlight = highlight.replace(/\s+/g, ' ').trim()

                    if (start > 0) highlight = '...' + highlight
                    if (end < contentItem.content.length) highlight = highlight + '...'

                    highlights.push({
                      messageIndex,
                      text: highlight,
                    })
                    break
                  }
                }
              }

              messageIndex++
            } catch (parseError) {
              // Skip invalid JSON lines
              console.error('Error parsing line:', parseError.message)
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
        } catch (error) {
          console.error(`Error processing file ${file}:`, error)
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
          .map((line, lineIndex) => {
            try {
              const parsed = JSON.parse(line)
              let content = ''
              let role = ''

              // First, determine the role based on type field
              if (parsed.type) {
                switch (parsed.type) {
                  case 'human':
                  case 'user':
                    role = 'user'
                    break
                  case 'assistant':
                  case 'completion':
                  case 'ai':
                  case 'summary':
                    role = 'assistant'
                    break
                  case 'system':
                    role = 'system'
                    break
                  default:
                    // For unknown types, we'll try to determine later
                    console.log(`Unknown message type: ${parsed.type}`)
                }
              }

              // Extract content based on message structure
              if (parsed.message && parsed.message.content) {
                // Standard message format
                if (!role && parsed.message.role) {
                  role = parsed.message.role
                }
                if (typeof parsed.message.content === 'string') {
                  content = parsed.message.content
                } else if (Array.isArray(parsed.message.content)) {
                  content = parsed.message.content
                    .map((c: any) => {
                      if (typeof c === 'string') return c
                      if (c.text) return c.text
                      if (c.content) return c.content
                      return ''
                    })
                    .join('\n')
                } else if (
                  typeof parsed.message.content === 'object' &&
                  parsed.message.content.text
                ) {
                  content = parsed.message.content.text
                }
              } else if (parsed.content) {
                // Direct content field
                if (!role && parsed.role) {
                  role = parsed.role
                }
                if (typeof parsed.content === 'string') {
                  content = parsed.content
                } else if (Array.isArray(parsed.content)) {
                  content = parsed.content
                    .map((c: any) => {
                      if (typeof c === 'string') return c
                      if (c.text) return c.text
                      return ''
                    })
                    .join('\n')
                }
              } else if (parsed.text) {
                // Text field
                if (!role && parsed.role) {
                  role = parsed.role
                }
                content = parsed.text
              } else if (parsed.summary) {
                // Summary field - usually for assistant messages
                if (!role) {
                  role = 'assistant'
                }
                content = parsed.summary
              } else if (parsed.query) {
                // Query field - definitely user message
                role = 'user'
                content = parsed.query
              } else if (parsed.response) {
                // Response field - definitely assistant message
                role = 'assistant'
                content = parsed.response
              } else {
                // Try to find any text-like field
                const textFields = ['text', 'body', 'message_text', 'msg', 'data']
                for (const field of textFields) {
                  if (parsed[field] && typeof parsed[field] === 'string') {
                    content = parsed[field]
                    if (!role && parsed.role) {
                      role = parsed.role
                    }
                    break
                  }
                }

                if (!content) {
                  // Log unhandled format
                  console.log(
                    `Line ${lineIndex}: Unhandled message format:`,
                    JSON.stringify(parsed).substring(0, 200),
                  )
                }
              }

              // If we still don't have a role, skip this message
              if (!role) {
                console.log(
                  `Line ${lineIndex}: Could not determine role for message:`,
                  JSON.stringify(parsed).substring(0, 200),
                )
                return null
              }

              // Only return if we have content or it's a valid message structure
              if (content || parsed.message || parsed.type) {
                return {
                  role,
                  content,
                  timestamp: parsed.timestamp || parsed.ts || parsed.created_at,
                  type: parsed.type,
                  original: parsed, // Keep original for debugging
                }
              }

              return null
            } catch (err) {
              console.error(`Failed to parse line ${lineIndex}:`, line.substring(0, 100), err)
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
      } catch (error) {
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
          // Get file stats for fallback timestamps
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
        } catch (error) {
          console.error(`Error reading session ${file}:`, error)
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
    const { sessionIds, projectFilter, format = 'json' } = req.body
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
          const sessionId = file.replace('.jsonl', '')
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8')
          const lines = content.split('\n').filter((line) => line.trim())

          // Parse messages from JSONL
          const messages = lines
            .map((line, lineIndex) => {
              try {
                const parsed = JSON.parse(line)
                let content = ''
                let role = ''

                // Use the same parsing logic as in the session detail endpoint
                if (parsed.type) {
                  switch (parsed.type) {
                    case 'human':
                    case 'user':
                      role = 'user'
                      break
                    case 'assistant':
                    case 'completion':
                    case 'ai':
                      role = 'assistant'
                      break
                    case 'system':
                      role = 'system'
                      break
                  }
                }

                // Extract content
                if (parsed.message && parsed.message.content) {
                  if (!role && parsed.message.role) {
                    role = parsed.message.role
                  }
                  if (typeof parsed.message.content === 'string') {
                    content = parsed.message.content
                  } else if (Array.isArray(parsed.message.content)) {
                    content = parsed.message.content
                      .map((c: any) => {
                        if (typeof c === 'string') return c
                        if (c.text) return c.text
                        if (c.content) return c.content
                        return ''
                      })
                      .join('\n')
                  }
                } else if (parsed.content) {
                  if (!role && parsed.role) {
                    role = parsed.role
                  }
                  content = typeof parsed.content === 'string' ? parsed.content : ''
                } else if (parsed.text) {
                  if (!role && parsed.role) {
                    role = parsed.role
                  }
                  content = parsed.text
                } else if (parsed.summary) {
                  if (!role) {
                    role = 'assistant'
                  }
                  content = parsed.summary
                }

                if (!role) return null

                return {
                  role,
                  content,
                  timestamp: parsed.timestamp || parsed.ts || parsed.created_at,
                }
              } catch {
                return null
              }
            })
            .filter(Boolean)

          if (messages.length === 0) continue

          // Generate title from first user message if not present
          const firstUserMessage = messages.find((m) => m.role === 'user')
          const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 100) +
              (firstUserMessage.content.length > 100 ? '...' : '')
            : 'Untitled Session'

          sessions.push({
            id: sessionId,
            project: project.replace(/-/g, '/'),
            title,
            created_at: messages[0]?.timestamp || new Date().toISOString(),
            updated_at: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
            messages,
            messageCount: messages.length,
            tags: [],
          })
        } catch (error) {
          console.error(`Error exporting session ${file}:`, error)
        }
      }
    }

    // Filter by session IDs if provided
    let exportSessions = sessions
    if (sessionIds && Array.isArray(sessionIds) && sessionIds.length > 0) {
      exportSessions = sessions.filter((s) => sessionIds.includes(s.id))
    }
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sessionCount: exportSessions.length,
      sessions: exportSessions,
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
      return res.status(400).json({ error: 'Invalid import data format' })
    }

    // Validate the import data structure
    if (!Array.isArray(data.sessions)) {
      return res.status(400).json({ error: 'Sessions must be an array' })
    }

    // Since we're in import mode, we don't actually save to disk
    // The client will handle the imported sessions in memory
    res.json({
      success: true,
      message: `Successfully loaded ${data.sessions.length} sessions in import mode. These sessions are viewable but not saved to disk.`,
      importedCount: data.sessions.length,
      warnings: [],
    })
  } catch (error) {
    console.error('Error importing sessions:', error)
    res.status(500).json({ error: 'Failed to import sessions' })
  }
})

// Serve index.html for all non-API routes (client-side routing)
app.get('*', serveIndex)

// Start server
const port = process.env.PORT || 3212
const server = app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`)
})

// Graceful shutdown handlers
const shutdown = () => {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGHUP', shutdown)
