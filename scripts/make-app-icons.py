#!/usr/bin/env python3
"""
LokmaGo — Android va iOS ilova ikonkalarini manba logotipdan (resources/lokma-go-logo-source.jpeg) yaratadi.

  python3 scripts/make-app-icons.py          (Pillow va numpy kerak)

Yaratadi:
  iOS      ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png   1024x1024, RGB (shaffoflik YO'Q — App Store talabi)
  Android  android/app/src/main/res/mipmap-*/ic_launcher.png          yumaloq-kvadrat (eski qurilmalar)
           android/app/src/main/res/mipmap-*/ic_launcher_round.png    doira
           android/app/src/main/res/mipmap-*/ic_launcher_foreground.png  moslashuvchan ikonka (Android 8+) oldi qatlami

Moslashuvchan ikonka qoidasi: 108dp kanvasning faqat markaziy 72dp qismi ko'rinadi (maska: doira/yumaloq kvadrat va h.k.),
xavfsiz zona — 66dp. Logotip keng (≈1.7:1), shuning uchun burchaklari maskadan chiqib ketmasligi uchun kichikroq masshtabda joylanadi.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'resources' / 'lokma-go-logo-source.jpeg'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
IOS = ROOT / 'ios' / 'App' / 'App' / 'Assets.xcassets' / 'AppIcon.appiconset' / 'AppIcon-512@2x.png'

# Manba rasmdagi logotip chegarasi (px, 873x873): to'yingan to'q sariq/qora piksellar bo'yicha aniqlangan
BBOX = (74, 182, 813, 617)  # x0, y0, x1, y1
LOGO_W = BBOX[2] - BBOX[0]
CX, CY = (BBOX[0] + BBOX[2]) / 2, (BBOX[1] + BBOX[3]) / 2


def master(logo_share: float, size: int = 1024) -> Image.Image:
    """Logotip kvadratning `logo_share` ulushini egallaydigan kvadrat kesim (rasm chetidan chiqsa — fon rangi davom ettiriladi)."""
    side = LOGO_W / logo_share
    x0, y0 = round(CX - side / 2), round(CY - side / 2)
    x1, y1 = round(x0 + side), round(y0 + side)
    src = np.asarray(Image.open(SRC).convert('RGB'))
    h, w = src.shape[:2]
    pad = max(0, -x0, -y0, x1 - w, y1 - h)
    if pad:
        src = np.pad(src, ((pad, pad), (pad, pad), (0, 0)), mode='edge')
    crop = src[y0 + pad:y1 + pad, x0 + pad:x1 + pad]
    return Image.fromarray(crop).resize((size, size), Image.LANCZOS)


def mask_rounded(size: int, radius_ratio: float) -> Image.Image:
    big = size * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * radius_ratio), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def mask_circle(size: int) -> Image.Image:
    big = size * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).ellipse([0, 0, big - 1, big - 1], fill=255)
    return m.resize((size, size), Image.LANCZOS)


def with_mask(img: Image.Image, mask: Image.Image) -> Image.Image:
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def main():
    full = master(0.88)   # iOS va eski kvadrat ikonka: logotip kengligining 88% i
    safe = master(0.78)   # doira va moslashuvchan ikonka: burchaklar maskadan chiqmasligi uchun kichikroq

    # ── iOS: 1024x1024, shaffoflik YO'Q ──
    full.convert('RGB').save(IOS, 'PNG', optimize=True)

    # ── Android ──
    legacy = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    fg = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
    # Foreground kanvasining tashqi qismi (parallaks uchun) — kesim chetidagi fon rangi bilan
    border = np.concatenate([np.asarray(safe)[0], np.asarray(safe)[-1], np.asarray(safe)[:, 0], np.asarray(safe)[:, -1]])
    bg = tuple(int(v) for v in np.median(border, axis=0))
    for d, px in legacy.items():
        out = RES / f'mipmap-{d}'
        with_mask(full.resize((px, px), Image.LANCZOS), mask_rounded(px, 0.12)).save(out / 'ic_launcher.png', 'PNG', optimize=True)
        with_mask(safe.resize((px, px), Image.LANCZOS), mask_circle(px)).save(out / 'ic_launcher_round.png', 'PNG', optimize=True)
    for d, c in fg.items():
        inner = round(c * 72 / 108)                       # ko'rinadigan markaziy 72dp
        canvas = Image.new('RGB', (c, c), bg)
        canvas.paste(safe.resize((inner, inner), Image.LANCZOS), ((c - inner) // 2, (c - inner) // 2))
        canvas.convert('RGBA').save(RES / f'mipmap-{d}' / 'ic_launcher_foreground.png', 'PNG', optimize=True)
    print('tayyor: iOS 1024 + Android', len(legacy) * 2 + len(fg), 'ta PNG')


if __name__ == '__main__':
    main()
