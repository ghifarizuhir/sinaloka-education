import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '../locales/id.json';
import en from '../locales/en.json';

const savedLang = localStorage.getItem('sinaloka-lang') || 'id';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

// Set document lang attribute on init
document.documentElement.lang = savedLang;

export default i18n;
