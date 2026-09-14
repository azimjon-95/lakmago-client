import { useCallback, useRef, useState } from 'react';
import { SubscriptionGateModal } from '@/components/AuthGate/SubscriptionGateModal';

/**
 * Order/booking submit vaqtida "kanal obunasi kerakmi" tekshiruvini
 * va kerak bo'lsa SubscriptionGateModal'ni boshqaradigan hook.
 *
 * MUHIM: bu hook /referral/subscription orqali tekshiradi — bu
 * endpoint AUTH TALAB QILADI. Shuning uchun chaqiruvchi (CartPage/
 * ReservationPage) buni ensureAuth()DAN KEYIN chaqirishi kerak:
 *
 *   const authed = await ensureAuth();
 *   if (!authed) return;
 *   const subscribed = await ensureSubscription();
 *   if (!subscribed) return;
 *   // ... davom etadi
 *
 * @returns {{ ensureSubscription: () => Promise<boolean>, SubscriptionGate: JSX.Element }}
 */
export function useRequireSubscription() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(null);
  const sharedPromiseRef = useRef(null);

  const ensureSubscription = useCallback(() => {
    if (sharedPromiseRef.current) return sharedPromiseRef.current;

    /*
     * Modal o'zi ochilgandan keyin api.getSubscription()ni
     * tekshiradi — agar obuna talab qilinmasa yoki allaqachon
     * obuna bo'lsa, modal HECH NARSA ko'rsatmasdan darhol
     * onSuccess() chaqiradi (SubscriptionGateModal.jsx'dagi
     * useEffect). Shuning uchun bu yerda oldindan tekshirish
     * shart emas — har doim "so'raymiz", ko'pchilik holatda
     * (obuna kerak bo'lmasa) modal ko'zga ko'rinmaydi ham.
     */
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

  const SubscriptionGate = (
    <SubscriptionGateModal open={open} onSuccess={handleSuccess} onClose={handleClose} />
  );

  return { ensureSubscription, SubscriptionGate };
}
