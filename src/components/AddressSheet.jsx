import { useState } from 'react';
import { Icon } from './Icon';










export function AddressSheet({ addresses, selectedId, onSelect, onAdd, onClose }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('Uy');
  const [text, setText] = useState('');

  function handleAdd() {
    onAdd({ title, address: text });
    setAdding(false);
    setTitle('Uy');
    setText('');
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(20,10,0,0.55)' }}>
      
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-surface rounded-t-[22px] max-h-[80vh] overflow-y-auto animate-sheet">
        
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div className="text-base font-medium text-ink">Manzil tanlang</div>
          <button onClick={onClose} aria-label="Yopish">
            <Icon name="x" size={20} color="#6B6B66" />
          </button>
        </div>

        {!adding ?
        <div className="p-4">
            <div className="flex flex-col gap-2.5">
              {addresses.map((a) =>
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className="flex items-center gap-3 p-3.5 rounded-xl text-left"
              style={
              a.id === selectedId ?
              { border: '1.5px solid #EF9F27', background: '#FAEEDA' } :
              { border: '0.5px solid #EAE7DF', background: '#fff' }
              }>
              
                  <Icon name="pin" size={20} color={a.id === selectedId ? '#BA7517' : '#9A9A94'} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="text-xs text-muted">{a.address}</div>
                  </div>
                  {a.id === selectedId && <Icon name="circleCheck" size={18} color="#BA7517" />}
                </button>
            )}
            </div>
            <button
            onClick={() => setAdding(true)}
            className="mt-3 w-full border-2 border-dashed border-[#D3D1C7] rounded-xl p-3 text-muted text-[13px] font-medium flex items-center justify-center gap-1.5">
            
              <Icon name="plus" size={16} color="#6B6B66" /> Yangi manzil qo'shish
            </button>
          </div> :

        <div className="p-4">
            <div className="text-[13px] font-medium text-ink mb-2">Manzil nomi</div>
            <div className="flex gap-2 mb-3.5">
              {['Uy', 'Ish', 'Boshqa'].map((t) =>
            <button
              key={t}
              onClick={() => setTitle(t)}
              className="flex-1 py-2 rounded-[10px] text-[13px] font-medium"
              style={title === t ? { background: '#411E00', color: '#FAEEDA' } : { background: '#F7F5F0', color: '#6B6B66' }}>
              
                  {t}
                </button>
            )}
            </div>
            <div className="text-[13px] font-medium text-ink mb-2">To'liq manzil</div>
            <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ko'cha, uy, xonadon raqami"
            autoFocus
            className="w-full box-border px-3.5 py-3 border border-line rounded-xl text-[16px] mb-4 outline-none focus:border-brand-400" />
          
            <div className="flex gap-2.5">
              <button
              onClick={() => setAdding(false)}
              className="flex-1 bg-canvas text-muted text-sm font-medium py-3 rounded-xl">
              
                Bekor qilish
              </button>
              <button
              onClick={handleAdd}
              disabled={text.trim().length < 5}
              className="flex-[1.5] bg-brand-ink text-white text-sm font-medium py-3 rounded-xl disabled:opacity-50">
              
                Qo'shish
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}
