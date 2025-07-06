import React from 'react'
import { FolderOpen, FileText } from 'lucide-react'

interface Project {
  name: string
  path: string
  sessionCount: number
  lastUpdated: string
}

interface ProjectListProps {
  projects: Project[]
  selectedProject: string | null
  onSelectProject: (project: string) => void
  isImportMode?: boolean
}

export default function ProjectList({
  projects,
  selectedProject,
  onSelectProject,
  isImportMode,
}: ProjectListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Projects{' '}
          {isImportMode && <span className="text-sm font-normal text-blue-600">(Import Mode)</span>}
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        <button
          onClick={() => onSelectProject('all')}
          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
            selectedProject === 'all' ? 'bg-blue-50 border-l-4 border-blue-600' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">All Projects</p>
              <p className="text-sm text-gray-500">
                {projects.reduce((sum, p) => sum + p.sessionCount, 0)} sessions total
              </p>
            </div>
          </div>
        </button>

        {projects.map((project) => (
          <button
            key={project.path}
            onClick={() => onSelectProject(project.path)}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
              selectedProject === project.path ? 'bg-blue-50 border-l-4 border-blue-600' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{project.name}</p>
                <p className="text-sm text-gray-500 truncate">{project.path}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  {project.sessionCount}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {new Date(project.lastUpdated).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
