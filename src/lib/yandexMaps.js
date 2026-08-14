/**
 * Yandex Maps JS API — umumiy yuklovchi.
 *
 * Avval bu funksiya MapAddressPicker.jsx ichida yolg'iz edi.
 * Endi restoran joylashuvi preview'i ham xuddi shu skriptni
 * ishlatadi — ikkinchi marta yuklamaslik uchun bitta promise
 * modul darajasida saqlanadi.
 */
let ymapsPromise = null;

export function loadYmaps(apiKey) {
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps);
  if (ymapsPromise) return ymapsPromise;

  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=uz_UZ`;
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
    script.onerror = () => {
      ymapsPromise = null;   // qayta urinish imkoni qolsin
      reject(new Error('Xarita yuklanmadi'));
    };
    document.head.appendChild(script);
  });
  return ymapsPromise;
}
