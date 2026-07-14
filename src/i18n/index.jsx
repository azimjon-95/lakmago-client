import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, LANGUAGES } from './translations.js';

const STORAGE_KEY = 'lokmago_lang';
const DEFAULT_LANG = 'uz';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && translations[saved] ? saved : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz';
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  // Tarjima funksiyasi — kalit topilmasa, uz'ga, u ham yo'q bo'lsa kalitning o'ziga qaytadi
  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

// Asosiy hook — komponentlarda ishlatiladi
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n I18nProvider ichida ishlatilishi kerak');
  return ctx;
}

// Qisqa yordamchi — faqat t() kerak bo'lsa
export function useT() {
  return useI18n().t;
}
