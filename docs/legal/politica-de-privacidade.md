# Política de Privacidade — StarTouch

> ⚠️ **RASCUNHO — NÃO VIGENTE.** Este documento ainda não foi publicado e não
> produz efeitos. A versão em vigor, quando houver, estará em
> startouch.com.br/privacidade e startouch.com.br/termos.

**Versão 1.0 — vigente a partir de [DATA DE PUBLICAÇÃO]**

---

## 1. Quem somos

A StarTouch é uma marca operada por:

**GT6 Brasil Comércio Varejista de Produtos Diversos Ltda**
CNPJ 31.556.596/0001-34
Rua Cristovan de Vita, 260 — Galpão 17 e 18, Sala F
Jardim Elias — Vargem Grande Paulista/SP — CEP 06734-452

Para os fins da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), a GT6 Brasil é a **controladora** dos dados pessoais tratados no site startouch.com.br e no painel StarTouch.

**Encarregado pelo Tratamento de Dados Pessoais (DPO):** Ricardo Fiorini
**Contato para assuntos de privacidade:** privacidade@startouch.com.br

---

## 2. O que a StarTouch faz, em termos de dados

É importante entender o desenho do produto antes das listas, porque ele explica por que coletamos pouco.

A StarTouch vende dispositivos físicos (placas, cartões e pulseiras com NFC e QR Code) que levam o cliente de um estabelecimento direto à página de avaliação daquele estabelecimento no Google. Junto com o dispositivo vem um painel de gestão, usado pelo dono do estabelecimento.

Isso cria três grupos distintos de pessoas, tratados de formas muito diferentes:

| Quem | O que coletamos |
|---|---|
| **O lojista** — quem compra o dispositivo e usa o painel | Dados de cadastro, contato, pedido e uso da plataforma |
| **O consumidor final** — quem encosta o celular no dispositivo | **Nenhum dado pessoal.** Registramos apenas contagem e formato do toque |
| **O visitante do site** — quem navega em startouch.com.br | Dados de navegação, sujeitos ao seu consentimento |

A seção 4 detalha o segundo grupo, porque é o ponto onde a maioria das soluções concorrentes coleta e nós deliberadamente não coletamos.

---

## 3. Dados do lojista (cliente StarTouch)

### 3.1 O que coletamos e por quê

**Cadastro e conta**
Nome, e-mail, telefone e senha (armazenada apenas como *hash* criptográfico — não temos acesso à senha em si).
*Base legal:* execução de contrato (Art. 7º, V).

**Dados do estabelecimento**
Nome do negócio, endereço, identificador do perfil no Google (*place_id*) e e-mail do responsável.
*Base legal:* execução de contrato (Art. 7º, V).

**Pedidos de dispositivos**
Nome, e-mail, telefone, CPF ou CNPJ, CEP, logradouro, número, complemento, bairro, cidade e estado.
*Base legal:* execução de contrato (Art. 7º, V) e cumprimento de obrigação legal e regulatória, notadamente fiscal (Art. 7º, II).
O CPF ou CNPJ é exigido pelo processador de pagamentos e pela legislação fiscal aplicável à emissão do documento de venda.

**Preferências de alerta**
E-mail e telefone indicados pelo lojista para receber avisos da plataforma — por exemplo, aviso de avaliação negativa.
*Base legal:* execução de contrato (Art. 7º, V).

**Registro de e-mails enviados**
Endereço de destino, tipo de mensagem, data e status de entrega.
*Base legal:* legítimo interesse (Art. 7º, IX) — comprovação de entrega, controle de frequência e prevenção de envios duplicados.

**Dados de contato comercial (leads)**
Quando você solicita um diagnóstico gratuito ou demonstra interesse em um produto: nome, e-mail, WhatsApp, nome do negócio, cidade e bairro.
*Base legal:* diligências preliminares a pedido do titular (Art. 7º, V, parte final).

