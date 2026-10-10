"""Teste ponta a ponta no Chromium real (Playwright). Uso: python3 tests/e2e/e2e.py [base_url]
Requer: playwright, opencv-python e Pillow (somente para esta verificação opcional)."""
import sys, os, tempfile, cv2
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
TMP = tempfile.mkdtemp()
results = []


def check(name, cond, extra=''):
    results.append((name, bool(cond)))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra and not cond else ''))


def decode_png(path):
    img = cv2.imread(path, 0)
    img = cv2.copyMakeBorder(img, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    return cv2.QRCodeDetector().detectAndDecode(img)[0]


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True,
                        permissions=['clipboard-read', 'clipboard-write'])
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'[após {len(results)} checks: {results[-1][0] if results else "-"}] console.{m.type}: {m.text[:60]} @ {m.location.get("url")}') if m.type in ('error', 'warning') and 'status of 404' not in m.text else None)
    page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 and not r.url.endswith('/pagina-inexistente') else None)

    # ---------- Home ----------
    page.goto(BASE + '/')
    page.wait_for_selector('#demo-canvas:not([hidden])')
    check('home: demo QR visível', page.locator('#demo-canvas').is_visible())
    check('home: 4 ferramentas listadas', page.locator('.tool-card').count() == 4)
    page.fill('#demo-input', 'https://exemplo.com.br/teste')
    page.wait_for_timeout(300)
    check('home: link do gerador carrega valor', 'v=https%3A%2F%2Fexemplo.com.br%2Fteste' in page.get_attribute('#demo-open', 'href'))
    page.screenshot(path='/tmp/shot-home-desktop.png', full_page=True, caret='initial', animations='allow')

    # ---------- QR Code ----------
    page.goto(BASE + '/qr-code/')
    check('qr: sem QR antes de preencher', page.locator('#qr-canvas').is_hidden() and page.locator('#qr-png').is_disabled())
    page.fill('#qr-url', 'exemplo.com.br/promo?a=1&b=ç')
    page.wait_for_selector('#qr-canvas:not([hidden])')
    check('qr: pré-visualização aparece', page.locator('#qr-canvas').is_visible())
    with page.expect_download() as d:
        page.click('#qr-png')
    f = os.path.join(TMP, 'qr.png'); d.value.save_as(f)
    check('qr: PNG decodifica para o link normalizado', decode_png(f) == 'https://exemplo.com.br/promo?a=1&b=ç', decode_png(f))
    im = Image.open(f)
    check('qr: PNG com exatamente 1024x1024', im.size == (1024, 1024) and im.format == 'PNG', str(im.size))
    page.click('#qr-copy'); page.wait_for_timeout(200)
    check('qr: copiar conteúdo', page.evaluate('navigator.clipboard.readText()') == 'https://exemplo.com.br/promo?a=1&b=ç')
    page.fill('#qr-url', 'palavra solta')
    page.wait_for_timeout(300)
    check('qr: erro compreensível para link inválido', 'espaços' in page.inner_text('#qr-error') and page.locator('#qr-png').is_disabled())
    page.check('input[name=kind][value=text]')
    page.fill('#qr-text', 'Olá, mundo! ✓')
    page.wait_for_selector('#qr-canvas:not([hidden])')
    with page.expect_download() as d:
        page.click('#qr-png')
    d.value.save_as(f)
    check('qr: texto UTF-8 decodifica', decode_png(f) == 'Olá, mundo! ✓', decode_png(f))
    page.check('input[name=kind][value=wifi]')
    page.fill('#qr-ssid', 'Casa;Wi:Fi'); page.fill('#qr-pass', 'curta')
    page.wait_for_timeout(300)
    check('qr: Wi-Fi valida senha curta', '8 caracteres' in page.inner_text('#qr-error'))
    page.fill('#qr-pass', 'senha-segura-1')
    page.wait_for_selector('#qr-canvas:not([hidden])')
    with page.expect_download() as d:
        page.click('#qr-png')
    d.value.save_as(f)
    check('qr: Wi-Fi decodifica com escapes', decode_png(f) == 'WIFI:T:WPA;S:Casa\\;Wi\\:Fi;P:senha-segura-1;;', decode_png(f))
    page.select_option('#qr-security', 'nopass')
    check('qr: sem senha oculta o campo', page.locator('#qr-pass-field').is_hidden())
    page.screenshot(path='/tmp/shot-qr-desktop.png', full_page=True, caret='initial', animations='allow')
    page.focus('input[name=kind][value=wifi]'); page.keyboard.press('ArrowLeft')
    check('qr: radios operáveis por teclado', page.locator('input[name=kind][value=text]').is_checked())
    page.goto(BASE + '/qr-code/?t=url&v=' + 'https%3A%2F%2Fwa.me%2F5548999999999')
    page.wait_for_selector('#qr-canvas:not([hidden])')
    check('qr: pré-preenchimento por URL', page.input_value('#qr-url') == 'https://wa.me/5548999999999')

    # ---------- WhatsLink ----------
    page.goto(BASE + '/whatslink/')
    check('wl: botões desabilitados inicialmente', page.locator('#wl-copy').is_disabled() and page.get_attribute('#wl-open', 'aria-disabled') == 'true')
    page.fill('#wl-phone', '+55 (48) 99999-9999'); page.fill('#wl-msg', 'Olá! Vim pelo site & quero saber mais.')
    expected = 'https://wa.me/5548999999999?text=Ol%C3%A1!%20Vim%20pelo%20site%20%26%20quero%20saber%20mais.'
    got = page.input_value('#wl-out')
    check('wl: link wa.me correto', got == expected, got)
    check('wl: abrir usa target _blank + noopener', page.get_attribute('#wl-open', 'href') == got and page.get_attribute('#wl-open', 'target') == '_blank' and 'noopener' in page.get_attribute('#wl-open', 'rel'))
    page.click('#wl-copy'); page.wait_for_timeout(150)
    check('wl: botão mostra Copiado! e volta ao normal', page.inner_text('#wl-copy') == 'Copiado!')
    check('wl: copiar link', page.evaluate('navigator.clipboard.readText()') == got)
    page.fill('#wl-phone', '0123')
    page.wait_for_timeout(100)
    check('wl: erro de número', 'zero' in page.inner_text('#wl-error') or 'curto' in page.inner_text('#wl-error'), page.inner_text('#wl-error'))
    page.fill('#wl-phone', '48999999999')
    check('wl: aviso de código do país', '55' in page.inner_text('#wl-warn'))
    page.fill('#wl-phone', '+48 512 345 678')
    check('wl: sem aviso quando o + foi digitado (regressão)', page.inner_text('#wl-warn') == '' and page.locator('#wl-fix').is_hidden())
    page.fill('#wl-phone', '(48) 99999-9999')
    check('wl: oferece adicionar +55', page.locator('#wl-fix').is_visible())
    page.click('#wl-fix')
    check('wl: botão aplica o 55', page.input_value('#wl-phone') == '+5548999999999' and page.input_value('#wl-out').startswith('https://wa.me/5548999999999') and page.locator('#wl-fix').is_hidden())
    page.fill('#wl-phone', '+5548999999999'); page.fill('#wl-msg', '')
    check('wl: sem mensagem não tem ?text', page.input_value('#wl-out') == 'https://wa.me/5548999999999')
    page.screenshot(path='/tmp/shot-whatslink-desktop.png', full_page=True, caret='initial', animations='allow')
    page.click('#wl-qr'); page.wait_for_selector('#qr-canvas:not([hidden])')
    check('wl: ponte para o QR Code', page.url.startswith(BASE + '/qr-code/') and page.input_value('#qr-url') == 'https://wa.me/5548999999999')

    # ---------- Sorteador ----------
    page.goto(BASE + '/sorteador/')
    page.fill('#rf-names', 'Ana\n\n  Bruno \nCarla\nana\nDiego\nElisa\n')
    check('rf: contador ignora vazias e repetidas', page.inner_text('#rf-count').startswith('5 participantes') and '1 repetido' in page.inner_text('#rf-count'), page.inner_text('#rf-count'))
    page.fill('#rf-winners', '9'); page.click('#rf-draw')
    check('rf: erro quando vencedores > participantes', 'apenas 5' in page.inner_text('#rf-error'))
    page.fill('#rf-winners', '3'); page.click('#rf-draw')
    w = page.locator('#rf-list li').all_inner_texts()
    check('rf: 3 vencedores únicos da lista', len(w) == 3 and len(set(w)) == 3 and set(w) <= {'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa'}, str(w))
    check('rf: status falado inclui os nomes', all(n in page.inner_text('#rf-status') for n in w), page.inner_text('#rf-status'))
    page.fill('#rf-names', 'Ana\nBruno\nCarla\nDiego\nElisa\nFabio')
    check('rf: avisa que a lista mudou depois do sorteio', 'mudou' in page.inner_text('#rf-status'))
    page.click('#rf-again')
    seen = set()
    for _ in range(25):
        page.click('#rf-again'); seen.add(tuple(page.locator('#rf-list li').all_inner_texts()))
    check('rf: novo sorteio varia o resultado', len(seen) > 5, str(len(seen)))
    page.click('#rf-copy'); page.wait_for_timeout(150)
    clip = page.evaluate('navigator.clipboard.readText()')
    check('rf: copiar resultados numerados', clip.startswith('1. ') and clip.count('\n') == 2, clip)
    page.fill('#rf-names', 'A\nB\nC\nD'); page.fill('#rf-winners', '1')
    counts = {}
    for _ in range(400):
        page.click('#rf-draw'); k = page.inner_text('#rf-list li'); counts[k] = counts.get(k, 0) + 1
    check('rf: distribuição razoável (400 sorteios, 4 nomes)', len(counts) == 4 and min(counts.values()) > 60, str(counts))
    page.click('#rf-clear')
    check('rf: limpar lista', page.input_value('#rf-names') == '' and page.locator('#rf-result').is_hidden())
    page.fill('#rf-names', 'Ana\nBia\nCaio\nDora'); page.fill('#rf-winners', '2'); page.click('#rf-draw')
    page.screenshot(path='/tmp/shot-raffle-desktop.png', full_page=True, caret='initial', animations='allow')

    # ---------- Conversor de imagens ----------
    page.goto(BASE + '/conversor-de-imagens/')
    rgba = Image.new('RGBA', (320, 200), (0, 0, 0, 0))
    for x in range(320):
        for y in range(100):
            rgba.putpixel((x, y), (200, 40, 40, 255))
    src_png = os.path.join(TMP, 'logo teste.png'); rgba.save(src_png)
    page.set_input_files('#im-file', src_png)
    page.wait_for_selector('#im-source:not([hidden])')
    check('im: pré-visualização e dados do arquivo', '320×200' in page.inner_text('#im-src-info'))
    check('im: sugere formato diferente (webp)', page.locator('input[name=fmt][value=webp]').is_checked())
    page.check('input[name=fmt][value=jpeg]')
    check('im: aviso de transparência no JPEG', 'fundo branco' in page.inner_text('#im-note'))
    page.click('#im-convert'); page.wait_for_selector('#im-result:not([hidden])')
    with page.expect_download() as d:
        page.click('#im-download')
    out = d.value; fj = os.path.join(TMP, 'out.jpg'); out.save_as(fj)
    ij = Image.open(fj)
    check('im: JPEG válido com nome certo', ij.format == 'JPEG' and out.suggested_filename == 'logo teste.jpg', f'{ij.format} {out.suggested_filename}')
    check('im: transparência virou branco', ij.convert('RGB').getpixel((10, 180))[0] > 240)
    page.check('input[name=fmt][value=webp]'); page.click('#im-convert'); page.wait_for_selector('#im-result:not([hidden])')
    page.fill('#im-quality', '50'); page.dispatch_event('#im-quality', 'input')
    check('im: mudar a qualidade descarta o resultado antigo (regressão)', page.locator('#im-result').is_hidden() and 'Converter' in page.inner_text('#im-status'))
    page.click('#im-convert'); page.wait_for_selector('#im-result:not([hidden])')
    with page.expect_download() as d:
        page.click('#im-download')
    fw = os.path.join(TMP, 'out.webp'); d.value.save_as(fw)
    iw = Image.open(fw)
    check('im: WebP válido', iw.format == 'WEBP' and iw.size == (320, 200), f'{iw.format} {iw.size}')
    page.check('input[name=fmt][value=png]'); page.click('#im-convert'); page.wait_for_selector('#im-result:not([hidden])')
    with page.expect_download() as d:
        page.click('#im-download')
    fp = os.path.join(TMP, 'out.png'); d.value.save_as(fp)
    ip = Image.open(fp)
    check('im: PNG preserva transparência', ip.format == 'PNG' and ip.mode == 'RGBA' and ip.getpixel((10, 180))[3] == 0, f'{ip.mode}')
    page.screenshot(path='/tmp/shot-image-desktop.png', full_page=True, caret='initial', animations='allow')
    bad = os.path.join(TMP, 'falso.png'); open(bad, 'w').write('isto não é uma imagem')
    page.set_input_files('#im-file', bad); page.wait_for_timeout(300)
    check('im: rejeita arquivo falso mesmo com .png', 'não suportado' in page.inner_text('#im-error') and page.locator('#im-source').is_hidden())
    big = os.path.join(TMP, 'grande.png'); open(big, 'wb').write(b'\x89PNG\r\n\x1a\n' + b'0' * (21 * 1024 * 1024))
    page.set_input_files('#im-file', big); page.wait_for_timeout(300)
    check('im: rejeita arquivo acima de 20 MB', 'limite' in page.inner_text('#im-error'), page.inner_text('#im-error'))
    corrupt = os.path.join(TMP, 'corrompida.png'); open(corrupt, 'wb').write(b'\x89PNG\r\n\x1a\n' + b'lixo' * 50)
    page.set_input_files('#im-file', corrupt); page.wait_for_timeout(500)
    check('im: trata imagem corrompida', 'corrompido' in page.inner_text('#im-error'), page.inner_text('#im-error'))
    page.set_input_files('#im-file', src_png); page.wait_for_selector('#im-source:not([hidden])')
    other = os.path.join(TMP, 'outra.png'); Image.new('RGB', (10, 10), (0, 0, 255)).save(other)
    import base64
    def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
    page.evaluate("""([a, b]) => { const f = (d, n) => { const bin = atob(d); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], n, { type: 'image/png' }); };
      const dt = new DataTransfer(); dt.items.add(f(a, 'a.png')); dt.items.add(f(b, 'b.png'));
      document.getElementById('im-drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }""", [b64(src_png), b64(other)])
    page.wait_for_selector('#im-source:not([hidden])')
    check('im: avisa quando mais de um arquivo é escolhido', 'primeira das 2' in page.inner_text('#im-status'))
    page.click('#im-reset')
    check('im: remover imagem limpa estado', page.locator('#im-source').is_hidden() and page.locator('#im-result').is_hidden())

    # ---------- Páginas auxiliares ----------
    r = page.goto(BASE + '/pagina-inexistente')
    check('404: status e conteúdo', r.status == 404 and 'não encontrada' in page.inner_text('h1'))
    r = ctx.request.get(BASE + '/qr-code', max_redirects=0)
    check('roteamento: /qr-code redireciona para /qr-code/ (308)', r.status == 308 and r.headers['location'] == '/qr-code/', f'{r.status}')
    r = page.goto(BASE + '/privacidade/'); check('privacidade: abre', r.status == 200)
    page.goto(BASE + '/')
    check('seo: og:image absoluto e canonical', page.get_attribute('meta[property="og:image"]', 'content').endswith('/assets/og-image.png') and page.get_attribute('link[rel=canonical]', 'href') == 'https://tools.igorcabral.dev.br/')
    r = ctx.request.get(BASE + '/assets/og-image.png'); check('seo: og-image.png serve 200', r.status == 200 and r.body()[:4] == b'\x89PNG')
    r = ctx.request.get(BASE + '/robots.txt'); check('robots.txt', r.status == 200 and 'Allow: /' in r.text())

    check('sem erros/avisos de console nem violações de CSP', not errors, '; '.join(errors)[:600])

    # ---------- Responsividade ----------
    paths = ['/', '/qr-code/', '/whatslink/', '/sorteador/', '/conversor-de-imagens/', '/privacidade/']
    for w in (360, 768):
        c2 = b.new_context(viewport={'width': w, 'height': 800}); pg = c2.new_page()
        for pth in paths:
            pg.goto(BASE + pth)
            sw = pg.evaluate('document.documentElement.scrollWidth')
            check(f'responsivo {w}px sem rolagem horizontal: {pth}', sw <= w, f'scrollWidth={sw}')
        c2.close()
    mob = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2); pg = mob.new_page()
    for name, pth in [('home', '/'), ('qr', '/qr-code/'), ('image', '/conversor-de-imagens/')]:
        pg.goto(BASE + pth); pg.wait_for_timeout(200); pg.screenshot(path=f'/tmp/shot-{name}-mobile.png', full_page=True, caret='initial', animations='allow')
    b.close()

fails = [n for n, ok in results if not ok]
print(f'\n{len(results) - len(fails)}/{len(results)} verificações passaram')
sys.exit(1 if fails else 0)
