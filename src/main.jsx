import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { startAppIconSync } from './lib/appIcon';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Mavsumiy ilova ikonkasi (faqat iOS/Android ilovada; sana bo'yicha avtomatik — APP-ICONS.md)
startAppIconSync();