**Vínculo de dispositivos adquiridos por marketplace**
Quando a compra é feita por canal de terceiro, recebemos nome e telefone do comprador para vincular o dispositivo à conta correta.
*Base legal:* execução de contrato (Art. 7º, V).

### 3.2 O que fazemos com esses dados

Criar e manter sua conta; processar e entregar seu pedido; emitir documentos fiscais; enviar comunicações operacionais sobre sua conta e seus pedidos; enviar alertas que você configurou; prestar suporte; e, quando você optar por recebê-los, enviar conteúdos e novidades.

**Não vendemos, alugamos ou cedemos dados pessoais a terceiros para fins de marketing.**

---

## 4. Dados do consumidor final (quem encosta o celular no dispositivo)

Esta seção descreve o caso de uso central do produto, e merece leitura atenta por parte do lojista.

### 4.1 Não coletamos dados pessoais no toque

Quando alguém aproxima o celular de um dispositivo StarTouch ou lê o QR Code, ocorre um redirecionamento para a página de avaliação do estabelecimento no Google. Nesse trajeto, registramos exclusivamente:

- data e hora do toque;
- formato de acesso (NFC, QR Code ou link direto);
- se o acesso partiu de dispositivo móvel ou de computador;
- domínio de origem, quando houver.

**Não vinculamos endereço IP ao toque. Não registramos identificador de aparelho. Não registramos nome, telefone, e-mail ou qualquer forma de contato.** Não há formulário, não há cadastro e não há instalação de aplicativo.

Uma ressalva, em nome da precisão: a página intermediária consulta nossos servidores para exibir o nome do estabelecimento, e essa consulta passa pelo mecanismo de proteção contra uso automatizado abusivo descrito na seção 6.3, que registra temporariamente o endereço IP de origem. Esse registro existe exclusivamente para segurança do serviço, tem prazo curto de retenção, não é cruzado com o registro de toques e não permite reconstruir quem acionou qual dispositivo.

Essa restrição é deliberada e está implementada no código: o registro de toque foi construído sem os campos que permitiriam identificar uma pessoa. O resultado é uma métrica de volume — quantos toques o dispositivo recebeu, em que formato — que não se conecta a nenhum indivíduo.

### 4.2 Rastreamento publicitário na página intermediária

A página intermediária pela qual o consumidor passa antes de chegar ao Google **não carrega cookies de análise ou de publicidade**. Ela existe apenas para executar o redirecionamento.

### 4.3 A avaliação em si acontece no Google

Ao chegar à página de avaliação, o consumidor passa a interagir com o Google, não com a StarTouch. O que ele escreve, a nota que atribui e o vínculo com sua conta Google são tratados pelo Google, sob a política de privacidade daquela empresa. A StarTouch não intermedeia, não filtra e não tem acesso privilegiado a esse conteúdo — ele se torna público como qualquer avaliação do Google.

---

## 5. Dados de avaliadores exibidos no painel

O painel StarTouch exibe ao lojista as avaliações públicas do perfil dele no Google, obtidas por meio da API oficial do Google Places. Essas avaliações incluem o nome público e a foto de perfil de quem avaliou.

*Base legal:* legítimo interesse (Art. 7º, IX), incidindo sobre dados tornados manifestamente públicos pelo próprio titular no momento em que publicou a avaliação (Art. 7º, § 4º).

Não enriquecemos, não cruzamos com outras bases e não usamos esses dados para qualquer finalidade além da exibição ao lojista titular do perfil. O armazenamento é temporário, em cache técnico, com expurgo automático conforme a seção 9.

Se você é autor de uma avaliação e deseja que a cópia em nosso cache seja eliminada, escreva para privacidade@startouch.com.br. A avaliação original permanecerá no Google, e sua remoção de lá deve ser solicitada diretamente àquela empresa.

---

## 6. Dados de navegação no site

### 6.1 Cookies e tecnologias semelhantes

O site startouch.com.br utiliza:

