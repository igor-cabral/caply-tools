# Auditoria e revisão (rodada 1)

Escopo: código local do projeto (o repositório público `igor-cabral/caply-tools` continha apenas o `README.md` no momento da revisão).
Referência visual: `DESIGN.md` do Stitch (o `screen.png` enviado era um HTML do app, sem imagem; não foi usado).

## Bugs e inconsistências corrigidos (todos com teste)
| # | Problema | Como foi confirmado | Correção |
|---|---|---|---|
| 1 | WhatsLink avisava "falta o código do país" mesmo com `+48…` digitado de propósito | Reproduzido no navegador | Sem aviso se o número começa com `+` ou `00` (`whatslink.test.mjs`, `e2e.py`) |
| 2 | `(48) 99999-9999` gerava `wa.me/48999999999` (48 = Polônia) só com um aviso fraco | Reproduzido | Detecta DDD+número brasileiro e oferece o botão "Adicionar o código +55" (ação do usuário, nada é alterado sozinho) |
| 3 | Conversor mantinha o resultado antigo após mudar a qualidade | Reproduzido | Resultado é descartado e o usuário é avisado |
| 4 | Conversor: troca rápida de imagem podia deixar carregamento antigo sobrescrever o novo | **Não reproduzido**; janela teórica no código | Blindagem preventiva com token de carregamento |
| 5 | Conversor ignorava em silêncio arquivos extras no arrastar-e-soltar | Leitura de código + teste | Mensagem "usamos apenas a primeira das N imagens" |
| 6 | Sorteador: leitor de tela não ouvia os vencedores; resultado ficava defasado ao editar a lista | Leitura de código + teste | Status falado inclui nomes (≤10); aviso quando a lista muda |
| 7 | QR: baixar logo após digitar podia usar QR defasado (debounce); rótulo do canvas era genérico | Leitura de código | Renderização imediata antes das ações; `aria-label` descritivo (sem expor senha de Wi-Fi) |
| 8 | Erros de campo não eram ligados ao campo (`aria-describedby`); `main` sem foco para o link de pulo; formulários sem nome | Revisão a11y | Corrigidos e cobertos em `site.test.mjs` |
| 9 | Sem `og:image`; card social "summary" | Revisão SEO | `og-image.png` + `summary_large_image` (só com URL pública) |
| 10 | Servidor local servia `/qr-code` com 200 (produção redireciona 308) | Teste | Paridade com a Cloudflare Pages |

## Segurança (verificado)
- CSP restritiva (`default-src 'self'`, sem inline, `connect-src 'self'`) aplicada no servidor local e no `_headers`; 0 violações no Chromium. Adicionado `Cross-Origin-Opener-Policy`.
- Sem dependências (nada a auditar com `npm audit`), sem `.env`, sem `fetch`/XHR no frontend (lint + teste), varredura de segredos no bundle em `site.test.mjs`.
- Links externos: `rel="noopener"` (autor) e `noopener noreferrer` (WhatsApp).

## Não coberto
- Testes em iOS/Safari e Firefox reais; leitura por leitores de tela reais.
- QR de ~900 bytes (v21) falha em alguns decodificadores OpenCV (ver README da rodada anterior); validado com 140/143 casos.
