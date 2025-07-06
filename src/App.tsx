import React, { useState, useEffect } from 'react'
import { Search, Upload, Download, Database } from 'lucide-react'
import ProjectList from './components/ProjectList'
import SessionDetail from './components/SessionDetail'

interface Session {
  id: string
  project: string
  title: string
  created_at: string
  updated_at: string
  messageCount: number
  messages: any[]
  preview: string
}

interface Project {
  name: string
  path: string
  sessionCount: number
  lastUpdated: string
}

interface SearchResult {
  sessionId: string
  sessionDate: string
  messageCount: number
  project: string
  highlights: Array<{
    messageIndex: number
    text: string
  }>
}

function App() {
  const [activeTab, setActiveTab] = useState<'projects' | 'search'>('projects')
  const [sessions, setSessions] = useState<Session[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isImportMode, setIsImportMode] = useState(false)

  // Load data on mount
  useEffect(() => {
    loadProjects()
  }, [])

  // Load sessions when project changes
  useEffect(() => {
    if (selectedProject && !isImportMode) {
      loadSessions()
    }
  }, [selectedProject, isImportMode])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects/detailed')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions?project=${selectedProject}`)
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setActiveTab('search')

    try {
      const response = await fetch(
        `/api/search/full?q=${encodeURIComponent(searchQuery)}&project=${selectedProject}`,
      )
      const data = await response.json()

      if (data.error) {
        console.error('Search error:', data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionDetail = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/session/${sessionId}`)
      const data = await response.json()
      if (data) {
        setSelectedSession(data)
      }
    } catch (error) {
      console.error('Failed to load session detail:', error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectFilter: selectedProject }),
      })
      const data = await response.json()

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ccsearch-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      setIsImportMode(true)

      // Create projects from imported data
      const projectMap = new Map()

      for (const session of data.sessions || []) {
        if (!projectMap.has(session.project)) {
          projectMap.set(session.project, {
            name: session.project.split('/').pop() || session.project,
            path: session.project,
            sessionCount: 0,
            lastUpdated: session.updated_at || new Date().toISOString(),
          })
        }
        projectMap.get(session.project).sessionCount++
      }

      setProjects(Array.from(projectMap.values()))
      setSessions(data.sessions || [])

      alert(`Imported ${data.sessions?.length || 0} sessions in import mode`)
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import file. Please check the file format.')
    }
  }

  const exitImportMode = () => {
    setIsImportMode(false)
    loadProjects()
    loadSessions()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">CC Search</h1>
                {isImportMode && (
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-600 font-medium">Import Mode</span>
                    <button
                      onClick={exitImportMode}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Exit
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Import
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in all conversation content..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mt-4 -mb-px">
              <button
                onClick={() => setActiveTab('projects')}
                className={`pb-2 px-1 ${
                  activeTab === 'projects'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects & Sessions
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-2 px-1 ${
                  activeTab === 'search'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search Results {searchResults.length > 0 && `(${searchResults.length})`}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-180px)]">
          {/* Left Sidebar - Projects */}
          <div className="w-1/3 max-w-md border-r border-gray-200 overflow-y-auto bg-gray-50">
            <ProjectList
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
              isImportMode={isImportMode}
            />
          </div>

          {/* Right Content - Sessions or Search Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'projects' && (
              <div className="space-y-4">
                {isLoading && (
                  <div className="text-center py-8 text-gray-500">Loading sessions...</div>
                )}

                {!isLoading && sessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {selectedProject === 'all'
                      ? 'Select a project to view sessions'
                      : 'No sessions found in this project'}
                  </div>
                )}

                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSessionDetail(session.id)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {session.title || `Session ${session.id.substring(0, 8)}...`}
                    </h3>
                    <p className="text-gray-600 line-clamp-2 mb-2">{session.preview}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                      <span>{session.messageCount} messages</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                {searchResults.length === 0 && searchQuery && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}

                {searchResults.map((result) => (
                  <div
                    key={result.sessionId}
                    onClick={() => loadSessionDetail(result.sessionId)}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        Session {result.sessionId.substring(0, 8)}...
                      </h3>
                      <span className="text-sm text-gray-500">{result.project}</span>
                    </div>
                    <div className="space-y-2">
                      {result.highlights.map((highlight, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                            {highlight.text}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>{new Date(result.sessionDate).toLocaleDateString()}</span>
                      <span>{result.messageCount} matches found</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetail
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          searchQuery={searchQuery}
        />
      )}
    </div>
  )
}

export default App
