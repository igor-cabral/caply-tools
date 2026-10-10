# Caply Tools

Ferramentas online gratuitas, sem cadastro, que processam tudo **no navegador**: Gerador de QR Code (link, texto, Wi-Fi; PNG/SVG), WhatsLink (links `wa.me`), Sorteador e Conversor de imagens (PNG, JPEG, WebP).

URL de produção: **https://tools.igorcabral.dev.br**

## Arquitetura (resumo)
- Site **100% estático**: não há framework, backend, banco, API nem funções serverless. As ferramentas rodam no navegador e o JS não faz nenhuma requisição de rede (verificado por lint e testes).
- Um script de build próprio em Node (`scripts/build.mjs`) gera HTML em `dist/` a partir de `src/`. **Sem dependências** (`package.json` não tem `dependencies`).
- Build: `npm run build`. Saída: `dist/`. Node 20+ (fixado em 22 via `.node-version`).

## Rodar localmente
```bash
npm run build      # gera dist/
npm start          # serve dist/ em http://localhost:4173 (inclui a mesma CSP de produção)
npm run dev        # build + serve
```

## Qualidade
```bash
npm run lint       # sintaxe de todos os .js/.mjs + regras (sem fetch/localStorage no frontend)
npm test           # 52 testes (lógica das ferramentas, SEO, links, segredos no bundle, 404)
npm run check      # lint + testes + build
python3 tests/e2e/e2e.py   # opcional: ponta a ponta no Chromium (requer playwright, opencv-python, Pillow e servidor em :4173)
```
Não existe typecheck: o projeto é JavaScript puro, sem TypeScript.

## Configuração da URL pública
`src/config.mjs` define `PRODUCTION_URL = https://tools.igorcabral.dev.br`. Ela alimenta `canonical`, `og:url`, `sitemap.xml` e a linha `Sitemap:` do `robots.txt`.

| Variável (build) | Obrigatória | Efeito |
|---|---|---|
| `SITE_URL` | **Não** | Sobrescreve a URL pública (ex.: `https://preview.exemplo.com`). Deve ser só a origem `https://…`, sem caminho; senão o build falha. `SITE_URL=""` remove canonical/sitemap. |
| `NODE_VERSION` | Não | Só se quiser forçar outra versão do Node; o arquivo `.node-version` (22) já basta. |

Não há segredos. **Não cadastre chaves de API ou tokens** como variáveis do projeto: este site não precisa delas, e tudo que entra no build pode acabar no bundle público.

## Publicar na Cloudflare Pages (passo a passo)

### Opção A: integração com Git (recomendada)
1. Envie este projeto para um repositório (GitHub/GitLab). O `.gitignore` já exclui `dist/` e arquivos `.env`.
2. No painel: **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
3. Em **Set up builds and deployments**:
   - **Project name:** `caply-tools` (gera `caply-tools.pages.dev`)
   - **Production branch:** `main` (ou a sua)
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** vazio (raiz do repositório)
4. **Environment variables:** nenhuma é necessária. (Opcional: `NODE_VERSION` = `22`.)
5. Clique em **Save and Deploy** e aguarde. Teste primeiro em `https://caply-tools.pages.dev`.

### Opção B: upload direto
```bash
npm run build
npx wrangler pages deploy dist --project-name caply-tools
```
(Requer `wrangler login` na sua máquina.)

### Domínio personalizado `tools.igorcabral.dev.br`
1. No projeto: **Custom domains → Set up a custom domain** e digite `tools.igorcabral.dev.br`.
2. Se `igorcabral.dev.br` usa o DNS da Cloudflare, ela oferece criar o registro automaticamente: confirme. Se o DNS está em outro provedor, crie manualmente:
   `CNAME  tools  →  caply-tools.pages.dev`
3. Aguarde o status ficar **Active**. O certificado HTTPS é emitido automaticamente.
4. Depois de ativo, confira `https://tools.igorcabral.dev.br/`, `/sitemap.xml` e `/robots.txt`.

> Este repositório não altera DNS, domínio nem publica nada por conta própria. Esses passos são manuais.

### Depois de publicar
- Envie `https://tools.igorcabral.dev.br/sitemap.xml` no Google Search Console (a indexação não é garantida).
- Confirme os cabeçalhos de segurança (`curl -I https://tools.igorcabral.dev.br/qr-code/`): `Content-Security-Policy` etc. vêm de `dist/_headers`, que a Cloudflare Pages aplica.

## Roteamento e 404 (sem fallback de SPA)
O site **não é uma SPA**: cada página tem seu próprio `index.html` (`/qr-code/`, `/whatslink/`, `/sorteador/`, `/conversor-de-imagens/`, `/privacidade/`), então recarregar qualquer página interna funciona sem regra extra. A Cloudflare Pages serve `/qr-code` redirecionando para `/qr-code/` e usa `404.html` (com status 404) para endereços inexistentes.

**Não crie** `_redirects` com `/* /index.html 200`: isso transformaria todo endereço inválido em uma página 200 da home (soft 404, ruim para SEO) e não é necessário aqui. Um teste automatizado garante que esse arquivo não exista.

## Estrutura
- `src/config.mjs`: nome, URL pública, URL do autor, catálogo de ferramentas.
- `src/layout.mjs`: cabeçalho, rodapé, SEO/Open Graph. `src/pages/*.mjs`: conteúdo das páginas.
- `src/assets/`: CSS e JS (`*-lib.js` sem DOM, testáveis; `*-tool.js` ligam a interface; `qr.js` é o codificador de QR Code próprio).
- `scripts/`: build, servidor local, lint. `tests/`: testes. `docs/AVALIACAO.md`: assistente de IA e links curtos (não implementados).
- Nova ferramenta: entrada em `config.mjs` + página em `src/pages/` + registro em `scripts/build.mjs`.

## Pendências conhecidas
- Imagem Open Graph (`og:image`) não criada: adicione quando houver arte.
- Rodapé e seção de serviços linkam só a raiz `https://igorcabral.dev.br`; atualize quando existirem páginas de portfólio/serviços/contato verificadas.
- Assistente de IA e links curtos próprios: ver `docs/AVALIACAO.md`.
