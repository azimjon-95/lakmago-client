import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { getCurrentPosition, reverseGeocode } from '@/lib/location';
import { haptic } from '@/lib/telegram';

// 1-bosqich: joylashuvга ruxsat so'rash yoki qo'lda kiritish
export function LocationPermission({ onDetected, onManual, onClose }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const detect = async () => {
    haptic();
    setErr(null);
    setLoading(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      const addr = await reverseGeocode(lat, lng);
      onDetected({ lat, lng, ...addr });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addrflow">
      {onClose && (
        <button onClick={onClose} className="addrflow__back" aria-label="Yopish">
          <Icon name="x" size={20} color="#A99C8C" />
        </button>
      )}

      <div className="addrflow__hero">
        <div className="loc-illustration">
          <div className="loc-illustration__pin">
            <Icon name="pin" size={64} color="#F5A524" strokeWidth={1.5} />
          </div>
          <div className="loc-illustration__ring" />
        </div>
      </div>

      <h2 className="addrflow__title">Qayerga yetkazib berilsin?</h2>
      <p className="addrflow__text">
        Yaqin atrofdagi eng yaxshi restoranlarni saralab olishimiz uchun
        joylashuvingizdan foydalanishga ruxsat bering yoki manzilni qo'lda kiriting
      </p>

      {err && <div className="addrflow__error">{err}</div>}

      <div className="addrflow__actions">
        <button onClick={detect} disabled={loading} className="addrflow__btn-primary">
          {loading ? (
            <><span className="spinner spinner--sm" /> Aniqlanmoqda...</>
          ) : (
            <><Icon name="navigation" size={18} color="#2A1500" /> Joylashuvni avtomatik aniqlash</>
          )}
        </button>
        <button onClick={onManual} className="addrflow__btn-link">
          Manzilni qo'lda ko'rsatish
        </button>
      </div>
    </div>
  );
}
