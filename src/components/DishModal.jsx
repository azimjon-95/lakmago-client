import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSom, formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic, shareDish } from '@/lib/telegram';
import { useT } from '@/i18n';
import './cards/DishModal.css';

export function DishModal({ dish, onClose }) {
  const t = useT();
  const addItem = useCart((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState(() => {
    const init = {};
    dish.optionGroups?.forEach((g) => {
      if (g.required && !g.multiple && g.options[0]) init[g.id] = [g.options[0].id];
      else init[g.id] = [];
    });
    return init;
  });

  const selectedOptions = useMemo(() => {
    const out = [];
    dish.optionGroups?.forEach((g) => {
      g.options.forEach((o) => { if (selected[g.id]?.includes(o.id)) out.push(o); });
    });
    return out;
  }, [selected, dish.optionGroups]);

  const unitPrice = dish.price + selectedOptions.reduce((s, o) => s + o.price, 0);
  const total = unitPrice * quantity;

  function toggle(groupId, optId, multiple) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (multiple) {
        return { ...prev, [groupId]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
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
    <div className="dish-modal-overlay" onClick={onClose}>
      <div className="dish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dish-modal__grabber" />
        <div className="dish-modal__photo">
          <DishPhoto dish={dish} fill fit="contain" radius={0} iconSize={72} />
          <button onClick={onClose} className="dish-modal__close" aria-label={t('close')}>
            <Icon name="x" size={18} color="#fff" />
          </button>
          <button onClick={() => shareDish(dish)} className="dish-modal__share" aria-label={t('share')}>
            <Icon name="share" size={17} color="#fff" />
          </button>
          {dish.isHit && <div className="dish-modal__hit"><Icon name="flame" size={11} color="#fff" /> HIT</div>}
        </div>

        <div className="dish-modal__body">
          <div className="dish-modal__head">
            <div className="dish-modal__name">{dish.name}</div>
            <div className="dish-modal__price">{formatSom(dish.price)}</div>
          </div>
          {dish.description && <p className="dish-modal__desc">{dish.description}</p>}

          {(dish.calories || dish.weightGram) && (
            <div className="dish-modal__nutrition">
              {dish.calories && <span><Icon name="flame" size={15} color="#E14B42" /> {dish.calories} {t('calories')}</span>}
              {dish.weightGram && <span><Icon name="scale" size={15} color="#A99C8C" /> {dish.weightGram} {t('gram')}</span>}
            </div>
          )}

          {dish.ingredients && dish.ingredients.length > 0 && (
            <>
              <div className="dish-modal__section-label">{t('ingredients')}</div>
              <div className="dish-modal__ingredients">
                {dish.ingredients.map((ing) => <span key={ing} className="dish-modal__ing">{ing}</span>)}
              </div>
            </>
          )}

          {dish.optionGroups?.map((g) => (
            <div key={g.id} className="dish-modal__group">
              <div className="dish-modal__group-title">
                {g.title} {g.required ? <span className="dish-modal__req">· {t('portionSize')}</span> : <span className="dish-modal__opt">· {t('extras')}</span>}
              </div>
              <div className="dish-modal__options">
                {g.options.map((o) => {
                  const isSel = selected[g.id]?.includes(o.id);
                  return (
                    <button key={o.id} onClick={() => toggle(g.id, o.id, g.multiple)} className="dish-modal__option">
                      <span className="dish-modal__option-name">
                        {o.name}{o.price > 0 && <span className="dish-modal__option-price"> +{formatSomShort(o.price)}</span>}
                      </span>
                      {g.multiple ? (
                        <span className={`dish-modal__check ${isSel ? 'is-sel' : ''}`}>{isSel && <Icon name="check" size={15} color="#2A1500" />}</span>
                      ) : (
                        <span className={`dish-modal__radio ${isSel ? 'is-sel' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="dish-modal__section-label dish-modal__section-label--comment">{t('comment')}</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('commentHint')} className="input-field" style={{ marginTop: 8 }} />

          <div className="dish-modal__footer">
            <div className="qty-control dish-modal__qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="−"><Icon name="minus" size={18} color="#A99C8C" /></button>
              <span className="qty-value">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label="+"><Icon name="plus" size={18} color="#F5A524" /></button>
            </div>
            <button onClick={handleAdd} className="btn-primary dish-modal__add">
              {t('toCart')} · {formatSom(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
