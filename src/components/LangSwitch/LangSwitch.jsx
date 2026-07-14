import { useState } from 'react';
import { useI18n } from '@/i18n';
import './LangSwitch.css';

// Til tanlash — profil sahifasida yoki bosh sahifa headerida ishlatiladi.
export function LangSwitch({ compact = false }) {
  const { lang, setLang, languages } = useI18n();
  const [open, setOpen] = useState(false);
  const current = languages.find((l) => l.code === lang);

  if (compact) {
    // Kichik varianti (header uchun)
    return (
      <div className="lang-switch lang-switch--compact">
        <button className="lang-switch__trigger" onClick={() => setOpen((o) => !o)}>
          🌐 {current?.code.toUpperCase()}
        </button>
        {open && (
          <div className="lang-switch__menu">
            {languages.map((l) => (
              <button
                key={l.code}
                className={`lang-switch__item ${l.code === lang ? 'is-active' : ''}`}
                onClick={() => { setLang(l.code); setOpen(false); }}
              >
                {l.native}
                {l.code === lang && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // To'liq variant (profil sozlamalari)
  return (
    <div className="lang-switch lang-switch--full">
      {languages.map((l) => (
        <button
          key={l.code}
          className={`lang-switch__pill ${l.code === lang ? 'is-active' : ''}`}
          onClick={() => setLang(l.code)}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
