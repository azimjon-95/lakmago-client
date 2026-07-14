import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';

// Yandex Eda uslubidagi menyu qatori:
// chapda katta rasm, o'rtada nom+tavsif+meta, o'ngda narx ustida "＋" tugma.
export function DishRow({ dish, onOpen }) {
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const decrement = useCart((s) => s.decrement);

  const simpleKey = `${dish.id}__`;
  const inCart = items.find((i) => i.key === simpleKey);
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;
  const discountPct = dish.oldPrice ? Math.round((1 - dish.price / dish.oldPrice) * 100) : null;
  const stopped = dish.isAvailable === false;

  // Meta: og'irlik · kaloriya
  const meta = [
    dish.weightGram ? `${dish.weightGram} g` : null,
    dish.calories ? `${dish.calories} kkal` : null,
  ].filter(Boolean).join(' · ');

  function quickAdd(e) {
    e.stopPropagation();
    if (stopped) return;
    haptic();
    if (hasOptions) onOpen(dish);
    else addItem(dish, 1, []);
  }

  return (
    <button
      onClick={() => !stopped && onOpen(dish)}
      className={`flex gap-3 items-stretch w-full text-left ${stopped ? 'opacity-50' : ''}`}
    >
      <div className="w-[88px] h-[88px] flex-none relative">
        <DishPhoto dish={dish} height={88} radius={14} iconSize={34} />
        {discountPct && !stopped && (
          <div className="absolute top-1 left-1 bg-[#E24B4A] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            −{discountPct}%
          </div>
        )}
        {dish.isHit && !discountPct && !stopped && (
          <div className="absolute top-1 left-1 bg-brand-400 text-brand-text text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            HIT
          </div>
        )}
        {stopped && (
          <div className="absolute inset-0 bg-black/60 rounded-[14px] flex items-center justify-center">
            <span className="text-white text-[11px] font-semibold">Tugadi</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col py-0.5">
        <div className="text-[15px] font-medium text-ink leading-tight">{dish.name}</div>
        {meta && <div className="text-[11px] text-muted mt-0.5">{meta}</div>}
        <div className="text-xs text-muted mt-1 leading-snug line-clamp-2">{dish.description}</div>

        <div className="mt-auto flex items-end justify-between pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-semibold text-ink">{formatSomShort(dish.price)}</span>
            <span className="text-[12px] text-muted">so'm</span>
            {dish.oldPrice && (
              <span className="text-muted line-through text-[12px]">{formatSomShort(dish.oldPrice)}</span>
            )}
          </div>

          {!stopped && (
            inCart && !hasOptions ? (
              <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => decrement(simpleKey)}
                  className="w-8 h-8 rounded-[10px] bg-surface border border-line flex items-center justify-center text-ink"
                  aria-label="Kamaytirish"
                >
                  <Icon name="minus" size={16} />
                </button>
                <span className="text-[15px] font-semibold text-ink w-3 text-center">{inCart.quantity}</span>
                <button
                  onClick={() => addItem(dish, 1, [])}
                  className="w-8 h-8 rounded-[10px] bg-brand-400 flex items-center justify-center"
                  aria-label="Qo'shish"
                >
                  <Icon name="plus" size={16} color="#2C1400" />
                </button>
              </div>
            ) : (
              <button
                onClick={quickAdd}
                className="w-9 h-9 rounded-[11px] bg-brand-400 flex-none flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Savatga qo'shish"
              >
                <Icon name="plus" size={20} color="#2C1400" />
              </button>
            )
          )}
        </div>
      </div>
    </button>
  );
}
