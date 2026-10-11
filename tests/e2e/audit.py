"""Auditoria de acessibilidade no navegador real: contraste (claro/escuro), foco visível por teclado e alvos de toque.
Uso: python3 tests/e2e/audit.py [base_url]"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
PATHS = ['/', '/qr-code/', '/whatslink/', '/sorteador/', '/conversor-de-imagens/', '/privacidade/', '/nao-existe']

CONTRAST_JS = r"""
() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; const root = parse(getComputedStyle(document.body).backgroundColor); if (root && root.a > 0) base = root; for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base); return base; };
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]') || el.closest('.sr-only')) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el); const text = blend(fg, bg);
    const l1 = lum(text), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    const dis = el.closest('[disabled],[aria-disabled="true"]');
    if (!dis && ratio < need) bad.push(`${el.tagName.toLowerCase()}.${el.className} "${n.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}<${need}`);
  }
  return bad;
}
"""

results = []
def check(name, cond, extra=''):
    results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra and not cond else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, color_scheme=scheme); pg = ctx.new_page()
        for path in PATHS:
            pg.goto(BASE + path)
            if path == '/qr-code/': pg.fill('#qr-url', 'x'); pg.fill('#qr-url', 'palavra solta'); pg.wait_for_timeout(300)
            if path == '/sorteador/': pg.fill('#rf-names', 'A\nB'); pg.fill('#rf-winners', '1'); pg.click('#rf-draw')
            bad = pg.evaluate(CONTRAST_JS)
            check(f'contraste AA ({scheme}) {path}', not bad, '; '.join(bad[:5]))
        ctx.close()
    # foco visível por teclado
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page()
    for path in PATHS[:-1]:
        pg.goto(BASE + path); missing = []; n = 0
        for _ in range(45):
            pg.keyboard.press('Tab')
            info = pg.evaluate("""() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const vis = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
              let own = vis; if (!own && e.matches('input[type=radio],input[type=file],input[type=checkbox]')) { const sib = e.nextElementSibling || e.closest('label,.dropzone'); if (sib) { const c2 = getComputedStyle(sib); own = (c2.outlineStyle !== 'none') || c2.boxShadow !== 'none'; const dz = e.closest('.dropzone'); if (dz) { const c3 = getComputedStyle(dz); own = own || c3.boxShadow !== 'none'; } } }
              const card = e.closest('.tool-row'); if (!own && card) { const cc = getComputedStyle(card); own = cc.outlineStyle !== 'none' && parseFloat(cc.outlineWidth) > 0; }
              const r = e.getBoundingClientRect(); return { tag: e.tagName + (e.id ? '#' + e.id : ''), vis: own, w: r.width, h: r.height }; }""")
            if info is None: break
            n += 1
            if not info['vis']: missing.append(info['tag'])
        check(f'foco visível em todos os {n} elementos tabuláveis {path}', n > 3 and not missing, ','.join(missing))
    # alvos de toque no mobile (≥ 24px WCAG 2.2; botões/campos ≥ 40px)
    ctx = b.new_context(viewport={'width': 360, 'height': 800}); pg = ctx.new_page()
    for path in ['/', '/qr-code/', '/whatslink/', '/sorteador/', '/conversor-de-imagens/']:
        pg.goto(BASE + path)
        small = pg.evaluate("""() => [...document.querySelectorAll('a.btn, button, input[type=text], input[type=tel], input[type=number], select, summary, .nav a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height))""")
        check(f'alvos de toque ≥ 40px no mobile {path}', not small, ','.join(small[:6]))
    b.close()
print(f'\n{sum(results)}/{len(results)} verificações passaram'); sys.exit(0 if all(results) else 1)
