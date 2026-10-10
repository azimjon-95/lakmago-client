import { useEffect } from 'react';

/** Oyna ochiq turganda orqadagi sahifa surilmaydi */
export function useLockBody() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}
