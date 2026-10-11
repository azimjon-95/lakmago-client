import { useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { loadYmaps } from '@/lib/yandexMaps';

const DEFAULT_CENTER = [41.311081, 69.240562];

/**
 * Restoran → mijoz yo'li (Yandex MultiRoute).
 * Real navigator uslubi: yo'l bo'ylab chiziq + 2 ta placemark.
 */
export function TrackMap({
  restaurantLat,
  restaurantLng,
  customerLat,
  customerLng,
  restaurantName = 'Restoran',
  itemLabel = '',
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg.enabled || !cfg.mapsKey) {
          setStatus('error');
          setError('Xarita sozlanmagan');
          return;
        }

        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;

        const hasR = Number.isFinite(restaurantLat) && Number.isFinite(restaurantLng);
        const hasC = Number.isFinite(customerLat) && Number.isFinite(customerLng);

        const rPoint = hasR ? [restaurantLat, restaurantLng] : null;
        const cPoint = hasC ? [customerLat, customerLng] : null;
        const center = cPoint || rPoint || DEFAULT_CENTER;

        const map = new ymaps.Map(boxRef.current, {
          center,
          zoom: 14,
          controls: ['zoomControl'],
        }, {
          suppressMapOpenBlock: true,
        });
        map.behaviors.disable('scrollZoom');
        mapRef.current = map;

        // Mijoz nuqtasi
        if (cPoint) {
          map.geoObjects.add(new ymaps.Placemark(cPoint, {
            balloonContent: 'Sizning joylashuvingiz',
            iconCaption: 'Siz',
          }, {
            preset: 'islands#blueCircleDotIcon',
          }));
        }

        // Restoran nuqtasi
        if (rPoint) {
          map.geoObjects.add(new ymaps.Placemark(rPoint, {
            balloonContent: restaurantName,
            iconCaption: restaurantName,
          }, {
            preset: 'islands#orangeFoodIcon',
          }));
        }

        // Yo'l bo'ylab real marshrut
        if (rPoint && cPoint) {
          const multiRoute = new ymaps.multiRouter.MultiRoute({
            referencePoints: [rPoint, cPoint],
            params: { routingMode: 'auto' },
          }, {
            boundsAutoApply: true,
            routeActiveStrokeWidth: 5,
            routeActiveStrokeColor: '#EF9F27',
            routeActiveStrokeStyle: 'solid',
            routeStrokeWidth: 4,
            routeStrokeColor: '#EF9F2788',
            wayPointVisible: false,
            viaPointVisible: false,
            pinVisible: false,
          });
          map.geoObjects.add(multiRoute);

          multiRoute.model.events.add('requestsuccess', () => {
            try {
              const bounds = multiRoute.getBounds();
              if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48 });
            } catch { /* ignore */ }
          });
        } else if (rPoint && cPoint) {
          map.setBounds([rPoint, cPoint], { checkZoomRange: true, zoomMargin: 48 });
        }

        if (!dead) setStatus('ready');
      } catch (e) {
        if (!dead) {
          setStatus('error');
          setError(e.message || 'Xarita yuklanmadi');
        }
      }
    })();

    return () => {
      dead = true;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [restaurantLat, restaurantLng, customerLat, customerLng, restaurantName]);

  return (
    <div className="track-map">
      <div ref={boxRef} className="track-map__box" />
      {status === 'loading' && (
        <div className="track-map__overlay"><span className="spinner" /></div>
      )}
      {status === 'error' && (
        <div className="track-map__overlay track-map__overlay--err">
          <p>{error}</p>
        </div>
      )}
      {itemLabel && status === 'ready' && (
        <div className="track-map__item-chip">{itemLabel}</div>
      )}
    </div>
  );
}