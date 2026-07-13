import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SubOrderStatus } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

// Har sub-buyurtmaning real-time statusini kuzatish (Socket.IO orqali).
// Backend ulanmagan bo'lsa (demo) — hech narsa qilmaydi, OrderTrackPage o'z
// mahalliy timer'i bilan har sub-order progressini simulyatsiya qiladi.
export function useOrderTracking(
  orderId: string | null,
  subOrderIds: string[],
  onStatus: (subId: string, status: SubOrderStatus) => void,
) {
  useEffect(() => {
    if (!orderId || !SOCKET_URL || subOrderIds.length === 0) return;

    const socket: Socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('track:order', orderId);
    subOrderIds.forEach((subId) => socket.emit('track:sub_order', subId));

    socket.on('sub_order:status', (data: { subId: string; status: SubOrderStatus }) => {
      onStatus(data.subId, data.status);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, subOrderIds.join(',')]);
}
