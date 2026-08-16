import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

/**
 * Ochilish ekrani.
 *
 * BIRINCHI MAROTABA (butun vaqt davomida, localStorage orqali
 * — sessiya emas) — brend videosi. Keyingi barcha ochilishlarda
 * — yengil GIF (kuryer animatsiyasi). Video ancha katta va faqat
 * bir marta ko'rilishi kerak; GIF esa har safar tez yuklanishi
 * uchun ataylab kichik (~1MB) qilib siqilgan.
 *
 * Ikkalasi ham 3 soniya ko'rsatiladi, keyin ilova ochiladi.
 */
const SHOW_MS = 3400;    // ko'rsatish vaqti — video ham, gif ham
const FADE_MS = 400;     // chiqish animatsiyasi
const HARD_STOP_MS = 6000; // hech narsa yurmasa ham o'tib ketamiz

const FIRST_OPEN_KEY = 'lokmago_first_open_done';

export function Splash({ onDone }) {
  const qc = useQueryClient();
  const videoRef = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const prefetched = useRef(false);

  /*
   * Bir marta hisoblanadi — FAQAT O'QIYDI, yon ta'sir yo'q.
   *
   * MUHIM: localStorage.setItem() ni bu yerga yozib bo'lmaydi —
   * React StrictMode useState boshlang'ich funksiyasini RIVOJLANISH
   * rejimida ATAYLAB ikki marta chaqiradi (aynan shunday yon
   * ta'sirlarni tutish uchun). Agar shu yerda yozilsa: 1-chaqiruv
   * bayroqni o'rnatadi -> 2-chaqiruv uni allaqachon o'rnatilgan
   * deb topadi -> natija noto'g'ri "false" bo'lib qoladi, birinchi
   * tashrifda ham video o'rniga gif ko'rinadi.
   */
  const [isFirstOpen] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_OPEN_KEY);
    } catch {
      // localStorage yo'q (masalan cookie o'chirilgan) — video
      // ko'rsatmaymiz, gif yengilroq va xavfsizroq zaxira
      return false;
    }
  });

  // Yon ta'sir shu yerda, useEffect ichida — faqat bir marta,
  // xavfsiz ishlaydi.
  useEffect(() => {
    if (!isFirstOpen) return;
    try { localStorage.setItem(FIRST_OPEN_KEY, '1'); } catch { /* yo'q qilib bo'lmaydi */ }
  }, [isFirstOpen]);

  // onDone har renderda yangidan yaratiladi. Uni to'g'ridan-to'g'ri
  // effekt bog'liqligiga qo'ysak taymerlar qayta ishga tushib,
  // splash yopilmay qolishi mumkin — shuning uchun ref orqali.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /**
   * Ma'lumotlarni oldindan yuklash.
   *
   * Bu beshta so'rov va ularning JSON tahlili asosiy oqimni
   * band qiladi. Media ijrosi bilan bir vaqtda boshlansa,
   * birinchi kadrlar kechikadi. Shuning uchun media yurib
   * ketgandan keyin chaqiriladi.
   */
  const prefetch = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    Promise.allSettled([
      qc.prefetchQuery({
        queryKey: ['restaurants'],
        queryFn: ({ signal }) => api.getRestaurants({ signal }),
      }),
      qc.prefetchQuery({
        queryKey: ['dishes', 'trending'],
        queryFn: ({ signal }) => api.getTrendingDishes({ signal }),
      }),
      qc.prefetchQuery({
        queryKey: ['dishes', 'discounted'],
        queryFn: ({ signal }) => api.getDiscountedDishes({ signal }),
      }),
      qc.prefetchQuery({
        queryKey: ['dishes', 'all'],
        queryFn: ({ signal }) => api.getAllDishes({ signal }),
      }),
      qc.prefetchQuery({
        queryKey: ['banners'],
        queryFn: ({ signal }) => api.getBanners({ signal }),
      }),
    ]);
  }, [qc]);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), SHOW_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), SHOW_MS + FADE_MS);

    // Media yuklanmasa yoki ijro bloklansa ham ilova ochilsin —
    // ma'lumot yuklashni istalgan holatda darhol boshlaymiz
    const guard = setTimeout(() => { prefetch(); }, 400);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
      clearTimeout(guard);
    };
  }, [prefetch]);

  // Butunlay qotib qolgan holat uchun zaxira
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), HARD_STOP_MS);
    return () => clearTimeout(t);
  }, []);

  /**
   * Ovoz. Brauzerlar ovozli avtoijroni bloklaydi — shuning uchun
   * video muted holda boshlanadi (ijro kafolatlanadi), keyin
   * ovozni yoqishga urinamiz. Ruxsat berilmasa video ko'rinaveradi.
   */
  const handlePlaying = () => {
    prefetch();

    const v = videoRef.current;
    if (!v || !v.muted) return;
    v.muted = false;
    v.volume = 0.1;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  };

  if (!isFirstOpen) {
    // ═══ Keyingi ochilishlar — yengil GIF ═══
    return (
      <div className={`splash splash--gif ${leaving ? 'splash--leaving' : ''}`}>
        <img
          className="splash__gif"
          src="/splash-courier.gif"
          alt=""
          onLoad={prefetch}
        />
      </div>
    );
  }

  // ═══ Birinchi marotaba — brend videosi ═══
  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      {/* To'ldiruvchi fon — statik kadr, har kadrda qayta
          chizilmaydi. Video tayyor bo'lguncha ham ko'rinadi. */}
      <div className="splash__fill" aria-hidden="true" />

      {/* Aniq va xira qatlam orasidagi chegarani yumshatadi */}
      <div className="splash__veil" aria-hidden="true" />

      {/* Asosiy video — to'liq ko'rinadi, hech joyi kesilmaydi */}
      <video
        ref={videoRef}
        className="splash__video"
        src="/splash.mp4"
        poster="/splash-poster.jpg"
        
        autoPlay muted playsInline
        preload="auto"
        disablePictureInPicture
        onPlaying={handlePlaying}
      />
    </div>
  );
}
