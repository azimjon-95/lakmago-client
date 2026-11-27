import { getTelegram } from '@/lib/telegram';

/*
 * Yagona "bosilganini his qilish" tebranishi.
 *  • Telegram: HapticFeedback (yumshoq).
 *  • iOS/Android ilova: @capacitor/haptics (Taptic Engine / vibratsiya) — plagin ilovada bo'lmasa jimgina o'tkaziladi.
 *  • Android brauzer: navigator.vibrate (iOS Safari qo'llamaydi).
 */
let native;
function nativeHaptics() {
  if (native !== undefined) return native;
  native = null;
  try {
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) {
      native = import('@capacitor/haptics').then((m) => m).catch(() => null);
    }
  } catch { native = null; }
  return native;
}

let last = 0;
export function tapHaptic(kind = 'tap') {
  const now = Date.now();
  if (now - last < 120) return; // linza surilganda va tab bosilganda qo'sh tebranmasin
  last = now;
  const hf = getTelegram()?.HapticFeedback;
  if (hf) {
    try { if (kind === 'select' && hf.selectionChanged) hf.selectionChanged(); else hf.impactOccurred('light'); } catch { /* */ }
    return;
  }
  const n = nativeHaptics();
  if (n) {
    n.then((m) => {
      if (!m) return;
      if (kind === 'select') m.Haptics.selectionChanged?.().catch?.(() => {});
      else m.Haptics.impact({ style: m.ImpactStyle.Light }).catch(() => {});
    });
    return;
  }
  try { navigator.vibrate?.(kind === 'select' ? 6 : 10); } catch { /* */ }
}

export function scrollToTopSmooth() {
  const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } catch { window.scrollTo(0, 0); }
}
