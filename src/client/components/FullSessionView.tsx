import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Moon, Sun, MessageCircle, Clock, Hash, BarChart3, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ClaudeSession } from '../types/api'
import { useImportContext } from '../contexts/ImportContext'
import { useTheme } from '../contexts/ThemeContext'
import { TagEditor } from './TagEditor'
import { SessionAnalyzer } from '../../utils/sessionAnalyzer'
import { SessionSummaryView } from './SessionSummaryView'
import { formatDateTime, formatDate } from '../../utils/dateFormatter'
import { LanguageSwitcher } from './LanguageSwitcher'

export const FullSessionView: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { importedSessions, isImportMode } = useImportContext()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [session, setSession] = useState<ClaudeSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullMessages, setShowFullMessages] = useState(false)
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  // Get search query and message index from URL
  const urlParams = new URLSearchParams(location.search)
  const searchQuery = urlParams.get('q') || ''
  const messageIndex = urlParams.get('m') ? parseInt(urlParams.get('m')!) : null
  const searchTerms = searchQuery.split(' ').filter((t) => t.length > 0)

  const highlightText = (text: string, terms: string[]): React.ReactNode => {
    // First, convert URLs to links
    const urlRegex = /(https?:\/\/[^\s<]+)/gi
    const textWithLinks = text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return { type: 'url', content: part, index }
      }
      return { type: 'text', content: part, index }
    })

    // Then apply search highlighting
    return (
      <>
        {textWithLinks.map((segment) => {
          if (segment.type === 'url') {
            return (
              <a
                key={segment.index}
                href={segment.content}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0066cc',
                  textDecoration: 'underline',
                }}
              >
                {segment.content}
              </a>
            )
          } else {
            // Apply search term highlighting to non-URL text
            if (!terms || terms.length === 0) {
              // Preserve line breaks when no search terms
              return segment.content.split('\n').map((line, lineIndex) => (
                <React.Fragment key={`${segment.index}-line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {line}
                </React.Fragment>
              ))
            }

            // Filter out empty terms
            const validTerms = terms.filter((term) => term && term.trim().length > 0)
            if (validTerms.length === 0) {
              return segment.content.split('\n').map((line, lineIndex) => (
                <React.Fragment key={`${segment.index}-line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {line}
                </React.Fragment>
              ))
            }

            const escapedTerms = validTerms.map((term) =>
              term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            )

            const pattern = escapedTerms.join('|')
            const regex = new RegExp(`(${pattern})`, 'gi')

            // Split by lines first, then apply highlighting to each line
            return segment.content.split('\n').map((line, lineIndex) => {
              const parts = line.split(regex)

              return (
                <React.Fragment key={`${segment.index}-line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {parts.map((part, partIndex) => {
                    const isMatch = validTerms.some(
                      (term) => part.toLowerCase() === term.toLowerCase(),
                    )

                    if (isMatch) {
                      return (
                        <mark
                          key={`${segment.index}-${lineIndex}-${partIndex}`}
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
                </React.Fragment>
              )
            })
          }
        })}
      </>
    )
  }

  const renderContent = (text: string): React.ReactNode => {
    if (searchQuery) {
      return highlightText(text, searchTerms)
    }

    // Just convert URLs to links when no search
    const urlRegex = /(https?:\/\/[^\s<]+)/gi
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0066cc',
              textDecoration: 'underline',
            }}
          >
            {part}
          </a>
        )
      }
      // Preserve line breaks in non-URL parts
      return part.split('\n').map((line, lineIndex) => (
        <React.Fragment key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </React.Fragment>
      ))
    })
  }

  useEffect(() => {
    const fetchSession = async () => {
      // eslint-disable-next-line no-console
      console.log('Fetching session with ID:', id)
      try {
        // Check if we're in import mode and have the session
        if (isImportMode && importedSessions.length > 0) {
          const importedSession = importedSessions.find((s) => s.id === id)
          if (importedSession) {
            // eslint-disable-next-line no-console
            console.log('Found imported session:', importedSession)
            setSession(importedSession)
            setLoading(false)
            return
          }
        }

        // Otherwise fetch from API
        const url = `/api/session/${id}`
        // eslint-disable-next-line no-console
        console.log('Fetching from API:', url)
        const response = await fetch(url)
        // eslint-disable-next-line no-console
        console.log('Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()

          console.error('API error response:', errorText)
          throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        // eslint-disable-next-line no-console
        console.log('Session data received:', data)

        // Ensure the session has a title
        if (!data.title && data.messages && data.messages.length > 0) {
          // Generate a title from the first user message
          const firstUserMessage = data.messages.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (m: any) => m.role === 'user' || m.type === 'user',
          )
          if (firstUserMessage) {
            data.title =
              firstUserMessage.content.substring(0, 100) +
              (firstUserMessage.content.length > 100 ? '...' : '')
          } else {
            data.title = 'Untitled Session'
          }
        }

        setSession(data)
      } catch (err) {
        console.error('Error fetching session:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSession()
    } else {
      console.warn('No session ID provided')
      setError('No session ID provided')
      setLoading(false)
    }
  }, [id, isImportMode, importedSessions])

  // Scroll to first matching message or specific message when session loads
  useEffect(() => {
    if (!session || loading) return

    let targetIndex = -1

    // If message index is specified in URL, use that
    if (messageIndex !== null && messageIndex >= 0 && messageIndex < session.messages.length) {
      targetIndex = messageIndex
    }
    // Otherwise, find first message containing search terms
    else if (searchQuery) {
      for (let i = 0; i < session.messages.length; i++) {
        const content = session.messages[i].content.toLowerCase()
        if (searchTerms.some((term) => content.includes(term.toLowerCase()))) {
          targetIndex = i
          break
        }
      }
    }

    // Scroll to the target message
    if (targetIndex >= 0 && messageRefs.current[targetIndex]) {
      setTimeout(() => {
        messageRefs.current[targetIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, searchQuery, messageIndex, loading])

  // Generate session summary
  const sessionSummary = session ? SessionAnalyzer.analyzeSession(session) : null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteSession = async () => {
    if (!session || !confirm(t('confirmDeleteSession'))) {
      return
    }

    try {
      const response = await fetch(`/api/session/${session.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete session')
      }

      alert(t('sessionDeletedSuccess'))
      navigate('/')
    } catch (err) {
      console.error('Failed to delete session:', err)
      alert(t('sessionDeletedError'))
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', fontFamily: 'system-ui' }}>{t('loadingSession')}</div>
  }

  if (error || !session) {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h2>{t('error')}</h2>
        <p>{error || t('sessionNotFound')}</p>
        <button onClick={() => navigate('/')}>{t('backToSearch')}</button>
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui',
        backgroundColor: '#f5f7fa',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 0',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.875rem', color: '#111827' }}>
                {session.title || t('untitledSession')}
              </h1>
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  gap: '16px',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageCircle size={16} />
                  {session.messages.length} {t('messages')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={16} />
                  {formatDate(session.updated_at)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Hash size={16} />
                  {session.id.substring(0, 8)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <LanguageSwitcher />
              <button
                onClick={() => {
                  const command = `claude -r "${session.id}" ""`
                  navigator.clipboard.writeText(command)
                  alert(t('cliCommandCopied'))
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4b5563',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title={t('copyCLICommand')}
              >
                <Terminal size={16} />
                {t('copyCLI')}
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← {t('backToSearch')}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Summary Section */}
        {sessionSummary && <SessionSummaryView session={session} summary={sessionSummary} />}

        {/* Session Metadata */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#111827' }}>
            {t('sessionInfo')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                <span style={{ color: '#6b7280' }}>{t('project')}:</span>
                <span style={{ color: '#111827', marginLeft: '8px' }}>
                  {session.project || 'N/A'}
                </span>
              </p>
              <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                <span style={{ color: '#6b7280' }}>{t('createdAt')}:</span>
                <span style={{ color: '#111827', marginLeft: '8px' }}>
                  {formatDateTime(session.created_at)}
                </span>
              </p>
            </div>
            <div>
              <p style={{ margin: '4px 0', fontSize: '0.875rem' }}>
                <span style={{ color: '#6b7280' }}>{t('updatedAt')}:</span>
                <span style={{ color: '#111827', marginLeft: '8px' }}>
                  {formatDateTime(session.updated_at)}
                </span>
              </p>
              <div style={{ marginTop: '8px' }}>
                <TagEditor
                  tags={session.tags || []}
                  onTagsChange={(newTags) => {
                    setSession({ ...session, tags: newTags })
                  }}
                  onSave={async () => {
                    try {
                      const response = await fetch(`/api/session/${session.id}/tags`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ tags: session.tags || [] }),
                      })
                      if (!response.ok) {
                        throw new Error('Failed to save tags')
                      }
                    } catch (err) {
                      console.error('Failed to save tags:', err)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Section */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>
              {t('conversationContent')} ({session.messages.length} {t('messagesCount')})
            </h3>
            <button
              onClick={() => setShowFullMessages(!showFullMessages)}
              style={{
                padding: '6px 12px',
                backgroundColor: showFullMessages ? '#3b82f6' : '#f3f4f6',
                color: showFullMessages ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <BarChart3 size={16} />
              {showFullMessages ? t('summaryView') : t('fullView')}
            </button>
          </div>

          {!showFullMessages ? (
            // Compact view with key messages
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {session.messages
                .filter((_, index) => {
                  // Show first message, last message, and messages with questions or important keywords
                  if (index === 0 || index === session.messages.length - 1) return true
                  const content = session.messages[index].content.toLowerCase()
                  return (
                    content.includes('?') ||
                    content.includes('error') ||
                    content.includes('help') ||
                    content.includes('how to')
                  )
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((message: any) => {
                  const originalIndex = session.messages.indexOf(message)
                  return (
                    <div
                      key={originalIndex}
                      style={{
                        padding: '16px',
                        backgroundColor:
                          message.role === 'user'
                            ? '#eff6ff'
                            : message.role === 'system'
                              ? '#f9fafb'
                              : '#f0fdf4',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${message.role === 'user' ? '#3b82f6' : message.role === 'system' ? '#9ca3af' : '#10b981'}`,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: '600',
                            color:
                              message.role === 'user'
                                ? '#1e40af'
                                : message.role === 'system'
                                  ? '#6b7280'
                                  : '#059669',
                            fontSize: '0.875rem',
                          }}
                        >
                          {message.role === 'user'
                            ? t('user')
                            : message.role === 'system'
                              ? t('system')
                              : t('assistant')}
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                            }}
                          >
                            #{originalIndex + 1}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          lineHeight: '1.6',
                          color: '#374151',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 6,
                          WebkitBoxOrient: 'vertical',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {renderContent(message.content)}
                      </div>
                      {message.content.length > 500 && (
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                          }}
                        >
                          ... ({t('messageOmitted')})
                        </div>
                      )}
                    </div>
                  )
                })}

              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                }}
              >
                {t('showingImportantMessages')} •
                <button
                  onClick={() => setShowFullMessages(true)}
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginLeft: '4px',
                  }}
                >
                  {t('showAllMessages', { count: session.messages.length })}
                </button>
              </div>
            </div>
          ) : (
            // Full messages view
            <div>
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                {t('showingAllMessages', { count: session.messages.length })}
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {session.messages.map((message: any, index: number) => {
                const content = message.content || ''
                const hasMatch = searchTerms.some((term) =>
                  content.toLowerCase().includes(term.toLowerCase()),
                )
                const isHighlighted = messageIndex === index

                return (
                  <div
                    key={index}
                    ref={(el) => {
                      messageRefs.current[index] = el
                    }}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      backgroundColor:
                        message.role === 'user'
                          ? '#eff6ff'
                          : message.role === 'system'
                            ? '#f9fafb'
                            : '#f0fdf4',
                      borderRadius: '8px',
                      border:
                        (hasMatch && searchQuery) || isHighlighted
                          ? '2px solid #ffeb3b'
                          : '1px solid #e5e7eb',
                      borderLeft: `3px solid ${message.role === 'user' ? '#3b82f6' : message.role === 'system' ? '#9ca3af' : '#10b981'}`,
                      boxShadow:
                        (hasMatch && searchQuery) || isHighlighted
                          ? '0 0 10px rgba(255, 235, 59, 0.3)'
                          : 'none',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '600',
                          color:
                            message.role === 'user'
                              ? '#1e40af'
                              : message.role === 'system'
                                ? '#6b7280'
                                : '#059669',
                        }}
                      >
                        {message.role === 'user'
                          ? t('user')
                          : message.role === 'system'
                            ? t('system')
                            : t('assistant')}
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: 'normal',
                          }}
                        >
                          #{index + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const url = `/session/${session.id}?m=${index}`
                          navigator.clipboard.writeText(window.location.origin + url)
                          alert(t('linkCopiedToClipboard'))
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#6b7280',
                        }}
                        title={t('copyDirectLink')}
                      >
                        {t('copyLink')}
                      </button>
                    </div>
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                        fontSize: '0.875rem',
                        color: '#374151',
                      }}
                    >
                      {content ? (
                        renderContent(content)
                      ) : (
                        <em style={{ color: '#9ca3af' }}>({t('noMessageContent')})</em>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <button
        className="dark-mode-toggle"
        onClick={toggleDarkMode}
        title={isDarkMode ? t('switchToLightMode') : t('switchToDarkMode')}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </div>
  )
}
