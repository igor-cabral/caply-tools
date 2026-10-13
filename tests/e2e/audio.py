"""Conversor de áudio no Chromium real (Playwright). Uso: python3 tests/e2e/audio.py [base_url]
Requer: playwright, numpy e ffmpeg/ffprobe (usados SÓ nos testes: geram arquivos de entrada reais e
decodificam o WAV de saída com um decodificador independente). Sem ffmpeg, os testes que dependem dele são pulados."""
import sys, os, json, shutil, subprocess, tempfile, base64
import numpy as np
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
TMP = tempfile.mkdtemp()
FF = shutil.which('ffmpeg') and shutil.which('ffprobe')
results = []


def check(name, cond, extra=''):
    results.append(bool(cond))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra and not cond else ''))


def skip(name):
    print(f'SKIP {name} (ffmpeg ausente)')


# ---------- geração de entradas reais ----------
def ff(*args):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True)


L, R = 'sin(2*PI*440*t)*0.5', 'sin(2*PI*880*t)*0.5'
src = lambda rate, dur, ch='L|R', extra='': ['-f', 'lavfi', '-i', f'aevalsrc=exprs={ {"L|R": L + "|" + R, "L": L}[ch] }:s={rate}:d={dur}{extra}']
F = {}
if FF:
    spec = {
        'wav16': (src(44100, 2), ['-c:a', 'pcm_s16le'], 'tone-44k-stereo.wav'),
        'wav24': (src(48000, 2), ['-c:a', 'pcm_s24le'], 'tone-48k-24bit.wav'),
        'wav8': (src(22050, 2, 'L'), ['-c:a', 'pcm_u8'], 'tone-22k-mono-8bit.wav'),
        'mp3': (src(44100, 2), ['-c:a', 'libmp3lame', '-b:a', '128k'], 'tone.mp3'),
        'ogg': (src(44100, 2), ['-c:a', 'libvorbis'], 'tone.ogg'),
        'opus': (src(48000, 2), ['-c:a', 'libopus'], 'tone-opus.webm'),
        'flac': (src(44100, 2), ['-c:a', 'flac'], 'tone.flac'),
        'm4a': (src(44100, 2), ['-c:a', 'aac', '-b:a', '128k'], 'tone.m4a'),
    }
    for k, (i, o, name) in spec.items():
        F[k] = os.path.join(TMP, name); ff(*i, *o, F[k])
    F['ch6'] = os.path.join(TMP, 'tone-6ch.wav')
    ff('-f', 'lavfi', '-i', f'aevalsrc=exprs={L}|0|0|0|0|0:s=48000:d=1:c=5.1', '-c:a', 'pcm_s16le', F['ch6'])
    F['video'] = os.path.join(TMP, 'video.webm')
    ff(*src(44100, 2), '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=2:r=10', '-c:v', 'libvpx', '-b:v', '50k', '-c:a', 'libvorbis', '-shortest', F['video'])
    F['long'] = os.path.join(TMP, 'longo-11min.wav')
    ff('-f', 'lavfi', '-i', 'aevalsrc=exprs=0:s=8000:d=660', '-c:a', 'pcm_u8', F['long'])
    F['big4'] = os.path.join(TMP, 'quatro-minutos-e-meio.wav')
    ff(*src(44100, 270), '-c:a', 'pcm_s16le', F['big4'])
    F['mp3cut'] = os.path.join(TMP, 'mp3-truncado.mp3'); open(F['mp3cut'], 'wb').write(open(F['mp3'], 'rb').read()[:3000])
F['fake'] = os.path.join(TMP, 'falso.mp3'); open(F['fake'], 'w').write('isto nao e um audio')
F['empty'] = os.path.join(TMP, 'vazio.wav'); open(F['empty'], 'wb').close()
F['header'] = os.path.join(TMP, 'so-cabecalho.wav')
if FF:
    open(F['header'], 'wb').write(open(F['wav16'], 'rb').read()[:44])
F['huge'] = os.path.join(TMP, 'enorme.wav')
with open(F['huge'], 'wb') as fh:
    fh.write(b'RIFF\x00\x00\x00\x00WAVE'); fh.write(b'\0' * (51 * 1024 * 1024))
