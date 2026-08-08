import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

/**
 * Ochilish ekrani — logo videosi.
 *
 * Video 9:16 (720×1280), telefon ekranlari esa odatda undan
 * ingichkaroq (masalan 393×852). Shuning uchun:
 *   • cover  → yon tomonlari kesiladi
 *   • contain → tepa-pastda bo'sh joy qoladi
 *
 * Yechim: asosiy video "contain" — hech narsa kesilmaydi; orqada
 * xuddi shu video "cover" holatda xiralashtirilib bo'shliqni
 * to'ldiradi. Natijada ekran to'liq qoplanadi va chegara bilinmaydi.
 */
const SHOW_MS = 5600;   // video ko'rsatiladigan vaqt
const FADE_MS = 400;    // chiqish animatsiyasi

export function Splash({ onDone }) {
  const qc = useQueryClient();
  const videoRef = useRef(null);
  const bgRef = useRef(null);
  const [leaving, setLeaving] = useState(false);

  // onDone har renderda yangidan yaratiladi. Uni to'g'ridan-to'g'ri
  // effekt bog'liqligiga qo'ysak taymerlar qayta ishga tushib,
  // splash yopilmay qolishi mumkin — shuning uchun ref orqali.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Splash ko'rinib turganda ma'lumotlar oldindan yuklanadi
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

    const leaveTimer = setTimeout(() => setLeaving(true), SHOW_MS);
    const doneTimer = setTimeout(() => onDoneRef.current(), SHOW_MS + FADE_MS);

    return () => { clearTimeout(leaveTimer); clearTimeout(doneTimer); };
  }, [qc]);

  /**
   * Ovoz. Brauzerlar ovozli avtoijroni bloklaydi — shuning uchun
   * video muted holda boshlanadi (ijro kafolatlanadi), keyin ovozni
   * yoqishga urinamiz. Ruxsat berilmasa video baribir ko'rinadi.
   */
  const handlePlaying = () => {
    const v = videoRef.current;
    if (!v || !v.muted) return;
    v.muted = false;
    v.volume = 0.1;
    // Ba'zi brauzerlar ovoz yoqilganda ijroni to'xtatadi — qaytaramiz
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  };

  /** Xira fon asosiy video bilan bir kadrda tursin. */
  const syncBackground = () => {
    const v = videoRef.current;
    const bg = bgRef.current;
    if (!v || !bg) return;
    if (Math.abs(bg.currentTime - v.currentTime) > 0.35) {
      bg.currentTime = v.currentTime;
    }
  };

  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      {/* To'ldiruvchi qatlam — kesilgan va xiralashtirilgan nusxa */}
      <video
        ref={bgRef}
        className="splash__fill"
        src="/splash.mp4"
        autoPlay muted loop playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Aniq va xira qatlam orasidagi chegarani yumshatadi */}
      <div className="splash__veil" aria-hidden="true" />

      {/* Asosiy video — to'liq ko'rinadi, hech joyi kesilmaydi */}
      <video
        ref={videoRef}
        className="splash__video"
        src="/splash.mp4"
        autoPlay muted playsInline
        preload="auto"
        onPlaying={handlePlaying}
        onTimeUpdate={syncBackground}
      />
    </div>
  );
}
