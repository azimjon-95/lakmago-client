/*
 * Sign in with Apple — SOF mantiq (hech narsa import qilmaydi: node --test bilan to'g'ridan-to'g'ri sinaladi).
 * Haqiqiy tarmoq/native chaqiruvlar lib/appleAuth.js dan beriladi (dependency injection).
 */
export class AppleAuthError extends Error {
  constructor(kind, detail) { super(`apple:${kind}${detail ? `:${detail}` : ''}`); this.name = 'AppleAuthError'; this.kind = kind; this.detail = detail; }
}

/** Apple kirishi FAQAT haqiqiy iOS ilovada (Capacitor native, platform=ios) va native plugin mavjud bo'lganda. */
export const canUseApple = ({ platform, isNative, hasPlugin }) => platform === 'ios' && isNative === true && hasPlugin === true;

/** Native xatoni ajratadi: ASAuthorizationError.canceled = 1001 (foydalanuvchi oynani yopdi). */
export function classifyNativeError(e) {
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? e?.errorMessage ?? '');
  if (code === '1001' || /\b1001\b/.test(msg) || /cancel/i.test(msg)) return new AppleAuthError('cancelled');
  return new AppleAuthError('failed', code || msg.slice(0, 60));
}

/**
 * Oqim: challenge → Apple oynasi (nonce bilan) → serverda kirish.
 * @param {{ post: (path: string, body: object) => Promise<{http:number,data:object}>, authorize: (nonce: string) => Promise<object>, deviceId: string }} d
 * @returns {Promise<object>} server javobi
 * @throws {AppleAuthError} cancelled | blocked | failed
 */
export async function runAppleSignIn({ post, authorize, deviceId }) {
  const ch = await post('/auth/apple/challenge', { platform: 'ios', deviceId }).catch(() => null);
  if (!ch || ch.http !== 200 || !ch.data?.challengeId || !ch.data?.nonce) throw new AppleAuthError('failed', `challenge:${ch?.http ?? 'net'}`);

  let cred;
  try { cred = await authorize(ch.data.nonce); } catch (e) { throw classifyNativeError(e); }
  if (!cred?.identityToken) throw new AppleAuthError('failed', 'no_token');

  const res = await post('/auth/apple', {
    platform: 'ios', deviceId, challengeId: ch.data.challengeId, identityToken: cred.identityToken,
    givenName: cred.givenName || undefined, familyName: cred.familyName || undefined,
  }).catch(() => null);
  if (res?.http === 200 && res.data?.accessToken) return res.data;
  throw new AppleAuthError(res?.http === 403 ? 'blocked' : 'failed', res?.data?.code || String(res?.http ?? 'net'));
}