F['xss'] = os.path.join(TMP, '<img src=x onerror=alert(1)>.wav')
if FF:
    shutil.copy(F['wav16'], F['xss'])


def decode(path):
    """Decodifica com o ffmpeg (independente do código testado): devolve (taxa, canais, amostras float [n, ch], duração)."""
    info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels,bits_per_sample:format=duration', '-of', 'json', path], capture_output=True, text=True, check=True).stdout)
    s = info['streams'][0]; ch = int(s['channels']); rate = int(s['sample_rate'])
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', str(ch), '-ar', str(rate), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').reshape(-1, ch)
    return {'codec': s['codec_name'], 'rate': rate, 'ch': ch, 'bits': int(s.get('bits_per_sample') or 0), 'dur': float(info['format']['duration']), 'x': x}


def peak_hz(sig, rate):
    w = np.hanning(len(sig)); sp = np.abs(np.fft.rfft(sig * w)); k = int(np.argmax(sp)); return k * rate / len(sig)


def amp_at(sig, rate, hz):
    n = len(sig); t = np.arange(n) / rate
    return 2 * abs(np.mean(sig * np.exp(-2j * np.pi * hz * t)))


INIT = """
window.__stats = { ctxNew: 0, ctxClose: 0, urlNew: 0, urlRev: 0 };
(() => {
  const Orig = window.AudioContext;
  class Counting extends Orig {
    constructor(...a) { super(...a); window.__stats.ctxNew++; }
    close() { window.__stats.ctxClose++; return super.close(); }
    decodeAudioData(buf, ok, err) {
      const d = window.__decodeDelay || 0;
      if (!d) return super.decodeAudioData(buf, ok, err);
      return super.decodeAudioData(buf).then((r) => new Promise((res) => setTimeout(() => { ok && ok(r); res(r); }, d)), (e) => { err && err(e); throw e; });
    }
  }
  window.AudioContext = Counting; window.webkitAudioContext = Counting;
  const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (o) => { window.__stats.urlNew++; return c(o); };
  URL.revokeObjectURL = (u) => { window.__stats.urlRev++; return r(u); };
})();
"""


def until(page, js, timeout=30.0):
    import time
    t0 = time.time()
    while time.time() - t0 < timeout:
        if page.evaluate(f'() => {js}'): return True
        page.wait_for_timeout(100)
    raise TimeoutError(js)


def li(page, i): return page.locator('#au-list > li').nth(i)
def wait_state(page, i, state, timeout=40000): page.wait_for_selector(f'#au-list > li:nth-child({i + 1})[data-state="{state}"]', timeout=timeout)
def stats(page): return page.evaluate('window.__stats')


def save_download(page, i, name):
    out = os.path.join(TMP, name)
    with page.expect_download() as d:
        li(page, i).locator('a.btn').click()
    d.value.save_as(out)
    return out, d.value.suggested_filename


def convert_one(page, path, i=0, **opts):
    page.set_input_files('#au-file', path)
    page.wait_for_selector(f'#au-list > li:nth-child({i + 1})')
    li(page, i).locator('button', has_text='Converter').first.click()
    wait_state(page, i, 'done')


