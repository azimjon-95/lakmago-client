import { useEffect } from 'react';
import { Icon } from '@/components/Icon';
import './ClosedAlert.css';

/**
 * "Restoran yopiq" ogohlantirishi.
 * Yopiq muassasadan buyurtma berishga urinilganda chiqadi.
 */
export function ClosedAlert({ info, onClose }) {
  // Orqa fon scroll bo'lmasin — FAQAT modal ochiq bo'lganda.
  // Avval info bo'lmasa ham ishlab, sahifani qotirib qo'yardi.
  useEffect(() => {
    if (!info) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [info]);

  if (!info) return null;

  return (
    <div className="closed-alert" onClick={onClose}>
      <div className="closed-alert__box" onClick={(e) => e.stopPropagation()}>
        <div className="closed-alert__icon">
          <Icon name="clock" size={28} color="#E14B42" />
        </div>

        <h3 className="closed-alert__title">
          {info.name ? `${info.name} hozir yopiq` : 'Restoran hozir yopiq'}
        </h3>

        <p className="closed-alert__text">
          Ish vaqti boshlangach buyurtma berishingiz mumkin.
        </p>

        {info.hoursLabel && (
          <div className="closed-alert__hours">
            <Icon name="clock" size={14} color="#A99C8C" />
            <span>Ish vaqti: {info.hoursLabel}</span>
          </div>
        )}

        {info.nextOpen && (
          <div className="closed-alert__next">{info.nextOpen}</div>
        )}

        <button onClick={onClose} className="closed-alert__btn">
          Tushunarli
        </button>
      </div>
    </div>
  );
}
