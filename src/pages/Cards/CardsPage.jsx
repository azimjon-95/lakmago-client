import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';
import './Cards.css';

const BRANDS = {
  uzcard: { label: 'UzCard', color: '#00A3E0' },
  humo: { label: 'Humo', color: '#00B2A9' },
  visa: { label: 'Visa', color: '#1A1F71' },
  mastercard: { label: 'Mastercard', color: '#EB001B' },
  card: { label: 'Karta', color: '#7D7264' },
};

// Karta raqamini 4 talab ajratamiz
const fmtNumber = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const fmtExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export function CardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: '', expiry: '', holder: '', bankName: '' });
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getCards()
      .then((list) => setCards(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const digits = form.number.replace(/\D/g, '');
    if (digits.length < 16) { setErr('Karta raqamini to\u2018liq kiriting'); return; }
    setSaving(true); setErr(null);
    try {
      const list = await api.addCard({
        number: digits,
        expiry: form.expiry,
        holder: form.holder.trim(),
        bankName: form.bankName.trim(),
      });
      setCards(list);
      setForm({ number: '', expiry: '', holder: '', bankName: '' });
      setAdding(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    haptic();
    if (!window.confirm("Kartani o'chirasizmi?")) return;
    try { setCards(await api.deleteCard(id)); } catch (e) { alert(e.message); }
  };

  const makeDefault = async (id) => {
    haptic();
    try { setCards(await api.setDefaultCard(id)); } catch (e) { alert(e.message); }
  };

  return (
    <div className="app-shell cards">
      <header className="cards-header">
        <button onClick={() => navigate(-1)} aria-label="Orqaga" className="cards-header__btn">
          <Icon name="arrowLeft" size={22} color="#F7F2EA" />
        </button>
        <h1 className="cards-header__title">To'lov kartalari</h1>
      </header>

      <div className="cards-body">
        {loading ? (
          <div className="cards-empty">Yuklanmoqda...</div>
        ) : (
          <>
            {cards.map((c) => {
              const b = BRANDS[c.brand] || BRANDS.card;
              return (
                <div key={c._id} className="card-item">
                  <div className="card-item__brand" style={{ background: b.color }}>
                    <Icon name="card" size={18} color="#fff" />
                  </div>
                  <div className="card-item__body">
                    <div className="card-item__num">
                      {c.bankName || b.label} •••• {c.last4}
                    </div>
                    <div className="card-item__meta">
                      {c.bankName && <span>{b.label}</span>}
                      {c.expiry && <span>{c.expiry}</span>}
                      {c.isDefault && <span className="card-item__default">Asosiy</span>}
                    </div>
                  </div>
                  <div className="card-item__actions">
                    {!c.isDefault && (
                      <button onClick={() => makeDefault(c._id)} className="card-item__btn">
                        Asosiy
                      </button>
                    )}
                    <button onClick={() => remove(c._id)} className="card-item__btn card-item__btn--del">
                      <Icon name="trash" size={15} color="#E14B42" />
                    </button>
                  </div>
                </div>
              );
            })}

            {cards.length === 0 && !adding && (
              <div className="cards-empty">
                <Icon name="card" size={48} color="#7D7264" />
                <div className="cards-empty__title">Karta qo'shilmagan</div>
                <p className="cards-empty__hint">
                  Karta qo'shsangiz to'lovda tanlashingiz mumkin
                </p>
              </div>
            )}

            {adding ? (
              <div className="card-form">
                <label className="card-form__label">Karta raqami</label>
                <input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: fmtNumber(e.target.value) })}
                  placeholder="8600 1234 5678 9012"
                  inputMode="numeric"
                  className="input-field"
                />

                <div className="card-form__row">
                  <div>
                    <label className="card-form__label">Amal qilish muddati</label>
                    <input
                      value={form.expiry}
                      onChange={(e) => setForm({ ...form, expiry: fmtExpiry(e.target.value) })}
                      placeholder="12/28"
                      inputMode="numeric"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="card-form__label">Karta egasi</label>
                    <input
                      value={form.holder}
                      onChange={(e) => setForm({ ...form, holder: e.target.value })}
                      placeholder="AZIZ KARIMOV"
                      className="input-field"
                    />
                  </div>
                </div>

                <label className="card-form__label">Bank nomi</label>
                <input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="Kapitalbank, Ipoteka Bank..."
                  list="bank-list"
                  className="input-field"
                />
                <datalist id="bank-list">
                  <option value="Kapitalbank" />
                  <option value="Ipoteka Bank" />
                  <option value="Xalq banki" />
                  <option value="Asaka bank" />
                  <option value="SQB (Sanoatqurilishbank)" />
                  <option value="Agrobank" />
                  <option value="Trastbank" />
                  <option value="Hamkorbank" />
                  <option value="InfinBank" />
                  <option value="Anor Bank" />
                  <option value="TBC Bank" />
                  <option value="Davr Bank" />
                  <option value="Ipak Yo'li banki" />
                  <option value="Turonbank" />
                  <option value="Aloqabank" />
                  <option value="Milliy bank (NBU)" />
                </datalist>

                <p className="card-form__note">
                  <Icon name="info" size={13} color="#6FBF73" /> Xavfsizlik: to'liq raqam
                  saqlanmaydi, faqat oxirgi 4 raqam
                </p>

                {err && <div className="card-form__err">{err}</div>}

                <div className="card-form__actions">
                  <button onClick={() => { setAdding(false); setErr(null); }} className="btn-secondary">
                    Bekor
                  </button>
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Saqlanmoqda...' : 'Qo\u2018shish'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { haptic(); setAdding(true); }} className="cards-add">
                <Icon name="plus" size={18} color="#F5A524" /> Karta qo'shish
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
