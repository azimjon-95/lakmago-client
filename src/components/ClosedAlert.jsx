import { useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import './ClosedAlert.css';

/**
 * "Restoran yopiq" ogohlantirishi.
 * Yopiq muassasadan buyurtma berishga urinilganda chiqadi.
 */
export function ClosedAlert({ info, onClose }) {
  useModalBackClose(Boolean(info), onClose);

  // Orqa fon scroll bo'lmasin — FAQAT modal ochiq bo'lganda.
  // Avval info bo'lmasa ham ishlab, sahifani qotirib qo'yardi.
  useEffect(() => {
    if (!info) return undefined;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [info]);

  if (!info) return null;

  return (
    <div className="closed-alert" onClick={onClose}>
      <div className="closed-alert__box" onClick={(e) => e.stopPropagation()}>
        <div className="closed-alert__icon">
          <Icon name={info.offToday ? 'calendar' : 'clock'} size={28} color="var(--danger)" />
        </div>

        <h3 className="closed-alert__title">
          {info.offToday
            ? (info.name ? `${info.name} bugun ishlamaydi` : 'Restoran bugun ishlamaydi')
            : (info.name ? `${info.name} hozir yopiq` : 'Restoran hozir yopiq')}
        </h3>

        <p className="closed-alert__text">
          {info.offToday
            ? 'Bugun restoranning dam olish kuni. Ish kunida buyurtma berishingiz mumkin.'
            : 'Ish vaqti boshlangach buyurtma berishingiz mumkin.'}
        </p>

        <div className="closed-alert__chips">
          {info.hoursLabel && (
            <div className="closed-alert__hours">
              <Icon name="clock" size={14} color="var(--muted)" />
              <span>Ish vaqti: {info.hoursLabel}</span>
            </div>
          )}
          {info.daysLabel && (
            <div className="closed-alert__hours">
              <Icon name="calendar" size={14} color="var(--muted)" />
              <span>Ish kunlari: {info.daysLabel}</span>
            </div>
          )}
          {info.offDaysLabel && (
            <div className="closed-alert__hours closed-alert__hours--off">
              <Icon name="calendar" size={14} color="var(--danger)" />
              <span>Dam olish: {info.offDaysLabel}</span>
            </div>
          )}
        </div>

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
