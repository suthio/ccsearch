export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  type?: string
  text?: string
  summary?: string
  message?: string
}

export interface ClaudeSession {
  id: string
  title?: string
  created_at: string
  updated_at: string
  messages: ClaudeMessage[]
  filepath?: string
  project?: string
  tags?: string[]
}

export interface SearchResult {
  session: ClaudeSession
  matches: {
    message: ClaudeMessage
    messageIndex: number
    highlights: string[]
  }[]
  score: number
}

export interface Project {
  name: string
  path: string
  displayPath?: string
  sessionCount: number
}
