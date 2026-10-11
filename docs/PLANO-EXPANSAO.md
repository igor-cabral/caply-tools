# Plano de expansão (rodada 2)

Base: projeto do ZIP enviado (HEAD 0b18ed5 + redesenho escuro não commitado, 60 testes e 70+25 verificações no navegador verdes).
Identidade: segue o site em produção e igorcabral.dev.br (preto `#0a0a0a`, papel off-white, azul `#1447b1`, Archivo, raio de 3 px).

## Etapas
| Etapa | Entrega | Estado |
|---|---|---|
| 0 | Receber o código real e validar a base | feita |
| 1 | Sorteador: nomes, números, equipes/grupos, ordem, chaves/confrontos, exclusões, copiar/imprimir/CSV | **feita** (ver README) |
| 2 | Conversor de áudio (camada nativa: Web Audio, WAV, MP3, Opus/AAC via WebCodecs quando houver) | pendente |
| 3 | Caply IA (Worker próprio, segredos fora do front, limites, aviso de envio a serviço externo) | pendente: decisão do provedor |
| 4 | Catálogo: categorias, dados estruturados, novas ferramentas por prioridade | pendente |

## Decisões técnicas (com fontes verificadas em 11/10/2026; confirmar nos documentos oficiais antes de contratar)
- **Áudio:** o núcleo do FFmpeg.wasm (~31 MB) excede o limite de **25 MiB por arquivo** da Cloudflare Pages; a versão multi-thread exige COOP/COEP. Por isso a 1ª versão usa APIs nativas do navegador; FFmpeg só se for necessário, hospedado fora da Pages ou em build só de áudio.
- **IA:** Workers AI (plano gratuito de 10.000 neurons/dia, bloqueia com erro 429 ao esgotar: sem cobrança no plano gratuito) é a opção de menor risco de custo; Gemini gratuito não é recomendado para um site público (limites instáveis e termos de uso dos dados); provedor pago exige teto de gasto no provedor e cota no Worker.
- Qualquer dependência de terceiros (encoder de MP3, PDF, FFmpeg, wrangler, TypeScript) precisa ser adicionada por quem tem rede; o ambiente de desenvolvimento do assistente não baixa pacotes.
