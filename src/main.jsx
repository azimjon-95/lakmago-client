import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { startTextScale } from './lib/textScale';
import { startAppIconSync } from './lib/appIcon';
import { liveUpdateBoot } from './lib/liveUpdate';

// Android shrift masshtabini render'dan OLDIN o'lchaymiz (lib/textScale.js)
startTextScale();

// Native ilova: joriy veb-versiya "tayyor" (aks holda 10 s da oldingisiga qaytadi) va oldin
// fonda yuklangan yangi versiya bo'lsa — splash paytida qo'llanadi (lib/liveUpdate.js). Veb/Telegram'da hech narsa qilmaydi.
liveUpdateBoot();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Mavsumiy ilova ikonkasi (faqat iOS/Android ilovada; sana bo'yicha avtomatik — APP-ICONS.md)
startAppIconSync();
