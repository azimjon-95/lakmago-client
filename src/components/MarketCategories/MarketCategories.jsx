import { useEffect, useRef } from 'react';
import { MARKET_HOME_CATEGORIES, catImage, homeCatLabel } from '@/data/marketHomeCategories';
import './MarketCategories.css';

/*
 * Market bosh sahifasi: yumaloq kategoriya qatori (Do'konlar tepasida).
 *   • birinchi — "Hammasi"; keyin MARKET_HOME_CATEGORIES tartibida (data/marketHomeCategories.js);
 *   • rasm bo'lsa — yumaloq rasm, bo'lmasa emoji doira (qator hech qachon buzilmaydi);
 *   • `available` (Set | null): do'konlarda MAHSULOTI BOR kalitlar. Mahsuloti yo'qlari xira ko'rinadi (bosish mumkin — "hozircha
 *     yo'q" xabari). null — noma'lum (server eski yoki yuklanmagan): hammasi oddiy.
 *   • tanlangan kategoriya qatorda ko'rinib turadi (markazga suriladi); qayta bosilsa — "Hammasi".
 */
export function MarketCategories({ value, onChange, available = null, lang = 'uz', allLabel = 'Hammasi', ariaLabel = '' }) {
  const refs = useRef({});

  useEffect(() => {
    refs.current[value]?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [value]);

  const tile = (key, label, emoji, dim) => {
    const img = catImage(key);
    const on = value === key;
    return (
      <button
        key={key}
        ref={(el) => { refs.current[key] = el; }}
        type="button"
        aria-pressed={on}
        data-testid={`mcat-${key}`}
        onClick={() => onChange(key === 'all' ? 'all' : (on ? 'all' : key))}
        className={`mcat ${on ? 'is-active' : ''} ${dim ? 'is-empty' : ''}`}
      >
        <span className="mcat__art">
          {img
            ? <img src={img} alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false" />
            : <span className="mcat__emoji" aria-hidden="true">{emoji}</span>}
        </span>
        <span className="mcat__label">{label}</span>
      </button>
    );
  };

  return (
    <div className="mcats no-scrollbar" role="group" aria-label={ariaLabel}>
      {tile('all', allLabel, '🛍️', false)}
      {MARKET_HOME_CATEGORIES.map((c) => tile(c.key, homeCatLabel(c, lang), c.emoji, available ? !available.has(c.key) : false))}
    </div>
  );
}
