import { useEffect } from 'react'
import { SessionFileReader } from '../../utils/fileReader'
import { useTUI } from '../contexts/TUIContext'

export const useSessionData = () => {
  const { setSessions, setFilteredSessions, setIsLoading, setSelectedIndex } = useTUI()

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoading(true)
        const fileReader = new SessionFileReader()
        const sessions = await fileReader.getAllSessions()

        // Sort by updated_at descending (most recent first)
        sessions.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )

        setSessions(sessions)
        setFilteredSessions(sessions)

        // Start at the last session (bottom of list)
        if (sessions.length > 0) {
          setSelectedIndex(sessions.length - 1)
        }
      } catch (error) {
        console.error('Failed to load sessions:', error)
        setSessions([])
        setFilteredSessions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [setSessions, setFilteredSessions, setIsLoading, setSelectedIndex])
}
