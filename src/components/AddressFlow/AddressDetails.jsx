import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';

// Manzil turlari (Yandex Eda uslubида)
const LABELS = [
  { id: 'home', icon: 'house', title: 'Uy' },
  { id: 'work', icon: 'briefcase', title: 'Ish' },
  { id: 'other', icon: 'pin', title: 'Boshqa' },
];

// 3-bosqich: manzil tafsilotlari (kirish, qavat, xonadon, izoh)
export function AddressDetails({ location, onSave, onBack }) {
  const [labelId, setLabelId] = useState('home');
  const [title, setTitle] = useState('Uy');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [flat, setFlat] = useState('');
  const [note, setNote] = useState('');

  const pickLabel = (l) => {
    haptic();
    setLabelId(l.id);
    // "Boshqa" bo'lsa nomni foydalanuvchи yozadi
    if (l.id !== 'other') setTitle(l.title);
    else setTitle('');
  };

  const save = () => {
    haptic();
    // To'liq manzil matnи (kuryer uchun)
    const parts = [location.street];
    if (entrance) parts.push(`${entrance}-kirish`);
    if (floor) parts.push(`${floor}-qavat`);
    if (flat) parts.push(`xon. ${flat}`);
    const address = parts.join(', ');

    onSave({
      title: title.trim() || 'Manzil',
      address,
      street: location.street,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
      entrance, floor, flat, note,
      labelId,
    });
  };

  return (
    <div className="addrflow addrflow--details">
      <div className="addrflow__header">
        <button onClick={onBack} className="addrflow__back-btn" aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#F7F2EA" />
        </button>
        <h3 className="addrflow__header-title">Manzil tafsilotlari</h3>
      </div>

      <div className="addr-details__scroll">
        {/* Tanlangan manzil */}
        <div className="addr-details__section-title">Manzil</div>
        <div className="addr-details__picked">
          <div className="addr-details__picked-icon">
            <Icon name="pin" size={20} color="#F5A524" />
          </div>
          <div>
            <div className="addr-details__street">{location.street}</div>
            {location.city && <div className="addr-details__city">{location.city}</div>}
          </div>
        </div>

        {/* Manzil turi + nomi */}
        <div className="addr-details__row">
          <div className="addr-details__labels">
            {LABELS.map((l) => (
              <button
                key={l.id}
                onClick={() => pickLabel(l)}
                className={`addr-label ${labelId === l.id ? 'is-active' : ''}`}
                aria-label={l.title}
              >
                <Icon name={l.icon} size={20} color={labelId === l.id ? '#F5A524' : '#A99C8C'} />
              </button>
            ))}
          </div>
          <div className="addr-details__field addr-details__field--grow">
            <label>Manzil nomi</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Uy" />
          </div>
        </div>

        {/* Kirish / qavat / xonadon */}
        <div className="addr-details__grid3">
          <div className="addr-details__field">
            <label>Kirish</label>
            <input value={entrance} onChange={(e) => setEntrance(e.target.value)} inputMode="numeric" placeholder="—" />
          </div>
          <div className="addr-details__field">
            <label>Qavat</label>
            <input value={floor} onChange={(e) => setFloor(e.target.value)} inputMode="numeric" placeholder="—" />
          </div>
          <div className="addr-details__field">
            <label>Xonadon</label>
            <input value={flat} onChange={(e) => setFlat(e.target.value)} inputMode="numeric" placeholder="—" />
          </div>
        </div>

        {/* Izoh */}
        <div className="addr-details__field">
          <label>Qo'shimcha ma'lumot</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Mo'ljal, domofon kodi, kirish qayerda..."
          />
          <div className="addr-details__hint">Bu kuryerga sizni tezroq topishga yordam beradi</div>
        </div>
      </div>

      <div className="addr-details__footer">
        <button onClick={save} className="addrflow__btn-primary">Manzilni saqlash</button>
      </div>
    </div>
  );
}
