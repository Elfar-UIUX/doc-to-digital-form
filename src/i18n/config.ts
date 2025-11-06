import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import frTranslations from './locales/fr.json';

// RTL languages
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

// Function to set document direction
const setDocumentDirection = (lng: string) => {
  const isRTL = rtlLanguages.includes(lng);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
      fr: { translation: frTranslations },
    },
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
  });

// Set initial direction
const currentLanguage = i18n.language || 'en';
setDocumentDirection(currentLanguage);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
  setDocumentDirection(lng);
});

export default i18n;

