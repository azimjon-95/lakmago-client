import { ICONS } from './icons-data';










// Barcha ikonlar Lucide (lucide.dev) ochiq kutubxonasidan olingan haqiqiy SVG path'lar —
// bir xil chiziq uslubi (strokeWidth=2, round cap/join), professional dizayn tizimi kabi izchil.
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, className, style }) {
  const elements = ICONS[name];
  if (!elements) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      // currentColor — CSS `color` orqali beriladi (pastda). Bu
      // color="var(--ink)" kabi CSS o'zgaruvchilarini xavfsiz
      // qabul qiladi: xom SVG atributi sifatida var() har doim
      // ham ishlay bermaydi, lekin CSS `style.color` orqali
      // ALBATTA to'g'ri hisoblanadi.
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, color, ...style }}
      aria-hidden="true">
      
      {elements.map(([tag, attrs], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} />;
      })}
    </svg>);

}
