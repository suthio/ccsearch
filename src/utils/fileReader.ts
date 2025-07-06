import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { ClaudeSession, ClaudeMessage, Project } from '../types/claude'

export class SessionFileReader {
  private claudeProjectsDir: string

  constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    this.claudeProjectsDir = path.join(homeDir, '.claude', 'projects')
  }

  async getProjects(): Promise<Project[]> {
    const projects: Project[] = []

    if (!fs.existsSync(this.claudeProjectsDir)) {
      return projects
    }

    const projectDirs = await fs.promises.readdir(this.claudeProjectsDir)

    for (const projectDir of projectDirs) {
      const projectPath = path.join(this.claudeProjectsDir, projectDir)

      try {
        const stats = await fs.promises.stat(projectPath)
        if (!stats.isDirectory()) continue

        const files = await fs.promises.readdir(projectPath)
        const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'))

        if (jsonlFiles.length > 0) {
          // Convert the directory name back to the original path
          // The directory format is: -Users-yuma-go-src-github-com-identifyinc-delmo-backend
          // Which represents: /Users/yuma/go/src/github.com/identifyinc/delmo-backend

          // Claude uses a simple encoding: replace all '/' with '-' and prepend '-'
          // To decode, we need to be smart about which '-' to convert back to '/'

          // Remove leading hyphen
          let workingPath = projectDir.substring(1)

          // Handle known patterns where hyphen should be replaced with slash
          // Start with the most specific patterns
          workingPath = workingPath
            .replace(/^Users-/, 'Users/')
            .replace(/^home-/, 'home/')
            .replace(/-go-src-/, '/go/src/')
            .replace(/-src-/, '/src/')
            .replace(/-github-com-/, '/github.com/')
            .replace(/-gitlab-com-/, '/gitlab.com/')
            .replace(/-bitbucket-org-/, '/bitbucket.org/')

          // For remaining parts after github.com/org/, replace '-' with '/' only for known directory patterns
          // This preserves hyphens in repository and directory names
          const domainMatch = workingPath.match(
            /(github\.com|gitlab\.com|bitbucket\.org)\/([^\/]+)\/(.*)/,
          )
          if (domainMatch) {
            const [, domain, org, rest] = domainMatch
            // In the rest part, only replace hyphens that are clearly directory separators
            const processedRest = rest
              .replace(/-backend-terraforms-/, '/backend/terraforms/')
              .replace(/-frontend-/, '/frontend/')
              .replace(/-scripts-/, '/scripts/')
              .replace(/-drive-2-backend/, '-drive-2/backend')
              .replace(/-drive-2-/, '-drive-2/')
              .replace(/-gdrive-backend/, '-gdrive/backend')
              .replace(/-gdrive-frontend/, '-gdrive/frontend')

            workingPath = `${domain}/${org}/${processedRest}`
          }

          const fixedPath = '/' + workingPath
          const pathParts = fixedPath.split('/')
          const projectName = pathParts[pathParts.length - 1] || fixedPath

          projects.push({
            name: projectName,
            path: fixedPath,
            displayPath: fixedPath,
            sessionCount: jsonlFiles.length,
          })
        }
      } catch (error) {
        console.error(`Error reading project directory ${projectDir}:`, error)
      }
    }

    return projects.sort((a, b) => b.sessionCount - a.sessionCount)
  }

  async getAllSessions(): Promise<ClaudeSession[]> {
    const sessions: ClaudeSession[] = []

    if (!fs.existsSync(this.claudeProjectsDir)) {
      console.warn(`Claude projects directory not found: ${this.claudeProjectsDir}`)
      return sessions
    }

    // Read all project directories
    const projectDirs = await fs.promises.readdir(this.claudeProjectsDir)

    for (const projectDir of projectDirs) {
      const projectPath = path.join(this.claudeProjectsDir, projectDir)

      try {
        const stats = await fs.promises.stat(projectPath)
        if (!stats.isDirectory()) continue

        // Read all JSONL files in the project directory
        const files = await fs.promises.readdir(projectPath)
        const jsonlFiles = files.filter((file) => file.endsWith('.jsonl'))

        for (const file of jsonlFiles) {
          try {
            const session = await this.readSessionFile(path.join(projectPath, file))
            if (session) {
              // Add project name to session
              // Convert the directory name back to the original path
              let workingPath = projectDir.substring(1)

              // Apply the same conversion logic as in getProjects
              workingPath = workingPath
                .replace(/^Users-/, 'Users/')
                .replace(/^home-/, 'home/')
                .replace(/-go-src-/, '/go/src/')
                .replace(/-src-/, '/src/')
                .replace(/-github-com-/, '/github.com/')
                .replace(/-gitlab-com-/, '/gitlab.com/')
                .replace(/-bitbucket-org-/, '/bitbucket.org/')

              const domainMatch = workingPath.match(
                /(github\.com|gitlab\.com|bitbucket\.org)\/([^\/]+)\/(.*)/,
              )
              if (domainMatch) {
                const [, domain, org, rest] = domainMatch
                const processedRest = rest
                  .replace(/-backend-terraforms-/, '/backend/terraforms/')
                  .replace(/-frontend-/, '/frontend/')
                  .replace(/-scripts-/, '/scripts/')
                  .replace(/-drive-2-backend/, '-drive-2/backend')
                  .replace(/-drive-2-/, '-drive-2/')
                  .replace(/-gdrive-backend/, '-gdrive/backend')
                  .replace(/-gdrive-frontend/, '-gdrive/frontend')

                workingPath = `${domain}/${org}/${processedRest}`
              }

              session.project = '/' + workingPath
              sessions.push(session)
            }
          } catch (error) {
            console.error(`Error reading session file ${file}:`, error)
          }
        }
      } catch (error) {
        console.error(`Error reading project directory ${projectDir}:`, error)
      }
    }

    return sessions
  }

  private async readSessionFile(filepath: string): Promise<ClaudeSession | null> {
    // Get file stats for fallback timestamps
    const stats = await fs.promises.stat(filepath)
    const fileBirthtime = stats.birthtime.toISOString()
    const fileMtime = stats.mtime.toISOString()

    const fileStream = fs.createReadStream(filepath)
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    const messages: ClaudeMessage[] = []
    let sessionId = path.basename(filepath, '.jsonl')
    let createdAt = ''
    let updatedAt = ''
    let title = ''

    for await (const line of rl) {
      if (!line.trim()) continue

      try {
        const data = JSON.parse(line)

        // Handle different message formats
        if (data.type === 'user' || data.type === 'assistant') {
          if (data.message) {
            const msg = data.message
            let content = ''

            // Extract content from different formats
            if (typeof msg.content === 'string') {
              content = msg.content
            } else if (Array.isArray(msg.content)) {
              // Handle both text content and tool results
              const contentParts = msg.content
                .map((c: any) => {
                  if (c.text) {
                    return c.text
                  } else if (c.type === 'tool_result' && c.content) {
                    // Include tool result content in searchable text
                    return c.content
                  }
                  return ''
                })
                .filter(Boolean)
              content = contentParts.join('\n')
            }

            if (content) {
              messages.push({
                role: msg.role || data.type,
                content: content,
                timestamp: data.timestamp,
              })
            }
          }

          // Set session ID from the data if available
          if (data.sessionId && !sessionId) {
            sessionId = data.sessionId
          }
        } else if (data.type === 'session_started') {
          sessionId = data.session_id || data.sessionId || sessionId
          createdAt = data.timestamp || fileBirthtime
        } else if (data.type === 'title_updated') {
          title = data.title || ''
        }

        if (data.timestamp) {
          updatedAt = data.timestamp
          if (!createdAt) {
            createdAt = data.timestamp
          }
        }
      } catch (error) {
        console.error('Error parsing line:', error)
      }
    }

    if (messages.length === 0) {
      return null
    }

    return {
      id: sessionId,
      title: title || this.generateTitleFromMessage(messages[0]?.content) || 'Untitled Session',
      created_at: createdAt || updatedAt || fileBirthtime,
      updated_at: updatedAt || createdAt || fileMtime,
      messages,
      filepath,
    }
  }

  private generateTitleFromMessage(content?: string): string {
    if (!content) return ''

    // Clean up the content first
    let cleanContent = content
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim()

    // Try to find a natural break point (period, question mark, exclamation)
    const sentenceEnd = cleanContent.search(/[.!?]/)
    if (sentenceEnd > 0 && sentenceEnd < 150) {
      return cleanContent.substring(0, sentenceEnd + 1).trim()
    }

    // If no sentence end found, look for a good break point
    if (cleanContent.length > 80) {
      // Try to break at a word boundary around 80 characters
      const breakPoint = cleanContent.lastIndexOf(' ', 80)
      if (breakPoint > 40) {
        return cleanContent.substring(0, breakPoint) + '...'
      }
    }

    // If content is short enough, return as is
    if (cleanContent.length <= 80) {
      return cleanContent
    }

    // Otherwise truncate at 80 characters
    return cleanContent.substring(0, 80) + '...'
  }
}
