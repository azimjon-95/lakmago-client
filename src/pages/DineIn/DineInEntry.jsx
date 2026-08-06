import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { getDeviceId, saveSession } from '@/lib/dineInSession';
import './DineIn.css';

/**
 * QR skanerlangandan keyingi kirish nuqtasi: lokma.uz/d/TOKEN
 *
 * Oqim: token → validatsiya → restoran → stol → sessiya → menyu
 *
 * Login TALAB QILINMAYDI.
 */
export function DineInEntry() {
  const { token } = useParams();
  const navigate = useNavigate();
  const done = useRef(false);

  const [error, setError] = useState(null);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    api.dineInScan(token, getDeviceId())
      .then((data) => {
        // Sessiyani saqlaymiz — menyuda ishlatiladi
        saveSession({
          sessionId: data.session.id,
          tableId: data.table.id,
          tableNumber: data.table.number,
          tableName: data.table.name,
          restaurantId: data.restaurant.id,
          restaurantName: data.restaurant.name,
          startedAt: Date.now(),
        });

        // Restoran menyusiga o'tamiz
        navigate(`/restaurant/${data.restaurant.id}`, {
          replace: true,
          state: { dineIn: true },
        });
      })
      .catch((e) => {
        setError({
          message: e.message || 'QR kod ishlamadi',
          code: e.code,
        });
      });
  }, [token, navigate]);

  if (error) {
    return (
      <div className="app-shell dinein-state">
        <div className="dinein-state__box">
          <div className="dinein-state__icon dinein-state__icon--error">
            <Icon name="info" size={30} color="#E14B42" />
          </div>

          <h1 className="dinein-state__title">QR kod ishlamadi</h1>
          <p className="dinein-state__text">{error.message}</p>

          <p className="dinein-state__hint">
            Ofitsiantdan yordam so'rang yoki boshqa stolning
            QR kodini skanerlang.
          </p>

          <button onClick={() => navigate('/')} className="dinein-state__btn">
            Bosh sahifaga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell dinein-state">
      <div className="dinein-state__box">
        <div className="dinein-state__spinner" />
        <p className="dinein-state__text">Menyu ochilmoqda...</p>
      </div>
    </div>
  );
}
