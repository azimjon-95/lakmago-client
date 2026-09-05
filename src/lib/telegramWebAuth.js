// Telegram Login Widget — brauzer (Chrome/Safari) orqali kirish.
//
// Mini App'dagi Telegram.WebApp.initData BU YERDA MAVJUD EMAS
// (brauzerda Telegram runtime umuman yo'q) — shuning uchun
// butunlay boshqa mexanizm: https://core.telegram.org/widgets/login
// Telegram o'zining <script> vidjetini yuklaydi, u tugma chizadi,
// foydalanuvchi Telegram orqali tasdiqlaganda global callback'ga
// {id, first_name, ..., hash} beradi — server buni
// verifyTelegramLoginWidget() bilan tekshiradi (initData'dan
// TEXNIK JIHATDAN FARQLI algoritm, backendga qarang).

import { API_BASE } from '@/api';

/*
 * MUHIM — `??` BU YERDA YETARLI EMAS EDI.
 * `??` faqat null/undefined'da zaxira qiymatga o'tadi. Vercel'da
 * env o'zgaruvchi YARATILGAN, lekin qiymati BO'SH qoldirilsa,
 * import.meta.env.VITE_BOT_USERNAME === '' bo'ladi — `??` buni
 * "qiymat bor" deb hisoblaydi va vidjetga bo'sh username uzatiladi.
 * Telegram esa bunga aynan "Username invalid" deb javob beradi.
 * Shuning uchun bo'sh/probel qiymat ham zaxiraga o'tishi shart.
 */
const cleanName = (v, fallback = '') => {
  const cleaned = String(v ?? '').trim().replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  return cleaned || fallback;
};

/*
 * DIQQAT — bot username'i "lokma" (o harfi bilan), "lakma" EMAS.
 * Loyihada bu ikkalasi bir necha marta chalkashgan: domen
 * (lakma.uz / lokma.uz) va deploy hujjatidagi "lakmagobot" ham
 * xato edi. Haqiqiy bot: @lokmaGobot
 */
const BOT_USERNAME = cleanName(import.meta.env.VITE_BOT_USERNAME, 'lokmaGobot');

function getDeviceId() {
  try {
    let id = localStorage.getItem('lokmago_device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('lokmago_device_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * Telegram Login Widget scriptini konteynerga chizadi.
 *
 * @param {HTMLElement} container — vidjet tugmasi shu ichiga chiziladi
 * @param {(profile) => void} onSuccess — muvaffaqiyatli login (server tasdiqlagandan keyin)
 * @param {(error: Error) => void} onError
 * @returns {() => void} cleanup — komponent unmount bo'lganda chaqirish kerak
 */
export function renderTelegramLoginWidget(container, onSuccess, onError) {
  if (!container) return () => {};

  // Har bir Login Widget callback'i global window darajasida
  // bo'lishi shart (Telegram scripti shunday chaqiradi) — nom
  // to'qnashmasligi uchun bir martalik noyob nom yasaymiz.
  const callbackName = `__lokmagoTelegramAuth_${Date.now()}`;

  window[callbackName] = async (tgData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/telegram-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tgData, platform: 'web', deviceId: getDeviceId() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Auth xatosi: ${res.status}`);
      }
      const data = await res.json();

      const { setAuthToken, setRefreshToken } = await import('@/api');
      if (data.accessToken) setAuthToken(data.accessToken);
      else if (data.token) setAuthToken(data.token);
      if (data.refreshToken) setRefreshToken(data.refreshToken);

      onSuccess({
        telegramId: data.user.telegramId,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        username: data.user.username,
        languageCode: data.user.languageCode,
        photoUrl: data.user.photoUrl,
        phone: data.user.phone,
        addresses: data.user.addresses,
      });
    } catch (e) {
      onError?.(e);
    }
  };

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.async = true;
  script.setAttribute('data-telegram-login', BOT_USERNAME);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '12');
  script.setAttribute('data-onauth', `${callbackName}(user)`);
  script.setAttribute('data-request-access', 'write');
  container.appendChild(script);

  return () => {
    delete window[callbackName];
    container.innerHTML = '';
  };
}
