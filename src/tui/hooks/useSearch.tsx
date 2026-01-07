import { useEffect, useCallback } from 'react'
import { useTUI } from '../contexts/TUIContext'

export const useSearch = (debounceMs: number = 300) => {
  const { sessions, searchQuery, selectedIndex, setFilteredSessions, setSelectedIndex } = useTUI()

  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions)
      // Keep current index when clearing search, or set to last if at top
      const newIndex = selectedIndex === 0 && sessions.length > 0
        ? sessions.length - 1
        : Math.min(selectedIndex, sessions.length - 1)
      setSelectedIndex(newIndex)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = sessions.filter((session) => {
      // Search in title
      if (session.title?.toLowerCase().includes(query)) return true

      // Search in project
      if (session.project?.toLowerCase().includes(query)) return true

      // Search in messages
      return session.messages.some((msg) =>
        msg.content.toLowerCase().includes(query)
      )
    })

    setFilteredSessions(filtered)
    setSelectedIndex(0)
  }, [sessions, searchQuery, selectedIndex, setFilteredSessions, setSelectedIndex])

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(performSearch, debounceMs)
    return () => clearTimeout(timeout)
  }, [performSearch, debounceMs])
}
