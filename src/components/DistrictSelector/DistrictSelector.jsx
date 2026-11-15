import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/i18n';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useDistrict, useDistrictMeta } from '@/store/district';
import { DISTRICT_SELECTOR_ENABLED, DISTRICT_AUTO_DETECT_ENABLED } from '@/lib/districtFlags';
import { requestDistrictCheck } from '@/hooks/useDistrictEngine';
import './DistrictSelector.css';

/*
 * ═══ HEADER: TUMAN/SHAHAR TANLAGICHI ═══
 * Mavjud manzil tanlagichini ALMASHTIRMAYDI (u yetkazish manzili; bu — katalog hududi). Flag (VITE_DISTRICT_SELECTOR_ENABLED)
 * va server metama'lumoti bo'lmasa umuman chizilmaydi. Ro'yxat serverdan (/districts), faqat poligoni bor tumanlar.
 */
const STATUS_KEY = {
  denied: 'districtStatusDenied', no_permission: 'districtStatusNoPerm', low_accuracy: 'districtStatusLowAcc',
  outside: 'districtStatusOutside', uncertain: 'districtStatusUncertain', error: 'districtStatusError',
};

const nameOf = (d, lang) => (d ? (d[lang] || d.uz || d.id) : '');
const norm = (s) => String(s || '').toLowerCase().replace(/[ʻʼ'`‘’]/g, '');

export function DistrictChip() {
  const { t, lang } = useI18n();
  const meta = useDistrictMeta((s) => s.meta);
  const districts = useDistrictMeta((s) => s.districts);
  const activeId = useDistrict((s) => s.activeDistrictId);
  const mode = useDistrict((s) => s.selectionMode);
  const resolving = useDistrict((s) => s.isResolving);
  const [open, setOpen] = useState(false);
  if (!DISTRICT_SELECTOR_ENABLED || !meta) return null;
  const active = meta.supported.includes(activeId) ? districts.find((d) => d.id === activeId) : null;
  return (
    <>
      <button type="button" className="dsel-chip" onClick={() => setOpen(true)} data-testid="district-chip" aria-haspopup="dialog">
        <Icon name="navigation" size={13} color="var(--brand)" />
        <span className="dsel-chip__name">{active ? nameOf(active, lang) : t('districtNotSelected')}</span>
        {active && <span className={`dsel-chip__mode ${mode === 'manual' ? 'is-manual' : ''}`}>{resolving ? t('districtDetecting') : (mode === 'manual' ? t('districtManual') : t('districtAuto'))}</span>}
        <Icon name="chevronDown" size={13} color="var(--muted)" />
      </button>
      {open && <DistrictSheet onClose={() => setOpen(false)} />}
    </>
  );
}

export function DistrictSheet({ onClose }) {
  const { t, lang } = useI18n();
  const meta = useDistrictMeta((s) => s.meta);
  const districts = useDistrictMeta((s) => s.districts);
  const activeId = useDistrict((s) => s.activeDistrictId);
  const mode = useDistrict((s) => s.selectionMode);
  const status = useDistrict((s) => s.autoStatus);
  const resolving = useDistrict((s) => s.isResolving);
  const [q, setQ] = useState('');
  const { dragProps, overlayStyle } = useSheetDrag(onClose);
  const autoOn = DISTRICT_AUTO_DETECT_ENABLED && !!meta?.autoDetect?.enabled;

  const list = useMemo(() => {
    const ok = new Set(meta?.supported || []);
    const n = norm(q);
    return districts.filter((d) => ok.has(d.id)).filter((d) => !n || [d.uz, d.uzc, d.ru].some((x) => norm(x).includes(n)));
  }, [districts, meta, q]);
  const groups = [
    { key: 'city', title: t('districtCity'), items: list.filter((d) => d.group === 'city') },
    { key: 'district', title: t('districtDistricts'), items: list.filter((d) => d.group !== 'city') },
  ].filter((g) => g.items.length);

  const pick = (id) => { useDistrict.getState().selectManual(id); onClose(); };
  const detect = () => { useDistrict.getState().backToAuto(); requestDistrictCheck({ interactive: true }); };

  return (
    <div onClick={onClose} className="sheet-overlay" style={{ zIndex: 100, ...overlayStyle }}>
      <div onClick={(e) => e.stopPropagation()} className="dsel-sheet" role="dialog" aria-label={t('districtTitle')} {...dragProps}>
        <div className="dsel-sheet__head">
          <div className="dsel-sheet__title">{t('districtTitle')}</div>
          <button type="button" onClick={onClose} aria-label={t('close')}><Icon name="x" size={20} color="var(--muted)" /></button>
        </div>
        <p className="dsel-sheet__hint">{t('districtHint')}</p>

        {autoOn && (
          <div className="dsel-sheet__auto">
            <button type="button" className="dsel-detect" onClick={detect} disabled={resolving} data-testid="district-detect">
              <Icon name="navigation" size={18} color="#2563EB" />
              <span>{resolving ? t('districtDetecting') : (mode === 'manual' ? t('districtBackToAuto') : t('districtDetect'))}</span>
            </button>
            {STATUS_KEY[status] && <div className="dsel-status" role="status">{t(STATUS_KEY[status])}</div>}
          </div>
        )}

        <input className="dsel-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('districtSearch')} aria-label={t('districtSearch')} />

        <div className="dsel-sheet__body">
          {groups.map((g) => (
            <div key={g.key} className="dsel-group">
              <div className="dsel-group__title">{g.title}</div>
              {g.items.map((d) => (
                <button key={d.id} type="button" onClick={() => pick(d.id)} className={`dsel-item ${d.id === activeId ? 'is-selected' : ''}`} aria-pressed={d.id === activeId}>
                  <span>{nameOf(d, lang)}</span>
                  {d.id === activeId && <Icon name="check" size={18} color="var(--brand)" />}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && <div className="dsel-empty">{t('districtNoResults')}</div>}
        </div>
      </div>
    </div>
  );
}
