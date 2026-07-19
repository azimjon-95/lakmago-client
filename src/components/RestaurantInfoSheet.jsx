import { Icon } from './Icon';
import { formatSom } from '@/lib/utils';
import './cards/RestaurantInfoSheet.css';

// Restoran ma'lumot oynasi (Uzum uslubi).
//   kind='schedule' — ish tartibi, yuridik ma'lumot
//   kind='service'  — xizmat haqi, minimal buyurtma
export function RestaurantInfoSheet({ kind, restaurant, onClose }) {
  const r = restaurant || {};

  return (
    <div className="rinfo-overlay" onClick={onClose}>
      <div className="rinfo-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rinfo-sheet__grabber" />
        <button onClick={onClose} className="rinfo-sheet__close" aria-label="Yopish">
          <Icon name="x" size={18} color="#A99C8C" />
        </button>

        {kind === 'schedule' ? (
          <div className="rinfo-body rinfo-body--center">
            <span className="rinfo-icon"><Icon name="info" size={26} color="#E0A96D" /></span>
            <h3 className="rinfo-title">Ish tartibi</h3>

            <div className="rinfo-text">
              {r.legalName && <p>{r.legalName}</p>}
              {r.address && <p>Manzil: {r.address}</p>}
              {r.legalAddress && <p>Yur. manzil: {r.legalAddress}</p>}
              {r.inn && <p>INN: {r.inn}</p>}
              {r.phone && <p>Tel: {r.phone}</p>}
            </div>

            <div className="rinfo-hours">
              {r.openTime || '09:00'} dan {r.closeTime || '23:00'} gacha
            </div>
          </div>
        ) : (
          <div className="rinfo-body">
            <h3 className="rinfo-title rinfo-title--left">Xizmat haqi</h3>

            <div className="rinfo-rows">
              {r.serviceFeePercent > 0 ? (
                <div className="rinfo-row">
                  <span className="rinfo-row__label">Buyurtma summasidan</span>
                  <span className="rinfo-row__value">
                    {r.serviceFeePercent}%
                    {r.serviceFeeMin > 0 && r.serviceFeeMax > 0 && (
                      <span className="rinfo-row__note">*</span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="rinfo-row">
                  <span className="rinfo-row__label">Xizmat haqi</span>
                  <span className="rinfo-row__value rinfo-row__value--free">Bepul</span>
                </div>
              )}

              {r.deliveryFee > 0 ? (
                <div className="rinfo-row">
                  <span className="rinfo-row__label">Yetkazib berish</span>
                  <span className="rinfo-row__value">{formatSom(r.deliveryFee)}</span>
                </div>
              ) : (
                <div className="rinfo-row">
                  <span className="rinfo-row__label">Yetkazib berish</span>
                  <span className="rinfo-row__value rinfo-row__value--free">Bepul</span>
                </div>
              )}
            </div>

            <h3 className="rinfo-title rinfo-title--left rinfo-title--mt">Tafsilotlar</h3>
            <div className="rinfo-rows">
              <div className="rinfo-row">
                <span className="rinfo-row__label">Minimal buyurtma miqdori</span>
                <span className="rinfo-row__value">
                  {r.minOrderAmount > 0 ? formatSom(r.minOrderAmount) : 'Cheklovsiz'}
                </span>
              </div>
              <div className="rinfo-row">
                <span className="rinfo-row__label">Yetkazish vaqti</span>
                <span className="rinfo-row__value">{r.deliveryMin}–{r.deliveryMax} daq</span>
              </div>
            </div>

            {r.serviceFeePercent > 0 && r.serviceFeeMin > 0 && r.serviceFeeMax > 0 && (
              <p className="rinfo-note">
                * Servis haqi buyurtma summasining {r.serviceFeePercent}% ini tashkil etadi,
                lekin {formatSom(r.serviceFeeMax)} dan oshmaydi va {formatSom(r.serviceFeeMin)} dan kam bo'lmaydi
              </p>
            )}

            {r.reservationEnabled && r.reservationNote && (
              <p className="rinfo-note">Stol bron qilish: {r.reservationNote}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
