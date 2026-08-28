import { useEffect, useRef, useCallback, useState } from 'react';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';

const ITEM_H = 44;

/**
 * Vaqt tanlagich — aylanuvchi baraban (wheel).
 *
 * Faqat MAVJUD vaqtlar (`slots`) ro'yxatga kiradi — soat va
 * daqiqa alohida g'ildirak qilinmadi, chunki shunda mijoz
 * band bo'lmagan (masalan restoran yopilgandan keyingi)
 * kombinatsiyani tanlab qo'yishi mumkin edi.
 *
 * Amalga oshirish: native CSS scroll-snap — yangi kutubxona
 * qo'shilmadi. Scroll to'xtaganda markazdagi elementni topib,
 * shuni tanlangan deb belgilaydi; uzoqlashgan qatorlar xiraroq
 * va kichikroq ko'rinadi (haqiqiy baraban taassuroti).
 */
export function TimePicker({ value, slots, onChange, open, onOpen, onClose }) {
  const scrollerRef = useRef(null);
  const settleTimer = useRef(null);
  const [centerIdx, setCenterIdx] = useState(() => Math.max(0, slots.indexOf(value)));

  const empty = slots.length === 0;

  // Markazdagi qatorni hisoblash va vizual effektni yangilash
  const applyLook = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return null;
    const idx = Math.round(sc.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(slots.length - 1, idx));

    [...sc.children].forEach((el) => {
      if (!el.dataset.idx) return;
      const d = Math.abs(Number(el.dataset.idx) - clamped);
      el.style.opacity = d === 0 ? '1' : d === 1 ? '0.45' : '0.2';
      el.style.transform = `scale(${d === 0 ? 1 : 0.86})`;
    });
    return clamped;
  }, [slots.length]);

  // Scroll paytida jonli chizish, to'xtaganda tanlovni belgilash
  const onScroll = useCallback(() => {
    applyLook();
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const idx = applyLook();
      if (idx === null) return;
      setCenterIdx(idx);
      const s = slots[idx];
      if (s && s !== value) { haptic(); onChange(s); }
    }, 120);
  }, [applyLook, slots, value, onChange]);

  // Oyna ochilganda — tanlangan vaqtga to'g'ridan-to'g'ri suriladi
  useEffect(() => {
    if (!open || !scrollerRef.current) return;
    const idx = Math.max(0, slots.indexOf(value));
    scrollerRef.current.scrollTop = idx * ITEM_H;
    setCenterIdx(idx);
    // Bir kadr kutib effektni chizamiz — DOM joylashgan bo'lsin
    requestAnimationFrame(applyLook);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  const tapItem = (idx) => {
    haptic();
    scrollerRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { if (!empty) { haptic(); onOpen(); } }}
        disabled={empty}
        className={`resv-timefield ${empty ? 'is-empty' : ''}`}
      >
        <span className="resv-timefield__left">
          <Icon name="clock" size={17} color="var(--muted)" />
          <span className="resv-timefield__value">
            {empty ? 'Bugunga bo‘sh vaqt yo‘q' : value}
          </span>
        </span>
        {!empty && <Icon name="chevronDown" size={17} color="var(--muted)" />}
      </button>

      {open && (
        <div className="resv-sheet" onClick={onClose}>
          <div className="resv-sheet__box" onClick={(e) => e.stopPropagation()}>
            <div className="resv-sheet__grip" />
            <div className="resv-sheet__head">
              <span>Vaqtni tanlang</span>
              <button onClick={onClose} aria-label="Yopish">
                <Icon name="x" size={18} color="var(--muted)" />
              </button>
            </div>

            <div className="resv-wheel-wrap">
              {/* Markazni ko'rsatuvchi ramka — g'ildirakning o'zi emas,
                  fon qatlamida, bosilmaydi */}
              <div className="resv-wheel__frame" />

              <div ref={scrollerRef} onScroll={onScroll} className="resv-wheel">
                <div className="resv-wheel__pad" />
                {slots.map((s, i) => (
                  <div
                    key={s}
                    data-idx={i}
                    onClick={() => tapItem(i)}
                    className="resv-wheel__item"
                    style={i === centerIdx ? { color: 'var(--brand-100)' } : undefined}
                  >
                    {s}
                  </div>
                ))}
                <div className="resv-wheel__pad" />
              </div>
            </div>

            <div className="resv-sheet__footer">
              <button
                onClick={() => { haptic(); onClose(); }}
                className="btn-primary btn-block"
              >
                Tanlash · {slots[centerIdx] ?? value}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
