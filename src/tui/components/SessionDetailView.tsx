import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { useTUI } from '../contexts/TUIContext'

export const SessionDetailView: React.FC = () => {
  const { selectedSession } = useTUI()
  const [scrollOffset, setScrollOffset] = useState(0)

  // Keyboard navigation for scrolling messages
  useInput((input, key) => {
    if (!selectedSession) return

    const visibleHeight = 15
    const maxOffset = Math.max(0, selectedSession.messages.length - visibleHeight)

    // Primary: Arrow keys for scrolling
    if (key.downArrow) {
      setScrollOffset(Math.min(scrollOffset + 1, maxOffset))
    } else if (key.upArrow) {
      setScrollOffset(Math.max(scrollOffset - 1, 0))
    } else if (input === 'j') {
      // Also support j for down
      setScrollOffset(Math.min(scrollOffset + 1, maxOffset))
    } else if (input === 'k') {
      // Also support k for up
      setScrollOffset(Math.max(scrollOffset - 1, 0))
    } else if (key.ctrl && input === 'd') {
      setScrollOffset(Math.min(scrollOffset + 5, maxOffset))
    } else if (key.ctrl && input === 'u') {
      setScrollOffset(Math.max(scrollOffset - 5, 0))
    } else if (input === 'g') {
      setScrollOffset(0)
    } else if (input === 'G') {
      setScrollOffset(maxOffset)
    }
  })

  if (!selectedSession) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="red">No session selected</Text>
      </Box>
    )
  }

  const title = selectedSession.title || 'Untitled Session'
  const project = selectedSession.project || 'Unknown Project'
  const messageCount = selectedSession.messages.length
  const created = new Date(selectedSession.created_at).toLocaleDateString()
  const updated = new Date(selectedSession.updated_at).toLocaleDateString()

  // Virtual scrolling for messages
  const visibleHeight = 15
  const visibleMessages = useMemo(() => {
    const start = scrollOffset
    const end = Math.min(selectedSession.messages.length, start + visibleHeight)
    return selectedSession.messages.slice(start, end)
  }, [selectedSession.messages, scrollOffset, visibleHeight])

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
        <Box>
          <Text color="green">{project}</Text>
          <Text color="gray"> · </Text>
          <Text color="yellow">{messageCount} messages</Text>
        </Box>
        <Box>
          <Text color="gray">Created: </Text>
          <Text color="blue">{created}</Text>
          <Text color="gray"> · Updated: </Text>
          <Text color="blue">{updated}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">{'─'.repeat(80)}</Text>
        </Box>
      </Box>

      {/* Messages */}
      <Box flexDirection="column">
        {visibleMessages.map((message, idx) => {
          const isUser = message.role === 'user'
          const displayIdx = scrollOffset + idx + 1

          return (
            <Box key={idx} flexDirection="column" marginBottom={1}>
              <Box>
                <Text bold color={isUser ? 'cyan' : 'green'}>
                  {isUser ? '👤 User' : '🤖 Assistant'} #{displayIdx}
                </Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color="white">
                  {truncateContent(message.content, 500)}
                </Text>
              </Box>
              {idx < visibleMessages.length - 1 && (
                <Box marginTop={1}>
                  <Text color="gray">{'─'.repeat(80)}</Text>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Scroll indicator */}
      {selectedSession.messages.length > visibleHeight && (
        <Box marginTop={1}>
          <Text color="gray">
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + visibleHeight, messageCount)} of{' '}
            {messageCount} messages
          </Text>
        </Box>
      )}
    </Box>
  )
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}
