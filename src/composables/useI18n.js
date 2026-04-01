import { ref } from 'vue'
import { messages } from '@/i18n/messages'

export const useI18n = (defaultLanguage = 'en') => {
  const language = ref(defaultLanguage)

  const t = (key) => messages[language.value]?.[key] || key

  const toggleLanguage = () => {
    language.value = language.value === 'en' ? 'es' : 'en'
  }

  return {
    language,
    t,
    toggleLanguage
  }
}
