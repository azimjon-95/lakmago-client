import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { haptic } from '@/lib/telegram';
import { formatSom, formatSomShort } from '@/lib/utils';
import { useDineInMenu } from '@/hooks/queries';
import { CATEGORIES } from '@/data/categories';

/**
 * Bronga taom oldindan tanlash.
 *
 * Taomlar platformaning yagona kategoriyalari bo'yicha
 * guruhlanadi (restoran o'zi yozgan erkin matn bo'yicha emas) —
 * restoran sahifasidagi bilan bir xil tartib.
 *
 * Tasdiqlashdan oldin mijoz tanlaganini aniq ko'radi: nomi,
 * soni, qatordagi summa va jami.
 */
export function PreOrderScreen({
  restaurant, reservationInfo, onCancelAll, onConfirm, onBack, saving, saveError, t,
}) {
  /*
   * BAZA narx — restoranning o'zi ko'rgan narxi. Mehmon zalga
   * kelib yeydi, yetkazish emas — shuning uchun bu yerda
   * yetkazish ustamasi ham, mijoz xizmat haqi ham qo'llanmaydi.
   */
  const {
    data: dishes = [], isLoading, isError, error, refetch,
  } = useDineInMenu(restaurant.id);
  const [selections, setSelections] = useState({});
  const [summaryOpen, setSummaryOpen] = useState(false);

  const sections = useMemo(() => {
    const byId = new Map();
    dishes.forEach((d) => {
      const key = d.category || '__other__';
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push(d);
    });

    const out = [];
    CATEGORIES.forEach(({ id, label }) => {
      const items = byId.get(id);
      if (items?.length) { out.push([label, items]); byId.delete(id); }
    });

    // Kategoriyasi yo'q taomlar yo'qolmasin
    const rest = [];
    byId.forEach((items) => rest.push(...items));
    if (rest.length) out.push(['Boshqa', rest]);

    return out;
  }, [dishes]);

  const dishId = (d) => d.id || d._id;

  function setQty(id, qty) {
    haptic();
    setSelections((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const selected = Object.entries(selections)
    .map(([id, qty]) => ({ dish: dishes.find((d) => dishId(d) === id), qty }))
    .filter((s) => s.dish);

  const count = selected.reduce((n, s) => n + s.qty, 0);
  const total = selected.reduce((n, s) => n + (s.dish.price || 0) * s.qty, 0);

  return (
    <div className="app-shell reservation">
      {/*
        Sarlavha va bron eslatmasi BITTA qattiq (sticky) blok —
        alohida bo'lganda ro'yxat surilganda ular orasida
        oraliq holat paydo bo'lib, tepa qism kesilib qolgandek
        ko'rinardi (Telegram'ning o'z boshqaruvlari bilan
        ustma-ust tushib). Endi ikkalasi birga suriladi/qotadi.
      */}
      <div className="resv-preorder-sticky">
        <header className="page-header">
          <button onClick={onBack} aria-label={t('back')}>
            <Icon name="arrowLeft" size={22} color="#F7F2EA" />
          </button>
          <h1>{t('extras')}</h1>
        </header>

        <div className="resv-preorder-hint">
          <div className="resv-preorder-hint__title">
            <Icon name="calendarPlus" size={18} color="#F5A524" />
            {reservationInfo.dateLabel}, {reservationInfo.time}
          </div>
          <div className="resv-preorder-hint__text">
            Kelishingizga tayyor bo&apos;lib tursin — hoziroq tanlang
            yoki joyida buyurtma bering.
          </div>
        </div>
      </div>

      <div className="resv-preorder-list">
        {isLoading ? (
          <div className="resv-error-state">
            <span className="spinner" style={{ margin: '0 auto 14px' }} />
            <div className="resv-error-state__text">Menyu yuklanmoqda...</div>
          </div>
        ) : isError ? (
          <div className="resv-error-state">
            <div className="resv-error-state__icon">📡</div>
            <div className="resv-error-state__title">Menyu yuklanmadi</div>
            <div className="resv-error-state__text">
              {error?.kind === 'network'
                ? 'Serverga ulanib bo\u2018lmadi. Internet aloqasini tekshiring.'
                : (error?.message || 'Server javob bermadi.')}
            </div>
            <button onClick={() => refetch()} className="resv-error-state__btn">
              Qayta urinish
            </button>
          </div>
        ) : sections.length === 0 ? (
          <div className="resv-preorder-empty">Menyu hozircha bo&apos;sh</div>
        ) : (
          sections.map(([name, list]) => (
          <section key={name}>
            <div className="resv-preorder-section">{name}</div>
            <div className="resv-preorder-dishes">
              {list.map((d) => {
                const id = dishId(d);
                const qty = selections[id] ?? 0;
                return (
                  <div key={id} className={`resv-preorder-dish ${qty ? 'is-picked' : ''}`}>
                    <div className="resv-preorder-dish__photo">
                      <DishPhoto dish={d} height={56} radius={12} iconSize={26} />
                    </div>
                    <div className="resv-preorder-dish__body">
                      <div className="resv-preorder-dish__name">{d.name}</div>
                      <div className="resv-preorder-dish__price">
                        {formatSomShort(d.price)} {t('som')}
                      </div>
                    </div>
                    {qty === 0 ? (
                      <button onClick={() => setQty(id, 1)} className="resv-preorder-dish__select">
                        {t('add')}
                      </button>
                    ) : (
                      <div className="qty-control">
                        <button onClick={() => setQty(id, qty - 1)} className="qty-btn qty-btn--minus" aria-label="−">
                          <Icon name="minus" size={16} color="#A99C8C" />
                        </button>
                        <span className="qty-value">{qty}</span>
                        <button onClick={() => setQty(id, qty + 1)} className="qty-btn qty-btn--plus" aria-label="+">
                          <Icon name="plus" size={16} color="#2A1500" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          ))
        )}
      </div>

      <div className="resv-preorder-footer">
        {saveError && <div className="resv-error">{saveError}</div>}

        {/* Tanlanganlar — tasdiqlashdan oldingi aniq xulosa */}
        {count > 0 && (
          <div className="resv-basket">
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              className="resv-basket__head"
              aria-expanded={summaryOpen}
            >
              <span className="resv-basket__count">{count}</span>
              <span className="resv-basket__label">Tanlangan taomlar</span>
              <span className="resv-basket__sum">{formatSom(total)}</span>
              <Icon name="chevronDown" size={16} color="#A99C8C"
                style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }} />
            </button>

            {summaryOpen && (
              <div className="resv-basket__list">
                {selected.map(({ dish, qty }) => (
                  <div key={dishId(dish)} className="resv-basket__row">
                    <span className="resv-basket__name">{dish.name}</span>
                    <span className="resv-basket__qty">×{qty}</span>
                    <span className="resv-basket__price">
                      {formatSomShort((dish.price || 0) * qty)}
                    </span>
                    <button
                      onClick={() => setQty(dishId(dish), 0)}
                      className="resv-basket__del"
                      aria-label="O'chirish"
                    >
                      <Icon name="trash" size={14} color="#E14B42" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="resv-preorder-actions">
          {/* Bekor qilish — butun bron jarayoni to'xtaydi */}
          <button onClick={onCancelAll} className="btn-secondary" style={{ flex: 1 }}>
            Bekor qilish
          </button>
          {/* Taom tanlash ixtiyoriy — tugma doim faol */}
          <button
            onClick={() => onConfirm(selected)}
            disabled={saving}
            className="btn-primary"
            style={{ flex: 1.4 }}
          >
            {saving ? 'Saqlanmoqda...' : count > 0 ? `Tasdiqlash · ${formatSom(total)}` : 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
