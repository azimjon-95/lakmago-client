/**
 * Yandex Maps JS API — umumiy yuklovchi.
 *
 * Xususiyatlar:
 * - Skriptni faqat bir marta yuklaydi.
 * - Skript javob bermasa, cheksiz kutmaydi.
 * - Xato bo'lsa, qayta urinishga imkon beradi.
 */

let ymapsPromise = null;

const MAPS_LOAD_TIMEOUT_MS = 15000;

export function loadYmaps(apiKey) {
  if (window.ymaps?.Map) {
    return Promise.resolve(window.ymaps);
  }

  if (!apiKey) {
    return Promise.reject(new Error('Yandex Maps API kaliti mavjud emas'));
  }

  if (ymapsPromise) {
    return ymapsPromise;
  }

  ymapsPromise = new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let script = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };

    const fail = (message) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (script && !window.ymaps?.Map) {
        script.remove();
      }

      ymapsPromise = null;
      reject(new Error(message));
    };

    const succeed = () => {
      if (settled) return;

      if (!window.ymaps?.Map) {
        fail('Yandex Maps API ishga tushmadi');
        return;
      }

      settled = true;
      cleanup();
      resolve(window.ymaps);
    };

    const handleLoad = () => {
      if (!window.ymaps?.ready) {
        fail('Yandex Maps API javob bermadi');
        return;
      }

      try {
        window.ymaps.ready(succeed);
      } catch {
        fail('Yandex xaritasini ishga tushirib bo‘lmadi');
      }
    };

    const handleError = () => {
      fail('Xarita yuklanmadi. Internet yoki API kalitini tekshiring.');
    };

    timer = setTimeout(() => {
      fail('Xarita yuklanishi uchun ajratilgan vaqt tugadi');
    }, MAPS_LOAD_TIMEOUT_MS);

    // Avvalgi skript mavjud bo'lsa, undan foydalanamiz.
    const existingScript = document.querySelector(
      'script[data-yandex-maps-loader="true"]'
    );

    if (existingScript) {
      if (window.ymaps?.ready) {
        script = existingScript;
        handleLoad();
        return;
      }

      // Oldingi skript osilib qolgan bo'lsa, qayta urinish imkonini yaratamiz.
      existingScript.remove();
    }

    script = document.createElement('script');

    script.dataset.yandexMapsLoader = 'true';
    script.src =
      `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=uz_UZ`;
    script.async = true;

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.head.appendChild(script);
  });

  return ymapsPromise;
}