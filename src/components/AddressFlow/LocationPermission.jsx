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

  /*
   * ═══ DIZAYN ═══
   *
   * Yuqorida sarlavha, markazda uy rasmi, pastda tugmalar.
   * Rasm chetlari SHAFFOF (location-hero.webp) — sahifa foni
   * ostidan ko'rinib turadi va rasm alohida "quti" bo'lib
   * ajralib qolmaydi.
   *
   * Uslublar `.locperm` ichida — boshqa manzil sahifalariga
   * ta'sir qilmaydi.
   */
  return (
    <div className="locperm">
      {/* Fondagi xira xarita chiziqlari — sahifa bo'shligini to'ldiradi */}
      <div className="locperm__bg" aria-hidden="true" />

      {onClose && (
        <button onClick={onClose} className="locperm__close" aria-label={t('close')}>
          <Icon name="x" size={20} color="var(--ink)" />
        </button>
      )}

      <div className="locperm__head">
        <h2 className="locperm__title">{t('whereToDeliverQuestion')}</h2>
        <p className="locperm__text">{t('locationPermissionHint')}</p>
      </div>

      <div className="locperm__hero">
        <img
          src="/location-hero.webp"
          alt=""
          aria-hidden="true"
          className="locperm__img"
          draggable="false"
        />
      </div>

      {err && <div className="locperm__error">{err}</div>}

      <div className="locperm__actions">
        <button onClick={detect} disabled={loading} className="locperm__btn">
          {loading ? (
            <><span className="spinner spinner--sm" /> {t('detectingLocation')}</>
          ) : (
            <><Icon name="pin" size={20} color="#fff" /> {t('autoDetectLocation')}</>
          )}
        </button>
        <button onClick={onManual} className="locperm__link">
          {t('enterManually')}
        </button>
        {/* Pastdagi bezak chizig'i */}
        <div className="locperm__divider" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
