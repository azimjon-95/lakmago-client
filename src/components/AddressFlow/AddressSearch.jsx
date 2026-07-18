import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { searchAddress, getCurrentPosition, reverseGeocode } from '@/lib/location';
import { haptic } from '@/lib/telegram';

// 2-bosqich: manzil qidirish (debounce + AbortController)
export function AddressSearch({ onPick, onBack }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounce 400ms — har harfда so'rov ketmaydi
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const list = await searchAddress(query, ctrl.signal);
        setResults(list);
      } catch { /* abort yoki xato */ }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const useCurrent = async () => {
    haptic();
    setDetecting(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      const addr = await reverseGeocode(lat, lng);
      onPick({ lat, lng, ...addr });
    } catch { /* jim */ }
    finally { setDetecting(false); }
  };

  return (
    <div className="addrflow addrflow--search">
      <div className="addrflow__header">
        <button onClick={onBack} className="addrflow__back-btn" aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#F2F1EE" />
        </button>
        <h3 className="addrflow__header-title">Qayerga yetkazib berilsin</h3>
      </div>

      <div className="addr-search__field">
        <Icon name="search" size={18} color="#9A9A94" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ko'cha, uy raqami..."
          className="addr-search__input"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Tozalash">
            <Icon name="x" size={16} color="#9A9A94" />
          </button>
        )}
      </div>

      {/* Joriy joylashuv tugmasi */}
      <button onClick={useCurrent} disabled={detecting} className="addr-search__current">
        <div className="addr-search__current-icon">
          <Icon name="navigation" size={18} color="#EF9F27" />
        </div>
        <span>{detecting ? 'Aniqlanmoqda...' : 'Joriy joylashuvim'}</span>
      </button>

      {/* Natijalar */}
      <div className="addr-search__results">
        {loading && <div className="addr-search__loading">Qidirilmoqda...</div>}
        {!loading && query.trim().length >= 3 && results.length === 0 && (
          <div className="addr-search__empty">Manzil topilmadi</div>
        )}
        {results.map((r, i) => (
          <button key={i} onClick={() => { haptic(); onPick(r); }} className="addr-result">
            <Icon name="pin" size={18} color="#9A9A94" />
            <div className="addr-result__body">
              <div className="addr-result__street">{r.street}</div>
              {r.city && <div className="addr-result__city">{r.city}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
