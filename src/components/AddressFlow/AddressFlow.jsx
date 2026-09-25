import { useState } from 'react';
import { LocationPermission } from './LocationPermission';
import { AddressDetails } from './AddressDetails';
import { MapAddressPicker } from './MapAddressPicker';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import './AddressFlow.css';

/*
 * ═══════════════════════════════════════════════════════════
 * MANZIL QO'SHISH OQIMI
 * ═══════════════════════════════════════════════════════════
 *
 *   permission ──(aniq joy)───────────────► details
 *        │     ──(taxminiy joy)──► map ───► details
 *        └────(qo'lda)────────────► map ───► details
 *
 * SODDALASHTIRILDI: avval "qo'lda" tugmasi alohida QIDIRUV
 * sahifasiga olib borardi, u yerdan esa yana xaritaga. Mijoz
 * uchun bu ortiqcha qadam edi: matn bo'yicha qidiruv ko'pincha
 * uyni topolmasdi (ayniqsa mahallalarda) va baribir xaritaga
 * o'tishga to'g'ri kelardi. Endi to'g'ridan-to'g'ri xarita.
 *
 * TAXMINIY JOY: geolokatsiya faqat taxminan aniqlasa (masalan
 * Wi-Fi bo'yicha 500 m), mijoz to'g'ridan-to'g'ri tafsilotlarga
 * emas, XARITAGA o'tadi — igna o'sha joyda, mijoz uni uyiga
 * suradi. Aks holda kuryer noto'g'ri manzilga borardi.
 */
export function AddressFlow({ onSave, onClose, startStep = 'permission' }) {
  // Eski 'search' qadami endi xaritaga yo'naltiriladi
  const [step, setStep] = useState(startStep === 'search' ? 'map' : startStep);
  const [location, setLocation] = useState(null);
  // Xarita qaysi nuqtadan boshlansin (taxminiy joy yoki tahrirlash)
  const [mapStart, setMapStart] = useState(null);

  const toDetails = (loc) => {
    setLocation(loc);
    setStep('details');
  };

  const toMap = (start = null) => {
    setMapStart(start);
    setStep('map');
  };

  const handleSave = (address) => {
    onSave(address);
    onClose();
  };

  /*
   * Orqaga tugmasi bosilganda — o'z ICHIDAGI navigatsiya
   * mantig'i bilan bir xil: xarita bosqichida oldingi (ruxsat)
   * bosqichga, tafsilotlar bosqichida xaritaga qaytadi. Faqat
   * ENG BOSHIDA (ruxsat bosqichi) butun oqim yopiladi — xuddi
   * shu bosqichning o'z "Yopish" tugmasi (onClose) bilan bir xil.
   */
  const handleBack = () => {
    if (step === 'map') { setStep('permission'); return; }
    if (step === 'details' && location) { toMap({ lat: location.lat, lng: location.lng }); return; }
    onClose();
  };
  useModalBackClose(true, handleBack);

  return (
    <div className="addrflow-overlay">
      {step === 'permission' && (
        <LocationPermission
          onDetected={toDetails}
          onApproximate={(pos) => toMap(pos)}
          onManual={() => toMap(null)}
          onClose={onClose}
        />
      )}

      {step === 'map' && (
        <MapAddressPicker
          start={mapStart}
          onPick={toDetails}
          onBack={() => setStep('permission')}
        />
      )}

      {step === 'details' && location && (
        <AddressDetails
          location={location}
          onSave={handleSave}
          // Orqaga — xaritaga, tanlangan nuqtadan davom etadi
          onBack={() => toMap({ lat: location.lat, lng: location.lng })}
        />
      )}
    </div>
  );
}
