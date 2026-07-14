import { useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/i18n';
import './cards/AddressSheet.css';

export function AddressSheet({ addresses, selectedId, onSelect, onAdd, onClose }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('Uy');
  const [text, setText] = useState('');

  function handleAdd() {
    onAdd({ title, address: text });
    setAdding(false); setTitle('Uy'); setText('');
  }

  return (
    <div onClick={onClose} className="sheet-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="addr-sheet">
        <div className="addr-sheet__head">
          <div className="addr-sheet__title">{t('myAddresses')}</div>
          <button onClick={onClose} aria-label={t('close')}><Icon name="x" size={20} color="#9A9A96" /></button>
        </div>

        {!adding ? (
          <div className="addr-sheet__body">
            <div className="addr-sheet__list">
              {addresses.map((a) => (
                <button key={a.id} onClick={() => onSelect(a.id)} className={`addr-item ${a.id === selectedId ? 'is-selected' : ''}`}>
                  <Icon name="pin" size={20} color={a.id === selectedId ? '#EF9F27' : '#9A9A94'} />
                  <div className="addr-item__body">
                    <div className="addr-item__title">{a.title}</div>
                    <div className="addr-item__text">{a.address}</div>
                  </div>
                  {a.id === selectedId && <Icon name="circleCheck" size={18} color="#EF9F27" />}
                </button>
              ))}
            </div>
            <button onClick={() => setAdding(true)} className="addr-sheet__add-btn">
              <Icon name="plus" size={16} color="#9A9A96" /> {t('add')}
            </button>
          </div>
        ) : (
          <div className="addr-sheet__body">
            <div className="addr-sheet__label">{t('myAddresses')}</div>
            <div className="addr-sheet__types">
              {['Uy', 'Ish', 'Boshqa'].map((tp) => (
                <button key={tp} onClick={() => setTitle(tp)} className={`addr-sheet__type ${title === tp ? 'is-active' : ''}`}>{tp}</button>
              ))}
            </div>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ko'cha, uy, xonadon" autoFocus className="input-field" style={{ marginBottom: 16 }} />
            <div className="addr-sheet__actions">
              <button onClick={() => setAdding(false)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={handleAdd} disabled={text.trim().length < 5} className="btn-primary" style={{ flex: 1.5 }}>{t('add')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
