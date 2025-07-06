import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProjectSelector } from './ProjectSelector'
import { SearchBox } from './SearchBox'
import { SessionItem } from './SessionItem'
import { FullSessionView } from './FullSessionView'
import { ExportImportPanel } from './ExportImportPanel'
import { TagFilter } from './TagFilter'
import { SortSelector, SortOption } from './SortSelector'
import { AdvancedFilter, FilterCriteria } from './AdvancedFilter'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ImportProvider, useImportContext } from '../contexts/ImportContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Project, ClaudeSession, SearchResponse } from '../types/api'
import '../styles/app.css'

const SearchView: React.FC = () => {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<ClaudeSession[]>([])
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useLocalStorage('selectedProject', 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useLocalStorage<SortOption>('sortBy', 'updated_desc')
  const [advancedFilters, setAdvancedFilters] = useState<FilterCriteria>({})
  const { importedSessions, setImportedSessions, isImportMode, setIsImportMode } =
    useImportContext()

  useEffect(() => {
    loadProjects()
    loadSessions()
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects/detailed')
      if (!response.ok) throw new Error(t('search.error'))
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const loadSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const url =
        selectedProject === 'all'
          ? '/api/sessions'
          : `/api/sessions?project=${encodeURIComponent(selectedProject)}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(t('search.error'))

      const data = await response.json()
      setSessions(data.sessions)
      setSearchResults(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('search.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    // In import mode, search only imported sessions locally
    if (isImportMode) {
      const lowerQuery = query.toLowerCase()
      const results = importedSessions
        .filter((session) => {
          const titleMatch = (session.title || '').toLowerCase().includes(lowerQuery)
          const messageMatch = session.messages.some((msg) =>
            msg.content.toLowerCase().includes(lowerQuery),
          )
          return titleMatch || messageMatch
        })
        .map((session) => ({
          session,
          matches: [],
          score: 0,
        }))

      setSearchResults({
        query,
        total: results.length,
        results,
      })
      return
    }

    // Normal mode: search via API
    setLoading(true)
    setError(null)
    try {
      let url = `/api/search?q=${encodeURIComponent(query)}`
      if (selectedProject !== 'all') {
        url += `&project=${encodeURIComponent(selectedProject)}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error(t('search.error'))

      const data = await response.json()

      // Transform API response to match client expectations
      const transformedResults = {
        query,
        total: data.results.length,
        results: await Promise.all(
          data.results.map(async (result: any) => {
            // Fetch full session data
            const sessionResponse = await fetch(`/api/session/${result.sessionId}`)
            const session = await sessionResponse.json()

            return {
              session,
              matches: result.highlights.map((h: any) => ({
                messageIndex: h.messageIndex,
                message: session.messages[h.messageIndex] || { role: 'user', content: '' },
                highlights: [h.text],
              })),
              score: result.messageCount,
            }
          }),
        ),
      }

      setSearchResults(transformedResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('search.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
    }
  }, [])

  const filterSessions = (
    sessions: ClaudeSession[],
    query: string,
    tags: string[],
    filters: FilterCriteria,
  ): ClaudeSession[] => {
    let filtered = sessions

    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter((session) => {
        const titleMatch = (session.title || '').toLowerCase().includes(lowerQuery)
        const idMatch = session.id.toLowerCase().includes(lowerQuery)
        const previewMatch = (session.preview || '').toLowerCase().includes(lowerQuery)
        const messageMatch = session.messages.some(
          (msg) => msg.content && msg.content.toLowerCase().includes(lowerQuery),
        )

        return titleMatch || idMatch || previewMatch || messageMatch
      })
    }

    // Filter by tags
    if (tags.length > 0) {
      filtered = filtered.filter((session) => {
        if (!session.tags || session.tags.length === 0) return false
        return tags.every((tag) => session.tags?.includes(tag))
      })
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.updated_at)
        if (filters.dateFrom && sessionDate < new Date(filters.dateFrom)) return false
        if (filters.dateTo && sessionDate > new Date(filters.dateTo + 'T23:59:59')) return false
        return true
      })
    }

    // Filter by message count
    if (filters.messageCountMin !== undefined || filters.messageCountMax !== undefined) {
      filtered = filtered.filter((session) => {
        const count = session.messageCount || session.messages.length
        if (filters.messageCountMin !== undefined && count < filters.messageCountMin) return false
        if (filters.messageCountMax !== undefined && count > filters.messageCountMax) return false
        return true
      })
    }

    return filtered
  }

  const handleSelectionChange = (sessionId: string, selected: boolean) => {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(sessionId)
      } else {
        newSet.delete(sessionId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const allSessionIds = displaySessions.map((result) => result.session.id)
    setSelectedSessions(new Set(allSessionIds))
  }

  const handleSelectNone = () => {
    setSelectedSessions(new Set())
  }

  const handleImportComplete = (importedData: ClaudeSession[]) => {
    setImportedSessions(importedData)
    setIsImportMode(true)
    setSelectedSessions(new Set())
    setSearchQuery('') // Clear search when entering import mode
    setSearchResults(null) // Clear search results
  }

  const handleExitImportMode = () => {
    setIsImportMode(false)
    setImportedSessions([])
    loadSessions()
  }

  // Extract all unique tags from sessions
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    const sessionsToCheck = isImportMode ? importedSessions : sessions
    sessionsToCheck.forEach((session) => {
      session.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [sessions, importedSessions, isImportMode])

  // Sort sessions based on selected option
  const sortSessions = (sessions: ClaudeSession[], option: SortOption): ClaudeSession[] => {
    const sorted = [...sessions]
    switch (option) {
      case 'updated_desc':
        return sorted.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
      case 'updated_asc':
        return sorted.sort(
          (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        )
      case 'created_desc':
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
      case 'created_asc':
        return sorted.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
      case 'messages_desc':
        return sorted.sort(
          (a, b) => (b.messageCount || b.messages.length) - (a.messageCount || a.messages.length),
        )
      case 'messages_asc':
        return sorted.sort(
          (a, b) => (a.messageCount || a.messages.length) - (b.messageCount || b.messages.length),
        )
      default:
        return sorted
    }
  }

  const currentSessions = isImportMode ? importedSessions : sessions
  const filteredSessions = filterSessions(
    currentSessions,
    searchQuery,
    selectedTags,
    advancedFilters,
  )
  const sortedSessions = sortSessions(filteredSessions, sortBy)

  // Apply sorting to search results as well
  const displaySessions =
    searchResults && searchResults.results
      ? searchResults.results.sort((a, b) => {
          switch (sortBy) {
            case 'updated_desc':
              return (
                new Date(b.session.updated_at).getTime() - new Date(a.session.updated_at).getTime()
              )
            case 'updated_asc':
              return (
                new Date(a.session.updated_at).getTime() - new Date(b.session.updated_at).getTime()
              )
            case 'created_desc':
              return (
                new Date(b.session.created_at).getTime() - new Date(a.session.created_at).getTime()
              )
            case 'created_asc':
              return (
                new Date(a.session.created_at).getTime() - new Date(b.session.created_at).getTime()
              )
            case 'messages_desc':
              return (
                (b.session.messageCount || b.session.messages.length) -
                (a.session.messageCount || a.session.messages.length)
              )
            case 'messages_asc':
              return (
                (a.session.messageCount || a.session.messages.length) -
                (b.session.messageCount || b.session.messages.length)
              )
            default:
              return b.score - a.score // Default to relevance for search results
          }
        })
      : sortedSessions.map((session) => ({ session, matches: [], score: 0 }))

  return (
    <div className="container">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{t('app.title')}</h1>
            <p>
              {t('app.searchYourSessions')}{' '}
              {isImportMode && <span style={{ color: '#ff6b6b' }}>({t('app.importMode')})</span>}
            </p>
          </div>
          <LanguageSwitcher />
        </div>
        {isImportMode && (
          <button
            onClick={handleExitImportMode}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {t('app.exitImportMode')}
          </button>
        )}
      </header>

      <div className="controls">
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
        />
        <TagFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
        <AdvancedFilter filters={advancedFilters} onFiltersChange={setAdvancedFilters} />
        <SearchBox onSearch={handleSearch} onInputChange={handleInputChange} />
      </div>

      <ExportImportPanel
        selectedProject={selectedProject}
        selectedSessions={selectedSessions}
        onImportComplete={handleImportComplete}
        isImportMode={isImportMode}
      />

      {displaySessions.length > 0 && (
        <div
          style={{
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <button onClick={handleSelectAll} style={{ marginRight: '10px', padding: '5px 10px' }}>
              {t('export.selectAll')}
            </button>
            <button onClick={handleSelectNone} style={{ marginRight: '10px', padding: '5px 10px' }}>
              {t('export.selectNone')}
            </button>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {selectedSessions.size} selected
            </span>
          </div>
          <SortSelector sortBy={sortBy} onSortChange={setSortBy} />
        </div>
      )}

      <div className="results-summary" id="resultsSummary">
        {searchResults
          ? `Found ${searchResults.total} session${searchResults.total !== 1 ? 's' : ''} matching "${searchResults.query}"`
          : `Showing ${displaySessions.length} ${searchQuery ? 'filtered' : 'recent'} session${displaySessions.length !== 1 ? 's' : ''}`}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>{t('search.searching')}</p>
        </div>
      )}

      {error && (
        <div className="error">
          {t('search.error')}: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="results">
          {displaySessions.length === 0 ? (
            <div className="no-results">{t('search.noResults')}</div>
          ) : (
            displaySessions
              .map((result, index) => {
                if (!result || !result.session) {
                  console.error('Invalid result:', result)
                  return null
                }
                return (
                  <SessionItem
                    key={result.session.id + '-' + index}
                    session={result.session}
                    searchResult={searchResults ? result : undefined}
                    searchQuery={searchQuery}
                    isSelected={selectedSessions.has(result.session.id)}
                    onSelectionChange={handleSelectionChange}
                  />
                )
              })
              .filter(Boolean)
          )}
        </div>
      )}
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ImportProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SearchView />} />
            <Route path="/session/:id" element={<FullSessionView />} />
          </Routes>
        </BrowserRouter>
      </ImportProvider>
    </ThemeProvider>
  )
}

export default App
