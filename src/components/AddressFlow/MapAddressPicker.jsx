import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { reverseGeocodeViaYandex, PRECISE_LOCATION_M } from '@/lib/location';
import { quickPosition, lastKnownFix } from '@/lib/quickFix';
import { districtCenter, REGION_CENTER } from '@/lib/districtCenters';
import { useDistrict } from '@/store/district';
import { loadYmaps } from '@/lib/yandexMaps';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';


/**
 * 2-bosqichdan kirilgan karta orqali manzil tanlash.
 *
 * Mijoz kartani surib, markazdagi ignani xohlagan nuqtaga
 * to'g'rilaydi (Yandex Taxi/Uber uslubi — igna qotib turadi,
 * karta suriladi). Markaz o'zgarganda manzil server orqali
 * (Yandex Geocoder, kalit serverda qoladi) aniqlanadi.
 */
/*
 * Tashqi xarita havolalari — tanlangan nuqtani ko'rish uchun.
 * DIQQAT: bu ilovalar nuqtani BIZGA qaytara olmaydi (platforma
 * cheklovi), shuning uchun tanlash shu sahifada, ular faqat
 * ko'rish/tekshirish uchun.
 */
const MAP_APPS = [
  { id: 'google', label: 'Google', url: (la, ln) => `https://www.google.com/maps/search/?api=1&query=${la},${ln}` },
  // Yandex'da tartib: LONGITUDE,LATITUDE
  { id: 'yandex', label: 'Yandex', url: (la, ln) => `https://yandex.com/maps/?ll=${ln},${la}&z=17&pt=${ln},${la},pm2rdm` },
  { id: 'apple', label: 'Apple', url: (la, ln) => `https://maps.apple.com/?ll=${la},${ln}&q=${la},${ln}` },
];

