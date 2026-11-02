import { CurrentLocationStep } from './CurrentLocationStep';
import { useModalBackClose } from '@/hooks/useModalBackClose';

/*
 * "Hozirgi joyimga yetkazish" — MUSTAQIL oyna (savat sahifasidan: manzillar ro'yxati / manzil yo'q holati).
 * Saqlangan manzili yo'q yangi mijoz ham buyurtma bera olishi uchun kerak: tasdiqlash oynasining manzil qadami faqat manzil
 * tanlangach ochiladi. Ichki qadam — bir xil CurrentLocationStep (tasdiqlash oynasidagi bilan).
 * Overlay bosilganda YOPILMAYDI (xarita surilganda tasodifan yopilib ketmasin); yopish — orqaga/× tugmasi yoki tizim "orqaga".
 */
export function CurrentLocationSheet({ restaurants = [], initial = null, onConfirm, onClose }) {
  useModalBackClose(true, onClose);
  return (
    <div className="ocm-overlay" style={{ zIndex: 110 }}>
      <div className="ocm-sheet ocm-sheet--map">
        <div className="ocm-handle" />
        <CurrentLocationStep restaurants={restaurants} initial={initial} onBack={onClose} onClose={onClose} onConfirm={onConfirm} />
      </div>
    </div>
  );
}
