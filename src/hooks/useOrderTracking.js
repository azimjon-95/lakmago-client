import { useEffect } from 'react';
import { getSocket, trackOrder } from '@/lib/socket';

// Buyurtmalarning real-time holatini kuzatadi.
// backendIds — kuzatiladigan order _id'lar.
// onStatus(orderId, status) — holat o'zgarganda chaqiriladi.
export function useOrderTracking(backendIds, onStatus) {
  useEffect(() => {
    const ids = (backendIds || []).filter(Boolean);
    if (ids.length === 0) return;

    const socket = getSocket();
    ids.forEach(trackOrder);

    const handler = (data) => onStatus(data.orderId, data.status);
    socket.on('order:status', handler);

    // Uzilib qayta ulansa — kuzatuvni tiklaymiz
    const rejoin = () => ids.forEach(trackOrder);
    socket.on('connect', rejoin);

    return () => {
      socket.off('order:status', handler);
      socket.off('connect', rejoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(backendIds || []).join(',')]);
}
