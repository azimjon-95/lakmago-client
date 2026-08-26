import { useRef, useState, useCallback, useEffect } from 'react';

/*
 * ═══════════ SOZLAMALAR ═══════════
 *
 * START_SLOP — barmoq shuncha px yurmaguncha HECH NARSA
 *   bo'lmaydi. Bu tasodifan tegib ketishni to'sadi va
 *   yo'nalishni aniqlash uchun vaqt beradi. Ilgari bu yo'q
 *   edi: barmoq 1px siljishi bilanoq ko'rsatkich chiqib,
 *   sahifa "yopishqoq" tuyulardi.
 *
 * THRESHOLD — yangilash uchun kerakli TORTILGAN masofa
 *   (qarshilikdan keyingi), ya'ni ataylab qilingan harakat.
 */
const START_SLOP = 12;
const THRESHOLD = 64;
const MAX_PULL = 110;

/**
 * Barmoq masofasini tortilgan masofaga aylantiradi.
 *
 * CHIZIQLI EMAS: boshida deyarli 1:1 (harakat "tirik"
 * tuyuladi), keyin borgan sari qattiqlashadi va MAX_PULL ga
 * asimptotik yaqinlashadi — xuddi rezina kabi.
 *
 * Ilgari oddiy `delta * 0.5` edi: oxirigacha bir xil yumshoq,
 * shuning uchun chegara qayerdaligi qo'lga bilinmasdi.
 */
function resist(distance) {
  return MAX_PULL * (1 - Math.exp(-distance / (MAX_PULL * 0.9)));
}

/**
 * Gorizontal siljiy oladigan ota-element bormi.
 *
 * Bosh sahifada uchta gorizontal karusel bor (bannerlar,
 * kategoriyalar, taomlar). Ularni surganda vertikal tortish
 * ISHGA TUSHMASLIGI kerak — ilgari tushardi va karusel
 * qaltirab ketardi.
 */
