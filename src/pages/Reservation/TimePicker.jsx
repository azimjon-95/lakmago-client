import { useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';

/**
 * Vaqt tanlagich.
 *
 * Avval barcha vaqtlar tugma bo'lib ekranga to'kilardi. Restoran
 * 10:00–23:00 ishlasa 26 ta tugma bo'lib, forma cho'zilib ketardi.
 * Endi bitta maydon — bosilsa pastdan ro'yxat chiqadi.
 *
 * Native <select> emas: Telegram WebView'da uning ko'rinishi
 * platformaga qarab o'zgaradi va qorong'i mavzuga mos kelmaydi.
 */
export function TimePicker({ value, slots, onChange, open, onOpen, onClose }) {
  const listRef = useRef(null);

  // Oyna ochilganda tanlangan vaqt ko'rinib tursin
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-on="1"]');
    if (el) el.scrollIntoView({ block: 'center' });
  }, [open]);

  const empty = slots.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => { if (!empty) { haptic(); onOpen(); } }}
        disabled={empty}
        className={`resv-timefield ${empty ? 'is-empty' : ''}`}
      >
        <span className="resv-timefield__left">
          <Icon name="clock" size={17} color="#A99C8C" />
          <span className="resv-timefield__value">
            {empty ? 'Bugunga bo\u2018sh vaqt yo\u2018q' : value}
          </span>
        </span>
        {!empty && <Icon name="chevronDown" size={17} color="#A99C8C" />}
      </button>

      {open && (
        <div className="resv-sheet" onClick={onClose}>
          <div className="resv-sheet__box" onClick={(e) => e.stopPropagation()}>
            <div className="resv-sheet__grip" />
            <div className="resv-sheet__head">
              <span>Vaqtni tanlang</span>
              <button onClick={onClose} aria-label="Yopish">
                <Icon name="x" size={18} color="#A99C8C" />
              </button>
            </div>

            <div ref={listRef} className="resv-sheet__list">
              {slots.map((s) => {
                const on = s === value;
                return (
                  <button
                    key={s}
                    data-on={on ? '1' : '0'}
                    onClick={() => { haptic(); onChange(s); onClose(); }}
                    className={`resv-slot ${on ? 'is-active' : ''}`}
                  >
                    <span>{s}</span>
                    {on && <Icon name="check" size={17} color="#F5A524" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
