import { DishPhoto } from './DishPhoto';
import { Icon } from './Icon';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';

// Yandex Eda uslubidagi gorizontal taom kartasi (trend/chegirma bo'limlari uchun):
// katta rasm ustida chegirma badge va "＋" tugma, ostida nom, restoran, narx.
export function DishScrollCard({ dish, onClick }) {
  const addItem = useCart((s) => s.addItem);
  const discountPct = dish.oldPrice ? Math.round((1 - dish.price / dish.oldPrice) * 100) : null;
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;

  function quickAdd(e) {
    e.stopPropagation();
    haptic();
    if (hasOptions) onClick(dish);
    else addItem(dish, 1, []);
  }

  return (
    <button
      onClick={() => onClick(dish)}
      className="flex-none w-[150px] text-left active:scale-[0.98] transition-transform"
    >
      <div className="relative">
        <DishPhoto dish={dish} height={112} radius={14} iconSize={38} />
        {discountPct && (
          <div className="absolute top-2 left-2 bg-[#E24B4A] text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
            −{discountPct}%
          </div>
        )}
        {dish.isHit && !discountPct && (
          <div className="absolute top-2 left-2 bg-brand-400 text-brand-text text-[11px] font-semibold px-2 py-0.5 rounded-md">
            HIT
          </div>
        )}
        {/* "＋" tugma — rasm o'ng pastida (Yandex uslubi) */}
        <button
          onClick={quickAdd}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-[10px] bg-brand-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Savatga qo'shish"
        >
          <Icon name="plus" size={18} color="#2C1400" />
        </button>
      </div>

      <div className="text-[13px] font-medium text-ink mt-2 leading-tight line-clamp-1">{dish.name}</div>
      {dish.restaurantName && (
        <div className="text-[11px] text-muted mt-0.5 line-clamp-1">{dish.restaurantName}</div>
      )}
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-[14px] font-semibold text-ink">{formatSomShort(dish.price)}</span>
        {dish.oldPrice && (
          <span className="text-muted line-through text-[11px]">{formatSomShort(dish.oldPrice)}</span>
        )}
      </div>
    </button>
  );
}
