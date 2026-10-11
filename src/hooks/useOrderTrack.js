import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { getSocket, trackOrder } from '@/lib/socket';

/*
 * ═══ BUYURTMA KUZATUVI — haqiqiy ma'lumot ═══
 * GET /orders/:id/track (server: services/orderTrack.js) — vaqt chizig'i, ETA, kuryer,
 * jonli joylashuv. Yangilanish:
 *   • soket 'order:status' / 'order:courier' kelsa — darhol qayta olinadi (3 s ichida bir martadan ko'p emas);
 *   • bundan tashqari so'rov: yo'lda — 8 s, boshqa faol holat — 20 s (soket uzilsa ham to'g'ri qoladi);
 *   • sahifa yashirin (boshqa tab/ilova fonda) bo'lsa — to'xtaydi, qaytganda darhol yangilanadi.
 *   • ETA "daqiqa" mijoz tomonida SERVER ETA VAQTIDAN (eta.at) hisoblanadi — har daqiqa
 *     so'rovsiz kamayib boradi (soxta hisoblagich emas: server bergan aniq vaqtga qarab).
 */
const POLL_DELIVERING_MS = 8_000;
const POLL_ACTIVE_MS = 20_000;
const MIN_GAP_MS = 3_000;

export function useOrderTrack(orderId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // Soat farqi (mijoz − server): javob kelgan paytda BIR marta hisoblanadi (keyin o'zgarmaydi)
  const [skew, setSkew] = useState(0);
  const last = useRef(0);
  const inflight = useRef(false);
  const alive = useRef(true);

  const load = useCallback(async (force = false) => {
    if (!orderId || inflight.current) return;
    if (!force && Date.now() - last.current < MIN_GAP_MS) return;
    inflight.current = true;
    try {
      const r = await api.getOrderTrack(orderId);
      if (!alive.current) return;
      setData(r); setError(null); last.current = Date.now();
      setSkew(r.serverTime ? Date.now() - new Date(r.serverTime).getTime() : 0);
      setNow(Date.now());
    } catch (e) {
      if (alive.current) setError(e.message || 'Xatolik');
    } finally { inflight.current = false; }
  }, [orderId]);

  useEffect(() => {
    alive.current = true;
    setData(null); setError(null);
    load(true);
    return () => { alive.current = false; };
  }, [orderId, load]);

  // Soket: holat yoki kuryer o'zgarsa darhol
  useEffect(() => {
    if (!orderId) return undefined;
    const socket = getSocket();
    trackOrder(orderId);
    const onEvent = (d) => { if (!d?.orderId || String(d.orderId) === String(orderId)) load(); };
    const rejoin = () => { trackOrder(orderId); load(true); };
    socket.on('order:status', onEvent);
    socket.on('order:courier', onEvent);
    socket.on('connect', rejoin);
    return () => { socket.off('order:status', onEvent); socket.off('order:courier', onEvent); socket.off('connect', rejoin); };
  }, [orderId, load]);

  // Davriy yangilash
  const status = data?.status;
  const finished = status === 'delivered' || status === 'cancelled';
  useEffect(() => {
    if (!orderId || finished) return undefined;
    const every = status === 'delivering' ? POLL_DELIVERING_MS : POLL_ACTIVE_MS;
    const timer = setInterval(() => { if (!document.hidden) load(true); }, every);
    const onVis = () => { if (!document.hidden) load(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [orderId, status, finished, load]);

  // ETA daqiqasi har 15 soniyada qayta hisoblanadi
  useEffect(() => {
    if (!data?.eta?.at || finished) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [data?.eta?.at, finished]);

  // Server ETA vaqtidan qolgan daqiqa (serverTime bilan soat farqi tuzatiladi)
  let etaMinutes = null;
  if (data?.eta?.at && !finished) {
    etaMinutes = Math.max(0, Math.ceil((new Date(data.eta.at).getTime() + skew - now) / 60_000));
    if (data.eta.minutes === 0) etaMinutes = 0;
  }

  return { data, error, etaMinutes, refresh: () => load(true) };
}
