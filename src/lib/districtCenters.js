/*
 * Tuman markazlari (shahar/posyolka) — xarita GPS kutmasdan DARHOL ochilishi uchun boshlang'ich ko'rinish.
 * Har bir nuqta server chegaralari (data/uzbekistan/namangan-districts.geojson) bo'yicha o'z tumani ichida ekani
 * tekshirilgan (resolveDistrict → matched). Bu faqat "qayerdan ko'rsatib boshlash" — manzil sifatida ishlatilmaydi.
 * Poligonsiz Davlatobod / Yangi Namangan — Namangan shahri ichida.
 */
const CENTERS = {
  namangan_sh: [40.9983, 71.6726],
  davlatobod: [40.9983, 71.6726],
  yangi_namangan: [40.9983, 71.6726],
  pop: [40.8736, 71.1089],
  chust: [41.0034, 71.2373],
  kosonsoy: [41.2496, 71.5469],
  mingbuloq: [40.853, 71.37],
  namangan_t: [40.901, 71.604],
  norin: [40.92, 72.08],
  toraqorgon: [41.0039, 71.5136],
  uychi: [41.081, 71.923],
  uchqorgon: [41.115, 72.079],
  chortoq: [41.069, 71.823],
  yangiqorgon: [41.192, 71.72],
};

/** Viloyat markazi — hech narsa ma'lum bo'lmasa (avval Toshkent edi — mijozlarimiz Namanganda). */
export const REGION_CENTER = CENTERS.namangan_sh;

export function districtCenter(id) {
  return (id && CENTERS[id]) || null;
}
