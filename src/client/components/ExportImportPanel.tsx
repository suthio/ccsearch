import React, { useState, useRef } from 'react'

interface ExportImportPanelProps {
  selectedProject: string
  selectedSessions: Set<string>
  onImportComplete: (importedData: any[]) => void
  isImportMode?: boolean
}

export const ExportImportPanel: React.FC<ExportImportPanelProps> = ({
  selectedProject,
  selectedSessions,
  onImportComplete,
  isImportMode = false,
}) => {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json')
  const [importProgress, setImportProgress] = useState<number>(0)
  const [importStatus, setImportStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectFilter: selectedProject,
          sessionIds: Array.from(selectedSessions),
          format: exportFormat,
        }),
      })

      if (!response.ok) throw new Error('Export failed')

      const contentType = response.headers.get('content-type')
      const fileExtension =
        exportFormat === 'csv' ? 'csv' : exportFormat === 'markdown' ? 'md' : 'json'
      const mimeType =
        exportFormat === 'csv'
          ? 'text/csv'
          : exportFormat === 'markdown'
            ? 'text/markdown'
            : 'application/json'

      let content: string
      if (exportFormat === 'json') {
        const data = await response.json()
        content = JSON.stringify(data, null, 2)
      } else {
        content = await response.text()
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ccsearch-export-${new Date().toISOString().split('T')[0]}.${fileExtension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(
        'Failed to export sessions: ' + (error instanceof Error ? error.message : 'Unknown error'),
      )
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportProgress(0)
    setImportStatus('')

    try {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 150) {
        setImportStatus(`Processing large file (${fileSizeMB.toFixed(1)}MB)...`)
      }

      // Read file with progress tracking
      setImportStatus('Reading file...')
      const text = await readFileWithProgress(file, (progress) => {
        setImportProgress(progress * 0.5) // Reading is 50% of the process
      })

      setImportStatus('Parsing JSON...')
      const data = JSON.parse(text)

      setImportStatus('Uploading to server...')
      setImportProgress(60)

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })

      setImportProgress(90)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const result = await response.json()
      setImportProgress(100)

      // Pass the imported sessions data back to the parent
      if (data.sessions && Array.isArray(data.sessions)) {
        onImportComplete(data.sessions)
      }

      if (result.warnings && result.warnings.length > 0) {
        const warningMessage = `Import completed with warnings:\n\n${result.warnings.join('\n')}\n\n${result.message}`
        alert(warningMessage)
      } else {
        alert(result.message)
      }
    } catch (error) {
      let errorMessage = 'Failed to import sessions: '
      if (error instanceof Error) {
        errorMessage += error.message
        if (error.message.includes('JSON')) {
          errorMessage += '\n\nThe file may be corrupted or too large to parse.'
        }
        if (error.message.includes('413')) {
          errorMessage = 'File is too large. Please try splitting the export into smaller files.'
        }
      } else {
        errorMessage += 'Unknown error'
      }
      alert(errorMessage)
    } finally {
      setImporting(false)
      setImportProgress(0)
      setImportStatus('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Helper function to read file with progress
  const readFileWithProgress = (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = event.loaded / event.total
          onProgress(progress)
        }
      }

      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error('Failed to read file'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        padding: '10px 0',
      }}
    >
      {!isImportMode && (
        <>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'markdown')}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
              fontSize: '14px',
            }}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting || selectedSessions.size === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedSessions.size > 0 ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting || selectedSessions.size === 0 ? 'not-allowed' : 'pointer',
              opacity: exporting || selectedSessions.size === 0 ? 0.6 : 1,
            }}
          >
            {exporting
              ? 'Exporting...'
              : `Export ${selectedSessions.size} Session${selectedSessions.size !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: importing ? 'not-allowed' : 'pointer',
            opacity: importing ? 0.6 : 1,
          }}
        >
          {importing ? 'Importing...' : 'Import Sessions'}
        </button>

        {importing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '200px',
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${importProgress}%`,
                  height: '100%',
                  backgroundColor: '#28a745',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>{importProgress.toFixed(0)}%</span>
            {importStatus && (
              <span style={{ fontSize: '12px', color: '#666' }}>{importStatus}</span>
            )}
          </div>
        )}
      </div>

      <span style={{ fontSize: '14px', color: '#666' }}>
        {selectedSessions.size > 0 && `${selectedSessions.size} selected | `}
        {selectedProject !== 'all'
          ? `Filtered by: ${selectedProject.split('/').slice(-1)[0] || selectedProject}`
          : 'All sessions'}
      </span>
    </div>
  )
}
