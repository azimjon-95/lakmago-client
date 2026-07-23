import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '/';

// Butun ilova uchun BITTA socket ulanishi.
// Har komponent alohida ulanish ochsa — server yuklanadi va
// xonalarga qo'shilish chalkashadi.
let socket = null;
let joinedUserId = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    // Uzilib qayta ulansa — xonalarga qayta qo'shilamiz
    socket.on('connect', () => {
      if (joinedUserId) socket.emit('join:user', joinedUserId);
    });
  }
  return socket;
}

// Mijoz o'z xonasiga qo'shiladi — bron holati, chat javobi,
// buyurtma yangilanishi shu orqali keladi.
export function joinUserRoom(userId) {
  if (!userId) return;
  joinedUserId = String(userId);
  const s = getSocket();
  if (s.connected) s.emit('join:user', joinedUserId);
}

// Buyurtmani kuzatish
export function trackOrder(orderId) {
  if (!orderId) return;
  getSocket().emit('track:order', String(orderId));
}
