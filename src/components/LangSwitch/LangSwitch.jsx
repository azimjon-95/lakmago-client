import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Icon } from '@/components/Icon';
import './LangSwitch.css';

// Til tanlash — profil sahifasida yoki bosh sahifa headerida ishlatiladi.
// iconOnly — header kapsulasi uchun: til nomi (UZ/RU) ko'rsatilmaydi, faqat 🌐 + ▼ (nomi aria-label'da).
export function LangSwitch({ compact = false, iconOnly = false }) {
  const { lang, setLang, languages, t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = languages.find((l) => l.code === lang);

  if (compact) {
    // Kichik varianti (header uchun)
    return (
      <div className={`lang-switch lang-switch--compact${iconOnly ? ' lang-switch--icon' : ''}`}>
        {iconOnly ? (
          <button
            type="button"
            className="lang-switch__trigger lang-switch__trigger--icon"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${t('language')}: ${current?.native || ''}`}
          >
            <Icon name="globe" size={20} color="#2F80ED" />
            <Icon name="chevronDown" size={15} color="var(--brand)" strokeWidth={2.4} />
          </button>
        ) : (
          <button className="lang-switch__trigger" onClick={() => setOpen((o) => !o)}>
            🌐 {current?.code.toUpperCase()}
          </button>
        )}
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
