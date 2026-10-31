import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from '@/api';

/*
 * ═══ ILOVA IMKONIYATLARI (serverdan) ═══
 *
 * Yangi imkoniyatlar (demo kirish, hisobni o'chirish) FAQAT server `GET /app/capabilities` da ochiq aytgandagina
 * ko'rsatiladi. ESKI server bu yo'lni bilmaydi (404 / HTML) — hammasi YASHIRIN qoladi: frontend serverdan oldin
 * chiqarilsa ham haqiqiy mijozlarga hech narsa o'zgarmaydi.
 */
const NONE = { demoLogin: false, accountDeletion: false, demoAccountDeletion: false };
let pending = null;

export function loadCapabilities(force = false) {
  if (pending && !force) return pending;
  pending = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE}/app/capabilities`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) return { ...NONE };                      // eski server: 404
      const j = await res.json().catch(() => null);          // SPA zaxira sahifasi (HTML) — JSON emas
      return { demoLogin: j?.demoLogin === true, accountDeletion: j?.accountDeletion === true, demoAccountDeletion: j?.demoAccountDeletion === true };
    } catch {
      pending = null;                                        // tarmoq xatosi — keyingi safar qayta urinadi
      return { ...NONE };
    } finally { clearTimeout(timer); }
  })();
  return pending;
}

/** iOS/Android ilova (Capacitor). Brauzer va Telegram Mini App — false. */
export const isNativeApp = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export function useCapabilities() {
  const [caps, setCaps] = useState(NONE);
  useEffect(() => {
    let on = true;
    loadCapabilities().then((c) => { if (on) setCaps(c); });
    return () => { on = false; };
  }, []);
  return caps;
}