export function MapAddressPicker({ start = null, onPick, onBack }) {
  const t = useT();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);
  // Mijoz xaritaga tegdimi — tekkan bo'lsa fonda kelgan GPS xaritani uning qo'lidan "tortib olmaydi"
  const touchedRef = useRef(false);

  const [status, setStatus] = useState('loading');   // loading | ready | error
  const [error, setError] = useState('');
  const [address, setAddress] = useState(null);       // { street, city, full }
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  // Taxminiy joydan boshlanganda — mijozga igna surish kerakligini aytamiz
  const [approxM, setApproxM] = useState(
    Number.isFinite(start?.accuracy) ? Math.round(start.accuracy) : null,
  );
  const [appsOpen, setAppsOpen] = useState(false);

  const resolveAddress = useCallback(async (lat, lng) => {
    const myReq = ++reqIdRef.current;
    setResolving(true);
    try {
      const addr = await reverseGeocodeViaYandex(lat, lng);
      // Foydalanuvchi kartani yana surgan bo'lsa eski javob e'tiborsiz
      if (myReq !== reqIdRef.current) return;
      setAddress(addr);
    } catch {
      if (myReq === reqIdRef.current) setAddress(null);
    } finally {
      if (myReq === reqIdRef.current) setResolving(false);
    }
  }, []);

  // Karta markazi o'zgarganda — 350ms kutib manzilni so'raymiz
  const onBoundsChange = useCallback(() => {
    if (!mapRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Mijoz kartani O'ZI surdi — ogohlantirish vazifasini bajardi (dastur surgani hisobga olinmaydi)
    if (touchedRef.current) setApproxM(null);
    debounceRef.current = setTimeout(() => {
      const [lat, lng] = mapRef.current.getCenter();
      resolveAddress(lat, lng);
    }, 350);
  }, [resolveAddress]);

  /*
   * ═══ XARITA DARHOL OCHILADI (GPS kutilmaydi) ═══
   *
   * AVVAL: "Kartadan tanlang" bosilganda xarita GPS natijasini KUTIB, keyingina chizilardi (15–25 s bo'sh
   * aylanuvchi belgi — mijozlar shikoyati). Bundan tashqari standart markaz Toshkent edi.
   *
   * ENDI: xarita Yandex skripti tayyor bo'lishi bilan chiziladi; boshlang'ich ko'rinish (kutmasdan):
   *   1) chaqiruvchi bergan nuqta (taxminiy joy yoki tahrirlash);
   *   2) oxirgi 10 daqiqada olingan joy (tuman aniqlash/oldingi urinish) — faqat xotirada;
   *   3) tanlangan tuman markazi (zoom 14) yoki Namangan.
   * Aniq joy FONDA olinadi (xarita bilan PARALLEL) va kelganda — agar mijoz xaritaga hali tegmagan bo'lsa —
   * igna o'sha joyga silliq suriladi. Tegib ulgurgan bo'lsa joyidan qo'zg'atilmaydi ("Mening joyim" tugmasi bor).
   */
  useEffect(() => {
    let dead = false;
    const ctl = new AbortController();
    const box = boxRef.current;
    const onTouch = () => { touchedRef.current = true; };
    box?.addEventListener('pointerdown', onTouch, { passive: true });
    box?.addEventListener('touchstart', onTouch, { passive: true });

    let center = null;
    let zoom = 17;
    let exact = false;       // boshlang'ich nuqta haqiqiy joymi (manzilini so'rash mantiqli)
    if (start && Number.isFinite(start.lat) && Number.isFinite(start.lng)) {
      center = [start.lat, start.lng];
      exact = true;
    } else {
      const lk = lastKnownFix();
      if (lk) {
        center = [lk.lat, lk.lng];
        exact = true;
        if (Number.isFinite(lk.accuracy) && lk.accuracy > PRECISE_LOCATION_M) setApproxM(Math.round(lk.accuracy));
      } else {
        center = districtCenter(useDistrict.getState().activeDistrictId) || REGION_CENTER;
        zoom = 14;
      }
    }

    // Fonda aniq joy (chaqiruvchi nuqta bergan bo'lsa — qayta so'ralmaydi, mijoz ikkinchi marta kutmasin)
    let fix = null;
    const applyFix = (pos) => {
      const map = mapRef.current;
      if (!map || dead || touchedRef.current) return;
      map.setCenter([pos.lat, pos.lng], 17, { duration: 300 });
      setApproxM(Number.isFinite(pos.accuracy) && pos.accuracy > PRECISE_LOCATION_M ? Math.round(pos.accuracy) : null);
      resolveAddress(pos.lat, pos.lng);
    };
    if (!start) {
      setLocating(true);
      quickPosition({ signal: ctl.signal })
        .then((pos) => { if (dead) return; fix = pos; applyFix(pos); })
        .catch(() => { /* ruxsat yo'q / signal yo'q — mijoz xaritani o'zi suradi */ })
        .finally(() => { if (!dead) setLocating(false); });
    }

    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg.enabled || !cfg.mapsKey) {
          setStatus('error');
          setError('Xarita hozircha sozlanmagan');
          return;
        }

        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;

        // GPS xaritadan oldin kelgan bo'lsa — to'g'ridan-to'g'ri o'sha joydan ochamiz
        if (fix) {
          center = [fix.lat, fix.lng]; zoom = 17; exact = true;
          setApproxM(Number.isFinite(fix.accuracy) && fix.accuracy > PRECISE_LOCATION_M ? Math.round(fix.accuracy) : null);
        }

        const map = new ymaps.Map(boxRef.current, {
          center,
          zoom,
          controls: ['zoomControl'],
        }, {
          /*
           * Yandex'ning o'z "Yandex Xaritada ochish" bloki
           * yashiriladi — o'rniga uchta xarita tanlovi bor.
           */
          suppressMapOpenBlock: true,
        });
        map.behaviors.disable('scrollZoom');
        mapRef.current = map;
        map.events.add('boundschange', onBoundsChange);

        setStatus('ready');
        // Tuman markazi — taxminiy ko'rinish, "manzil" emas: mijozga "Kartani suring" ko'rinadi
        if (exact) resolveAddress(center[0], center[1]);
      } catch (e) {
        if (!dead) { setStatus('error'); setError(e.message || 'Xarita yuklanmadi'); }
      }
    })();

    return () => {
      dead = true;
      ctl.abort();
      box?.removeEventListener('pointerdown', onTouch);
      box?.removeEventListener('touchstart', onTouch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = async () => {
    haptic();
    setLocating(true);
    try {
      const { lat, lng, accuracy } = await quickPosition();
      touchedRef.current = false;   // dastur suradi — "taxminiy" ogohlantirishi o'chib ketmasin
      mapRef.current?.setCenter([lat, lng], 17, { duration: 300 });
      resolveAddress(lat, lng);
      setApproxM(Number.isFinite(accuracy) && accuracy > PRECISE_LOCATION_M ? Math.round(accuracy) : null);
    } catch { /* ruxsat berilmadi — jim */ }
    finally { setLocating(false); }
  };

  const confirm = () => {
    if (!mapRef.current || resolving) return;
    haptic();
    const [lat, lng] = mapRef.current.getCenter();
    onPick({ lat, lng, ...(address || {}) });
  };

  return (
    <div className="addrflow addrflow--map">
      <div className="addrflow__header">
        <button onClick={onBack} className="addrflow__back-btn" aria-label={t('back')}>
          <Icon name="arrowLeft" size={22} color="var(--ink)" />
        </button>
        <h3 className="addrflow__header-title">{t('pickFromMapTitle')}</h3>
      </div>

      <div className="map-picker">
        <div ref={boxRef} className="map-picker__box" />

        {status === 'loading' && (
          <div className="map-picker__overlay">
            <span className="spinner" />
          </div>
        )}

        {status === 'error' && (
          <div className="map-picker__overlay">
            <Icon name="pin" size={32} color="var(--muted)" />
            <p>{error}</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* Qotib turuvchi igna — karta suriladi, igna markazda qoladi */}
            <div className="map-picker__pin">
              <Icon name="pin" size={40} color="var(--brand)" strokeWidth={1.5} />
              <span className="map-picker__pin-shadow" />
            </div>

            {/* Taxminiy joy — mijozga nima qilish kerakligini aytamiz */}
            {approxM && (
              <div className="map-picker__approx">
                <Icon name="info" size={16} color="var(--brand)" />
                <span>{t('approxLocationHint').replace('{m}', approxM)}</span>
              </div>
            )}

            {/* Tashqi xaritada ko'rish — uchta tanlov */}
            <div className="map-picker__apps">
              <button type="button" className="map-picker__apps-toggle"
                onClick={() => { haptic(); setAppsOpen((v) => !v); }}>
                <Icon name="pin" size={15} color="var(--brand)" />
                <span>{t('openInMapsLabel')}</span>
              </button>
              {appsOpen && (
                <div className="map-picker__apps-list">
                  {MAP_APPS.map((a) => (
                    <button key={a.id} type="button" className="map-picker__app"
                      onClick={() => {
                        const [la, ln] = mapRef.current?.getCenter() || [];
                        if (!Number.isFinite(la)) return;
                        haptic();
                        window.open(a.url(la.toFixed(6), ln.toFixed(6)), '_blank', 'noopener');
                      }}>
                      {a.label}
                    </button>
                  ))}
                  <div className="map-picker__apps-hint">{t('mapAppsHint')}</div>
                </div>
              )}
            </div>

            <button
              onClick={locateMe}
              disabled={locating}
              className="map-picker__locate"
              aria-label={t('currentLocationAriaLabel')}
            >
              {locating ? <span className="spinner spinner--sm" /> : (
                <Icon name="navigation" size={20} color="var(--brand)" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="map-picker__footer">
        <div className="map-picker__address">
          {resolving ? (
            <span className="map-picker__address-loading">{t('addressDetecting')}</span>
          ) : address ? (
            <>
              <div className="map-picker__street">{address.street}</div>
              {address.city && <div className="map-picker__city">{address.city}</div>}
            </>
          ) : (
            <span className="map-picker__address-loading">{t('moveMap')}</span>
          )}
        </div>

        <button
          onClick={confirm}
          disabled={status !== 'ready' || resolving}
          className="addrflow__btn-primary"
        >
          <Icon name="check" size={18} color="var(--brand-text)" />
          {t('selectThisAddress')}
        </button>
      </div>
    </div>
  );
}
