import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useBanners } from '@/store/banners';


const BANNER_BG_PRESETS = [
{ bg: '#411E00', accentText: '#FAC775', ctaBg: '#EF9F27', ctaText: '#2C1400' },
{ bg: '#993C1D', accentText: '#F5C4B3', ctaBg: '#F0997B', ctaText: '#4A1B0C' },
{ bg: '#0F6E56', accentText: '#9FE1CB', ctaBg: '#5DCAA5', ctaText: '#04342C' },
{ bg: '#534AB7', accentText: '#D6D2F5', ctaBg: '#9B8FE0', ctaText: '#241F5C' }];

const BANNER_ICON_OPTIONS = ['gift', 'bike', 'fish', 'discount', 'bottle', 'chefHat', 'beef'];

export function AdminPage() {
  const navigate = useNavigate();
  const { banners, smallBanners, addBanner, updateBanner, removeBanner, addSmallBanner, updateSmallBanner, removeSmallBanner } =
  useBanners();

  const [tab, setTab] = useState('main');
  const [editing, setEditing] = useState(null);

  function saveBanner(data, id) {
    if (id) updateBanner(id, data);else
    addBanner(data);
    setEditing(null);
  }
  function saveSmallBanner(data, id) {
    if (id) updateSmallBanner(id, data);else
    addSmallBanner(data);
    setEditing(null);
  }

  if (editing) {
    return (
      <BannerEditor
        banner={editing === 'new' ? null : editing}
        isSmall={tab === 'small'}
        onCancel={() => setEditing(null)}
        onSave={(data, id) => tab === 'main' ? saveBanner(data, id) : saveSmallBanner(data, id)} />);


  }

  return (
    <div className="min-h-screen bg-canvas max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 bg-surface flex items-center gap-3 border-b border-line">
        <button onClick={() => navigate('/profile')} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Admin panel · Bannerlar</div>
      </div>

      <div className="flex gap-2 px-4 pt-3">
        <button
          onClick={() => setTab('main')}
          className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium"
          style={tab === 'main' ? { background: '#411E00', color: '#FAEEDA' } : { background: '#fff', color: '#6B6B66', boxShadow: 'inset 0 0 0 0.5px #EAE7DF' }}>
          
          Asosiy slayder ({banners.length}/4)
        </button>
        <button
          onClick={() => setTab('small')}
          className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium"
          style={tab === 'small' ? { background: '#411E00', color: '#FAEEDA' } : { background: '#fff', color: '#6B6B66', boxShadow: 'inset 0 0 0 0.5px #EAE7DF' }}>
          
          Kichik reklama ({smallBanners.length})
        </button>
      </div>

      <div className="p-4 flex-1">
        {tab === 'main' &&
        <>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              Bosh sahifadagi aylanuvchi banner. 3-4 tagacha qo'shish tavsiya etiladi.
            </p>
            <div className="flex flex-col gap-2.5">
              {banners.map((b) =>
            <div key={b.id} className="bg-surface border border-line rounded-xl p-2.5 flex items-center gap-2.5">
                  <div className="w-12 h-10 rounded-lg flex-none flex items-center justify-center" style={{ background: b.bg }}>
                    <Icon name={b.icon} size={18} color={b.ctaBg} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted font-medium">{b.eyebrow}</div>
                    <div className="text-[13px] font-medium text-ink overflow-hidden text-ellipsis whitespace-nowrap">{b.title}</div>
                  </div>
                  <button onClick={() => setEditing(b)} className="w-[30px] h-[30px] rounded-lg border border-line flex items-center justify-center" aria-label="Tahrirlash">
                    <Icon name="edit" size={14} color="#6B6B66" />
                  </button>
                  <button onClick={() => removeBanner(b.id)} className="w-[30px] h-[30px] rounded-lg border border-line flex items-center justify-center" aria-label="O'chirish">
                    <Icon name="trash" size={14} color="#D85A30" />
                  </button>
                </div>
            )}
            </div>
            {banners.length < 4 &&
          <button
            onClick={() => setEditing('new')}
            className="mt-3 w-full border-2 border-dashed border-[#D3D1C7] rounded-xl p-3 text-muted text-[13px] font-medium flex items-center justify-center gap-1.5">
            
                <Icon name="plus" size={16} color="#6B6B66" /> Yangi banner qo'shish
              </button>
          }
          </>
        }

        {tab === 'small' &&
        <>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              Bosh sahifada trend va chegirma taomlari orasidagi kichik sponsor bloki.
            </p>
            <div className="flex flex-col gap-2.5">
              {smallBanners.map((b) =>
            <div key={b.id} className="bg-surface border border-line rounded-xl p-2.5 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg flex-none flex items-center justify-center" style={{ background: b.tint }}>
                    <Icon name={b.icon} size={18} color={b.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted font-medium">{b.eyebrow}</div>
                    <div className="text-[13px] font-medium text-ink">{b.title}</div>
                  </div>
                  <button onClick={() => setEditing(b)} className="w-[30px] h-[30px] rounded-lg border border-line flex items-center justify-center" aria-label="Tahrirlash">
                    <Icon name="edit" size={14} color="#6B6B66" />
                  </button>
                  <button onClick={() => removeSmallBanner(b.id)} className="w-[30px] h-[30px] rounded-lg border border-line flex items-center justify-center" aria-label="O'chirish">
                    <Icon name="trash" size={14} color="#D85A30" />
                  </button>
                </div>
            )}
              {smallBanners.length === 0 && <div className="text-center text-muted text-[13px] py-5">Kichik banner yo'q</div>}
            </div>
            <button
            onClick={() => setEditing('new')}
            className="mt-3 w-full border-2 border-dashed border-[#D3D1C7] rounded-xl p-3 text-muted text-[13px] font-medium flex items-center justify-center gap-1.5">
            
              <Icon name="plus" size={16} color="#6B6B66" /> Yangi reklama qo'shish
            </button>
          </>
        }
      </div>
    </div>);

}

function BannerEditor({
  banner,
  isSmall,
  onCancel,
  onSave





}) {
  const [eyebrow, setEyebrow] = useState(banner?.eyebrow || (isSmall ? 'REKLAMA · SPONSOR' : 'AKSIYA'));
  const [title, setTitle] = useState(banner?.title || '');
  const [cta, setCta] = useState(banner?.cta || "Ko'rish");
  const [icon, setIcon] = useState(banner?.icon || BANNER_ICON_OPTIONS[0]);
  const [presetIdx, setPresetIdx] = useState(0);

  const valid = title.trim().length > 0;
  const preset = BANNER_BG_PRESETS[presetIdx];

  function handleSave() {
    if (isSmall) {
      onSave({ eyebrow, title, icon, tint: '#FAEEDA', iconColor: '#D85A30' }, banner?.id);
    } else {
      onSave({ eyebrow, title, cta, icon, ...preset }, banner?.id);
    }
  }

  return (
    <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-line">
        <button onClick={onCancel} aria-label="Yopish">
          <Icon name="x" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">{banner ? 'Tahrirlash' : 'Yangi banner'}</div>
      </div>

      <div className="p-4 flex-1">
        {!isSmall ?
        <div className="h-[110px] rounded-2xl flex items-center justify-between px-4 mb-4.5" style={{ background: preset.bg }}>
            <div>
              <div className="text-[10px] font-medium" style={{ color: preset.accentText }}>{eyebrow || 'EYEBROW'}</div>
              <div className="text-[15px] text-white font-medium mt-0.5 max-w-[180px]">{title || 'Banner sarlavhasi'}</div>
              <div className="mt-1.5 inline-block text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: preset.ctaBg, color: preset.ctaText }}>
                {cta}
              </div>
            </div>
            <Icon name={icon} size={40} color={preset.ctaBg} />
          </div> :

        <div className="rounded-2xl bg-brand-50 flex items-center justify-between px-4 py-3.5 mb-4.5">
            <div>
              <div className="text-[10px] text-brand-800 font-medium">{eyebrow}</div>
              <div className="text-sm text-brand-text font-medium mt-0.5">{title || 'Reklama sarlavhasi'}</div>
            </div>
            <Icon name={icon} size={32} color="#D85A30" />
          </div>
        }

        <div className="text-[13px] font-medium text-ink mb-1.5">Ustki matn</div>
        <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Masalan: YANGI AKSIYA" className="w-full box-border px-3.5 py-2.5 border border-line rounded-xl text-[16px] mb-3 outline-none" />

        <div className="text-[13px] font-medium text-ink mb-1.5">Sarlavha</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masalan: 100 000 so'mdan yuqori buyurtmaga sovg'a"
          className="w-full box-border px-3.5 py-2.5 border border-line rounded-xl text-[16px] mb-3 outline-none" />
        

        {!isSmall &&
        <>
            <div className="text-[13px] font-medium text-ink mb-1.5">Tugma matni</div>
            <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Masalan: Olish" className="w-full box-border px-3.5 py-2.5 border border-line rounded-xl text-[16px] mb-3 outline-none" />

            <div className="text-[13px] font-medium text-ink mb-1.5">Rang</div>
            <div className="flex gap-2 mb-4">
              {BANNER_BG_PRESETS.map((p, i) =>
            <button
              key={i}
              onClick={() => setPresetIdx(i)}
              className="w-9 h-9 rounded-[10px]"
              style={{ background: p.bg, border: presetIdx === i ? '2px solid #1A1A17' : '2px solid transparent' }}
              aria-label={`Rang ${i + 1}`} />

            )}
            </div>
          </>
        }

        <div className="text-[13px] font-medium text-ink mb-1.5">Ikonka</div>
        <div className="flex gap-2 flex-wrap mb-5">
          {BANNER_ICON_OPTIONS.map((ic) =>
          <button
            key={ic}
            onClick={() => setIcon(ic)}
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: icon === ic ? '#411E00' : '#F7F5F0' }}
            aria-label={ic}>
            
              <Icon name={ic} size={18} color={icon === ic ? '#EF9F27' : '#6B6B66'} />
            </button>
          )}
        </div>

        <button onClick={handleSave} disabled={!valid} className="w-full bg-brand-ink text-white text-[15px] font-medium py-3.5 rounded-xl disabled:opacity-50">
          Saqlash
        </button>
      </div>
    </div>);

}
