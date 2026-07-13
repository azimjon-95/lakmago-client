import { useNavigate } from 'react-router-dom';
import { useCart } from '@/store/cart';
import { Icon } from './Icon';
import { formatSom } from '@/lib/utils';

export function CartBar() {
  const navigate = useNavigate();
  const count = useCart((s) => s.totalCount());
  const total = useCart((s) => s.totalPrice());

  if (count === 0) return null;

  const dishWord = count === 1 ? 'taom' : 'ta taom';

  return (
    <div className="sticky bottom-2 mx-3 z-30">
      <button
        onClick={() => navigate('/cart')}
        className="w-full bg-brand-ink rounded-card px-4 py-3.5 flex items-center justify-between active:scale-[0.99] transition-transform"
      >
        <div className="text-left">
          <div className="text-xs text-brand-100">
            {count} {dishWord}
          </div>
          <div className="text-[17px] font-medium text-white">{formatSom(total)}</div>
        </div>
        <div className="bg-brand-400 text-brand-text text-sm font-medium px-4 py-2.5 rounded-[11px] flex items-center gap-1.5">
          Buyurtma <Icon name="arrowRight" size={16} />
        </div>
      </button>
    </div>
  );
}
