
import { DishPhoto } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';






export function DishScrollCard({ dish, onClick }) {
  const discountPct = dish.oldPrice ?
  Math.round((1 - dish.price / dish.oldPrice) * 100) :
  null;

  return (
    <button
      onClick={() => onClick(dish)}
      className="flex-none w-[130px] text-left active:scale-[0.98] transition-transform">
      
      <div className="relative">
        <DishPhoto dish={dish} height={96} radius={12} iconSize={34} />
        {dish.isHit &&
        <div className="absolute top-1.5 left-1.5 bg-[#D85A30] text-white text-[10px] font-medium px-[7px] py-0.5 rounded-md">
            HIT
          </div>
        }
        {discountPct &&
        <div className="absolute top-1.5 left-1.5 bg-[#E24B4A] text-white text-[10px] font-medium px-[7px] py-0.5 rounded-md">
            −{discountPct}%
          </div>
        }
      </div>
      <div className="text-[13px] font-medium text-ink mt-1.5 leading-tight">{dish.name}</div>
      <div className="text-xs mt-0.5">
        {dish.oldPrice ?
        <>
            <span className="font-medium text-ink">{formatSomShort(dish.price)}</span>{' '}
            <span className="text-muted line-through text-[11px]">
              {formatSomShort(dish.oldPrice)}
            </span>
          </> :

        <span className="text-muted">{formatSomShort(dish.price)} so'm</span>
        }
      </div>
    </button>);

}