def clear(page):
    if page.locator('#au-clear').is_visible(): page.click('#au-clear')
    until(page, 'document.querySelectorAll("#au-list > li").length === 0')


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text[:160]}') if m.type in ('error', 'warning') else None)
    page.goto(BASE + '/conversor-de-audio/')

    # ---------- página e capacidades ----------
    sup = page.locator('#au-support li').evaluate_all('els => els.map(e => e.textContent)')
    check('áudio: o navegador informa o que consegue abrir (7 formatos)', len(sup) == 7 and all(s.strip() for s in sup), str(sup))
    check('áudio: MP3 aparece como indisponível, com o motivo', page.locator('input[value=mp3]').is_disabled() and 'encoder' in page.inner_text('#au-mp3-note'))
    check('áudio: estado vazio mostra instrução', page.is_visible('#au-empty') and page.is_hidden('#au-actions'))

    if FF:
        # ---------- WAV 16 bits estéreo: conteúdo verificado por decodificador independente ----------
        page.set_input_files('#au-file', F['wav16']); page.wait_for_selector('#au-list > li')
        meta = li(page, 0).locator('.ai-meta').inner_text()
        check('áudio: lista nome, formato, tamanho e duração', 'WAV' in meta and '344' in meta and '0:02' in meta, meta)
        check('áudio: mostra estimativa do tamanho do WAV', 'WAV de até' in meta, meta)
        li(page, 0).locator('button', has_text='Converter').first.click(); wait_state(page, 0, 'done')
        out, fname = save_download(page, 0, 'o-wav16.wav')
        d = decode(out)
        check('wav16→WAV: pcm_s16le, 44,1 kHz, 2 canais, 2,0 s', (d['codec'], d['rate'], d['ch']) == ('pcm_s16le', 44100, 2) and abs(d['dur'] - 2) < 0.01, str({k: d[k] for k in ('codec', 'rate', 'ch', 'dur')}))
        ref = decode(F['wav16'])['x']
        check('wav16→WAV: amostras idênticas ao original (erro ≤ 2 LSB de 16 bits)', d['x'].shape == ref.shape and np.max(np.abs(d['x'] - ref)) * 32768 <= 2, f'{np.max(np.abs(d["x"] - ref)) * 32768:.2f}')
        check('wav16→WAV: canal E em 440 Hz e canal D em 880 Hz', abs(peak_hz(d['x'][:, 0], 44100) - 440) < 1 and abs(peak_hz(d['x'][:, 1], 44100) - 880) < 1)
        check('download: nome não sobrescreve o original (-convertido)', fname == 'tone-44k-stereo-convertido.wav', fname)
        st = li(page, 0).locator('.ai-status').inner_text(); check('áudio: resumo do resultado', 'WAV 16 bits, 44,1 kHz, estéreo' in st and 'KB' in st or 'MB' in st, st)
        until(page, 'document.querySelector("#au-list audio").readyState >= 1')
        dur = page.evaluate('document.querySelector("#au-list audio").duration')
        check('prévia: <audio> carrega o WAV convertido (2,0 s)', abs(dur - 2.0) < 0.05, str(dur))
        check('prévia e download usam URL local (blob:)', page.evaluate('document.querySelector("#au-list audio").src').startswith('blob:') and page.get_attribute('#au-list a.btn', 'href').startswith('blob:'))

        # converter de novo com outras configurações substitui o resultado e libera a URL anterior
        before = stats(page)
        page.select_option('#au-bits', '24'); page.check('input[name=ch][value=mono]'); page.select_option('#au-rate', '22050')
        meta2 = li(page, 0).locator('.ai-meta').inner_text()
        check('áudio: trocar as configurações atualiza a estimativa', meta2 != meta, meta2)
        li(page, 0).locator('button', has_text='Converter de novo').click(); wait_state(page, 0, 'done')
        after = stats(page)
        out, _ = save_download(page, 0, 'o-24-mono-22k.wav'); d = decode(out)
        check('24 bits + mono + 22,05 kHz: pcm_s24le, 22050, 1 canal', (d['codec'], d['rate'], d['ch']) == ('pcm_s24le', 22050, 1) and abs(d['dur'] - 2) < 0.01, str({k: d[k] for k in ('codec', 'rate', 'ch', 'dur')}))
        x = d['x'][:, 0]
        check('mono = média dos canais (440 Hz e 880 Hz com amplitude 0,25 cada)', abs(amp_at(x, 22050, 440) - 0.25) < 0.01 and abs(amp_at(x, 22050, 880) - 0.25) < 0.01, f'{amp_at(x, 22050, 440):.3f}/{amp_at(x, 22050, 880):.3f}')
        check('reconverter libera a URL do resultado anterior', after['urlRev'] - before['urlRev'] >= 1 and after['ctxNew'] == after['ctxClose'], f'{before} -> {after}')
        clear(page)
        page.select_option('#au-bits', '16'); page.check('input[name=ch][value=keep]'); page.select_option('#au-rate', '44100')

        # ---------- formatos de entrada reais ----------
        for key, label, hz_l, tol in [('mp3', 'MP3', 440, 0.12), ('ogg', 'OGG Vorbis', 440, 0.05), ('flac', 'FLAC', 440, 0.01), ('opus', 'WebM/Opus', 440, 0.05), ('wav24', 'WAV 24 bits 48 kHz', 440, 0.01), ('wav8', 'WAV 8 bits mono 22 kHz', 440, 0.01)]:
            convert_one(page, F[key]); out, _ = save_download(page, 0, f'o-{key}.wav'); d = decode(out)
            ch_expected = 1 if key == 'wav8' else 2
            ok = d['rate'] == 44100 and d['ch'] == ch_expected and abs(d['dur'] - 2) < tol + 0.05 and abs(peak_hz(d['x'][:, 0], 44100) - hz_l) < 2
            check(f'{label} → WAV: 44,1 kHz, {ch_expected} canal(is), ~2 s, 440 Hz preservado', ok, str({k: d[k] for k in ('rate', 'ch', 'dur')}) + f" pico={peak_hz(d['x'][:, 0], 44100):.1f}")
            if ch_expected == 2: check(f'{label} → WAV: canal D em 880 Hz', abs(peak_hz(d['x'][:, 1], 44100) - 880) < 2)
            clear(page)

        # vídeo: extrai o áudio
        convert_one(page, F['video']); out, _ = save_download(page, 0, 'o-video.wav'); d = decode(out)
        check('vídeo WebM → WAV só com o áudio (440/880 Hz, ~2 s)', d['ch'] == 2 and abs(d['dur'] - 2) < 0.1 and abs(peak_hz(d['x'][:, 0], d['rate']) - 440) < 2, str({k: d[k] for k in ('rate', 'ch', 'dur')}))
        clear(page)

        # 5.1 → estéreo e mono (mixagem padrão do Web Audio)
        convert_one(page, F['ch6']); out, _ = save_download(page, 0, 'o-6ch-stereo.wav'); d = decode(out)
        check('5.1 → estéreo: 2 canais, 440 Hz audível no canal E e silêncio no D', d['ch'] == 2 and abs(peak_hz(d['x'][:, 0], d['rate']) - 440) < 2 and amp_at(d['x'][:, 0], d['rate'], 440) > 0.2 and amp_at(d['x'][:, 1], d['rate'], 440) < 0.05, f"E={amp_at(d['x'][:, 0], d['rate'], 440):.3f} D={amp_at(d['x'][:, 1], d['rate'], 440):.3f}")
        page.check('input[name=ch][value=mono]'); li(page, 0).locator('button', has_text='Converter de novo').click(); wait_state(page, 0, 'done')
        out, _ = save_download(page, 0, 'o-6ch-mono.wav'); d = decode(out)
        check('5.1 → mono: 1 canal com o 440 Hz', d['ch'] == 1 and abs(peak_hz(d['x'][:, 0], d['rate']) - 440) < 2 and amp_at(d['x'][:, 0], d['rate'], 440) > 0.05, f"{amp_at(d['x'][:, 0], d['rate'], 440):.3f}")
        page.check('input[name=ch][value=keep]'); clear(page)

        # ---------- arquivos inválidos e incompatíveis ----------
        page.set_input_files('#au-file', F['fake']); page.wait_for_timeout(300)
        check('inválido: arquivo falso com extensão .mp3 é recusado', 'Formato não reconhecido' in page.inner_text('#au-error') and page.locator('#au-list > li').count() == 0, page.inner_text('#au-error'))
        page.set_input_files('#au-file', F['empty']); page.wait_for_timeout(300)
        check('inválido: arquivo vazio é recusado', 'vazio' in page.inner_text('#au-error'))
        page.set_input_files('#au-file', F['huge']); page.wait_for_timeout(600)
        check('limite: arquivo acima de 50 MB é recusado com explicação', 'limite' in page.inner_text('#au-error') and page.locator('#au-list > li').count() == 0, page.inner_text('#au-error'))
        page.set_input_files('#au-file', F['long']); page.wait_for_timeout(900)
        check('limite: duração acima de 10 min é recusada', 'passa do limite' in page.inner_text('#au-error') and page.locator('#au-list > li').count() == 0, page.inner_text('#au-error'))
        page.set_input_files('#au-file', [F['fake'], F['wav16']]); page.wait_for_selector('#au-list > li')
        check('inválido + válido juntos: o válido entra e o erro do outro aparece', page.locator('#au-list > li').count() == 1 and 'falso.mp3' in page.inner_text('#au-error'))
        clear(page)

        page.set_input_files('#au-file', F['m4a']); page.wait_for_selector('#au-list > li')
        warn = li(page, 0).locator('.ai-warn').inner_text()
        check('incompatível: M4A/AAC é avisado antes de converter', 'não abre este formato' in warn, warn)
        li(page, 0).locator('button', has_text='Converter').first.click(); wait_state(page, 0, 'error')
        msg = li(page, 0).locator('.ai-status').inner_text()
        check('incompatível: erro claro com o nome do formato, sem resultado', 'não conseguiu decodificar' in msg and 'M4A (AAC)' in msg and li(page, 0).locator('a.btn').is_hidden() and li(page, 0).locator('audio').is_hidden(), msg)
        check('incompatível: oferece tentar de novo', li(page, 0).locator('button', has_text='Tentar de novo').is_visible())
        clear(page)

        page.set_input_files('#au-file', F['header']); page.wait_for_selector('#au-list > li')
        li(page, 0).locator('button', has_text='Converter').first.click(); wait_state(page, 0, 'error')
        check('corrompido: WAV só com cabeçalho dá erro de decodificação', 'não conseguiu decodificar' in li(page, 0).locator('.ai-status').inner_text(), li(page, 0).locator('.ai-status').inner_text())
        clear(page)
        page.set_input_files('#au-file', F['mp3cut']); page.wait_for_selector('#au-list > li')
        li(page, 0).locator('button', has_text='Converter').first.click(); page.wait_for_selector('#au-list > li[data-state="done"], #au-list > li[data-state="error"]', timeout=20000)
        check('MP3 truncado: termina sem travar (convertido parcialmente ou com erro claro)', li(page, 0).get_attribute('data-state') in ('done', 'error'))
        clear(page)

        # ---------- segurança ----------
        page.set_input_files('#au-file', F['xss']); page.wait_for_selector('#au-list > li')
        check('segurança: nome de arquivo com HTML vira texto', page.locator('#au-list img').count() == 0 and '<img' in li(page, 0).locator('.ai-name').inner_text())
        clear(page)

        # ---------- progresso real ----------
        page.set_input_files('#au-file', F['big4']); page.wait_for_selector('#au-list > li')
        page.evaluate("""() => { window.__vals = []; const o = new MutationObserver((ms) => ms.forEach((m) => { const p = m.target; if (p.hasAttribute('value')) window.__vals.push(Number(p.getAttribute('value'))); })); document.querySelectorAll('#au-list progress').forEach((p) => o.observe(p, { attributes: true, attributeFilter: ['value'] })); }""")
        li(page, 0).locator('button', has_text='Converter').first.click(); wait_state(page, 0, 'done', 90000)
        vals = page.evaluate('window.__vals')
        check('progresso: valores crescentes de 0 a 100 durante a geração do WAV', len(set(vals)) >= 5 and vals == sorted(vals) and vals[-1] == 100, f'{len(vals)} valores: {vals[:5]}…{vals[-3:]}')
        out, _ = save_download(page, 0, 'o-big.wav'); d = decode(out)
        check('arquivo de 4,5 min (47 MB) convertido com a duração correta', abs(d['dur'] - 270) < 0.05, str(d['dur']))
        clear(page)

        # ---------- cancelar, remover e liberar memória (decodificação com atraso injetado no teste) ----------
        s0 = stats(page)
        page.evaluate('window.__decodeDelay = 2500')
        page.set_input_files('#au-file', F['wav16']); page.wait_for_selector('#au-list > li')
        li(page, 0).locator('button', has_text='Converter').first.click(); wait_state(page, 0, 'working')
        dbg = page.evaluate("(() => { const p = document.querySelector('#au-list progress'); return p ? p.outerHTML + ' | estado=' + p.closest('li').dataset.state : 'sem barra'; })()")
        check('decodificação: barra indeterminada (sem valor) e aviso de que o navegador não informa o andamento', page.evaluate("!document.querySelector('#au-list progress').hasAttribute('value')") and 'não informa' in li(page, 0).locator('.ai-status').inner_text(), dbg + ' | ' + li(page, 0).locator('.ai-status').inner_text())
        li(page, 0).locator('button', has_text='Cancelar').click()
        check('cancelar: avisa que a etapa atual termina e o resultado é descartado', 'Cancelando' in li(page, 0).locator('.ai-status').inner_text())
        wait_state(page, 0, 'canceled', 10000)
        s1 = stats(page)
        check('cancelar: estado cancelado, nada guardado, nenhuma URL de resultado criada', li(page, 0).locator('audio').is_hidden() and li(page, 0).locator('a.btn').is_hidden() and 'Nada foi guardado' in li(page, 0).locator('.ai-status').inner_text())
        check('cancelar: o contexto de áudio foi fechado', s1['ctxNew'] - s0['ctxNew'] >= 1 and s1['ctxNew'] - s1['ctxClose'] == s0['ctxNew'] - s0['ctxClose'], f'{s0} -> {s1}')
        page.evaluate('window.__decodeDelay = 0')
        li(page, 0).locator('button', has_text='Tentar de novo').click(); wait_state(page, 0, 'done')
        check('depois de cancelar, tentar de novo conclui normalmente', True)
        # remover durante a conversão: não pode sobrar URL nem resultado
        page.evaluate('window.__decodeDelay = 1500'); s2 = stats(page)
        li(page, 0).locator('button', has_text='Converter de novo').click(); wait_state(page, 0, 'working')
        li(page, 0).locator('button', has_text='Remover').click()
        page.wait_for_timeout(2600); s3 = stats(page)
        created_after_remove = (s3['urlNew'] - s2['urlNew'])
        check('remover durante a conversão descarta tudo (nenhuma URL nova criada)', page.locator('#au-list > li').count() == 0 and created_after_remove == 0, f'{created_after_remove} URLs novas')
        page.evaluate('window.__decodeDelay = 0')

        # ---------- fila: converter todos, remover, limpar ----------
        page.set_input_files('#au-file', [F['wav16'], F['mp3'], F['flac']]); until(page, 'document.querySelectorAll("#au-list > li").length === 3')
        page.click('#au-convert-all')
        for i in range(3): wait_state(page, i, 'done', 60000)
        check('fila: converter todos conclui os 3 arquivos, um de cada vez', 'convertidos' in page.inner_text('#au-summary') and '3 arquivos' in page.inner_text('#au-summary'), page.inner_text('#au-summary'))
        names = [save_download(page, i, f'fila{i}.wav')[1] for i in range(3)]
        check('fila: nomes de saída corretos', names == ['tone-44k-stereo-convertido.wav', 'tone.wav', 'tone.wav'], str(names))
        li(page, 1).locator('button', has_text='Remover').click()
        check('fila: remover um item mantém os outros', page.locator('#au-list > li').count() == 2)
        s4 = stats(page); page.click('#au-clear')
        until(page, 'document.querySelectorAll("#au-list > li").length === 0')
        s5 = stats(page)
        check('limpar tudo: fila vazia e instrução volta a aparecer', page.is_visible('#au-empty') and page.is_hidden('#au-actions'))
        check('memória: todas as URLs criadas foram revogadas e todos os contextos fechados', s5['urlNew'] == s5['urlRev'] and s5['ctxNew'] == s5['ctxClose'], str(s5))

        # arrastar e soltar
        b64 = base64.b64encode(open(F['wav16'], 'rb').read()).decode()
        page.evaluate("""(d) => { const bin = atob(d); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const dt = new DataTransfer(); dt.items.add(new File([u], 'arrastado.wav', { type: 'audio/wav' }));
          document.getElementById('au-drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }""", b64)
        page.wait_for_selector('#au-list > li')
        check('arrastar e soltar adiciona o arquivo à fila', 'arrastado.wav' in li(page, 0).locator('.ai-name').inner_text())
        clear(page)

        # limite de fila
        many = [F['wav16']] * 11
        page.set_input_files('#au-file', many); page.wait_for_timeout(1200)
        check('limite de fila: aceita 10 e avisa sobre o excedente', page.locator('#au-list > li').count() == 10 and 'até 10 arquivos' in page.inner_text('#au-error'), f"{page.locator('#au-list > li').count()} | {page.inner_text('#au-error')}")
        clear(page)
    else:
        for n in ('conversões reais', 'formatos de entrada', 'cancelamento e memória', 'fila'): skip(n)

    # ---------- celular ----------
    check('sem erros de console nem violações de CSP', not errors, '; '.join(errors)[:500])
    m = b.new_context(viewport={'width': 360, 'height': 800}, accept_downloads=True); m.add_init_script(INIT); pm = m.new_page(); pm.goto(BASE + '/conversor-de-audio/')
    if FF:
        long_name = os.path.join(TMP, 'um-nome-de-arquivo-realmente-muito-comprido-para-testar-quebra-de-linha-no-celular-0123456789.wav'); shutil.copy(F['wav16'], long_name)
        pm.set_input_files('#au-file', [long_name, F['mp3']]); until(pm, 'document.querySelectorAll("#au-list > li").length === 2')
        pm.click('#au-convert-all'); wait_state(pm, 0, 'done'); wait_state(pm, 1, 'done')
        check('celular 360px: fila com nome longo e resultados não rola a página na horizontal', pm.evaluate('document.documentElement.scrollWidth') <= 360, str(pm.evaluate('document.documentElement.scrollWidth')))
        small = pm.evaluate("() => [...document.querySelectorAll('#au-list button, #au-list a.btn, #au-convert-all, #au-clear')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => e.textContent + ':' + Math.round(e.getBoundingClientRect().height))")
        check('celular 360px: botões da fila com alvo de toque ≥ 40px', not small, str(small))
        check('acessível: botões e prévia identificam o arquivo', 'um-nome-de-arquivo' in pm.get_attribute('#au-list > li:first-child button', 'aria-label') and 'Prévia' in pm.get_attribute('#au-list > li:first-child audio', 'aria-label'))
        pm.screenshot(path=os.path.join(TMP, 'audio-mobile.png'), full_page=True, caret='initial', animations='allow')
        # teclado de verdade: Tab até a fila; o contorno de foco precisa existir e ter contraste ≥ 3:1 sobre o cartão branco
        pm.mouse.click(5, 5)
        for _ in range(90):
            pm.keyboard.press('Tab')
            if pm.evaluate("!!document.activeElement.closest('#au-list')"): break
        f = pm.evaluate("""() => { const e = document.activeElement; const c = getComputedStyle(e);
          const rgb = (s) => (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
          const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const col = rgb(c.outlineColor); const l1 = lum(col), l2 = lum([255, 255, 255]);
          return { inList: !!e.closest('#au-list'), tag: e.tagName + ':' + (e.getAttribute('aria-label') || '').slice(0, 24), style: c.outlineStyle, width: parseFloat(c.outlineWidth), ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), focusVisible: e.matches(':focus-visible') }; }""")
        check('teclado: Tab alcança a fila e o foco é visível (contorno ≥ 2px, contraste ≥ 3:1 sobre branco)', f['inList'] and f['focusVisible'] and f['style'] != 'none' and f['width'] >= 2 and f['ratio'] >= 3, str(f))
    m.close(); b.close()

print(f'\n{sum(results)}/{len(results)} verificações passaram')
shutil.copy(os.path.join(TMP, 'audio-mobile.png'), '/tmp/audio-mobile.png') if os.path.exists(os.path.join(TMP, 'audio-mobile.png')) else None
sys.exit(0 if all(results) else 1)
