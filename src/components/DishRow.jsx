
import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';






export function DishRow({ dish, onOpen }) {
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const decrement = useCart((s) => s.decrement);

  const simpleKey = `${dish.id}__`;
  const inCart = items.find((i) => i.key === simpleKey);
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;
  const discountPct = dish.oldPrice ?
  Math.round((1 - dish.price / dish.oldPrice) * 100) :
  null;

  function quickAdd(e) {
    e.stopPropagation();
    haptic();
    if (hasOptions) {
      onOpen(dish);
    } else {
      addItem(dish, 1, []);
    }
  }

  return (
    <button onClick={() => onOpen(dish)} className="flex gap-3 items-center w-full text-left">
      <div className="w-[70px] h-[70px] flex-none relative">
        <DishPhoto dish={dish} height={70} radius={12} iconSize={30} />
        {dish.isHit &&
        <div className="absolute -top-1 -left-1 bg-[#D85A30] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md">
            HIT
          </div>
        }
        {discountPct &&
        <div className="absolute -top-1 -left-1 bg-[#E24B4A] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md">
            −{discountPct}%
          </div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-ink">{dish.name}</div>
        <div className="text-xs text-muted mt-0.5 leading-snug line-clamp-2">
          {dish.description}
        </div>
        <div className="text-sm font-medium text-ink mt-1">
          {dish.oldPrice &&
          <span className="text-muted line-through text-xs mr-1">
              {formatSomShort(dish.oldPrice)}
            </span>
          }
          {formatSomShort(dish.price)} so'm
        </div>
      </div>

      {inCart && !hasOptions ?
      <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
          <button
          onClick={() => decrement(simpleKey)}
          className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-muted"
          aria-label="Kamaytirish">
          
            <Icon name="minus" size={16} />
          </button>
          <span className="text-[15px] font-medium text-ink w-3 text-center">
            {inCart.quantity}
          </span>
          <button
          onClick={() => addItem(dish, 1, [])}
          className="w-7 h-7 rounded-lg bg-brand-400 flex items-center justify-center"
          aria-label="Qo'shish">
          
            <Icon name="plus" size={16} color="#2C1400" />
          </button>
        </div> :

      <button
        onClick={quickAdd}
        className="w-[30px] h-[30px] rounded-[9px] bg-brand-400 flex-none flex items-center justify-center"
        aria-label="Savatga qo'shish">
        
          <Icon name="plus" size={18} color="#2C1400" />
        </button>
      }
    </button>);

}
