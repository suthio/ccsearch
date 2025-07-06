export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ClaudeSession {
  id: string
  title?: string
  created_at: string
  updated_at: string
  messages: ClaudeMessage[]
  filepath: string
  project?: string
  messageCount?: number
  preview?: string
  tags?: string[]
}

export interface SearchMatch {
  message: ClaudeMessage
  messageIndex: number
  highlights: string[]
}

export interface SearchResult {
  session: ClaudeSession
  matches: SearchMatch[]
  score: number
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
}

export interface SessionsResponse {
  total: number
  sessions: ClaudeSession[]
}

export interface Project {
  name: string
  path: string
  displayPath?: string
  sessionCount: number
}