**Cookies necessários** — indispensáveis ao funcionamento: manutenção de sessão, segurança e registro da sua escolha sobre cookies. Não podem ser desativados.
*Base legal:* legítimo interesse (Art. 7º, IX).

**Cookies de análise** — Google Analytics 4, para entender como as páginas são utilizadas.
*Base legal:* consentimento (Art. 7º, I).

**Cookies de publicidade** — Meta Pixel, para mensurar campanhas e apresentar anúncios.
*Base legal:* consentimento (Art. 7º, I).

Os cookies de análise e de publicidade só são ativados após aceite no aviso exibido no primeiro acesso. Você pode alterar sua decisão a qualquer momento pelo link "Preferências de cookies" no rodapé, e também pode bloquear cookies nas configurações do seu navegador.

### 6.2 Medição de conversão de compras

Quando uma compra é concluída, enviamos ao Google Analytics um evento de conversão contendo o valor da compra e um identificador anônimo de navegador. Não enviamos nome, e-mail, CPF ou endereço nesse evento.

### 6.3 Registros técnicos e proteção contra abuso

Para impedir uso automatizado abusivo de funcionalidades gratuitas, registramos temporariamente o endereço IP de quem faz requisições, associado a um contador. O IP é dado pessoal e o tratamento se justifica pela segurança do serviço.
*Base legal:* legítimo interesse (Art. 7º, IX).

Nossa infraestrutura de hospedagem também mantém registros de acesso à aplicação, conforme exigido pelo Art. 15 do Marco Civil da Internet (Lei nº 12.965/2014).

### 6.4 Identificador de navegação

Atribuímos ao navegador do visitante um identificador aleatório, armazenado localmente no próprio dispositivo, para medir a jornada dentro do site de forma agregada. Ele não é vinculado ao seu nome, e-mail ou conta.
*Base legal:* legítimo interesse (Art. 7º, IX).

---

## 7. Com quem compartilhamos dados

Utilizamos prestadores de serviço que atuam como **operadores**, tratando dados exclusivamente sob nossa instrução:

| Prestador | Finalidade | Dados envolvidos |
|---|---|---|
| **Supabase** | Banco de dados e autenticação | Cadastro, pedidos, preferências, registros |
| **Vercel** | Hospedagem e execução da aplicação | Registros técnicos de acesso |
| **Mercado Pago** | Processamento de pagamentos | Nome, e-mail, telefone, CPF/CNPJ, endereço |
| **Resend** | Envio de e-mails | Nome e e-mail do destinatário |
| **Google (Places API)** | Consulta de perfis e avaliações públicas | Identificador do perfil do estabelecimento |
| **Google (Analytics)** | Análise de uso do site | Dados de navegação e identificador de navegador |
| **Meta** | Mensuração de campanhas publicitárias | Dados de navegação e identificador de navegador |
| **ViaCEP** | Preenchimento automático de endereço | CEP informado |
| **OpenAI, Google e Perplexity** | Consultas do produto IA Radar | Nome, categoria e cidade do estabelecimento — dados de empresa, não de pessoa física |

Também poderemos compartilhar dados quando houver determinação legal, ordem judicial ou requisição de autoridade competente, e em caso de reorganização societária, hipótese em que a presente Política continuará aplicável.

### 7.1 Transferência internacional

Os prestadores acima operam infraestrutura fora do Brasil. Isso caracteriza transferência internacional de dados, realizada com fundamento no Art. 33 da LGPD e amparada nos instrumentos contratuais aplicáveis, incluindo cláusulas-padrão contratuais quando cabível.

---

## 8. Segurança

Adotamos medidas técnicas e administrativas para proteger os dados pessoais, entre elas:

- comunicação criptografada em trânsito (HTTPS) em todo o site e painel;
- senhas armazenadas exclusivamente como *hash*, jamais em texto legível;
- arquitetura em que o navegador do usuário não acessa o banco de dados diretamente — toda leitura e escrita passa por uma camada de servidor que valida a identidade e a permissão de quem pede;
- isolamento por linha no banco de dados, de modo que cada cliente acesse apenas os próprios registros;
- controle de acesso restrito às pessoas que precisam dele para operar o serviço.

