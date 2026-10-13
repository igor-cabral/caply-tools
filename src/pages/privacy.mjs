import { site } from '../config.mjs';

export default function privacy() {
  const body = `
<div class="page-head"><div class="wrap"><p class="crumbs"><a href="/">Início</a> / Privacidade</p><h1>Privacidade<span class="dot">.</span></h1><p class="lead">Em resumo: o que você digita ou escolhe nas ferramentas fica no seu navegador.</p></div></div>
<div class="wrap"><div class="prose">
  <section class="prose-block">
    <h2>O que acontece com seus dados</h2>
    <p>Nenhuma ferramenta do Caply Tools exige cadastro. Textos, links, senhas de Wi-Fi, números de telefone, listas de participantes, imagens e arquivos de áudio são processados localmente pelo seu navegador e não são enviados a nenhum servidor desta plataforma.</p>
    <p>Os arquivos desta versão do site são estáticos: não há banco de dados, contas de usuário nem endpoints que recebam o que você digita.</p>
  </section>
  <section class="prose-block">
    <h2>Cookies e métricas</h2>
    <p>Esta versão não define cookies nem inclui ferramentas de análise ou publicidade. Se isso mudar no futuro, esta página será atualizada antes e a mudança será informada com clareza.</p>
  </section>
  <section class="prose-block">
    <h2>Serviços de terceiros</h2>
    <p>O Caply Tools não carrega fontes, scripts ou imagens de serviços externos. Os links para o WhatsApp (<code>wa.me</code>) só são acessados quando você os abre. Hospedagem e provedores de rede podem registrar acessos técnicos (como endereço IP) conforme as regras deles.</p>
  </section>
  <section class="prose-block">
    <h2>Contato</h2>
    <p>Para dúvidas sobre este projeto, visite <a href="${site.authorUrl}" rel="noopener">igorcabral.dev.br</a>.</p>
  </section>
</div></div>`;
  return {
    path: '/privacidade/',
    title: 'Privacidade | Caply Tools',
    description: 'Como o Caply Tools trata seus dados: as ferramentas funcionam no navegador, sem cadastro e sem envio de arquivos a servidores.',
    body,
  };
}
