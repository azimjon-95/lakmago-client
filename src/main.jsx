import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { startTextScale } from './lib/textScale';
import { startAppIconSync } from './lib/appIcon';
import { liveUpdateBoot } from './lib/liveUpdate';
import { pushBoot } from './lib/promoPush';
import { restoreLastHome } from './lib/lastHome';

// Android shrift masshtabini render'dan OLDIN o'lchaymiz (lib/textScale.js)
startTextScale();

// Native ilova: joriy veb-versiya "tayyor" (aks holda 10 s da oldingisiga qaytadi) va oldin
// fonda yuklangan yangi versiya bo'lsa — splash paytida qo'llanadi (lib/liveUpdate.js). Veb/Telegram'da hech narsa qilmaydi.
liveUpdateBoot();

// Native ilova: bildirishnoma bosilganini render'dan OLDIN tinglaymiz (sovuq ochilishda ham taom sahifasi ochilsin).
// Rozilik bo'lmasa hech narsa so'ramaydi. Veb/Telegram'da hech narsa qilmaydi (lib/promoPush.js).
pushBoot();

// Oxirgi bo'lim (Go / Market / To'yxonalar) — router ishga tushishidan oldin (lib/lastHome.js)
restoreLastHome();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Mavsumiy ilova ikonkasi (faqat iOS/Android ilovada; sana bo'yicha avtomatik — APP-ICONS.md)
startAppIconSync();
