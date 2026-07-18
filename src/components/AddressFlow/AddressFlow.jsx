import { useState } from 'react';
import { LocationPermission } from './LocationPermission';
import { AddressSearch } from './AddressSearch';
import { AddressDetails } from './AddressDetails';
import './AddressFlow.css';

// Manzil qo'shish oqimи (3 bosqich):
//   1) permission — joylashuvга ruxsat yoki qo'lda
//   2) search     — manzil qidirish
//   3) details    — kirish/qavat/xonadon/izoh
export function AddressFlow({ onSave, onClose, startStep = 'permission' }) {
  const [step, setStep] = useState(startStep);
  const [location, setLocation] = useState(null);

  // Joylashuv aniqlandi (avtomatik yoki qidiruvдан) → tafsilotlarга
  const handlePicked = (loc) => {
    setLocation(loc);
    setStep('details');
  };

  const handleSave = (address) => {
    onSave(address);
    onClose();
  };

  return (
    <div className="addrflow-overlay">
      {step === 'permission' && (
        <LocationPermission
          onDetected={handlePicked}
          onManual={() => setStep('search')}
          onClose={onClose}
        />
      )}

      {step === 'search' && (
        <AddressSearch
          onPick={handlePicked}
          onBack={() => setStep('permission')}
        />
      )}

      {step === 'details' && location && (
        <AddressDetails
          location={location}
          onSave={handleSave}
          onBack={() => setStep('search')}
        />
      )}
    </div>
  );
}
