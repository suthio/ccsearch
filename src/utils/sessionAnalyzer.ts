import { ClaudeSession, ClaudeMessage } from '../types/claude'

export interface SessionSummary {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  totalWords: number
  avgWordsPerMessage: number
  conversationDuration: string
  conversationType: ConversationType
  mainTopics: string[]
  keyPhrases: string[]
  codeBlocks: number
  questions: number
  hasError: boolean
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
}

export type ConversationType =
  | 'coding'
  | 'debugging'
  | 'qa'
  | 'explanation'
  | 'analysis'
  | 'general'
  | 'mixed'

export class SessionAnalyzer {
  static analyzeSessions(sessions: ClaudeSession[]): Map<string, SessionSummary> {
    const summaries = new Map<string, SessionSummary>()

    for (const session of sessions) {
      summaries.set(session.id, this.analyzeSession(session))
    }

    return summaries
  }

  static analyzeSession(session: ClaudeSession): SessionSummary {
    const messages = session.messages || []

    // Basic statistics
    const totalMessages = messages.length
    const userMessages = messages.filter((m) => m.role === 'user' || m.type === 'user').length
    const assistantMessages = messages.filter(
      (m) => m.role === 'assistant' || m.type === 'assistant',
    ).length

    // Word count
    const totalWords = messages.reduce((sum, msg) => {
      const content = this.extractContent(msg)
      return sum + this.countWords(content)
    }, 0)
    const avgWordsPerMessage = totalMessages > 0 ? Math.round(totalWords / totalMessages) : 0

    // Duration (if timestamps available)
    const duration = this.calculateDuration(session)

    // Analyze content
    const conversationType = this.detectConversationType(messages)
    const mainTopics = this.extractMainTopics(messages)
    const keyPhrases = this.extractKeyPhrases(messages)
    const codeBlocks = this.countCodeBlocks(messages)
    const questions = this.countQuestions(messages)
    const hasError = this.detectErrors(messages)
    const sentiment = this.analyzeSentiment(messages)

    return {
      totalMessages,
      userMessages,
      assistantMessages,
      totalWords,
      avgWordsPerMessage,
      conversationDuration: duration,
      conversationType,
      mainTopics,
      keyPhrases,
      codeBlocks,
      questions,
      hasError,
      sentiment,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractContent(msg: any): string {
    if (!msg) return ''

    // Try different content fields
    if (msg.content && typeof msg.content === 'string') {
      return msg.content
    } else if (msg.text && typeof msg.text === 'string') {
      return msg.text
    } else if (msg.summary) {
      return msg.summary
    } else if (msg.message && msg.message.content) {
      if (typeof msg.message.content === 'string') {
        return msg.message.content
      } else if (Array.isArray(msg.message.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return msg.message.content.map((c: any) => c.text || '').join(' ')
      }
    }

    return ''
  }

  private static countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  private static calculateDuration(session: ClaudeSession): string {
    const start = new Date(session.created_at)
    const end = new Date(session.updated_at)
    const diff = end.getTime() - start.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  private static detectConversationType(messages: ClaudeMessage[]): ConversationType {
    const fullText = messages
      .map((m) => this.extractContent(m))
      .join(' ')
      .toLowerCase()

    // Count indicators
    const codeIndicators = [
      'function',
      'const',
      'let',
      'var',
      'class',
      'import',
      'export',
      'return',
      'if',
      'else',
      'for',
      'while',
      '```',
      'code',
      'implement',
    ]
    const debugIndicators = [
      'error',
      'bug',
      'fix',
      'issue',
      'problem',
      'debug',
      'trace',
      'exception',
      'fail',
      'crash',
      'wrong',
    ]
    const qaIndicators = [
      'what is',
      'how to',
      'why',
      'when',
      'where',
      'explain',
      'tell me',
      'can you',
      '?',
    ]
    const analysisIndicators = [
      'analyze',
      'review',
      'evaluate',
      'assess',
      'examine',
      'investigate',
      'study',
      'research',
    ]

    const scores = {
      coding: this.countIndicators(fullText, codeIndicators),
      debugging: this.countIndicators(fullText, debugIndicators),
      qa: this.countIndicators(fullText, qaIndicators),
      analysis: this.countIndicators(fullText, analysisIndicators),
    }

    const maxScore = Math.max(...Object.values(scores))

    if (maxScore < 3) return 'general'

    if (scores.debugging > scores.coding * 0.5 && scores.debugging > 2) {
      return 'debugging'
    }
    if (scores.coding > maxScore * 0.7) return 'coding'
    if (scores.qa > maxScore * 0.7) return 'qa'
    if (scores.analysis > maxScore * 0.7) return 'analysis'

    return 'mixed'
  }

  private static countIndicators(text: string, indicators: string[]): number {
    return indicators.reduce((count, indicator) => {
      // Escape special regex characters
      const escapedIndicator = indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedIndicator, 'gi')
      const matches = text.match(regex)
      return count + (matches ? matches.length : 0)
    }, 0)
  }

  private static extractMainTopics(messages: ClaudeMessage[]): string[] {
    const topics = new Set<string>()
    const fullText = messages.map((m) => this.extractContent(m)).join(' ')

    // Programming languages
    const languages = ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby']
    languages.forEach((lang) => {
      // Escape special regex characters
      const escapedLang = lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escapedLang}\\b`, 'i').test(fullText)) {
        // Special case for c++
        if (lang === 'c++') {
          topics.add('C++')
        } else {
          topics.add(lang.charAt(0).toUpperCase() + lang.slice(1))
        }
      }
    })

    // Frameworks and libraries
    const frameworks = ['react', 'vue', 'angular', 'express', 'django', 'flask', 'spring']
    frameworks.forEach((fw) => {
      // Escape special regex characters
      const escapedFw = fw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escapedFw}\\b`, 'i').test(fullText)) {
        topics.add(fw.charAt(0).toUpperCase() + fw.slice(1))
      }
    })

    // Common tech topics
    const techTopics = [
      'api',
      'database',
      'frontend',
      'backend',
      'deployment',
      'testing',
      'security',
    ]
    techTopics.forEach((topic) => {
      // Escape special regex characters
      const escapedTopic = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escapedTopic}\\b`, 'i').test(fullText)) {
        topics.add(topic.toUpperCase())
      }
    })

    return Array.from(topics).slice(0, 5)
  }

  private static extractKeyPhrases(messages: ClaudeMessage[]): string[] {
    const phrases: string[] = []

    // Extract phrases from user questions
    messages
      .filter((m) => m.role === 'user' || m.type === 'user')
      .forEach((msg) => {
        const content = this.extractContent(msg)
        // Look for question patterns
        const questionMatch = content.match(
          /(?:how to|what is|why|when|where|can you|could you)\s+([^.?!]+)/i,
        )
        if (questionMatch) {
          phrases.push(questionMatch[1].trim().slice(0, 50))
        }

        // Look for "I want to" patterns
        const wantMatch = content.match(/(?:i want to|i need to|i'm trying to)\s+([^.?!]+)/i)
        if (wantMatch) {
          phrases.push(wantMatch[1].trim().slice(0, 50))
        }
      })

    return phrases.slice(0, 3)
  }

  private static countCodeBlocks(messages: ClaudeMessage[]): number {
    const fullText = messages.map((m) => this.extractContent(m)).join('\n')
    const codeBlockMatches = fullText.match(/```[\s\S]*?```/g)
    return codeBlockMatches ? codeBlockMatches.length : 0
  }

  private static countQuestions(messages: ClaudeMessage[]): number {
    return messages.filter((m) => {
      const isUser = m.role === 'user' || m.type === 'user'
      const content = this.extractContent(m)
      return isUser && content.includes('?')
    }).length
  }

  private static detectErrors(messages: ClaudeMessage[]): boolean {
    const errorKeywords = ['error', 'exception', 'fail', 'crash', 'bug', 'issue', 'problem']
    const fullText = messages
      .map((m) => this.extractContent(m))
      .join(' ')
      .toLowerCase()

    return errorKeywords.some((keyword) => fullText.includes(keyword))
  }

  private static analyzeSentiment(
    messages: ClaudeMessage[],
  ): 'positive' | 'neutral' | 'negative' | 'mixed' {
    const positiveWords = [
      'thank',
      'great',
      'perfect',
      'excellent',
      'good',
      'helpful',
      'works',
      'solved',
    ]
    const negativeWords = ['error', 'fail', 'wrong', 'bad', 'issue', 'problem', 'stuck', 'confused']

    const fullText = messages
      .map((m) => this.extractContent(m))
      .join(' ')
      .toLowerCase()

    const positiveCount = this.countIndicators(fullText, positiveWords)
    const negativeCount = this.countIndicators(fullText, negativeWords)

    if (positiveCount > negativeCount * 2) return 'positive'
    if (negativeCount > positiveCount * 2) return 'negative'
    if (positiveCount > 0 && negativeCount > 0) return 'mixed'

    return 'neutral'
  }

  static generateSessionSummaryText(summary: SessionSummary): string {
    const typeDescriptions: Record<ConversationType, string> = {
      coding: 'コーディングセッション',
      debugging: 'デバッグセッション',
      qa: 'Q&Aセッション',
      explanation: '説明セッション',
      analysis: '分析セッション',
      general: '一般的な会話',
      mixed: '複合的な会話',
    }

    const sentimentDescriptions = {
      positive: '良好',
      negative: '問題あり',
      neutral: '中立',
      mixed: '混合',
    }

    let summaryText = `【${typeDescriptions[summary.conversationType]}】\n`
    summaryText += `メッセージ数: ${summary.totalMessages} (User: ${summary.userMessages}, Assistant: ${summary.assistantMessages})\n`
    summaryText += `会話時間: ${summary.conversationDuration}\n`

    if (summary.mainTopics.length > 0) {
      summaryText += `主要トピック: ${summary.mainTopics.join(', ')}\n`
    }

    if (summary.codeBlocks > 0) {
      summaryText += `コードブロック: ${summary.codeBlocks}個\n`
    }

    if (summary.hasError) {
      summaryText += `⚠️ エラー/問題が含まれています\n`
    }

    summaryText += `雰囲気: ${sentimentDescriptions[summary.sentiment]}`

    return summaryText
  }
}
