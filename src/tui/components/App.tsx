import React, { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { TUIProvider, useTUI } from '../contexts/TUIContext'
import { useSessionData } from '../hooks/useSessionData'
import { useSearch } from '../hooks/useSearch'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { SessionListView } from './SessionListView'
import { SessionDetailView } from './SessionDetailView'
import { SearchInput } from './SearchInput'
import { StatusBar } from './StatusBar'

export const App: React.FC = () => {
  return (
    <TUIProvider>
      <AppContent />
    </TUIProvider>
  )
}

const AppContent: React.FC = () => {
  const { exit } = useApp()
  const {
    filteredSessions,
    selectedIndex,
    searchQuery,
    setSearchQuery,
    currentView,
    setCurrentView,
    setSelectedSession,
  } = useTUI()
  const [isSearching, setIsSearching] = useState(false)

  // Load sessions on mount
  useSessionData()

  // Search with debouncing
  useSearch(300)

  // Handle Enter key to open session detail
  const handleOpenSession = () => {
    if (currentView === 'list' && filteredSessions.length > 0) {
      const session = filteredSessions[selectedIndex]
      setSelectedSession(session)
      setCurrentView('detail')
    }
  }

  // Keyboard navigation
  useKeyboardNav({
    onSearch: () => setIsSearching(true),
    onEnter: handleOpenSession,
  })

  // Global quit and escape handler
  useInput((input, key) => {
    if (input === 'q' && !isSearching) {
      if (currentView === 'detail') {
        // Go back to list view
        setCurrentView('list')
        setSelectedSession(null)
      } else {
        exit()
      }
    } else if (key.ctrl && input === 'c') {
      exit()
    } else if (key.escape) {
      if (isSearching) {
        setIsSearching(false)
      } else if (currentView === 'detail') {
        setCurrentView('list')
        setSelectedSession(null)
      }
    }
  })

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1}>
        <Text bold>CCSearch TUI</Text>
        <Box flexGrow={1} />
        <Text dimColor>
          {currentView === 'list'
            ? `${filteredSessions.length} session${filteredSessions.length !== 1 ? 's' : ''}`
            : 'Session Detail'}
        </Text>
      </Box>

      {/* Search bar (if active in list view) */}
      {isSearching && currentView === 'list' && (
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={() => setIsSearching(false)}
          onCancel={() => {
            setSearchQuery('')
            setIsSearching(false)
          }}
        />
      )}

      {/* Main content - show list or detail view */}
      <Box flexGrow={1}>
        {currentView === 'list' ? (
          <SessionListView height={8} />
        ) : (
          <SessionDetailView />
        )}
      </Box>

      {/* Status bar */}
      <StatusBar
        leftText={
          isSearching
            ? 'Esc: cancel | Enter: done'
            : currentView === 'detail'
              ? '↑/↓: scroll | Esc: back | q: quit'
              : '↑/↓: navigate | Enter: open | /: search | q: quit'
        }
        rightText={searchQuery ? `Search: ${searchQuery}` : undefined}
      />
    </Box>
  )
}
