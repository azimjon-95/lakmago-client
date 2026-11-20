import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { startTextScale } from './lib/textScale';
import { startAppIconSync } from './lib/appIcon';

// Android shrift masshtabini render'dan OLDIN o'lchaymiz (lib/textScale.js)
startTextScale();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Mavsumiy ilova ikonkasi (faqat iOS/Android ilovada; sana bo'yicha avtomatik — APP-ICONS.md)
startAppIconSync();
