import { useNavigate } from 'react-router-dom';

import { Icon } from './Icon';
import { PHOTO_STYLES } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';

export function RestaurantCard({ restaurant: r }) {
  const navigate = useNavigate();
  const hasPhoto = (r.images || []).length > 0;
  const photoKey = hasPhoto ? r.images[0] : null;
  const style = photoKey ? PHOTO_STYLES[photoKey] : null;

  return (
    <button
      onClick={() => navigate(`/restaurant/${r.id}`)}
      className="block w-full text-left bg-surface border border-line rounded-card overflow-hidden active:scale-[0.99] transition-transform">
      
      <div
        className="h-[104px] flex items-center justify-center relative"
        style={{ background: style ? style.grad : r.tint }}>
        
        {style &&
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.3), transparent 55%)' }} />

        }
        <Icon name={r.icon} size={42} color={style ? style.iconColor : '#EF9F27'} strokeWidth={style ? 1.4 : 2} className="relative" />
        <div className="absolute top-2 left-2 bg-[#2C1400] text-[#FAC775] text-[11px] px-2 py-[3px] rounded-lg flex items-center gap-1">
          <Icon name="star" size={11} color="#FAC775" /> {r.rating.toFixed(1)}
        </div>
        {r.discount &&
        <div className="absolute top-2 right-2 bg-brand-400 text-brand-text text-[11px] font-medium px-2 py-[3px] rounded-lg">
            −{r.discount}%
          </div>
        }
        {r.isNew &&
        <div className="absolute top-2 right-2 bg-[#0F6E56] text-white text-[11px] font-medium px-2 py-[3px] rounded-lg">
            Yangi
          </div>
        }
        {!hasPhoto &&
        <div className="absolute bottom-1.5 right-2 flex items-center gap-1 bg-white/70 rounded-md px-1.5 py-0.5">
            <Icon name="camera" size={10} color="#9A9A94" />
          </div>
        }
      </div>
      <div className="px-3 py-[10px]">
        <div className="text-[15px] font-medium text-ink">{r.name}</div>
        <div className="text-xs text-muted mt-0.5 flex items-center gap-1 flex-wrap">
          <Icon name="clock" size={12} color="#6B6B66" /> {r.deliveryMin}-{r.deliveryMax} daq ·{' '}
          <Icon name="bike" size={12} color="#6B6B66" />{' '}
          {r.deliveryFee === 0 ? 'Bepul' : formatSomShort(r.deliveryFee)} · {r.cuisine}
        </div>
      </div>
    </button>);

}
