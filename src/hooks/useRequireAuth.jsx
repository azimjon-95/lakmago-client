import { useCallback, useRef, useState } from 'react';
import { getAuthToken } from '@/api';
import { AuthGateModal } from '@/components/AuthGate/AuthGateModal';

/**
 * Order/booking submit vaqtida "auth kerakmi" tekshiruvini va
 * kerak bo'lsa AuthGateModal'ni boshqaradigan hook.
 *
 * Ishlatilishi (CartPage/ReservationPage'da, Phase 3 keyingi
 * bosqichida):
 *   const { ensureAuth, AuthGate } = useRequireAuth();
 *   ...
 *   const ok = await ensureAuth();
 *   if (!ok) return;
 *   // ... mavjud submit logikasi, o'zgarishsiz davom etadi
 *   ...
 *   return <>{AuthGate}...</>;
 *
 * @returns {{ ensureAuth: () => Promise<boolean>, AuthGate: JSX.Element }}
 */
export function useRequireAuth() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('order'); // 'order' | 'profile' — oynadagi sarlavha matni
  const resolverRef = useRef(null);
  const sharedPromiseRef = useRef(null);

  /*
   * Bir vaqtning o'zida ikki marta ensureAuth() chaqirilsa (masalan
   * ikkita tugma tez-tez bosilsa, yoki ikki komponent bir vaqtda
   * so'rasa), IKKINCHI chaqiriq YANGI modal OCHMAYDI — birinchisi
   * bilan BIR XIL, hali hal bo'lmagan promise'ni qaytaradi.
   */
  const ensureAuth = useCallback((opts) => {
    if (getAuthToken()) return Promise.resolve(true);
    setReason(opts?.reason === 'profile' ? 'profile' : 'order');

    if (sharedPromiseRef.current) return sharedPromiseRef.current;

    const promise = new Promise((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    }).finally(() => {
      sharedPromiseRef.current = null;
    });

    sharedPromiseRef.current = promise;
    return promise;
  }, []);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const AuthGate = (
    <AuthGateModal open={open} onSuccess={handleSuccess} onClose={handleClose} reason={reason} />
  );

  return { ensureAuth, AuthGate };
}
