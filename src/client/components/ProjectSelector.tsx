import React from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../types/api'

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: string
  onProjectChange: (project: string) => void
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  onProjectChange,
}) => {
  const { t } = useTranslation()
  return (
    <div className="project-filter">
      <select
        id="projectSelect"
        value={selectedProject}
        onChange={(e) => onProjectChange(e.target.value)}
      >
        <option value="all">{t('projects.all')}</option>
        {projects.map((project) => {
          return (
            <option key={project.path} value={project.path} title={project.path}>
              {project.path} ({project.sessionCount} {t('projects.sessions')})
            </option>
          )
        })}
      </select>
    </div>
  )
}
