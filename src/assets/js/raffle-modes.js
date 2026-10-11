// Modalidades do Sorteador. Módulo compartilhado: o build gera uma página por modalidade
// e o navegador usa os mesmos dados para trocar de modalidade sem recarregar.
export const MODES = [
  { id: 'nomes', path: '/sorteador/', label: 'Nomes', action: 'Sortear', h1: 'Sorteador de nomes',
    title: 'Sorteador de nomes online grátis | Caply Tools',
    description: 'Cole uma lista de nomes e sorteie um ou mais vencedores, com ou sem repetição. Aleatoriedade do navegador, grátis e sem cadastro.',
    help: 'Cole uma lista de nomes e sorteie um ou vários vencedores. Por padrão, cada pessoa só pode sair uma vez.' },
  { id: 'numeros', path: '/sorteador/numeros/', label: 'Números', action: 'Sortear números', h1: 'Sorteador de números',
    title: 'Sorteador de números online grátis | Caply Tools',
    description: 'Sorteie números inteiros em qualquer intervalo, com ou sem repetição. Grátis, sem cadastro, com resultado para copiar, imprimir ou baixar.',
    help: 'Escolha o menor e o maior número e quantos quer sortear. Você decide se o mesmo número pode sair mais de uma vez.' },
  { id: 'equipes', path: '/sorteador/equipes/', label: 'Equipes e grupos', action: 'Formar equipes', h1: 'Gerador de equipes',
    title: 'Gerador de equipes e grupos aleatórios | Caply Tools',
    description: 'Divida participantes em equipes ou grupos aleatórios de tamanhos equilibrados, com regras para separar pessoas. Grátis e sem cadastro.',
    help: 'Divide a lista em equipes ou grupos com tamanhos o mais iguais possível. Você pode indicar pessoas que não devem ficar juntas.' },
  { id: 'ordem', path: '/sorteador/ordem/', label: 'Ordem', action: 'Sortear a ordem', h1: 'Sorteio de ordem',
    title: 'Sorteio de ordem de apresentação online | Caply Tools',
    description: 'Sorteie a ordem de apresentação, de fala ou de participação de uma lista de nomes. Grátis, sem cadastro; copie, imprima ou baixe o resultado.',
    help: 'Sorteia a ordem em que cada pessoa vai se apresentar, falar ou participar.' },
  { id: 'chaves', path: '/sorteador/chaves/', label: 'Chaves e confrontos', action: 'Sortear chave', h1: 'Sorteio de chaves',
    title: 'Sorteio de chaves e confrontos de torneio | Caply Tools',
    description: 'Monte uma chave eliminatória ou sorteie confrontos em duplas, com folgas distribuídas ao acaso. Grátis, sem cadastro, direto no navegador.',
    help: 'Monta uma chave eliminatória ou sorteia confrontos em duplas. Quando sobra uma pessoa, ela fica de folga.' },
];
export const modeById = (id) => MODES.find((m) => m.id === id) || MODES[0];
