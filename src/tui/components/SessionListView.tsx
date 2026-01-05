import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { useTUI } from '../contexts/TUIContext'
import { ClaudeSession } from '../../types/claude'

interface SessionListViewProps {
  height: number
}

export const SessionListView: React.FC<SessionListViewProps> = ({ height }) => {
  const { filteredSessions, selectedIndex, isLoading } = useTUI()

  // Virtual scrolling: keep selected item centered in view
  const visibleSessions = useMemo(() => {
    const halfHeight = Math.floor(height / 2)
    const totalItems = filteredSessions.length

    // Always center the selected item (no aggressive end adjustment)
    const startIndex = Math.max(0, selectedIndex - halfHeight)
    const endIndex = Math.min(totalItems, startIndex + height)

    return filteredSessions.slice(startIndex, endIndex).map((session, idx) => ({
      session,
      index: startIndex + idx,
    }))
  }, [filteredSessions, selectedIndex, height])

  if (isLoading) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="cyan">Loading sessions...</Text>
      </Box>
    )
  }

  if (filteredSessions.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="yellow">No sessions found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {visibleSessions.map(({ session, index }, idx) => (
        <React.Fragment key={session.id}>
          <SessionItem
            session={session}
            isSelected={index === selectedIndex}
          />
          {idx < visibleSessions.length - 1 && (
            <Box paddingX={1} marginBottom={1}>
              <Text color="gray">{'─'.repeat(80)}</Text>
            </Box>
          )}
        </React.Fragment>
      ))}
    </Box>
  )
}

interface SessionItemProps {
  session: ClaudeSession
  isSelected: boolean
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isSelected }) => {
  const title = session.title || 'Untitled Session'
  const project = getProjectDisplayName(session.project || '')
  const messageCount = session.messages.length
  const date = formatRelativeDate(session.updated_at)

  if (isSelected) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
        <Box>
          <Text bold color="green">
            ▶ {truncate(title, 68)}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="cyan">{truncate(project, 38)}</Text>
          <Text color="gray"> · </Text>
          <Text color="yellow">{messageCount} msgs</Text>
          <Text color="gray"> · </Text>
          <Text color="blue">{date}</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold color="white">
          {'  '}{truncate(title, 70)}
        </Text>
      </Box>
      <Box marginLeft={3}>
        <Text color="green">{truncate(project, 40)}</Text>
        <Text color="gray"> · </Text>
        <Text color="yellow">{messageCount} msgs</Text>
        <Text color="gray"> · </Text>
        <Text color="blue">{date}</Text>
      </Box>
    </Box>
  )
}

// Helper functions (reusing existing patterns)
function getProjectDisplayName(project: string): string {
  if (!project) return ''
  const parts = project.split('/')
  if (parts.length >= 2) {
    return parts.slice(-2).join('/')
  }
  return parts[parts.length - 1]
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return date.toLocaleDateString()
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
