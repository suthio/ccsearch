import React, { useState } from 'react'
import { Filter, Calendar, MessageSquare } from 'lucide-react'

export interface FilterCriteria {
  dateFrom?: string
  dateTo?: string
  messageCountMin?: number
  messageCountMax?: number
}

interface AdvancedFilterProps {
  filters: FilterCriteria
  onFiltersChange: (filters: FilterCriteria) => void
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<FilterCriteria>(filters)

  const handleApply = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleReset = () => {
    const emptyFilters: FilterCriteria = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof FilterCriteria] !== undefined,
  )

  return (
    <div className="advanced-filter" style={{ position: 'relative', marginRight: '10px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: hasActiveFilters ? '#e3f2fd' : '#f5f5f5',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          gap: '5px',
          fontSize: '14px',
        }}
      >
        <Filter size={16} />
        Advanced Filters
        {hasActiveFilters && (
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
            Active
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
            minWidth: '300px',
            padding: '15px',
          }}
        >
          <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Advanced Filters</h4>

          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <Calendar size={16} />
              Date Range
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
                style={{
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '13px',
                }}
              />
              <span>to</span>
              <input
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
                style={{
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              <MessageSquare size={16} />
              Message Count
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="Min"
                min="0"
                value={localFilters.messageCountMin || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    messageCountMin: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                style={{
                  width: '80px',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '13px',
                }}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                value={localFilters.messageCountMax || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    messageCountMax: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                style={{
                  width: '80px',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Apply
            </button>
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
