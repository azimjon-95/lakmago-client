import { useRef, useState, useCallback } from 'react';

const THRESHOLD = 68;     // shuncha piksel tortilsa — yangilash boshlanadi
const MAX_PULL = 110;     // vizual cho'zilishning maksimal chegarasi

/**
 * Pastga tortib yangilash — Instagram/Telegram/Yandex ilovalari
 * kabi. Faqat sahifa ENG TEPASIDA (scrollTop===0) ishlaydi, aks
 * holda oddiy scroll bilan aralashib ketmaydi.
 *
 * html/body'da overscroll-behavior-y:none o'rnatilgan (WebView
 * ichidagi eski kontent yaltirab ketish xatosi uchun) — shuning
 * uchun BROWSER'NING o'z "rubber-band" effekti ishlamaydi, bu
 * componentning o'zi qo'lda (touch hodisalari orqali) shu
 * tajribani qayta yaratadi.
 */
export function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);       // joriy tortilgan masofa (px)
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    // Faqat sahifa tepasida boshlansa faollashadi.
    //
    // MUHIM: bu ilovada scroll odatda WINDOW/BODY darajasida
    // ishlaydi (o'rab turgan div o'zining alohida scroll'iga ega
    // emas) — shuning uchun window.scrollY tekshiriladi, faqat
    // containerRef.scrollTop EMAS (bu doim 0 bo'lib, "tepada"
    // degan noto'g'ri xulosaga olib kelardi, hatto sahifa pastga
    // scroll qilingan bo'lsa ham).
    if (refreshing) return;
    const scrollTop = window.scrollY ?? document.documentElement.scrollTop ?? 0;
    if (scrollTop > 0) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { setPull(0); return; }
    // Rezina kabi — qanchalik ko'p tortilsa, shunchalik sekinlashadi
    const damped = Math.min(MAX_PULL, delta * 0.5);
    setPull(damped);
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;

    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);   // spinner ko'rinadigan joyda "yopishib" turadi
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Yangilash ko'rsatkichi — tortilgan masofaga mos suriladi */}
      <div
        className="ptr-indicator"
        style={{
          height: pull,
          opacity: pull > 4 ? 1 : 0,
        }}
      >
        <div
          className={`ptr-spinner ${refreshing ? 'ptr-spinner--spin' : ''}`}
          style={{
            transform: `rotate(${refreshing ? 0 : progress * 360}deg)`,
            opacity: 0.4 + progress * 0.6,
          }}
        />
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: startY.current === null ? 'transform 0.25s var(--ease, ease-out)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