function insideHorizontalScroller(node, root) {
  let el = node;
  while (el && el !== root && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Pastga tortib yangilash.
 *
 * Telegram Mini App'da disableVerticalSwipes() chaqirilgan
 * (lib/telegram.js) — ya'ni pastga tortish ilovani yopmaydi va
 * bu ishora bizniki. Shuning uchun uni haqiqiy ilovalardagidek
 * aniq qilish bizning zimmamizda.
 */
export function PullToRefresh({ onRefresh, children, reload = true }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [settling, setSettling] = useState(false);

  const wrap = useRef(null);
  const start = useRef(null);
  const axis = useRef(null);
  const active = useRef(false);
  const pullRef = useRef(0);

  const reset = useCallback(() => {
    start.current = null;
    axis.current = null;
    active.current = false;
  }, []);

  const setPullBoth = useCallback((v) => {
    pullRef.current = v;
    setPull(v);
  }, []);

  /*
   * Tinglovchilar QO'LDA qo'shiladi, React propi orqali emas.
   *
   * Sabab: touchmove'da preventDefault chaqirish kerak, buning
   * uchun listener { passive: false } bo'lishi shart. React'ning
   * onTouchMove'i passiv qo'shiladi va u yerdagi preventDefault
   * brauzer tomonidan e'tiborsiz qoldiriladi.
   */
  useEffect(() => {
    const node = wrap.current;
    if (!node) return undefined;

    const onStart = (e) => {
      if (refreshing || e.touches.length !== 1) { reset(); return; }

      const top = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      if (top > 0) { reset(); return; }

      if (insideHorizontalScroller(e.target, node)) { reset(); return; }

      const t = e.touches[0];
      start.current = { y: t.clientY, x: t.clientX };
      axis.current = null;
      active.current = false;
    };

    const onMove = (e) => {
      if (!start.current || refreshing) return;

      // Ikkinchi barmoq qo'shilsa (masshtablash) — bekor
      if (e.touches.length !== 1) { reset(); setPullBoth(0); return; }

      const t = e.touches[0];
      const dy = t.clientY - start.current.y;
      const dx = t.clientX - start.current.x;

      /*
       * YO'NALISHNI QULFLASH.
       *
       * Birinchi START_SLOP px ichida qaysi o'q ustunligini
       * aniqlaymiz va gesture oxirigacha SHUNDA qolamiz.
       * Aks holda diagonal harakatda ko'rsatkich chiqib-o'chib
       * turardi.
       */
      if (!axis.current) {
        if (Math.abs(dy) < START_SLOP && Math.abs(dx) < START_SLOP) return;
        axis.current = Math.abs(dy) > Math.abs(dx) * 1.2 ? 'v' : 'x';
        if (axis.current === 'x') { reset(); return; }
      }

      // Yuqoriga tortish — bu oddiy scroll, aralashmaymiz
      if (dy <= START_SLOP) {
        if (active.current) { setPullBoth(0); active.current = false; }
        return;
      }

      active.current = true;
      setPullBoth(resist(dy - START_SLOP));

      // Brauzer bu harakatni scroll/bounce deb hisoblamasin
      if (e.cancelable) e.preventDefault();
    };

    const onEnd = async () => {
      if (!start.current) return;
      const reached = active.current && pullRef.current >= THRESHOLD;
      reset();

      if (!reached) {
        setSettling(true);
        setPullBoth(0);
        setTimeout(() => setSettling(false), 260);
        return;
      }

      setRefreshing(true);
      setSettling(true);
      setPullBoth(THRESHOLD);

      try {
        await onRefresh?.();
      } catch {
        /* yangilash muvaffaqiyatsiz — pastda baribir yopamiz */
      }

      /*
       * TO'LIQ QAYTA YUKLASH.
       *
       * Telegram menyusidagi "Обновить страницу" aynan shuni
       * qiladi. Ma'lumotni qayta so'rash yetarli emas — u faqat
       * so'rovlarni yangilaydi, eski JS, kesh va xotiradagi
       * holat qolib ketadi.
       */
      if (reload) {
        window.location.reload();
        return;
      }

      setRefreshing(false);
      setPullBoth(0);
      setTimeout(() => setSettling(false), 260);
    };

    const onCancel = () => {
      reset();
      setSettling(true);
      setPullBoth(0);
      setTimeout(() => setSettling(false), 260);
    };

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    node.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onCancel);
    };
  }, [refreshing, onRefresh, reload, reset, setPullBoth]);

  const progress = Math.min(1, pull / THRESHOLD);
  const ready = progress >= 1;

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <div className="ptr-indicator" style={{ height: pull }}>
        <LokmaLoader progress={progress} spinning={refreshing} ready={ready} />
      </div>

      <div
        style={{
          /*
           * transform FAQAT tortish paytida.
           *
           * Doim qo'yilsa (hatto translateY(0) bo'lsa ham) bu
           * element position:fixed bolalar uchun yangi
           * "containing block" yaratadi va barcha modallar
           * butun ekranga emas, shu konteynerga nisbatan
           * joylashadi — natijada ular ko'rinmay, faqat qora
           * fon qolardi.
           */
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: settling ? 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          willChange: pull > 0 ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * LokmaGo ko'rsatkichi.
 *
 * Tortilayotganda: halqa progressga qarab to'ladi, vilka-pichoq
 * asta ko'rinadi. Chegaraga yetganda belgi "sakraydi" — qo'lga
 * bilinadigan tasdiq, matn o'qish shart emas.
 * Yangilanayotganda: halqa aylanadi.
 *
 * SVG tanlandi, GIF/Lottie emas: 1 KB dan kam, har o'lchamda
 * aniq, rangi CSS o'zgaruvchisidan keladi va qo'shimcha
 * kutubxona talab qilmaydi.
 */
function LokmaLoader({ progress, spinning, ready }) {
  const R = 13;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={`ptr-loader${spinning ? ' is-spinning' : ''}${ready && !spinning ? ' is-ready' : ''}`}
      style={{ opacity: Math.min(1, 0.25 + progress * 0.75) }}
    >
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="16" r={R} fill="none" stroke="var(--line)" strokeWidth="2.5" />

        {/* To'layotgan yoy — tortilgan masofaga mos */}
        <circle
          className="ptr-loader__arc"
          cx="16" cy="16" r={R}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={spinning ? C * 0.72 : C * (1 - progress)}
          transform="rotate(-90 16 16)"
        />

        {/* Vilka va pichoq — LokmaGo belgisi */}
        <g
          stroke="var(--brand)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity={spinning ? 1 : progress}
        >
          <path d="M12.4 10.6v3.1" />
          <path d="M14.3 10.6v3.1" />
          <path d="M13.35 13.7v7.7" />
          <path d="M19.2 10.6c1.15 1.5 1.15 3.6 0 5.1v5.7" />
        </g>
      </svg>
    </div>
  );
}
