import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/i18n';
import './cards/BannerSlider.css';

/*
 * ═══ ASOSIY BANNER ═══
 * • Tartib TASODIFIY: har kirishda (mount) va pastga tortib yangilashda (shuffleKey) qayta aralashtiriladi.
 *   Oxirgi safar birinchi ko'rsatilgan banner yana birinchi chiqmaydi (localStorage).
 *   Fon refetch (id'lar o'zgarmasa) tartibni BUZMAYDI — mijoz ko'z oldida banner sakramaydi.
 * • Almashuv: hamma slayd ustma-ust turadi va oldindan yuklanadi; yangisi eskisining USTIDA yumshoq paydo bo'ladi
 *   (eski slayd yangi to'liq qoplaguncha joyida qoladi — oq chaqnash/ko'z qamashishi yo'q). Rasmda sekin zoom (GPU).
 * • Ilova fonda bo'lsa avtoaylanish to'xtaydi.
 */
const INTERVAL_MS = 4000;
const LAST_FIRST_KEY = 'lokma-banner-first';
const idOf = (b, i) => String(b.id ?? b._id ?? i);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  let last = null;
  try { last = localStorage.getItem(LAST_FIRST_KEY); } catch { /* */ }
  if (a.length > 1 && last && idOf(a[0], 0) === last) {
    const j = 1 + Math.floor(Math.random() * (a.length - 1));
    [a[0], a[j]] = [a[j], a[0]];
  }
  return a;
}

export function BannerSlider({ banners, onAdClick, shuffleKey = 0 }) {
  const translate = useT();
  const idsKey = banners.map(idOf).join('|');
  const latest = useRef(banners);
  latest.current = banners;

  // Tartib: id'lar to'plami yoki shuffleKey o'zgarganda qayta aralashtiriladi
  const order = useMemo(() => shuffle(latest.current), [idsKey, shuffleKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ma'lumot yangilansa (id bir xil) — eng so'nggi obyektlar ishlatiladi, tartib o'sha
  const slides = useMemo(() => {
    const byId = new Map(banners.map((b, i) => [idOf(b, i), b]));
    return order.map((b, i) => byId.get(idOf(b, i)) || b);
  }, [order, banners]);

  // Holat id bo'yicha: yangilashda ham ko'rinib turgan slayddan yangisiga silliq o'tiladi (DOM elementlari id kalitli)
  const [activeId, setActiveId] = useState(null);
  const [prevId, setPrevId] = useState(null);
  const shown = useRef(null);
  const go = (id) => {
    if (!id || id === shown.current) return;
    setPrevId(shown.current); setActiveId(id); shown.current = id;
  };

  // Yangi tartib — uning birinchi slaydiga (oldingi ko'rinib turgani ostida qoladi va yangi qoplagach yo'qoladi)
  useEffect(() => {
    if (!order[0]) return;
    const first = idOf(order[0], 0);
    go(first);
    try { localStorage.setItem(LAST_FIRST_KEY, first); } catch { /* */ }
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = slides.map(idOf);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    let timer = null;
    const tick = () => {
      const list = idsRef.current;
      const i = list.indexOf(shown.current);
      go(list[(i + 1) % list.length]);
    };
    const start = () => { clearInterval(timer); timer = setInterval(tick, INTERVAL_MS); };
    const onVis = () => (document.hidden ? clearInterval(timer) : start());
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [slides.length, order]); // eslint-disable-line react-hooks/exhaustive-deps

  // Havolani Telegram ichida yoki brauzerda ochamiz
  const openLink = (url) => {
    const tg = window.Telegram?.WebApp;
    if (!url) return;
    if (url.includes('t.me/') && tg?.openTelegramLink) tg.openTelegramLink(url);
    else if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  };

  const handleClick = (b) => {
    // Restoran/taom reklamasi — havola emas, modal ochiladi (dastur ichida qoladi)
    if (b.isAd) { onAdClick?.(b); return; }
    if (b.hasButton && b.linkUrl) openLink(b.linkUrl);
  };

  if (!slides.length) return null;
  const curId = ids.includes(activeId) ? activeId : ids[0];

  return (
    <div className="banner-slider">
      {slides.map((b, i) => {
        const id = idOf(b, i);
        const active = id === curId;
        const clickable = b.isAd || (b.hasButton && b.linkUrl);
        return (
          <div
            key={id}
            className={`banner-slide ${b.hasButton || b.isAd ? '' : 'banner-slide--plain'} ${active ? 'is-active' : ''} ${id === prevId && !active ? 'is-prev' : ''}`}
            style={b.imageUrl ? undefined : { background: b.bg }}
            onClick={active ? () => handleClick(b) : undefined}
            role={active && clickable ? 'button' : undefined}
            aria-hidden={!active}
          >
            {b.imageUrl && <div className="banner-slide__img" style={{ backgroundImage: `url(${b.imageUrl})` }} />}
            {/* Matn va tugma faqat yoqilganda — aks holda toza rasm */}
            {b.hasButton && !b.isAd && (
              <div className="banner-slide__body">
                {b.eyebrow && <div className="banner-slide__eyebrow" style={{ color: b.accentText }}>{b.eyebrow}</div>}
                {b.title && <div className="banner-slide__title">{b.title}</div>}
                <div className="banner-slide__cta" style={{ background: b.ctaBg, color: b.ctaText }}>
                  {b.cta || translate('viewLabel')}
                </div>
              </div>
            )}
            {b.isAd && <div className="banner-slide__ad-tag">{translate('adLabel')}</div>}
            {!b.imageUrl && <Icon name={b.icon} size={52} color={b.ctaBg} />}
          </div>
        );
      })}
      <div className="banner-slider__dots">
        {slides.map((b, i) => (
          <span key={idOf(b, i)} className={`banner-slider__dot ${idOf(b, i) === curId ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
