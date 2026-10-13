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
    check('home: 5 ferramentas listadas', page.locator('.tool-row').count() == 5)
    page.fill('#demo-input', 'https://exemplo.com.br/teste')
    page.wait_for_timeout(300)
    check('home: link do gerador carrega valor', 'v=https%3A%2F%2Fexemplo.com.br%2Fteste' in page.get_attribute('#demo-open', 'href'))
    with page.expect_download() as dd:
        page.click('#demo-download')
    fh = os.path.join(TMP, 'home-qr.png'); dd.value.save_as(fh)
    check('home: atalho baixa PNG 1024x1024 que decodifica', Image.open(fh).size == (1024, 1024) and decode_png(fh) == 'https://exemplo.com.br/teste', str(Image.open(fh).size))
    page.fill('#demo-input', '')
    page.wait_for_timeout(250)
    check('home: campo vazio esconde o QR e desativa o download', page.locator('#demo-canvas').is_hidden() and page.locator('#demo-download').is_disabled())
    page.fill('#demo-input', 'https://exemplo.com.br/teste')
    page.wait_for_timeout(250)
    page.screenshot(path=os.path.join(TMP, 'shot-home-desktop.png'), full_page=True, caret='initial', animations='allow')

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
    page.screenshot(path=os.path.join(TMP, 'shot-qr-desktop.png'), full_page=True, caret='initial', animations='allow')
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
    page.screenshot(path=os.path.join(TMP, 'shot-whatslink-desktop.png'), full_page=True, caret='initial', animations='allow')
    page.click('#wl-qr'); page.wait_for_selector('#qr-canvas:not([hidden])')
    check('wl: ponte para o QR Code', page.url.startswith(BASE + '/qr-code/') and page.input_value('#qr-url') == 'https://wa.me/5548999999999')

    # ---------- Sorteador ----------
    page.goto(BASE + '/sorteador/')
    page.fill('#rf-names', 'Ana\n\n  Bruno \nCarla\nana\nDiego\nElisa\n')
    page.wait_for_timeout(300)
    check('rf: contador ignora vazias e repetidas', page.inner_text('#rf-count').startswith('5 participantes') and '1 repetido' in page.inner_text('#rf-count'), page.inner_text('#rf-count'))
    page.fill('#rf-winners', '9'); page.click('#rf-draw')
    check('rf: erro quando vencedores > participantes', 'apenas 5' in page.inner_text('#rf-error'))
    page.fill('#rf-winners', '3'); page.click('#rf-draw')
    w = page.locator('#rf-list li').all_inner_texts()
    check('rf: 3 vencedores únicos da lista', len(w) == 3 and len(set(w)) == 3 and set(w) <= {'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa'}, str(w))
    check('rf: status falado inclui os nomes', all(n in page.inner_text('#rf-status') for n in w), page.inner_text('#rf-status'))
    page.fill('#rf-names', 'Ana\nBruno\nCarla\nDiego\nElisa\nFabio')
    check('rf: avisa que os dados mudaram depois do sorteio', 'mudaram' in page.inner_text('#rf-status'))
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
    page.screenshot(path=os.path.join(TMP, 'shot-raffle-desktop.png'), full_page=True, caret='initial', animations='allow')

    # ---------- Sorteador: novas modalidades ----------
    def pick(mode):
        page.check(f'input[name=mode][value={mode}]')
    page.goto(BASE + '/sorteador/')
    page.fill('#rf-names', 'Ana\nBruno\nCarla')
    pick('numeros')
    check('rf: trocar de modalidade atualiza a URL e o título', page.url.endswith('/sorteador/numeros/') and 'números' in page.title())
    check('rf: modalidade de números esconde a lista e mostra o intervalo', page.locator('#rf-names').is_hidden() and page.locator('#rf-min').is_visible())
    pick('nomes')
    check('rf: a lista digitada é preservada ao trocar de modalidade', page.input_value('#rf-names') == 'Ana\nBruno\nCarla')
    page.goto(BASE + '/sorteador/numeros/')
    check('rf: página de números abre já na modalidade certa', page.locator('input[name=mode][value=numeros]').is_checked() and 'Sorteador de números' in page.inner_text('h1'))
    page.fill('#rf-min', '1'); page.fill('#rf-max', '10'); page.fill('#rf-ncount', '10'); page.click('#rf-draw')
    nums = [int(x) for x in page.locator('#rf-list li').all_inner_texts()]
    check('rf-num: 10 números únicos de 1 a 10', sorted(nums) == list(range(1, 11)), str(nums))
    page.fill('#rf-ncount', '11'); page.click('#rf-draw')
    check('rf-num: erro claro quando pede mais que o intervalo', 'apenas 10' in page.inner_text('#rf-error'))
    page.check('#rf-nrepeat'); page.check('#rf-nsort'); page.click('#rf-draw')
    nums = [int(x) for x in page.locator('#rf-list li').all_inner_texts()]
    check('rf-num: com repetição e ordem crescente', len(nums) == 11 and nums == sorted(nums), str(nums))
    page.fill('#rf-min', '5'); page.fill('#rf-max', '1'); page.click('#rf-draw')
    check('rf-num: min > max é recusado', 'menor número' in page.inner_text('#rf-error'))
    page.fill('#rf-min', ''); page.click('#rf-draw')
    check('rf-num: campo vazio é recusado', page.inner_text('#rf-error') != '')
    page.fill('#rf-min', '-3'); page.fill('#rf-max', '3'); page.fill('#rf-ncount', '7'); page.uncheck('#rf-nrepeat'); page.click('#rf-draw')
    check('rf-num: intervalo com negativos', sorted(int(x) for x in page.locator('#rf-list li').all_inner_texts()) == list(range(-3, 4)))

    page.goto(BASE + '/sorteador/equipes/')
    people = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gabi', 'Hugo', 'Iara', 'Joao']
    page.fill('#rf-names', '\n'.join(people)); page.check('input[name=tmode][value=perTeam]'); page.fill('#rf-tvalue', '4')
    check('rf-eq: rótulo muda conforme o modo', 'pessoas por' in page.inner_text('#rf-tvalue-label'))
    page.click('#rf-draw')
    sizes = sorted(int(t.split()[0]) for t in page.locator('.team .count').all_inner_texts())
    check('rf-eq: 10 pessoas, 4 por equipe -> 3 equipes de tamanhos 4/3/3', sizes == [3, 3, 4], str(sizes))
    allp = sorted(page.locator('.team li').all_inner_texts()); check('rf-eq: todos aparecem exatamente uma vez', allp == sorted(people))
    page.check('input[name=tmode][value=teams]'); page.fill('#rf-tvalue', '3')
    check('rf-eq: regras ficam recolhidas até o usuário abrir', page.locator('#rf-sep').is_hidden())
    page.click('summary:has-text("não podem ficar juntas")'); page.fill('#rf-sep', 'Ana, Bruno\nCarla, Diego, Elisa')
    ok = True
    for _ in range(30):
        page.click('#rf-again')
        teams = [t.all_inner_texts() for t in page.locator('.team ul').all()]
        for t in teams:
            if ('Ana' in t and 'Bruno' in t) or sum(x in t for x in ('Carla', 'Diego', 'Elisa')) > 1: ok = False
    check('rf-eq: regras de separação sempre cumpridas (30 sorteios)', ok)
    page.fill('#rf-sep', 'Ana, Bruno, Carla, Diego'); page.fill('#rf-tvalue', '3'); page.click('#rf-draw')
    check('rf-eq: regra impossível é explicada', '4 pessoas' in page.inner_text('#rf-error'), page.inner_text('#rf-error'))
    page.fill('#rf-sep', 'Ana, Zeca'); page.click('#rf-draw')
    check('rf-eq: avisa sobre nome desconhecido nas regras', 'Zeca' in page.inner_text('#rf-status'))
    page.check('input[name=tlabel][value=Grupo]'); page.fill('#rf-sep', ''); page.click('#rf-draw')
    check('rf-eq: rótulo Grupo', page.locator('.team h3').first.inner_text().startswith('Grupo 1'))
    page.fill('#rf-tvalue', '11'); page.click('#rf-draw')
    check('rf-eq: mais equipes que pessoas é recusado', 'apenas 10' in page.inner_text('#rf-error'))

    page.goto(BASE + '/sorteador/ordem/')
    page.fill('#rf-names', '\n'.join(people)); page.click('summary:has-text("Excluir participantes")'); page.fill('#rf-exclude', 'bruno\nJoao'); page.click('#rf-draw')
    got = page.locator('#rf-list li').all_inner_texts()
    check('rf-ordem: permutação sem os excluídos', sorted(got) == sorted(set(people) - {'Bruno', 'Joao'}), str(got))
    page.wait_for_timeout(300)
    check('rf-ordem: contador mostra excluídos', '2 excluídos' in page.inner_text('#rf-count'), page.inner_text('#rf-count'))

    page.goto(BASE + '/sorteador/chaves/')
    page.fill('#rf-names', '\n'.join(people[:5])); page.click('#rf-draw')
    rounds = page.locator('.round h3').all_inner_texts()
    check('rf-chave: 5 participantes -> quartas, semifinais e final', rounds == ['Quartas de final', 'Semifinais', 'Final'], str(rounds))
    check('rf-chave: 3 folgas na 1ª rodada', page.locator('.round').first.locator('.game', has_text='avança direto').count() == 3)
    check('rf-chave: região rolável acessível', page.get_attribute('.bracket', 'role') == 'region' and page.get_attribute('.bracket', 'tabindex') == '0')
    page.check('input[name=bmode][value=pairs]'); page.click('#rf-draw')
    check('rf-chave: duplas com número ímpar deixam 1 de folga', page.locator('.pairs .game').count() == 3 and page.locator('.pairs .bye').count() == 1)
    page.fill('#rf-names', 'Só um'); page.click('#rf-draw')
    check('rf-chave: 1 participante é recusado', 'pelo menos 2' in page.inner_text('#rf-error'))

    # segurança e exportação
    page.goto(BASE + '/sorteador/')
    page.fill('#rf-names', '<img src=x onerror=alert(1)>\n=1+1\n"aspas";ponto'); page.fill('#rf-winners', '3'); page.click('#rf-draw')
    check('rf-seg: nomes com HTML viram texto (sem XSS)', page.locator('#rf-output img').count() == 0 and '<img' in ' '.join(page.locator('#rf-list li').all_inner_texts()))
    with page.expect_download() as d:
        page.click('#rf-csv')
    fcsv = os.path.join(TMP, 'sorteio.csv'); d.value.save_as(fcsv); raw = open(fcsv, 'rb').read()
    check('rf-csv: BOM UTF-8, cabeçalho e fórmula neutralizada', raw.startswith(b'\xef\xbb\xbf') and b'posi' in raw and b"'=1+1" in raw and d.value.suggested_filename == 'sorteio-caply.csv', raw[:120].decode('utf-8', 'replace'))
    page.emulate_media(media='print')
    check('rf-print: só o resultado aparece na impressão', page.locator('#rf-form').is_hidden() and page.locator('.site-header').is_hidden() and page.locator('#rf-print-head').is_visible() and page.locator('#rf-list').is_visible())
    page.emulate_media(media='screen')
    # simula uma colagem (1 evento); page.fill insere linha a linha no Chromium e é quadrático mesmo sem JS
    page.evaluate("() => { const t = document.getElementById('rf-names'); t.value = Array.from({length: 5000}, (_, i) => 'Pessoa ' + i).join('\\n'); t.dispatchEvent(new Event('input', { bubbles: true })); }")
    page.fill('#rf-winners', '50')
    import time as _t; t0 = _t.time(); page.click('#rf-draw'); page.wait_for_selector('#rf-list li'); dt = _t.time() - t0
    check('rf-perf: 5000 nomes sorteados rapidamente', page.locator('#rf-list li').count() == 50 and dt < 3, f'{dt:.2f}s')
    page.fill('#rf-names', 'x' * 200); page.click('#rf-draw')
    check('rf-limite: nome gigante é recusado com explicação', 'mais de 120' in page.inner_text('#rf-error'))

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
    page.screenshot(path=os.path.join(TMP, 'shot-image-desktop.png'), full_page=True, caret='initial', animations='allow')
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

    # ---------- Responsividade (7 larguras, todas as páginas, com e sem resultado na tela) ----------
    paths = ['/', '/qr-code/', '/whatslink/', '/sorteador/', '/sorteador/numeros/', '/sorteador/equipes/', '/sorteador/ordem/', '/sorteador/chaves/', '/conversor-de-imagens/', '/conversor-de-audio/', '/privacidade/', '/nao-existe']
    NAMES20 = '\n'.join(f'Participante com nome comprido número {i}' for i in range(1, 21))
    for w in (320, 360, 390, 768, 1024, 1280, 1920):
        c2 = b.new_context(viewport={'width': w, 'height': 800}); pg = c2.new_page()
        over = []; h1over = []
        for pth in paths:
            pg.goto(BASE + pth)
            if pth.startswith('/sorteador/'):
                if pg.locator('#rf-names').is_visible(): pg.fill('#rf-names', NAMES20)
                if pth.endswith('/equipes/'): pg.fill('#rf-tvalue', '4')
                pg.click('#rf-draw')
            sw = pg.evaluate('document.documentElement.scrollWidth')
            if sw > w: over.append(f'{pth}={sw}')
            bad = pg.evaluate("() => [...document.querySelectorAll('h1, h2')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30))")
            if bad: h1over.append(f'{pth}:{bad}')
        check(f'responsivo {w}px: nenhuma das {len(paths)} páginas rola na horizontal', not over, ', '.join(over))
        check(f'responsivo {w}px: títulos não estouram a largura', not h1over, ', '.join(h1over))
        c2.close()
    # chave grande (64 participantes) não pode quebrar a página no celular; a rolagem fica dentro da região da chave
    cm = b.new_context(viewport={'width': 360, 'height': 800}); pm = cm.new_page(); pm.goto(BASE + '/sorteador/chaves/')
    pm.fill('#rf-names', '\n'.join(f'Time {i}' for i in range(64))); pm.click('#rf-draw')
    check('responsivo 360px: chave de 64 participantes rola só dentro da própria região', pm.evaluate('document.documentElement.scrollWidth') <= 360 and pm.evaluate("(() => { const e = document.querySelector('.bracket'); return e.scrollWidth > e.clientWidth; })()"))
    narrow = pm.evaluate("() => [...document.querySelectorAll('.round')].map(e => Math.round(e.getBoundingClientRect().width))")
    check('responsivo 360px: cada rodada da chave mantém largura legível (≥ 200px)', narrow and min(narrow) >= 200, str(narrow))
    broken = pm.evaluate("() => [...document.querySelectorAll('.game .slot')].filter(e => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 2.6).length")
    check('responsivo 360px: nomes na chave não quebram em várias linhas curtas', broken == 0, str(broken))
    cm.close()
    mob = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2); pg = mob.new_page()
    for name, pth in [('home', '/'), ('qr', '/qr-code/'), ('image', '/conversor-de-imagens/'), ('numeros', '/sorteador/numeros/'), ('chaves', '/sorteador/chaves/')]:
        pg.goto(BASE + pth); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(TMP, f'shot-{name}-mobile.png'), full_page=True, caret='initial', animations='allow')
    b.close()

fails = [n for n, ok in results if not ok]
print(f'\n{len(results) - len(fails)}/{len(results)} verificações passaram')
sys.exit(1 if fails else 0)
