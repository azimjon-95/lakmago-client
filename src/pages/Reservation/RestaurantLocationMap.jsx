import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { loadYmaps } from '@/lib/yandexMaps';

/**
 * Restoran joylashuvi — kichik preview, bosilsa katta xarita.
 *
 * Formadan ALOHIDA sahifaga o'tmaydi: bir xil komponent daraxti
 * ichida overlay sifatida ochiladi, shuning uchun forma
 * maydonlari (ism, telefon, sana, vaqt) hech qachon yo'qolmaydi.
 *
 * restaurant.lat/lng bo'lmasa — hech narsa chizilmaydi (xato
 * emas, shunchaki bo'lim ko'rinmaydi).
 */
export function RestaurantLocationMap({ restaurant }) {
  const [big, setBig] = useState(false);

  if (!restaurant?.lat || !restaurant?.lng) return null;

  return (
    <div className="resv-field">
      <label className="resv-field__label">Manzil</label>
      <MapBox
        lat={restaurant.lat}
        lng={restaurant.lng}
        name={restaurant.name}
        height={130}
        onExpand={() => setBig(true)}
      />

      {big && (
        <div className="resv-map-full" onClick={() => setBig(false)}>
          <div className="resv-map-full__head" onClick={(e) => e.stopPropagation()}>
            <span className="resv-map-full__title">{restaurant.name}</span>
            <button
              onClick={() => setBig(false)}
              className="resv-map-full__close"
              aria-label="Yopish"
            >
              <Icon name="x" size={20} color="var(--ink)" />
            </button>
          </div>
          <div className="resv-map-full__box" onClick={(e) => e.stopPropagation()}>
            <MapBox
              lat={restaurant.lat}
              lng={restaurant.lng}
              name={restaurant.name}
              height="100%"
              interactive
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Yandex xaritaning o'zi.
 *
 * Preview holatida bosilganda kattalashadi (onExpand), o'zi
 * suriladigan/kattalashadigan emas — chunki bu FIXED joylashuv,
 * mijoz nuqta tanlamayapti, restoran qayerdaligini ko'rmoqda.
 * Fullscreen holatida esa zoom bilan aylanish mumkin.
 */
function MapBox({ lat, lng, name, height, interactive = false, onExpand }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading');   // loading | ready | error

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg.enabled || !cfg.mapsKey) { setStatus('error'); return; }

        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;

        const map = new ymaps.Map(boxRef.current, {
          center: [lat, lng],
          zoom: interactive ? 16 : 15,
          controls: interactive ? ['zoomControl'] : [],
        });
        // Preview'da imo-ishora kartani surmasin — faqat bosish
        // orqali katta xaritaga o'tadi
        if (!interactive) {
          map.behaviors.disable(['scrollZoom', 'drag', 'multiTouch']);
        }
        map.geoObjects.add(new ymaps.Placemark([lat, lng], { hintContent: name }, {
          preset: 'islands#orangeDotIcon',
        }));
        mapRef.current = map;
        setStatus('ready');
      } catch {
        if (!dead) setStatus('error');
      }
    })();

    return () => {
      dead = true;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, interactive]);

  /*
   * onExpand bo'lganda (preview) — xarita o'zi drag/zoomga
   * bog'lanmagan, shuning uchun ustiga shaffof <button> qo'yib
   * bosishni ushlaymiz. Fullscreen holatida (interactive) bunday
   * qatlam YO'Q — aks holda u xaritaning o'z surish-kattalashtirish
   * imo-ishoralarini to'sib qo'yardi.
   */
  return (
    <div className="resv-map-preview" style={{ height }}>
      <div ref={boxRef} className="resv-map-preview__box" />

      {status === 'loading' && (
        <div className="resv-map-preview__overlay">
          <span className="spinner spinner--sm" />
        </div>
      )}
      {status === 'error' && (
        <div className="resv-map-preview__overlay">
          <Icon name="pin" size={22} color="var(--muted)" />
        </div>
      )}

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="resv-map-preview__tap"
          aria-label="Xaritani kattalashtirish"
        >
          {status === 'ready' && (
            <span className="resv-map-preview__hint">Kattalashtirish</span>
          )}
        </button>
      )}
    </div>
  );
}
