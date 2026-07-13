import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { useOrders } from '@/store/orders';
import { formatSom } from '@/lib/utils';

export function OrdersPage() {
  const navigate = useNavigate();
  const activeOrder = useOrders((s) => s.activeOrder);
  const pastOrders = useOrders((s) => s.pastOrders);

  if (!activeOrder && pastOrders.length === 0) {
    return (
      <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col">
        <div className="px-4 py-3.5 text-lg font-medium text-ink border-b border-line">Buyurtmalar</div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <Icon name="bag" size={48} color="#9A9A94" />
          <div className="text-base font-medium text-ink mt-4">Hozircha buyurtmalaringiz yo'q</div>
          <p className="text-sm text-muted mt-1.5">Buyurtma bering, shu yerda ko'rinadi.</p>
          <button onClick={() => navigate('/')} className="mt-5 bg-brand-ink text-white text-sm font-medium px-5 py-2.5 rounded-xl">
            Restoranlar
          </button>
        </div>
        <BottomNav />
      </div>);

  }

  return (
    <div className="min-h-screen bg-canvas max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 text-lg font-medium text-ink border-b border-line bg-surface">Buyurtmalar</div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {activeOrder &&
        <button
          onClick={() => navigate('/order/track')}
          className="block w-full text-left bg-brand-ink rounded-card p-3.5">
          
            <div className="flex items-center justify-between">
              <div className="text-xs text-brand-100">Faol buyurtma · #{activeOrder.id}</div>
              <Icon name="chevronRight" size={16} color="#FAC775" />
            </div>
            <div className="text-[15px] font-medium text-white mt-1">
              {activeOrder.subOrders.map((s) => s.restaurant.name).join(' + ')}
            </div>
            <div className="text-xs text-brand-100 mt-1">
              {activeOrder.subOrders.filter((s) => s.status === 'delivered').length}/{activeOrder.subOrders.length} yetkazildi ·{' '}
              {formatSom(activeOrder.total)}
            </div>
          </button>
        }

        {pastOrders.length > 0 &&
        <>
            <div className="text-[13px] font-medium text-muted mt-1">Tarix</div>
            {pastOrders.map((o) =>
          <div key={o.id} className="bg-surface border border-line rounded-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium text-ink">#{o.id}</div>
                  <span className="text-[11px] text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-lg">Yakunlandi</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {o.subOrders.map((s) => s.restaurant.name).join(' + ')} · {formatSom(o.total)}
                </div>
              </div>
          )}
          </>
        }
      </div>

      <BottomNav />
    </div>);

}
