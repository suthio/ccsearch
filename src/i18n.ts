import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslation from './locales/en/translation.json'
import jaTranslation from './locales/ja/translation.json'

// eslint-disable-next-line no-console
console.log('Loading i18n...')

const resources = {
  en: {
    translation: enTranslation,
  },
  ja: {
    translation: jaTranslation,
  },
}

// eslint-disable-next-line no-console
console.log('i18n resources loaded from JSON files')

// eslint-disable-next-line no-console
console.log('Initializing i18n with initReactI18next...')

const initI18n = async () => {
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: 'ja', // デフォルトを日本語に設定
      fallbackLng: 'en',
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      react: {
        useSuspense: false, // Suspenseを無効化
      },
    })

  // eslint-disable-next-line no-console
  console.log('i18n initialized')
  // eslint-disable-next-line no-console
  console.log('Current language:', i18n.language)
  // eslint-disable-next-line no-console
  console.log('Available languages:', Object.keys(resources))
}

// Initialize immediately
 
initI18n().catch(console.error)

export default i18n
