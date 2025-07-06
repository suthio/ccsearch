import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n?.language || 'ja')

  useEffect(() => {
    if (!i18n || typeof i18n.on !== 'function') {
      console.warn('i18n not fully initialized')
      return
    }

    const handleLanguageChange = (lng: string) => {
      console.log('Language changed event:', lng)
      setCurrentLang(lng)
    }

    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      if (typeof i18n.off === 'function') {
        i18n.off('languageChanged', handleLanguageChange)
      }
    }
  }, [i18n])

  const changeLanguage = (lng: string) => {
    if (!i18n) {
      console.error('i18n not initialized')
      return
    }
    console.log('Changing language to:', lng)
    console.log('Current language:', i18n.language)
    i18n.changeLanguage(lng).then(() => {
      console.log('Language changed to:', i18n.language)
    })
  }

  console.log('Rendering LanguageSwitcher, current language:', currentLang)

  if (!i18n) {
    return <div>Loading...</div>
  }

  return (
    <div className="language-switcher">
      <button
        className={`lang-button ${currentLang === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
      >
        EN
      </button>
      <button
        className={`lang-button ${currentLang === 'ja' ? 'active' : ''}`}
        onClick={() => changeLanguage('ja')}
      >
        日本語
      </button>
      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
        (Current: {currentLang})
      </span>
    </div>
  )
}
