import { useState } from 'react';
import { LocationPermission } from './LocationPermission';
import { AddressDetails } from './AddressDetails';
import { MapAddressPicker } from './MapAddressPicker';
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
