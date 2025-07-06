import React from 'react'
import { ArrowUpDown, Calendar, Clock, MessageSquare } from 'lucide-react'

export type SortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'created_desc'
  | 'created_asc'
  | 'messages_desc'
  | 'messages_asc'

interface SortSelectorProps {
  sortBy: SortOption
  onSortChange: (option: SortOption) => void
}

export const SortSelector: React.FC<SortSelectorProps> = ({ sortBy, onSortChange }) => {
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'updated_desc', label: 'Recently Updated', icon: <Clock size={16} /> },
    { value: 'updated_asc', label: 'Oldest Updated', icon: <Clock size={16} /> },
    { value: 'created_desc', label: 'Recently Created', icon: <Calendar size={16} /> },
    { value: 'created_asc', label: 'Oldest Created', icon: <Calendar size={16} /> },
    { value: 'messages_desc', label: 'Most Messages', icon: <MessageSquare size={16} /> },
    { value: 'messages_asc', label: 'Fewest Messages', icon: <MessageSquare size={16} /> },
  ]

  return (
    <div className="sort-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666' }}>
        <ArrowUpDown size={16} />
        <span style={{ fontSize: '14px' }}>Sort by:</span>
      </div>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        style={{
          padding: '6px 10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
