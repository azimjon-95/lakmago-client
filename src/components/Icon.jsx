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
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true">
      
      {elements.map(([tag, attrs], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} />;
      })}
    </svg>);

}