Nenhum sistema é imune a incidentes. Caso ocorra incidente de segurança com risco relevante aos titulares, comunicaremos a Autoridade Nacional de Proteção de Dados e os titulares afetados, nos prazos e na forma da regulamentação vigente.

---

## 9. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Cadastro e dados da conta | Enquanto a conta existir, e por até 5 anos após o encerramento |
| Pedidos e dados fiscais | 5 anos, contados do encerramento do exercício, por exigência fiscal |
| Preferências de alerta | Enquanto a conta existir |
| Registro de e-mails enviados | 12 meses |
| Leads que não se tornaram clientes | 24 meses a partir do último contato |
| Registro de toques nos dispositivos | Indefinidamente — não contém dado pessoal |
| Cache de avaliações do Google | Até 30 dias, limite estabelecido pelos termos da API do Google. Na prática, o conteúdo é renovado a cada poucas horas e o registro é eliminado por rotina automática de expurgo |
| Registros de proteção contra abuso (IP) | 30 dias |
| Identificador de navegação | 12 meses |
| Registros de acesso à aplicação | 6 meses, conforme Art. 15 do Marco Civil da Internet |

Findo o prazo, os dados são eliminados ou anonimizados, ressalvadas as hipóteses de guarda autorizadas pelo Art. 16 da LGPD.

---

## 10. Seus direitos

A LGPD garante a você, titular, os seguintes direitos (Art. 18):

- **confirmação** da existência de tratamento;
- **acesso** aos seus dados;
- **correção** de dados incompletos, inexatos ou desatualizados;
- **anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desconformidade com a lei;
- **portabilidade** a outro fornecedor;
- **eliminação** dos dados tratados com base em consentimento;
- **informação** sobre com quem compartilhamos seus dados;
- **informação** sobre a possibilidade de não consentir e as consequências disso;
- **revogação do consentimento**;
- **oposição** a tratamento fundado em uma das hipóteses de dispensa de consentimento;
- **revisão** de decisões automatizadas que afetem seus interesses.

### Como exercer

Escreva para **privacidade@startouch.com.br** ou utilize o formulário disponível em startouch.com.br/privacidade/solicitacao.

Responderemos em até **15 dias**. Poderemos solicitar informações adicionais para confirmar sua identidade, medida de segurança destinada a impedir que terceiros acessem dados que não lhes pertencem.

Se você entender que sua solicitação não foi adequadamente atendida, tem o direito de peticionar à Autoridade Nacional de Proteção de Dados (ANPD).

---

## 11. Crianças e adolescentes

A StarTouch é um serviço destinado a empresas e seus responsáveis. Não direcionamos nossos produtos a menores de 18 anos e não coletamos conscientemente dados de crianças e adolescentes. Se identificarmos coleta involuntária, os dados serão eliminados.

---

## 12. Alterações nesta Política

Podemos atualizar esta Política para refletir mudanças no serviço ou na legislação. A versão vigente estará sempre disponível nesta página, com a data de vigência no topo.

Alterações que reduzam direitos ou ampliem finalidades de tratamento serão comunicadas por e-mail aos clientes ativos com antecedência mínima de 15 dias.

---

## 13. Contato

**Encarregado pelo Tratamento de Dados Pessoais:** Ricardo Fiorini
**E-mail:** privacidade@startouch.com.br
**Endereço:** Rua Cristovan de Vita, 260 — Galpão 17 e 18, Sala F — Jardim Elias — Vargem Grande Paulista/SP — CEP 06734-452

Para assuntos comerciais e de suporte, o canal continua sendo contato@startouch.com.br.

---

*GT6 Brasil Comércio Varejista de Produtos Diversos Ltda — CNPJ 31.556.596/0001-34*
