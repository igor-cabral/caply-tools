"""Gera src/assets/og-image.png (1200x630) no estilo do Caply Tools: preto, azul da marca e Archivo.
Uso opcional: python3 scripts/make-og-image.py
Requer: Pillow, fonttools e brotli (somente para decodificar o .woff2 da fonte já incluída no projeto)."""
import io, os
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
ASSETS = os.path.join(ROOT, 'src', 'assets')
W, H = 1200, 630
INK, BLUE, BRIGHT, PAPER = '#0a0a0a', '#1447b1', '#7ea2ff', '#f8f8f6'

# Archivo variável (eixo de peso) a partir do woff2 do projeto
tt = TTFont(os.path.join(ASSETS, 'fonts', 'archivo-latin-wght.woff2'))
buf = io.BytesIO(); tt.flavor = None; tt.save(buf); data = buf.getvalue()

def font(size, weight=800):
    f = ImageFont.truetype(io.BytesIO(data), size)
    f.set_variation_by_axes([weight])
    return f

img = Image.new('RGB', (W, H), INK)
d = ImageDraw.Draw(img)

# Painel azul à direita com a "placa" branca de um QR (desenhado por módulos, só ilustrativo)
d.rectangle((760, 0, W, H), fill=BLUE)
d.rectangle((820, 120, 1140, 440), fill='#ffffff')
import random
random.seed(7)
n, cell, ox, oy = 21, 12, 846, 146
def finder(x, y):
    d.rectangle((ox + x * cell, oy + y * cell, ox + (x + 7) * cell - 1, oy + (y + 7) * cell - 1), fill='#000')
    d.rectangle((ox + (x + 1) * cell, oy + (y + 1) * cell, ox + (x + 6) * cell - 1, oy + (y + 6) * cell - 1), fill='#fff')
    d.rectangle((ox + (x + 2) * cell, oy + (y + 2) * cell, ox + (x + 5) * cell - 1, oy + (y + 5) * cell - 1), fill='#000')
for y in range(n):
    for x in range(n):
        if (x < 8 and y < 8) or (x > n - 9 and y < 8) or (x < 8 and y > n - 9): continue
        if random.random() < 0.5: d.rectangle((ox + x * cell, oy + y * cell, ox + (x + 1) * cell - 1, oy + (y + 1) * cell - 1), fill='#000')
finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
d.text((820, 486), 'Sem cadastro.', font=font(34), fill='#ffffff')
d.text((820, 530), '100% no navegador.', font=font(34), fill='#d4def7')

# Marca e título
d.text((70, 70), 'caply tools', font=font(46), fill='#ffffff')
w = d.textlength('caply tools', font=font(46)); d.text((70 + w, 70), '.', font=font(46), fill=BRIGHT)
for i, line in enumerate(['Ferramentas', 'grátis que', 'resolvem', 'o básico']):
    d.text((70, 150 + i * 92), line, font=font(104), fill='#ffffff')
w = d.textlength('o básico', font=font(104)); d.text((70 + w, 150 + 3 * 92), '.', font=font(104), fill=BRIGHT)
d.text((70, 560), 'por igor cabral.', font=font(30, 600), fill='#aab0bd')

img.save(os.path.join(ASSETS, 'og-image.png'), optimize=True)
print('og-image.png gerada')
