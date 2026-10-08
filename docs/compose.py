#!/usr/bin/env python3
"""Builds the README images with Pillow from the raw demo-data captures (docs/raw/*.png -> docs/images/*.png).
Maintainers only. Run docs/make-screenshots.mjs first. Uses macOS system fonts, falls back to Pillow's default."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, 'images')
os.makedirs(OUT, exist_ok=True)
BG = (8, 8, 8)
TEAL, PURPLE, BLUE = (78, 201, 176), (180, 120, 255), (99, 149, 255)


def font(paths, size, variation=None):
    for p in paths:
        try:
            f = ImageFont.truetype(p, size)
            if variation:
                try: f.set_variation_by_name(variation)
                except Exception: pass
            return f
        except Exception:
            continue
    return ImageFont.load_default(size)


SANS = ['/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc']
SERIF_I = ['/System/Library/Fonts/NewYorkItalic.ttf', '/System/Library/Fonts/Supplemental/Georgia Italic.ttf']
MONO = ['/System/Library/Fonts/Menlo.ttc', '/System/Library/Fonts/SFNSMono.ttf']


def rounded_mask(size, radius, scale=4):
    big = Image.new('L', (size[0] * scale, size[1] * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle([0, 0, big.width - 1, big.height - 1], radius * scale, fill=255)
    return big.resize(size, Image.LANCZOS)


def framed(img, width, radius=16, pad=40, shadow=True):
    """Resize to `width`, round the corners, add a hairline border and a soft shadow (transparent background)."""
    h = round(img.height * width / img.width)
    img = img.convert('RGB').resize((width, h), Image.LANCZOS)
    mask = rounded_mask(img.size, radius)
    canvas = Image.new('RGBA', (width + pad * 2, h + pad * 2), (0, 0, 0, 0))
    if shadow:
        sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 170), (pad, pad + 14), mask)
        canvas = Image.alpha_composite(canvas, sh.filter(ImageFilter.GaussianBlur(18)))
    tile = img.convert('RGBA'); tile.putalpha(mask)
    canvas.alpha_composite(tile, (pad, pad))
    border = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    big = Image.new('RGBA', (img.width * 4, img.height * 4), (0, 0, 0, 0))
    ImageDraw.Draw(big).rounded_rectangle([0, 0, big.width - 1, big.height - 1], radius * 4, outline=(255, 255, 255, 38), width=4)
    border.alpha_composite(big.resize(img.size, Image.LANCZOS), (pad, pad))
    return Image.alpha_composite(canvas, border)


def glow(canvas, center, radius, color, alpha):
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    x, y = center
    ImageDraw.Draw(layer).ellipse([x - radius, y - radius, x + radius, y + radius], fill=color + (alpha,))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius * 0.55)))


def hero():
    W, H = 1600, 1040
    c = Image.new('RGBA', (W, H), BG + (255,))
    glow(c, (330, 140), 260, TEAL, 70); glow(c, (1280, 120), 240, PURPLE, 62); glow(c, (800, 980), 420, BLUE, 38)
    d = ImageDraw.Draw(c)
    title_f, scan_f = font(SANS, 84, 'Light'), font(SERIF_I, 92)
    tw = d.textlength('Toolkit ', font=title_f); sw = d.textlength('Scan', font=scan_f)
    x0 = (W - tw - sw) / 2
    d.text((x0, 62), 'Toolkit ', font=title_f, fill=(255, 255, 255))
    d.text((x0 + tw, 56), 'Scan', font=scan_f, fill=TEAL)
    tag = 'See which tools, skills and MCP servers you actually use.'
    tf = font(SANS, 30)
    d.text(((W - d.textlength(tag, font=tf)) / 2, 178), tag, font=tf, fill=(205, 205, 205))
    sub = 'FROM YOUR OWN AI-AGENT TRANSCRIPTS   ·   NO LLM CALLS   ·   NOTHING LEAVES YOUR MACHINE'
    mf = font(MONO, 14)
    d.text(((W - d.textlength(sub, font=mf)) / 2, 232), sub, font=mf, fill=(130, 130, 130))
    shot = framed(Image.open(os.path.join(RAW, 'overview-clean.png')).crop((0, 0, 2880, 2000)), 1380, radius=20, pad=36)
    c.alpha_composite(shot, ((W - shot.width) // 2, 300))
    c.convert('RGB').save(os.path.join(OUT, 'hero.png'), optimize=True)


def save(name, raw, width=1400, crop=None):
    img = Image.open(os.path.join(RAW, raw))
    if crop:
        img = img.crop(crop)
    framed(img, width).save(os.path.join(OUT, name), optimize=True)


if __name__ == '__main__':
    hero()
    save('overview.png', 'overview-top.png', crop=(0, 0, 2880, 1980))
    save('activity.png', 'overview-activity.png')
    save('tools-heat.png', 'tools-heat.png')
    save('pruning.png', 'pruning.png', width=980)
    save('compare-start.png', 'compare-start.png', width=1100)
    save('compare-top.png', 'compare-top.png')
    save('compare-common.png', 'compare-common.png')
    save('skills.png', 'skills-top.png')
    for f in sorted(os.listdir(OUT)):
        print(f, round(os.path.getsize(os.path.join(OUT, f)) / 1024), 'KB')
