import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { getCurrentPosition, reverseGeocode, isPrecise } from '@/lib/location';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';

// 1-bosqich: joylashuvга ruxsat so'rash yoki qo'lda kiritish
export function LocationPermission({ onDetected, onApproximate, onManual, onClose }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const detect = async () => {
    haptic();
    setErr(null);
    setLoading(true);
    try {
      const pos = await getCurrentPosition();

      /*
       * Joy faqat TAXMINAN aniqlangan bo'lsa (Wi-Fi/tarmoq),
       * mijozni xaritaga yuboramiz — igna o'sha nuqtada turadi,
       * u uni aniq uyiga suradi. Aniq bo'lsa (GPS) — darhol
       * tafsilotlarga, ortiqcha qadamsiz.
       */
      if (!isPrecise(pos) && onApproximate) {
        onApproximate(pos);
        return;
      }

      const addr = await reverseGeocode(pos.lat, pos.lng);
      onDetected({ lat: pos.lat, lng: pos.lng, ...addr });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addrflow">
      {onClose && (
        <button onClick={onClose} className="addrflow__back" aria-label={t('close')}>
          <Icon name="x" size={20} color="var(--muted)" />
        </button>
      )}

      <div className="addrflow__hero">
        <div className="loc-illustration">
          <div className="loc-illustration__pin">
            <Icon name="pin" size={64} color="var(--brand)" strokeWidth={1.5} />
          </div>
          <div className="loc-illustration__ring" />
        </div>
      </div>

      <h2 className="addrflow__title">{t('whereToDeliverQuestion')}</h2>
      <p className="addrflow__text">
        {t('locationPermissionHint')}
      </p>

      {err && <div className="addrflow__error">{err}</div>}

      <div className="addrflow__actions">
        <button onClick={detect} disabled={loading} className="addrflow__btn-primary">
          {loading ? (
            <><span className="spinner spinner--sm" /> {t('detectingLocation')}</>
          ) : (
            <><Icon name="navigation" size={18} color="var(--brand-text)" /> {t('autoDetectLocation')}</>
          )}
        </button>
        <button onClick={onManual} className="addrflow__btn-link">
          {t('enterManually')}
        </button>
      </div>
    </div>
  );
}
