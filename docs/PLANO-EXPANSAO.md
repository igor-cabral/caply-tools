# Plano de expansão (rodada 2)

Base: projeto do ZIP enviado (HEAD 0b18ed5 + redesenho escuro não commitado, 60 testes e 70+25 verificações no navegador verdes).
Identidade: segue o site em produção e igorcabral.dev.br (preto `#0a0a0a`, papel off-white, azul `#1447b1`, Archivo, raio de 3 px).

## Etapas
| Etapa | Entrega | Estado |
|---|---|---|
| 0 | Receber o código real e validar a base | feita |
| 1 | Sorteador: nomes, números, equipes/grupos, ordem, chaves/confrontos, exclusões, copiar/imprimir/CSV | **feita** (ver README) |
| 2 | Conversor de áudio: **WAV** (Web Audio + codificador próprio), fila, prévia, progresso, cancelar, extração de áudio de vídeo | **feita (v1)** |
| 2b | MP3 (encoder de terceiros) e Opus/AAC (WebCodecs) | pendente, ver abaixo |
| 3 | Caply IA (Worker próprio, segredos fora do front, limites, aviso de envio a serviço externo) | pendente: decisão do provedor |
| 4 | Catálogo: categorias, dados estruturados, novas ferramentas por prioridade | pendente |

## Decisões técnicas (com fontes verificadas em 11/10/2026; confirmar nos documentos oficiais antes de contratar)
- **Áudio:** o núcleo do FFmpeg.wasm (~31 MB) excede o limite de **25 MiB por arquivo** da Cloudflare Pages; a versão multi-thread exige COOP/COEP. Por isso a 1ª versão usa APIs nativas do navegador; FFmpeg só se for necessário, hospedado fora da Pages ou em build só de áudio.
- **IA:** Workers AI (plano gratuito de 10.000 neurons/dia, bloqueia com erro 429 ao esgotar: sem cobrança no plano gratuito) é a opção de menor risco de custo; Gemini gratuito não é recomendado para um site público (limites instáveis e termos de uso dos dados); provedor pago exige teto de gasto no provedor e cota no Worker.
- Qualquer dependência de terceiros (encoder de MP3, PDF, FFmpeg, wrangler, TypeScript) precisa ser adicionada por quem tem rede; o ambiente de desenvolvimento do assistente não baixa pacotes.

## Etapa 2 (áudio): estado e próximos passos
**Entregue:** conversão para WAV 16/24 bits, 4 taxas, mono/estéreo (5.1 é mixado), fila de até 10 arquivos, prévia, download, progresso real na gravação do WAV, cancelamento, remoção e limpeza com liberação de memória, detecção do suporte do navegador, extração de áudio de MP4/WebM, mensagens claras para formatos incompatíveis. Saída validada com FFmpeg (decodificador independente) em testes de navegador.

**Limitações conhecidas**
- A decodificação é do navegador e **não informa progresso** nem pode ser interrompida: cancelar espera a etapa terminar e descarta o resultado.
- Formatos de entrada dependem do navegador (M4A/AAC falhou no Chromium de teste). Só Chromium foi testado; Firefox, Safari e celulares reais **não** foram.
- O limite de 10 min / 50 MB é conservador para celulares (o PCM de 10 min estéreo decodificado ocupa ~212 MB).
- Sem encoder de MP3: a opção aparece desativada com o motivo.

**Próxima etapa de áudio (2b)**
1. MP3: escolher uma biblioteca (verificar licença, tamanho e manutenção), vendorizá-la em `src/assets/js/vendor/` com a licença, registrar em `ENCODERS` e testar com `ffprobe`. Alguém com acesso à rede precisa baixar o pacote (o ambiente de desenvolvimento do assistente não baixa dependências).
2. Opus/AAC via WebCodecs `AudioEncoder`: o Chromium de teste não tem WebCodecs de áudio, então só é testável em um Chrome/Edge completo; implementar com detecção de recurso.
3. Avaliar FFmpeg.wasm somente se houver demanda por muitos formatos (núcleo ~31 MB excede o limite de 25 MiB por arquivo da Pages: exigiria hospedagem externa).
