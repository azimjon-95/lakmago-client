import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { getCurrentPosition, reverseGeocodeViaYandex } from '@/lib/location';
import { loadYmaps } from '@/lib/yandexMaps';
import { haptic } from '@/lib/telegram';

// Toshkent markazi — joylashuv aniqlanmagunicha shu ko'rsatiladi
const DEFAULT_CENTER = [41.311081, 69.240562];

/**
 * 2-bosqichdan kirilgan karta orqali manzil tanlash.
 *
 * Mijoz kartani surib, markazdagi ignani xohlagan nuqtaga
 * to'g'rilaydi (Yandex Taxi/Uber uslubi — igna qotib turadi,
 * karta suriladi). Markaz o'zgarganda manzil server orqali
 * (Yandex Geocoder, kalit serverda qoladi) aniqlanadi.
 */
export function MapAddressPicker({ onPick, onBack }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  const [status, setStatus] = useState('loading');   // loading | ready | error
  const [error, setError] = useState('');
  const [address, setAddress] = useState(null);       // { street, city, full }
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

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
    debounceRef.current = setTimeout(() => {
      const [lat, lng] = mapRef.current.getCenter();
      resolveAddress(lat, lng);
    }, 350);
  }, [resolveAddress]);

  useEffect(() => {
    let dead = false;

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

        // Joriy joylashuv bo'lsa shundan boshlaymiz, bo'lmasa Toshkent markazi
        let start = DEFAULT_CENTER;
        try {
          const pos = await getCurrentPosition();
          if (!dead) start = [pos.lat, pos.lng];
        } catch { /* ruxsat yo'q — standart markaz */ }
        if (dead) return;

        const map = new ymaps.Map(boxRef.current, {
          center: start,
          zoom: 16,
          controls: ['zoomControl'],
        });
        map.behaviors.disable('scrollZoom');
        mapRef.current = map;
        map.events.add('boundschange', onBoundsChange);

        setStatus('ready');
        resolveAddress(start[0], start[1]);
      } catch (e) {
        if (!dead) { setStatus('error'); setError(e.message || 'Xarita yuklanmadi'); }
      }
    })();

    return () => {
      dead = true;
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
      const { lat, lng } = await getCurrentPosition();
      mapRef.current?.setCenter([lat, lng], 17, { duration: 300 });
      resolveAddress(lat, lng);
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
        <button onClick={onBack} className="addrflow__back-btn" aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#F7F2EA" />
        </button>
        <h3 className="addrflow__header-title">Kartadan tanlang</h3>
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
            <Icon name="pin" size={32} color="#A99C8C" />
            <p>{error}</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* Qotib turuvchi igna — karta suriladi, igna markazda qoladi */}
            <div className="map-picker__pin">
              <Icon name="pin" size={40} color="#F5A524" strokeWidth={1.5} />
              <span className="map-picker__pin-shadow" />
            </div>

            <button
              onClick={locateMe}
              disabled={locating}
              className="map-picker__locate"
              aria-label="Joriy joylashuv"
            >
              {locating ? <span className="spinner spinner--sm" /> : (
                <Icon name="navigation" size={20} color="#F5A524" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="map-picker__footer">
        <div className="map-picker__address">
          {resolving ? (
            <span className="map-picker__address-loading">Manzil aniqlanmoqda...</span>
          ) : address ? (
            <>
              <div className="map-picker__street">{address.street}</div>
              {address.city && <div className="map-picker__city">{address.city}</div>}
            </>
          ) : (
            <span className="map-picker__address-loading">Kartani suring</span>
          )}
        </div>

        <button
          onClick={confirm}
          disabled={status !== 'ready' || resolving}
          className="addrflow__btn-primary"
        >
          <Icon name="check" size={18} color="#2A1500" />
          Shu manzilni tanlash
        </button>
      </div>
    </div>
  );
}
