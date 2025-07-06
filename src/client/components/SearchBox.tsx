import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SearchBoxProps {
  onSearch: (query: string) => void
  onInputChange: (query: string) => void
}

export const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, onInputChange }) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onInputChange(value)
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <input
        type="text"
        id="searchInput"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={handleInputChange}
        autoFocus
      />
      <button type="submit" id="searchButton">
        {t('search.button')}
      </button>
    </form>
  )
}
