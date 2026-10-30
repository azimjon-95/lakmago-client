import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { loadGoogleMaps, googleKeyFrom, createMap, disposeMap } from '@/lib/googleMaps';
import { useT } from '@/i18n';
import { useModalBackClose } from '@/hooks/useModalBackClose';

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
  const t = useT();
  const [big, setBig] = useState(false);
  useModalBackClose(big, () => setBig(false));

  if (!restaurant?.lat || !restaurant?.lng) return null;

  return (
    <div className="resv-field">
      <label className="resv-field__label">{t('address')}</label>
      <MapBox
        lat={restaurant.lat}
        lng={restaurant.lng}
        name={restaurant.name}
        height={130}
        onExpand={() => setBig(true)}
        t={t}
      />

      {big && (
        <div className="resv-map-full" onClick={() => setBig(false)}>
          <div className="resv-map-full__head" onClick={(e) => e.stopPropagation()}>
            <span className="resv-map-full__title">{restaurant.name}</span>
            <button
              onClick={() => setBig(false)}
              className="resv-map-full__close"
              aria-label={t('close')}
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
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Google xaritaning o'zi.
 *
 * Preview holatida bosilganda kattalashadi (onExpand), o'zi
 * suriladigan/kattalashadigan emas — chunki bu FIXED joylashuv,
 * mijoz nuqta tanlamayapti, restoran qayerdaligini ko'rmoqda.
 * Fullscreen holatida esa zoom bilan aylanish mumkin.
 */
function MapBox({ lat, lng, name, height, interactive = false, onExpand, t }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const [status, setStatus] = useState('loading');   // loading | ready | error

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        const key = googleKeyFrom(cfg);
        if (!key) { setStatus('error'); return; }

        const maps = await loadGoogleMaps(key);
        if (dead || !boxRef.current) return;

        const map = createMap(maps, boxRef.current, { center: [lat, lng], zoom: interactive ? 16 : 15, zoomControl: interactive, interactive });
        // Restoran belgisi: to'q sariq nuqta (oq hoshiya bilan)
        new maps.Marker({
          position: { lat, lng }, map, title: name, clickable: false,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#FF6A13', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        });
        mapsRef.current = maps;
        mapRef.current = map;
        setStatus('ready');
      } catch {
        if (!dead) setStatus('error');
      }
    })();

    return () => {
      dead = true;
      if (mapRef.current) disposeMap(mapsRef.current, mapRef.current, boxRef.current);
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
          aria-label={t('zoomMapLabel')}
        >
          {status === 'ready' && (
            <span className="resv-map-preview__hint">{t('zoomInHint')}</span>
          )}
        </button>
      )}
    </div>
  );
}
