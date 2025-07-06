import React from 'react'
import { useTranslation } from 'react-i18next'
import { ClaudeSession } from '../types/api'
import { SessionSummary } from '../../utils/sessionAnalyzer'

interface SessionSummaryViewProps {
  session: ClaudeSession
  summary: SessionSummary
}

export const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({ session, summary }) => {
  const { t } = useTranslation()
  const getConversationTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      coding: '💻',
      debugging: '🐛',
      qa: '❓',
      explanation: '📚',
      analysis: '📊',
      general: '💬',
      mixed: '🔄',
    }
    return icons[type] || '💬'
  }

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: '#16a34a',
      negative: '#dc2626',
      neutral: '#6b7280',
      mixed: '#f59e0b',
    }
    return colors[sentiment] || '#6b7280'
  }

  // Extract key messages for preview
  const getKeyMessages = () => {
    const keyMessages: Array<{ role: string; content: string; index: number }> = []

    // Get first user message
    const firstUserMsg = session.messages.find((m) => m.role === 'user')
    if (firstUserMsg) {
      keyMessages.push({
        role: 'user',
        content: firstUserMsg.content,
        index: session.messages.indexOf(firstUserMsg),
      })
    }

    // Get messages with questions
    session.messages.forEach((msg, index) => {
      if (msg.role === 'user' && msg.content.includes('?') && keyMessages.length < 3) {
        if (!keyMessages.some((km) => km.index === index)) {
          keyMessages.push({ role: msg.role, content: msg.content, index })
        }
      }
    })

    // Get error-related messages if any
    if (summary.hasError) {
      session.messages.forEach((msg, index) => {
        const lowerContent = msg.content.toLowerCase()
        if (
          (lowerContent.includes('error') || lowerContent.includes('fail')) &&
          keyMessages.length < 5
        ) {
          if (!keyMessages.some((km) => km.index === index)) {
            keyMessages.push({ role: msg.role, content: msg.content, index })
          }
        }
      })
    }

    return keyMessages.sort((a, b) => a.index - b.index)
  }

  const keyMessages = getKeyMessages()

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header with conversation type */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '12px',
        }}
      >
        <span style={{ fontSize: '24px', marginRight: '12px' }}>
          {getConversationTypeIcon(summary.conversationType)}
        </span>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>
            {t(`conversationType.${summary.conversationType}`)}
          </h3>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginTop: '4px',
            }}
          >
            {summary.conversationDuration} • {summary.totalMessages} {t('messages')}
          </div>
        </div>
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: getSentimentColor(summary.sentiment) + '20',
            color: getSentimentColor(summary.sentiment),
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          {t(`sentiment.${summary.sentiment}`)}
        </div>
      </div>

      {/* Main topics and stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          {summary.mainTopics.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                {t('summary.mainTopics')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {summary.mainTopics.map((topic, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.keyPhrases.length > 0 && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                {t('summary.keyPhrases')}
              </div>
              {summary.keyPhrases.map((phrase, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.875rem',
                    color: '#374151',
                    marginBottom: '2px',
                  }}
                >
                  • {phrase}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '8px' }}>
            {t('summary.statistics')}
          </div>
          <div style={{ display: 'grid', gap: '4px' }}>
            <div style={{ fontSize: '0.875rem' }}>
              📝 {t('summary.totalWords')}: {summary.totalWords.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              💬 {t('summary.avgWordsPerMessage')}: {summary.avgWordsPerMessage}
            </div>
            {summary.codeBlocks > 0 && (
              <div style={{ fontSize: '0.875rem' }}>
                📄 {t('summary.codeBlocks')}: {summary.codeBlocks}
              </div>
            )}
            {summary.questions > 0 && (
              <div style={{ fontSize: '0.875rem' }}>
                ❓ {t('summary.questionsCount')}: {summary.questions}
              </div>
            )}
            {summary.hasError && (
              <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                ⚠️ {t('summary.hasError')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key messages preview */}
      {keyMessages.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '16px',
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '12px',
              fontWeight: '500',
            }}
          >
            {t('summary.importantMessages')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {keyMessages.slice(0, 3).map((msg, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: msg.role === 'user' ? '#eff6ff' : '#f0fdf4',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${msg.role === 'user' ? '#3b82f6' : '#10b981'}`,
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: msg.role === 'user' ? '#1e40af' : '#059669',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  {msg.role === 'user' ? t('user') : t('assistant')}
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#374151',
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
