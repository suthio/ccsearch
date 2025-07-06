import React, { useState } from 'react'
import { Tag } from 'lucide-react'

interface TagFilterProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const handleClearAll = () => {
    onTagsChange([])
  }

  if (availableTags.length === 0) {
    return null
  }

  return (
    <div className="tag-filter" style={{ position: 'relative', marginRight: '10px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: selectedTags.length > 0 ? '#e3f2fd' : '#f5f5f5',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          gap: '5px',
          fontSize: '14px',
        }}
      >
        <Tag size={16} />
        Filter by Tags
        {selectedTags.length > 0 && (
          <span
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '12px',
              marginLeft: '5px',
            }}
          >
            {selectedTags.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '5px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {selectedTags.length > 0 && (
            <div style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
              <button
                onClick={handleClearAll}
                style={{
                  width: '100%',
                  padding: '5px',
                  backgroundColor: '#f5f5f5',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Clear All
              </button>
            </div>
          )}
          <div style={{ padding: '8px' }}>
            {availableTags.map((tag) => (
              <label
                key={tag}
                style={{
                  display: 'block',
                  padding: '5px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>{tag}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
