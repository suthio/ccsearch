import { ClaudeSession, SearchResult } from '../types/claude'

export class SearchEngine {
  search(sessions: ClaudeSession[], query: string): SearchResult[] {
    if (!query.trim()) {
      return []
    }

    const searchTerms = query
      .toLowerCase()
      .split(' ')
      .filter((term) => term.length > 0)
    const results: SearchResult[] = []

    for (const session of sessions) {
      const sessionResult: SearchResult = {
        session,
        matches: [],
        score: 0,
      }

      for (let i = 0; i < session.messages.length; i++) {
        const message = session.messages[i]
        const content = message.content.toLowerCase()
        let messageScore = 0
        const highlights: string[] = []

        for (const term of searchTerms) {
          if (content.includes(term)) {
            messageScore += (content.match(new RegExp(term, 'gi')) || []).length

            const regex = new RegExp(`(${term})`, 'gi')
            const parts = message.content.split(regex)

            for (let j = 0; j < parts.length; j++) {
              if (parts[j].toLowerCase() === term) {
                const start = Math.max(0, j - 10)
                const end = Math.min(parts.length, j + 10)
                const highlight = parts.slice(start, end).join('')
                highlights.push(this.createHighlight(highlight, term))
              }
            }
          }
        }

        if (messageScore > 0) {
          sessionResult.matches.push({
            message,
            messageIndex: i,
            highlights:
              highlights.length > 0
                ? highlights
                : [this.createDefaultHighlight(message.content, searchTerms)],
          })
          sessionResult.score += messageScore
        }
      }

      if (sessionResult.matches.length > 0) {
        if (
          session.title &&
          searchTerms.some((term) => session.title!.toLowerCase().includes(term))
        ) {
          sessionResult.score += 5
        }
        results.push(sessionResult)
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  private createHighlight(text: string, term: string): string {
    const contextLength = 80 // Characters to show before/after match
    const termIndex = text.toLowerCase().indexOf(term.toLowerCase())

    if (termIndex === -1) {
      return text.substring(0, 200) + (text.length > 200 ? '...' : '')
    }

    // Calculate context boundaries
    const start = Math.max(0, termIndex - contextLength)
    const end = Math.min(text.length, termIndex + term.length + contextLength)

    // Extract the context
    let highlight = text.substring(start, end)

    // Add ellipsis if truncated
    if (start > 0) {
      // Find word boundary
      const wordBoundary = highlight.match(/^\S*\s/)
      if (wordBoundary) {
        highlight = '...' + highlight.substring(wordBoundary[0].length)
      } else {
        highlight = '...' + highlight
      }
    }

    if (end < text.length) {
      // Find word boundary
      const wordBoundary = highlight.match(/\s\S*$/)
      if (wordBoundary) {
        highlight = highlight.substring(0, highlight.length - wordBoundary[0].length) + '...'
      } else {
        highlight = highlight + '...'
      }
    }

    return highlight
  }

  private createDefaultHighlight(content: string, terms: string[]): string {
    for (const term of terms) {
      const index = content.toLowerCase().indexOf(term)
      if (index !== -1) {
        return this.createHighlight(content, term)
      }
    }
    return content.substring(0, 200) + (content.length > 200 ? '...' : '')
  }
}
