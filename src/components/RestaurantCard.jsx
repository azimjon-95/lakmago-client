import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { PHOTO_STYLES } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';

// Yandex Eda uslubidagi restoran kartasi:
// katta banner rasm + reyting badge + chegirma/yangi, ostida nom va yetkazish meta.
export function RestaurantCard({ restaurant: r }) {
  const navigate = useNavigate();
  const hasPhoto = (r.images || []).length > 0;
  const photoKey = hasPhoto ? r.images[0] : null;
  const style = photoKey ? PHOTO_STYLES[photoKey] : null;
  const freeDelivery = r.deliveryFee === 0;

  return (
    <button
      onClick={() => navigate(`/restaurant/${r.id}`)}
      className="block w-full text-left bg-surface border border-line rounded-card overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div
        className="h-[124px] flex items-center justify-center relative"
        style={{ background: style ? style.grad : r.tint }}
      >
        {style && (
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.28), transparent 55%)' }}
          />
        )}
        <Icon name={r.icon} size={46} color={style ? style.iconColor : '#EF9F27'} strokeWidth={style ? 1.4 : 2} className="relative" />

        {/* Reyting badge (Yandex uslubi — qora yarim shaffof) */}
        <div className="absolute top-2.5 left-2.5 bg-black/70 text-[#FAC775] text-[12px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
          <Icon name="star" size={12} color="#FAC775" /> {r.rating.toFixed(1)}
        </div>

        {r.discount && (
          <div className="absolute top-2.5 right-2.5 bg-[#E24B4A] text-white text-[11px] font-semibold px-2 py-1 rounded-lg">
            −{r.discount}%
          </div>
        )}
        {r.isNew && !r.discount && (
          <div className="absolute top-2.5 right-2.5 bg-[#0F6E56] text-white text-[11px] font-semibold px-2 py-1 rounded-lg">
            Yangi
          </div>
        )}
      </div>

      <div className="px-3.5 py-3">
        <div className="text-[16px] font-semibold text-ink">{r.name}</div>
        <div className="text-[12px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
          <span>{r.cuisine}</span>
          <span className="text-line">•</span>
          <span className="flex items-center gap-1"><Icon name="clock" size={12} color="#9A9A96" /> {r.deliveryMin}–{r.deliveryMax} daq</span>
          <span className="text-line">•</span>
          {freeDelivery ? (
            <span className="text-[#5DCAA5] font-medium flex items-center gap-1">
              <Icon name="bike" size={12} color="#5DCAA5" /> Bepul yetkazish
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Icon name="bike" size={12} color="#9A9A96" /> {formatSomShort(r.deliveryFee)} so'm
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
