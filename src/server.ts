import express from 'express'
import * as http from 'http'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { SessionFileReader } from './utils/fileReader'
import { searchRoutes } from './routes/search'

const execAsync = promisify(exec)

export class Server {
  private app: express.Application
  private server: http.Server | null = null
  private fileReader: SessionFileReader

  constructor() {
    this.app = express()
    this.fileReader = new SessionFileReader()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '200mb' }))
    this.app.use(express.urlencoded({ limit: '200mb', extended: true }))
    // Serve static files from dist directory
    // When compiled, __dirname is the dist directory itself
    const publicPath = __dirname
    this.app.use(express.static(publicPath))
  }

  private setupRoutes(): void {
    this.app.use('/api/search', searchRoutes(this.fileReader))

    this.app.get('/api/projects', async (req, res) => {
      try {
        const projects = await this.fileReader.getProjects()
        res.json(projects)
      } catch (error) {
        console.error('Error fetching projects:', error)
        res.status(500).json({ error: 'Failed to fetch projects' })
      }
    })

    this.app.get('/api/sessions', async (req, res) => {
      try {
        const projectFilter = req.query.project as string
        const sessions = await this.fileReader.getAllSessions()
        const limit = parseInt(req.query.limit as string) || 50

        // Filter by project if specified
        let filteredSessions = sessions
        if (projectFilter && projectFilter !== 'all') {
          filteredSessions = sessions.filter((s) => s.project === projectFilter)
        }

        // Sort by updated_at descending (most recent first)
        const sortedSessions = filteredSessions.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )

        // Add summary info
        const sessionsWithSummary = sortedSessions.slice(0, limit).map((session) => {
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
              role =
                msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'
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
            } else if (msg.message) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const message = msg.message as any
              if (typeof message === 'object' && message !== null && 'content' in message) {
                const msgContent = message.content
                content =
                  typeof msgContent === 'string'
                    ? msgContent
                    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      msgContent.map((c: any) => c.text || '').join(' ')
              }
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

        res.json({
          total: filteredSessions.length,
          sessions: sessionsWithSummary,
        })
      } catch (error) {
        console.error('Error fetching sessions:', error)
        res.status(500).json({ error: 'Failed to fetch sessions' })
      }
    })

    this.app.get('/api/session/:id', async (req, res) => {
      try {
        const sessions = await this.fileReader.getAllSessions()
        const session = sessions.find((s) => s.id === req.params.id)
        if (session) {
          res.json(session)
        } else {
          res.status(404).json({ error: 'Session not found' })
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        res.status(500).json({ error: 'Failed to fetch session' })
      }
    })

    this.app.put('/api/session/:id/tags', async (req, res) => {
      try {
        const { tags } = req.body
        const sessionId = req.params.id

        if (!Array.isArray(tags)) {
          return res.status(400).json({ error: 'Tags must be an array' })
        }

        // Read sessions
        const sessions = await this.fileReader.getAllSessions()
        const sessionIndex = sessions.findIndex((s) => s.id === sessionId)

        if (sessionIndex === -1) {
          return res.status(404).json({ error: 'Session not found' })
        }

        // Update tags
        sessions[sessionIndex].tags = tags

        // Save back to file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs').promises
        const sessionFilePath = sessions[sessionIndex].filepath
        await fs.writeFile(sessionFilePath, JSON.stringify(sessions[sessionIndex], null, 2))

        res.json({ success: true, tags })
      } catch (error) {
        console.error('Error updating tags:', error)
        res.status(500).json({ error: 'Failed to update tags' })
      }
    })

    this.app.put('/api/session/:id/title', async (req, res) => {
      try {
        const { title } = req.body
        const sessionId = req.params.id

        if (typeof title !== 'string') {
          return res.status(400).json({ error: 'Title must be a string' })
        }

        // Read sessions
        const sessions = await this.fileReader.getAllSessions()
        const sessionIndex = sessions.findIndex((s) => s.id === sessionId)

        if (sessionIndex === -1) {
          return res.status(404).json({ error: 'Session not found' })
        }

        // Update title
        sessions[sessionIndex].title = title

        // Save back to file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs').promises
        const sessionFilePath = sessions[sessionIndex].filepath
        await fs.writeFile(sessionFilePath, JSON.stringify(sessions[sessionIndex], null, 2))

        res.json({ success: true, title })
      } catch (error) {
        console.error('Error updating title:', error)
        res.status(500).json({ error: 'Failed to update title' })
      }
    })

    this.app.delete('/api/session/:id', async (req, res) => {
      try {
        const sessionId = req.params.id

        // Read sessions
        const sessions = await this.fileReader.getAllSessions()
        const sessionIndex = sessions.findIndex((s) => s.id === sessionId)

        if (sessionIndex === -1) {
          return res.status(404).json({ error: 'Session not found' })
        }

        // Get file path before removing from array
        const sessionFilePath = sessions[sessionIndex].filepath

        // Delete the file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs').promises
        await fs.unlink(sessionFilePath)

        res.json({ success: true, message: 'Session deleted successfully' })
      } catch (error) {
        console.error('Error deleting session:', error)
        res.status(500).json({ error: 'Failed to delete session' })
      }
    })

    this.app.post('/api/open-claude', async (req, res) => {
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
          error: 'Failed to open Claude. Make sure Claude CLI is installed and in PATH.',
        })
      }
    })

    // Export sessions
    this.app.post('/api/export', async (req, res) => {
      try {
        const { sessionIds, projectFilter, format = 'json' } = req.body
        const sessions = await this.fileReader.getAllSessions()

        let exportSessions = sessions

        // Filter by session IDs if provided
        if (sessionIds && Array.isArray(sessionIds) && sessionIds.length > 0) {
          exportSessions = sessions.filter((s) => sessionIds.includes(s.id))
        } else if (projectFilter && projectFilter !== 'all') {
          // Filter by project if no specific sessions are selected
          exportSessions = exportSessions.filter((s) => s.project === projectFilter)
        }

        // Normalize paths to be relative (remove user-specific parts)
        const normalizedSessions = exportSessions.map((session) => {
          const normalizedSession = { ...session }
          // Remove filepath property for privacy
          delete normalizedSession.filepath

          if (session.project) {
            // Extract just the repository part (e.g., "github.com/org/repo")
            const match = session.project.match(/github\.com\/[\w-]+\/[\w-]+/)
            if (match) {
              normalizedSession.project = match[0]
            } else {
              // Keep last 3 parts of the path as a fallback
              const parts = session.project.split('/')
              normalizedSession.project = parts.slice(-3).join('/')
            }
          }
          return normalizedSession
        })

        // Handle different export formats
        if (format === 'csv') {
          // CSV export
          const csv = this.convertToCSV(normalizedSessions)
          res.setHeader('Content-Type', 'text/csv')
          res.send(csv)
        } else if (format === 'markdown') {
          // Markdown export
          const markdown = this.convertToMarkdown(normalizedSessions)
          res.setHeader('Content-Type', 'text/markdown')
          res.send(markdown)
        } else {
          // JSON export (default)
          const exportData = {
            version: '1.1',
            exportDate: new Date().toISOString(),
            sessionCount: normalizedSessions.length,
            exportedFrom: process.platform,
            sessions: normalizedSessions,
          }
          res.json(exportData)
        }
      } catch (error) {
        console.error('Error exporting sessions:', error)
        res.status(500).json({ error: 'Failed to export sessions' })
      }
    })

    // Import sessions
    this.app.post('/api/import', async (req, res) => {
      try {
        const { data } = req.body

        if (!data) {
          return res.status(400).json({
            error: 'No import data provided',
            details: 'The uploaded file appears to be empty or invalid',
          })
        }

        if (!data.sessions || !Array.isArray(data.sessions)) {
          return res.status(400).json({
            error: 'Invalid import data format',
            details:
              'The file does not contain a valid sessions array. Please ensure you are importing a CCSearch export file.',
          })
        }

        if (data.sessions.length === 0) {
          return res.status(400).json({
            error: 'No sessions to import',
            details: 'The export file contains no sessions',
          })
        }

        // Validate session format
        const warnings: string[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validSessions = data.sessions.filter((session: any, index: number) => {
          if (!session.id || !session.messages || !Array.isArray(session.messages)) {
            warnings.push(`Session at index ${index} is missing required fields (id or messages)`)
            return false
          }
          return true
        })

        if (validSessions.length === 0) {
          return res.status(400).json({
            error: 'No valid sessions found',
            details: 'All sessions in the file are missing required fields',
          })
        }

        // Note about path differences
        if (data.exportedFrom && data.exportedFrom !== process.platform) {
          warnings.push(
            `This export was created on ${data.exportedFrom} and you are on ${process.platform}. Project paths have been normalized for compatibility.`,
          )
        }

        res.json({
          success: true,
          message: `Successfully imported ${validSessions.length} of ${data.sessions.length} sessions`,
          importedCount: validSessions.length,
          totalCount: data.sessions.length,
          warnings: warnings.length > 0 ? warnings : undefined,
          metadata: {
            exportDate: data.exportDate,
            version: data.version,
            exportedFrom: data.exportedFrom,
          },
        })
      } catch (error) {
        console.error('Error importing sessions:', error)
        if (error instanceof SyntaxError) {
          res.status(400).json({
            error: 'Invalid JSON format',
            details:
              'The file contains invalid JSON. Please ensure it is a valid CCSearch export file.',
          })
        } else {
          res.status(500).json({
            error: 'Failed to import sessions',
            details: error instanceof Error ? error.message : 'Unknown error occurred',
          })
        }
      }
    })

    // Serve the main app for all non-API routes (client-side routing)
    this.app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, 'index.html')
      res.sendFile(indexPath)
    })
  }

  async start(preferredPort: number = 3000): Promise<number> {
    const tryPort = (port: number): Promise<number> => {
      return new Promise((resolve, reject) => {
        this.server = this.app
          .listen(port)
          .on('listening', () => {
            // eslint-disable-next-line no-console
            console.log(`Server started on http://localhost:${port}`)
            resolve(port)
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              // eslint-disable-next-line no-console
              console.log(`Port ${port} is busy, trying ${port + 1}...`)
              tryPort(port + 1)
                .then(resolve)
                .catch(reject)
            } else {
              reject(err)
            }
          })
      })
    }

    return tryPort(preferredPort)
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      // eslint-disable-next-line no-console
      console.log('Server stopped')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertToCSV(sessions: any[]): string {
    const headers = [
      'Session ID',
      'Title',
      'Project',
      'Created',
      'Updated',
      'Message Count',
      'Tags',
      'First Message',
    ]
    const rows = [headers.join(',')]

    sessions.forEach((session) => {
      // Extract first message content
      let firstMessageContent = ''
      if (session.messages && session.messages.length > 0) {
        const msg = session.messages[0]
        if (msg.content && typeof msg.content === 'string') {
          firstMessageContent = msg.content
        } else if (msg.text && typeof msg.text === 'string') {
          firstMessageContent = msg.text
        } else if (msg.summary) {
          firstMessageContent = msg.summary
        } else if (msg.message && msg.message.content) {
          if (typeof msg.message.content === 'string') {
            firstMessageContent = msg.message.content
          } else if (Array.isArray(msg.message.content)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            firstMessageContent = msg.message.content.map((c: any) => c.text || '').join(' ')
          }
        }
      }

      const row = [
        session.id,
        `"${(session.title || 'Untitled').replace(/"/g, '""')}"`,
        `"${(session.project || '').replace(/"/g, '""')}"`,
        new Date(session.created_at).toISOString(),
        new Date(session.updated_at).toISOString(),
        session.messages.length,
        `"${(session.tags || []).join(', ')}"`,
        `"${firstMessageContent.slice(0, 100).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      ]
      rows.push(row.join(','))
    })

    return rows.join('\n')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertToMarkdown(sessions: any[]): string {
    let markdown = '# Claude Sessions Export\n\n'
    markdown += `Export Date: ${new Date().toISOString()}\n\n`
    markdown += `Total Sessions: ${sessions.length}\n\n`

    sessions.forEach((session) => {
      markdown += `## ${session.title || 'Untitled Session'}\n\n`
      markdown += `- **ID**: ${session.id}\n`
      markdown += `- **Project**: ${session.project || 'N/A'}\n`
      markdown += `- **Created**: ${new Date(session.created_at).toLocaleString()}\n`
      markdown += `- **Updated**: ${new Date(session.updated_at).toLocaleString()}\n`
      markdown += `- **Messages**: ${session.messages.length}\n`
      if (session.tags && session.tags.length > 0) {
        markdown += `- **Tags**: ${session.tags.join(', ')}\n`
      }
      markdown += '\n### Messages\n\n'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.messages.forEach((msg: any, index: number) => {
        // Extract content from various message formats
        let content = ''
        let role = 'System'

        if (msg.role) {
          role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'
        } else if (msg.type) {
          if (msg.type === 'user') role = 'User'
          else if (msg.type === 'assistant') role = 'Assistant'
        }

        // Extract content from various formats
        if (msg.content && typeof msg.content === 'string') {
          content = msg.content
        } else if (msg.text && typeof msg.text === 'string') {
          content = msg.text
        } else if (msg.summary) {
          content = msg.summary
        } else if (msg.message && msg.message.content) {
          if (typeof msg.message.content === 'string') {
            content = msg.message.content
          } else if (Array.isArray(msg.message.content)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content = msg.message.content.map((c: any) => c.text || '').join(' ')
          }
        }

        markdown += `#### ${role} (${index + 1})\n\n`
        markdown += `${content}\n\n`
        if (index < session.messages.length - 1) {
          markdown += '---\n\n'
        }
      })

      markdown += '\n\n'
    })

    return markdown
  }
}
