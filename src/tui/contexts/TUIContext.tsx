import React, { createContext, useContext, useState, ReactNode } from 'react'
import { ClaudeSession } from '../../types/claude'

type ViewType = 'list' | 'detail'

interface TUIState {
  sessions: ClaudeSession[]
  filteredSessions: ClaudeSession[]
  searchQuery: string
  selectedIndex: number
  isLoading: boolean
  currentView: ViewType
  selectedSession: ClaudeSession | null
}

interface TUIContextType extends TUIState {
  setSessions: (sessions: ClaudeSession[]) => void
  setFilteredSessions: (sessions: ClaudeSession[]) => void
  setSearchQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  setIsLoading: (loading: boolean) => void
  setCurrentView: (view: ViewType) => void
  setSelectedSession: (session: ClaudeSession | null) => void
}

const TUIContext = createContext<TUIContextType | undefined>(undefined)

export const TUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ClaudeSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ClaudeSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>('list')
  const [selectedSession, setSelectedSession] = useState<ClaudeSession | null>(null)

  return (
    <TUIContext.Provider
      value={{
        sessions,
        filteredSessions,
        searchQuery,
        selectedIndex,
        isLoading,
        currentView,
        selectedSession,
        setSessions,
        setFilteredSessions,
        setSearchQuery,
        setSelectedIndex,
        setIsLoading,
        setCurrentView,
        setSelectedSession,
      }}
    >
      {children}
    </TUIContext.Provider>
  )
}

export const useTUI = () => {
  const context = useContext(TUIContext)
  if (!context) {
    throw new Error('useTUI must be used within TUIProvider')
  }
  return context
}
