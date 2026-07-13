import { useMemo, useState } from 'react';

import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSom, formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';






export function DishModal({ dish, onClose }) {
  const addItem = useCart((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState(() => {
    const init = {};
    dish.optionGroups?.forEach((g) => {
      if (g.required && !g.multiple && g.options[0]) init[g.id] = [g.options[0].id];else
      init[g.id] = [];
    });
    return init;
  });

  const selectedOptions = useMemo(() => {
    const out = [];
    dish.optionGroups?.forEach((g) => {
      g.options.forEach((o) => {
        if (selected[g.id]?.includes(o.id)) out.push(o);
      });
    });
    return out;
  }, [selected, dish.optionGroups]);

  const unitPrice = dish.price + selectedOptions.reduce((s, o) => s + o.price, 0);
  const total = unitPrice * quantity;

  function toggle(groupId, optId, multiple) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (multiple) {
        return {
          ...prev,
          [groupId]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId]
        };
      }
      return { ...prev, [groupId]: [optId] };
    });
  }

  function handleAdd() {
    haptic();
    addItem(dish, quantity, selectedOptions, note || undefined);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,10,0,0.55)' }}
      onClick={onClose}>
      
      <div
        className="w-full max-w-[420px] bg-surface rounded-t-[22px] overflow-hidden animate-sheet max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="relative flex-none">
          <DishPhoto dish={dish} height={180} radius={0} iconSize={72} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full flex items-center justify-center text-white"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            aria-label="Yopish">
            
            <Icon name="x" size={18} color="#fff" />
          </button>
          {dish.isHit &&
          <div className="absolute top-3 left-3 bg-[#D85A30] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Icon name="flame" size={11} color="#fff" /> HIT
            </div>
          }
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xl font-medium text-ink">{dish.name}</div>
            <div className="text-lg font-medium text-ink whitespace-nowrap">
              {formatSom(dish.price)}
            </div>
          </div>
          <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{dish.description}</p>

          {(dish.calories || dish.weightGram) &&
          <div className="flex gap-3.5 mt-3 py-2.5 border-y border-line">
              {dish.calories &&
            <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Icon name="flame" size={15} color="#D85A30" /> {dish.calories} kkal
                </span>
            }
              {dish.weightGram &&
            <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Icon name="scale" size={15} color="#6B6B66" /> {dish.weightGram} g
                </span>
            }
            </div>
          }

          {dish.ingredients && dish.ingredients.length > 0 &&
          <>
              <div className="text-[13px] font-medium text-muted mt-3.5 uppercase tracking-wide">
                Tarkibi
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dish.ingredients.map((ing) =>
              <span
                key={ing}
                className="bg-canvas border border-line text-muted text-xs px-2.5 py-1 rounded-2xl">
                
                    {ing}
                  </span>
              )}
              </div>
            </>
          }

          {dish.optionGroups?.map((g) =>
          <div key={g.id} className="mt-4">
              <div className="text-[13px] font-medium text-ink">
                {g.title}{' '}
                {g.required ?
              <span className="text-[#D85A30] text-[11px]">· majburiy</span> :

              <span className="text-muted text-[11px]">· ixtiyoriy</span>
              }
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {g.options.map((o) => {
                const isSel = selected[g.id]?.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(g.id, o.id, g.multiple)}
                    className="flex items-center justify-between px-3 py-2.5 border border-line rounded-xl text-left">
                    
                      <span className="text-sm text-ink">
                        {o.name}
                        {o.price > 0 &&
                      <span className="text-muted text-xs"> +{formatSomShort(o.price)}</span>
                      }
                      </span>
                      {g.multiple ?
                    <span
                      className="w-[22px] h-[22px] rounded-md flex items-center justify-center border-[1.5px]"
                      style={{
                        background: isSel ? '#EF9F27' : 'transparent',
                        borderColor: isSel ? '#EF9F27' : '#D3D1C7'
                      }}>
                      
                          {isSel && <Icon name="check" size={15} color="#2C1400" />}
                        </span> :

                    <span
                      className="w-5 h-5 rounded-full"
                      style={
                      isSel ?
                      { border: '5px solid #EF9F27', background: '#fff' } :
                      { border: '1.5px solid #B4B2A9' }
                      } />

                    }
                    </button>);

              })}
              </div>
            </div>
          )}

          <div className="text-[13px] font-medium text-ink mt-4">Izoh</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Masalan: piyozsiz qiling..."
            className="mt-2 w-full px-3 py-2.5 border border-line rounded-xl text-[16px] text-ink placeholder:text-muted outline-none focus:border-brand-400" />
          

          <div className="flex items-center gap-3 mt-5">
            <div className="flex items-center gap-3.5 border border-line rounded-xl px-3 py-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kamaytirish">
                <Icon name="minus" size={18} color="#6B6B66" />
              </button>
              <span className="text-base font-medium text-ink w-4 text-center">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label="Ko'paytirish">
                <Icon name="plus" size={18} color="#BA7517" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-brand-ink text-white text-[15px] font-medium py-3.5 rounded-xl text-center active:scale-[0.99] transition-transform">
              
              Savatga · {formatSom(total)}
            </button>
          </div>
        </div>
      </div>
    </div>);

}
