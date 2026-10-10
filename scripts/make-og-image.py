"""Gera src/assets/og-image.png (1200x630). Uso opcional: python3 scripts/make-og-image.py (requer Pillow)."""
from PIL import Image, ImageDraw, ImageFont
import os
W, H = 1200, 630
img = Image.new('RGB', (W, H), '#1e40af')
px = img.load()
for y in range(H):
    for x in range(W):
        t = (x / W * 0.6 + y / H * 0.4)
        r = int(30 + (79 - 30) * t); g = int(64 + (70 - 64) * t); b = int(175 + (229 - 175) * t)
        px[x, y] = (r, g, b)
d = ImageDraw.Draw(img)
def font(sz, bold=True):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
# marca
d.rounded_rectangle((90, 90, 190, 190), 28, fill='#ffffff')
d.rectangle((115, 115, 143, 143), outline='#1e40af', width=8); d.rectangle((137, 137, 165, 165), outline='#1e40af', width=8)
d.rounded_rectangle((148, 120, 160, 132), 3, fill='#06b6d4'); d.rounded_rectangle((120, 148, 132, 160), 3, fill='#1e40af')
d.text((215, 108), 'caply', font=font(72), fill='#ffffff'); d.text((215 + 215, 108 + 18), 'tools', font=font(52, False), fill='#cfe0ff')
d.text((90, 290), 'Ferramentas gratuitas,', font=font(64), fill='#ffffff')
d.text((90, 370), 'direto no navegador.', font=font(64), fill='#ffffff')
d.text((90, 490), 'QR Code · WhatsLink · Sorteador · Conversor de imagens', font=font(30, False), fill='#dbe7ff')
d.rounded_rectangle((90, 540, 520, 590), 25, fill=(255, 255, 255))
d.ellipse((110, 558, 126, 574), fill='#10b981'); d.text((140, 551), 'Sem cadastro. 100% no navegador.', font=font(22), fill='#0f172a')
img.save(os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'og-image.png'), optimize=True)
