import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.lokma.go',
  appName: 'Lokma Go',
  webDir: 'dist',
  // Veb-ko'rinish foni = ishga tushirish ekrani foni: native ekran tugagach oq "chaqnash" bo'lmasin (Splash.css bilan bir xil)
  backgroundColor: '#032A37',
  plugins: {
    // Taom takliflari: ilova ochiq turganda banner chiqmaydi (mijoz allaqachon ilovada); yopiq/fonda — tizim ko'rsatadi
    PushNotifications: {
      presentationOptions: ['badge'],
    },
    /*
     * Jim yangilanish (veb-qism) — O'Z serverimizdan, bulutsiz (lib/liveUpdate.js, scripts/build-ota.mjs).
     * Plaginning avtomatik rejimi va Capgo serverlariga hech qanday so'rov O'CHIQ.
     * Yangi versiya 10 s ichida "tayyorman" demasa (notifyAppReady) — oldingisiga avtomatik qaytadi.
     * resetWhenUpdate: mijoz do'kondan yangi native ilova o'rnatsa — eski yuklangan veb-versiyalar tashlanadi.
     */
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: '',
      statsUrl: '',
      channelUrl: '',
      appReadyTimeout: 10000,
      responseTimeout: 30,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      resetWhenUpdate: true,
      keepUrlPathAfterReload: false,
    },
  },
};

export default config;
