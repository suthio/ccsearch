import React, { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

interface TagEditorProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  onSave?: () => void
}

export const TagEditor: React.FC<TagEditorProps> = ({ tags = [], onTagsChange, onSave }) => {
  const [inputValue, setInputValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAddTag = () => {
    if (inputValue.trim() && !tags.includes(inputValue.trim())) {
      const newTags = [...tags, inputValue.trim()]
      onTagsChange(newTags)
      setInputValue('')
      setIsAdding(false)
      if (onSave) {
        onSave()
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove)
    onTagsChange(newTags)
    if (onSave) {
      onSave()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setInputValue('')
    }
  }

  return (
    <div className="tag-editor" style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
        {tags.map((tag, index) => (
          <span
            key={index}
            className="tag-item"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              borderRadius: '16px',
              fontSize: '0.85em',
              fontWeight: '500',
              border: '1px solid #bbdefb',
            }}
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              style={{
                marginLeft: '5px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                color: '#1976d2',
              }}
              title="Remove tag"
            >
              <X size={14} />
            </button>
          </span>
        ))}

        {isAdding ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => {
                if (!inputValue.trim()) {
                  setIsAdding(false)
                }
              }}
              placeholder="Type tag name..."
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.85em',
                minWidth: '120px',
              }}
            />
            <button
              onClick={handleAddTag}
              disabled={!inputValue.trim()}
              style={{
                padding: '4px 8px',
                backgroundColor: inputValue.trim() ? '#1976d2' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.85em',
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="add-tag-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#1976d2',
              border: '1px dashed #1976d2',
              borderRadius: '16px',
              fontSize: '0.85em',
              cursor: 'pointer',
              gap: '3px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e3f2fd'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Plus size={14} />
            Add Tag
          </button>
        )}
      </div>
    </div>
  )
}
