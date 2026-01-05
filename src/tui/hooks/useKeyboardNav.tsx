import { useEffect, useState } from 'react'
import { useInput } from 'ink'
import { useTUI } from '../contexts/TUIContext'

interface UseKeyboardNavOptions {
  onSearch: () => void
  onEnter?: () => void
}

export const useKeyboardNav = ({ onSearch, onEnter }: UseKeyboardNavOptions) => {
  const { filteredSessions, selectedIndex, setSelectedIndex, currentView } = useTUI()
  const [lastKey, setLastKey] = useState('')

  useInput((input, key) => {
    // Only handle navigation in list view
    if (currentView !== 'list') return

    const maxIndex = filteredSessions.length - 1

    // Navigation with arrow keys (primary)
    if (key.downArrow) {
      setSelectedIndex(Math.min(selectedIndex + 1, maxIndex))
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    } else if (input === 'j') {
      // Also support j for down
      setSelectedIndex(Math.min(selectedIndex + 1, maxIndex))
    } else if (input === 'k') {
      // Also support k for up
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    } else if (key.ctrl && input === 'd') {
      // Page down (half page)
      setSelectedIndex(Math.min(selectedIndex + 10, maxIndex))
    } else if (key.ctrl && input === 'u') {
      // Page up (half page)
      setSelectedIndex(Math.max(selectedIndex - 10, 0))
    } else if (input === 'g') {
      // Handle 'gg' for top
      if (lastKey === 'g') {
        setSelectedIndex(0)
        setLastKey('')
        return
      }
      setLastKey('g')
    } else if (input === 'G') {
      // Jump to bottom
      setSelectedIndex(maxIndex)
    } else if (input === '/') {
      // Enter search mode
      onSearch()
    } else if (key.return && onEnter) {
      // Open selected session
      onEnter()
    }
  })

  // Reset lastKey after timeout
  useEffect(() => {
    if (lastKey === 'g') {
      const timeout = setTimeout(() => setLastKey(''), 500)
      return () => clearTimeout(timeout)
    }
  }, [lastKey])
}
