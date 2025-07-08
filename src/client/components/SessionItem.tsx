import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Code,
  Bug,
  HelpCircle,
  BarChart,
} from 'lucide-react'
import { ClaudeSession, SearchResult } from '../types/api'
import { SessionAnalyzer } from '../../utils/sessionAnalyzer'
import { formatDateTime } from '../../utils/dateFormatter'

interface SessionItemProps {
  session: ClaudeSession
  searchResult?: SearchResult
  searchQuery?: string
  isSelected?: boolean
  onSelectionChange?: (sessionId: string, selected: boolean) => void
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  searchResult,
  searchQuery,
  isSelected = false,
  onSelectionChange,
}) => {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Analyze session for summary
  const summary = useMemo(() => {
    return SessionAnalyzer.analyzeSession(session)
  }, [session])

  const highlightText = (text: string, searchTerms: string[]): React.ReactNode => {
    if (!searchTerms || searchTerms.length === 0) return text

    // Filter out empty terms and escape special regex characters
    const validTerms = searchTerms.filter((term) => term && term.trim().length > 0)
    if (validTerms.length === 0) return text

    const escapedTerms = validTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    // Create regex pattern for all terms
    const pattern = escapedTerms.join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')

    // Split text by matches
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, index) => {
          // Check if this part matches any search term
          const isMatch = validTerms.some((term) => part.toLowerCase() === term.toLowerCase())

          if (isMatch) {
            return (
              <mark
                key={index}
                style={{
                  backgroundColor: '#ffeb3b',
                  padding: '2px 0',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                }}
              >
                {part}
              </mark>
            )
          }
          return part
        })}
      </>
    )
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSelectionChange) {
      onSelectionChange(session.id, !isSelected)
    }
  }

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // Get title from first user message
  const getSessionTitle = (): string => {
    const firstUserMessage = session.messages.find(
      (msg) => msg.role === 'user' && extractMessageContent(msg).trim(),
    )

    if (firstUserMessage) {
      const content = extractMessageContent(firstUserMessage).trim()
      // Remove local command messages
      const lines = content
        .split('\n')
        .filter(
          (line) =>
            !line.includes('<command-name>') &&
            !line.includes('<command-message>') &&
            !line.includes('<local-command-stdout>'),
        )
      const cleanContent = lines.join('\n').trim()

      if (cleanContent) {
        // Limit to reasonable length for title
        return cleanContent.length > 200 ? cleanContent.substring(0, 200) + '...' : cleanContent
      }
    }

    return session.title || 'Untitled Session'
  }

  // Filter messages to show only main user/assistant interactions
  const getMainMessages = () => {
    return session.messages.filter((msg) => {
      const content = extractMessageContent(msg).trim()
      if (!content) return false

      // Skip messages that look like tool calls or system messages
      if (
        content.includes('<function_calls>') ||
        content.includes('<function_results>') ||
        content.includes('<command-name>') ||
        content.includes('<command-message>') ||
        content.includes('<local-command-stdout>') ||
        content.includes('Tool Use:') ||
        content.includes('Function Call:') ||
        content.startsWith("I'll ") ||
        content.startsWith('Let me ')
      ) {
        return false
      }

      // Only show user messages and substantive assistant responses
      return msg.role === 'user' || (msg.role === 'assistant' && content.length > 30)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractMessageContent = (msg: any): string => {
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

  const getProjectDisplayName = (project: string | undefined) => {
    if (!project) return { short: '', full: '' }

    // Extract meaningful parts from the path
    const githubMatch = project.match(/github\.com\/([^/]+\/[^/]+)/)
    if (githubMatch) {
      return {
        short: githubMatch[1],
        full: project,
      }
    }

    // For non-GitHub paths, show more context
    const parts = project.split('/')
    if (parts.length >= 3) {
      return {
        short: parts.slice(-3).join('/'),
        full: project,
      }
    }

    return {
      short: project,
      full: project,
    }
  }

  const getConversationTypeIcon = (type: string) => {
    const icons: Record<string, React.JSX.Element> = {
      coding: <Code size={14} />,
      debugging: <Bug size={14} />,
      qa: <HelpCircle size={14} />,
      analysis: <BarChart size={14} />,
      general: <MessageCircle size={14} />,
      mixed: <MessageCircle size={14} />,
    }
    return icons[type] || <MessageCircle size={14} />
  }

  const getConversationTypeLabel = (type: string) => {
    const typeKey = `session.types.${type}`
    const translated = t(typeKey)
    // If translation key doesn't exist, fall back to default
    if (translated === typeKey) {
      return t('session.types.conversation')
    }
    return translated
  }

  return (
    <div className="session-result" style={{ position: 'relative' }}>
      {onSelectionChange && (
        <div
          onClick={handleCheckboxClick}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '40px',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '20px',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
      <div
        style={{
          paddingLeft: onSelectionChange ? '40px' : '0',
        }}
      >
        <div className="session-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
            <button
              onClick={handleExpandToggle}
              className="expand-button"
              style={{ marginRight: '8px' }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <Link
              to={`/session/${session.id}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                flex: 1,
              }}
            >
              <div style={{ width: '100%' }}>
                <div className="session-title">
                  <span title={getSessionTitle()}>
                    {getSessionTitle().length > 100
                      ? getSessionTitle().substring(0, 100) + '...'
                      : getSessionTitle()}
                  </span>
                  {session.project && (
                    <span
                      title={getProjectDisplayName(session.project).full}
                      style={{
                        fontSize: '0.75em',
                        color: '#888',
                        fontWeight: 'normal',
                        marginLeft: '8px',
                        fontFamily: 'monospace',
                        opacity: 0.8,
                      }}
                    >
                      {getProjectDisplayName(session.project).short}
                    </span>
                  )}
                </div>
                <div
                  className="session-meta"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '8px',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    {getConversationTypeIcon(summary.conversationType)}
                    {getConversationTypeLabel(summary.conversationType)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {formatDateTime(session.created_at)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {formatDateTime(session.updated_at)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {session.messageCount} {t('session.messages')}
                  </span>
                  {summary.hasError && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      ⚠️ {t('session.hasError')}
                    </span>
                  )}
                  {searchResult && (
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {searchResult.matches.length} matches
                    </span>
                  )}
                </div>
                {session.tags && session.tags.length > 0 && (
                  <div className="session-tags" style={{ marginTop: '5px' }}>
                    {session.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="tag"
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          marginRight: '5px',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '12px',
                          fontSize: '0.8em',
                          fontWeight: '500',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Enhanced session preview with summary info */}
        <div
          className="session-preview"
          style={{
            marginTop: '12px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            borderLeft: '3px solid #e5e7eb',
          }}
        >
          {/* Summary stats */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '12px',
              fontSize: '0.8rem',
              color: '#6b7280',
            }}
          >
            {summary.mainTopics.length > 0 && (
              <div>
                <strong>{t('session.topics')}:</strong> {summary.mainTopics.slice(0, 3).join(', ')}
              </div>
            )}
            <div>
              <strong>{t('session.duration')}:</strong> {summary.conversationDuration}
            </div>
            {summary.codeBlocks > 0 && (
              <div>
                <strong>{t('session.code')}:</strong> {summary.codeBlocks} {t('session.blocks')}
              </div>
            )}
          </div>

          {/* Key messages preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {getMainMessages()
              .slice(0, 3)
              .map((msg, idx) => {
                const content = extractMessageContent(msg)
                const role = msg.role || 'system'
                const displayRole = role === 'user' ? 'User' : 'Assistant'

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: '600',
                        color: role === 'user' ? '#2563eb' : '#059669',
                        fontSize: '0.8rem',
                        minWidth: '60px',
                      }}
                    >
                      {displayRole}:
                    </span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: '#374151',
                        lineHeight: '1.4',
                        flex: 1,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {content.length > 150 ? content.substring(0, 150) + '...' : content}
                    </span>
                  </div>
                )
              })}

            {getMainMessages().length > 3 && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  fontStyle: 'italic',
                  marginTop: '4px',
                }}
              >
                ...他 {getMainMessages().length - 3} メッセージ
              </div>
            )}
          </div>
        </div>

        {searchResult && searchResult.matches.length > 0 && (
          <div className="matches">
            {searchResult.matches.slice(0, 3).map((match, index) => {
              const searchTerms = searchQuery
                ? searchQuery.split(' ').filter((t) => t.length > 0)
                : []

              return (
                <div key={index} className="match">
                  <div className="match-role">{match.message.role}</div>
                  <div className="match-content">
                    {highlightText(
                      match.highlights[0] || match.message.content.substring(0, 200),
                      searchTerms,
                    )}
                  </div>
                </div>
              )
            })}
            {searchResult.matches.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: '10px', color: '#7f8c8d' }}>
                ... and {searchResult.matches.length - 3} more matches
              </div>
            )}
          </div>
        )}

        {isExpanded && session.messages && (
          <div
            className="expanded-content"
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div
              style={{
                fontSize: '0.85em',
                color: '#6b7280',
                marginBottom: '12px',
                fontWeight: '500',
              }}
            >
              Full conversation ({session.messages.length} messages)
            </div>
            {session.messages.slice(0, 10).map((message, index) => (
              <div
                key={index}
                className={`message-item ${message.role}`}
                style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom:
                    index < Math.min(9, session.messages.length - 1) ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <div
                  className={`message-role ${message.role}`}
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: message.role === 'user' ? '#2563eb' : '#059669',
                    fontSize: '0.9em',
                  }}
                >
                  {message.role === 'user' ? 'User' : 'Assistant'}
                </div>
                <div
                  className="message-content"
                  style={{
                    fontSize: '0.9em',
                    lineHeight: '1.6',
                    color: '#374151',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.content.length > 800
                    ? message.content.substring(0, 800) + '...'
                    : message.content}
                </div>
              </div>
            ))}
            {session.messages.length > 10 && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.85em',
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                }}
              >
                <div>... and {session.messages.length - 10} more messages</div>
                <Link
                  to={`/session/${session.id}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
                  style={{
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: '500',
                    marginTop: '8px',
                    display: 'inline-block',
                  }}
                >
                  View full conversation →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
