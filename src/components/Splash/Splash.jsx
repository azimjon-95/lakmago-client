import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

/**
 * Ochilish ekrani — logo videosi.
 *
 * Video 9:16 (720×1280), telefon ekrani odatda undan ingichka.
 * Shuning uchun video "contain" bilan chiziladi (hech joyi
 * kesilmaydi), tepa-pastdagi bo'shliqni esa xira POSTER
 * to'ldiradi.
 *
 * MUHIM: bo'shliqni ilgari ikkinchi <video> to'ldirardi. Bu
 * bitta faylni ikki marta dekodlash va har kadrga blur(40px)
 * qo'llash demak edi — telefonda video boshida qotib qolardi.
 * Endi fon statik rasm: dekod bir marta, blur bir marta.
 */
const SHOW_MS = 5600;   // video ko'rsatiladigan vaqt
const FADE_MS = 400;    // chiqish animatsiyasi
const HARD_STOP_MS = 8000; // video umuman yurmasa ham o'tib ketamiz

export function Splash({ onDone }) {
  const qc = useQueryClient();
  const videoRef = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const prefetched = useRef(false);

  // onDone har renderda yangidan yaratiladi. Uni to'g'ridan-to'g'ri
  // effekt bog'liqligiga qo'ysak taymerlar qayta ishga tushib,
  // splash yopilmay qolishi mumkin — shuning uchun ref orqali.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /**
   * Ma'lumotlarni oldindan yuklash.
   *
   * Bu beshta so'rov va ularning JSON tahlili asosiy oqimni
   * band qiladi. Video ijrosi bilan bir vaqtda boshlansa,
   * birinchi kadrlar kechikadi. Shuning uchun video yurib
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

    // Video yuklanmasa yoki ijro bloklansa ham ilova ochilsin
    const guard = setTimeout(() => { prefetch(); }, 1200);

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
