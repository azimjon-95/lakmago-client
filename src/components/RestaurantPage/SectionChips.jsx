import { sectionIcon, startsWithEmoji } from '@/lib/restaurantUi';
import './RestaurantHeader.css';

/*
 * Menyu bo'limlari — ikonkali chiplar (yopishqoq). Ikonka bo'lim NOMIGA qarab tanlanadi (kalit so'z bo'yicha);
 * mos kelmasa — umumiy "sanchqi va pichoq". Faol chip — bo'lim rangida (Go: to'q sariq, Market: yashil).
 */
const S = ({ children }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  utensils: <S><path d="M7 3v7M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 10v11M17 3c-2.2 1.4-3.2 3.8-3.2 6.6 0 2 1.2 3.2 3.2 3.2V3zM17 12.8V21" /></S>,
  bowl: <S><path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9zM8 11c0-3 1.8-5 4-5s4 2 4 5" /></S>,
  soup: <S><path d="M3 12h18a9 8 0 0 1-18 0zM8.5 8.5c0-1.4 1-1.8 1-3.2M12 8.5c0-1.4 1-1.8 1-3.2M15.5 8.5c0-1.4 1-1.8 1-3.2" /></S>,
  skewer: <S><path d="M4 20L20 4" /><path d="M7.5 16.5l2-2M11 13l2-2M14.5 9.5l2-2" strokeWidth="4.2" /></S>,
  leaf: <S><path d="M5 19c0-8 4-14 14-14 0 10-6 14-14 14zM5 19l8-8" /></S>,
  cup: <S><path d="M5 9h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9zM17 10h1.5a2 2 0 0 1 0 4H17M8 3.5v2M12 3.5v2" /></S>,
  bread: <S><path d="M5 10.5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4c0 1-.5 1.8-1.5 2.2V18a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1v-5.3C5.5 12.3 5 11.5 5 10.5z" /></S>,
  cake: <S><path d="M4 20h16M5 20v-6h14v6M5 14c2 0 2-2 3.5-2S11 14 12 14s1.5-2 3.5-2S17 14 19 14M12 12V8.5M12 8.5c-1-1-1-2 0-3 1 1 1 2 0 3z" /></S>,
  burger: <S><path d="M4 11a8 6 0 0 1 16 0H4zM3 14h18M5 17h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2z" /></S>,
  percent: <S><path d="M19 5L5 19" /><circle cx="7.5" cy="7.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /></S>,
  star: <S><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></S>,
  grid: <S><rect x="4" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" /></S>,
};

/** sections: [[name, list]]; labelOf(name) → ko'rinadigan matn; kindOf(name) → 'sale' | 'reviews' | 'dish' */
export function SectionChips({ sections, active, onPick, labelOf, kindOf, innerRef }) {
  return (
    <div ref={innerRef} className="rp-chips no-scrollbar" role="tablist" data-testid="rp-chips">
      {sections.map(([name]) => {
        const on = name === active;
        return (
          <button
            key={name} type="button" role="tab" aria-selected={on}
            data-on={on ? '1' : '0'}
            className={`rp-chip${on ? ' is-active' : ''}`}
            onClick={() => onPick(name)}
          >
            {!startsWithEmoji(name) && (ICONS[sectionIcon(name, kindOf(name))] || ICONS.utensils)}
            <span>{labelOf(name)}</span>
          </button>
        );
      })}
    </div>
  );
}
