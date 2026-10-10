# Avaliação: assistente de IA e links curtos do WhatsLink

Resultado: **nenhum dos dois foi implementado**, porque o ambiente não oferece a infraestrutura segura exigida. Nada foi simulado na interface.

## Assistente de IA
**Por que não foi implementado:** exige uma chave de API e um backend para guardá-la (chave nunca pode ir ao frontend). Não havia credenciais nem servidor. O site atual é 100% estático.

**O que será necessário:**
1. Conta/chave de API do provedor de IA, guardada como segredo no host.
2. Um endpoint de servidor (ex.: função serverless) que receba a pergunta, aplique um *system prompt* em português e chame a API.
3. Proteções: limite de requisições por IP, limite de tamanho de entrada e de saída, tempo máximo, orçamento mensal com alerta, CORS restrito ao domínio do site.
4. Base de conhecimento *real* sobre o Caply Tools e os serviços (preços, prazos, contato), fornecida por Igor. Sem ela o assistente deve dizer que não sabe, nunca inventar condições comerciais.
5. Aviso de privacidade atualizado (as perguntas passariam a sair do navegador) e relaxar a CSP `connect-src` apenas para o endpoint.
6. As quatro ferramentas continuam independentes: o widget deve ser carregado de forma opcional.

## Links curtos próprios (ex.: `whatslink.igorcabral.dev.br/codigo`)
**Por que não foi implementado:** exige armazenamento persistente, um serviço de redirecionamento e DNS, nada disso disponível (e o DNS não deve ser alterado automaticamente).

**O que será necessário:**
1. Subdomínio dedicado apontado para o host (ação manual no DNS).
2. Banco de dados chave-valor (código → número + mensagem) e rota de redirecionamento.
3. Página intermediária com marca WhatsLink "by Igor Cabral", contagem de 5 s e botão "Abrir agora" (precisa de JS e de CSP própria).
4. Controles contra abuso: limite de criação por IP, códigos aleatórios longos o bastante, bloqueio de mensagens com links suspeitos, lista de denúncia/remoção, expiração opcional.
5. Aspectos legais: os números de telefone passam a ser armazenados (dado pessoal): atualizar a política de privacidade, prever exclusão sob pedido (LGPD).

Recomendação de ordem: primeiro links curtos (valor direto para o usuário), depois o assistente.
