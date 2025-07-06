import React, { createContext, useContext, useState } from 'react'
import { ClaudeSession } from '../types/api'

interface ImportContextType {
  importedSessions: ClaudeSession[]
  setImportedSessions: (sessions: ClaudeSession[]) => void
  isImportMode: boolean
  setIsImportMode: (mode: boolean) => void
}

const ImportContext = createContext<ImportContextType | undefined>(undefined)

export const ImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [importedSessions, setImportedSessions] = useState<ClaudeSession[]>([])
  const [isImportMode, setIsImportMode] = useState(false)

  return (
    <ImportContext.Provider
      value={{
        importedSessions,
        setImportedSessions,
        isImportMode,
        setIsImportMode,
      }}
    >
      {children}
    </ImportContext.Provider>
  )
}

export const useImportContext = () => {
  const context = useContext(ImportContext)
  if (!context) {
    throw new Error('useImportContext must be used within ImportProvider')
  }
  return context
}
