import { useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

// Har buyurtma (backend order)ning real-time statusini kuzatadi.
// backendIds — kuzatiladigan order _id'lar. onStatus(backendId, status) chaqiriladi.
// Backend/socket yo'q bo'lsa (demo) — hech narsa qilmaydi, sahifa timer bilan simulyatsiya qiladi.
export function useOrderTracking(backendIds, onStatus) {
  useEffect(() => {
    const ids = (backendIds || []).filter(Boolean);
    if (!SOCKET_URL || ids.length === 0) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    ids.forEach((id) => socket.emit('track:order', id));

    socket.on('order:status', (data) => {
      onStatus(data.orderId, data.status);
    });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(backendIds || []).join(',')]);
}
