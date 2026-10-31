#!/usr/bin/env python3
"""
LokmaGo — MAVSUMIY ilova ikonkalarini yaratadi (iOS + Android). Manba: resources/app-icons/<mavzu>.jpg (oq fonli logotip).

  python3 scripts/make-seasonal-icons.py          (Pillow va numpy kerak)

Mavzular (src/lib/appIconSchedule.js bilan BIR XIL ro'yxat — tests/appIconNative.test.mjs tekshiradi):
  default   asosiy logotip (ikonkaning o'zi: iOS AppIcon, Android ic_launcher*)
  spring · summer · autumn · ramadan · newyear

Yaratadi:
  iOS      ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png              (default, 1024x1024, shaffofliksiz)
           ios/App/App/Assets.xcassets/AppIcon-<Mavzu>.appiconset/{Contents.json, icon-1024.png}   (qolgan mavzular)
  Android  res/mipmap-*/ic_launcher[_round|_foreground].png                               (default)
           res/mipmap-*/ic_launcher_<mavzu>[_round|_foreground].png + mipmap-anydpi-v26/ic_launcher_<mavzu>[_round].xml

Moslashuvchan ikonka (Android 8+): 108dp kanvasning faqat markaziy 72dp qismi ko'rinadi; doira maskasida burchaklar kesilmasligi uchun
mazmun burchak-diagonali bo'yicha cheklanadi (hypot/2 ≤ 0.46 × ko'rinadigan kvadrat).
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'resources' / 'app-icons'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
XCA = ROOT / 'ios' / 'App' / 'App' / 'Assets.xcassets'

THEMES = ['default', 'spring', 'summer', 'autumn', 'ramadan', 'newyear']
IOS_NAME = {'spring': 'Spring', 'summer': 'Summer', 'autumn': 'Autumn', 'ramadan': 'Ramadan', 'newyear': 'NewYear'}
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
RECT_FIT = 0.86    # kvadrat/yumaloq-kvadrat: mazmunning eng katta tomoni kanvasning shu ulushi
SAFE_FIT = 0.46    # doira/moslashuvchan: mazmun yarim-diagonali ko'rinadigan kvadratning shu ulushidan oshmasin


def load(theme: str):
    """(rasm RGB, fon rangi, mazmun chegarasi x0,y0,x1,y1). Mazmun — oq fondan farq qiladigan piksellar (yumshoq soya ham qo'shiladi)."""
    img = Image.open(SRC / f'{theme}.jpg').convert('RGB')
    a = np.asarray(img)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = tuple(int(v) for v in np.median(border, axis=0))
    ys, xs = np.where(a.min(axis=2) < 232)
    return img, bg, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def render(img, bg, bbox, size: int, fit: str) -> Image.Image:
    """Mazmunni size×size kvadratga markazlab joylaydi (fon — manba fon rangi)."""
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    scale = (RECT_FIT * size / max(w, h)) if fit == 'rect' else (SAFE_FIT * size / (np.hypot(w, h) / 2))
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    piece = img.crop(bbox).resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGB', (size, size), bg)
    canvas.paste(piece, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def mask(size: int, kind: str) -> Image.Image:
    big = size * 4
    m = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(m)
    if kind == 'circle':
        d.ellipse([0, 0, big - 1, big - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.12), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def masked(img: Image.Image, kind: str) -> Image.Image:
    out = img.convert('RGBA')
    out.putalpha(mask(img.width, kind))
    return out


def adaptive_xml(fg: str) -> str:
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background"/>\n'
            f'    <foreground android:drawable="@mipmap/{fg}"/>\n'
            '</adaptive-icon>\n')


def main():
    n = 0
    for theme in THEMES:
        img, bg, bbox = load(theme)
        # ── iOS 1024 ──
        ios = render(img, bg, bbox, 1024, 'rect')
        if theme == 'default':
            ios.save(XCA / 'AppIcon.appiconset' / 'AppIcon-512@2x.png', 'PNG', optimize=True)
        else:
            d = XCA / f'AppIcon-{IOS_NAME[theme]}.appiconset'
            d.mkdir(parents=True, exist_ok=True)
            ios.save(d / 'icon-1024.png', 'PNG', optimize=True)
            (d / 'Contents.json').write_text(json.dumps({
                'images': [{'filename': 'icon-1024.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}],
                'info': {'author': 'xcode', 'version': 1},
            }, indent=2) + '\n')
        n += 1
        # ── Android ──
        base = 'ic_launcher' if theme == 'default' else f'ic_launcher_{theme}'
        for dens, px in LEGACY.items():
            out = RES / f'mipmap-{dens}'
            masked(render(img, bg, bbox, px, 'rect'), 'rounded').save(out / f'{base}.png', 'PNG', optimize=True)
            masked(render(img, bg, bbox, px, 'safe'), 'circle').save(out / f'{base}_round.png', 'PNG', optimize=True)
        for dens, c in FOREGROUND.items():
            inner = round(c * 72 / 108)                         # ko'rinadigan markaziy 72dp
            canvas = Image.new('RGB', (c, c), bg)
            canvas.paste(render(img, bg, bbox, inner, 'safe'), ((c - inner) // 2, (c - inner) // 2))
            canvas.convert('RGBA').save(RES / f'mipmap-{dens}' / f'{base}_foreground.png', 'PNG', optimize=True)
        if theme != 'default':
            (RES / 'mipmap-anydpi-v26' / f'{base}.xml').write_text(adaptive_xml(f'{base}_foreground'))
            (RES / 'mipmap-anydpi-v26' / f'{base}_round.xml').write_text(adaptive_xml(f'{base}_foreground'))
        n += 1
        print(f'  ✓ {theme:8s} fon={bg} mazmun={bbox}')
    print(f'tayyor: {len(THEMES)} mavzu')


if __name__ == '__main__':
    main()
