// ============================================================
// StarTouch — FONTE ÚNICA das dicas da semana
// ============================================================
// Um só lugar pra o conteúdo das dicas. Consumido por DOIS canais:
//   1) E-mail semanal  → api/_lib/email-templates.js (weeklyTipEmail)
//                        + api/cron/weekly-tips.js
//   2) Artigo no site  → scripts/build-articles.mjs (a "fábrica")
// Editar aqui muda os dois. ESM puro (roda no build Node e na function).
//
// AGENDA: 1 dica em cada dia de envio definido em SEND_WEEKDAYS (hoje: terça).
// A cada envio o cron manda TIPS[periodNumber % N] por e-mail; o artigo
// correspondente passa a existir no site (publishedTips) + no sitemap.
// "Na medida que a dica é publicada, ela vira artigo." Segunda fica só pro
// resumo semanal (weekly-digest) — dica e resumo nunca caem no mesmo dia.
// Trocar os dias de envio = só mudar SEND_WEEKDAYS.
//
// Campos: slug (url do artigo) · tag ("Google"|"IA") · headline (assunto
// do e-mail + H1) · seoTitle/metaDescription (busca) · lead (abertura do
// artigo) · paragraphs (corpo, compartilhado) · cta (botão do e-mail).
// ============================================================

// ⚠️ CHAVE DA FÁBRICA DE ARTIGOS — false = nenhum artigo de dica no site.
//
// POR QUE ISTO EXISTE, e não só uma data futura:
// O plano "sem armar" de 2026-07-17 desarmou o e-mail tirando o cron
// weekly-tips do vercel.json, e contava com PROGRAM_START ser "uma data
// futura" pra segurar o artigo. Data futura não segura nada: ela chega.
// Em 2026-09-01 o placeholder virou hoje, o build rodou como roda em todo
// deploy, e o artigo "responder-avaliacoes-google" foi ao ar sozinho —
// sem ninguém armar, sem e-mail nenhum ter saído, sem aviso.
// Placeholder de data é bomba-relógio: para de ser futuro sem avisar.
// Interruptor explícito não expira. Este é o interruptor.
//
// ARMAR a fábrica de artigos = trocar este flag pra true E conferir se
// PROGRAM_START é a TERÇA de estreia que você quer (>= dia do deploy + 1).
// O e-mail é uma chave separada: readicionar no vercel.json
// { "path": "/api/cron/weekly-tips", "schedule": "0 12 * * *" }.
export const ARTICLES_ARMED = false;

// 1ª dica (data de ENVIO aos clientes) — deve ser uma TERÇA. A prévia pro
// admin sai 1 dia antes (segunda). Só passa a valer com ARTICLES_ARMED=true.
export const PROGRAM_START = "2026-09-01"; // TERÇA
// Dias de envio da dica (getUTCDay), 12:00 UTC = 9h BRT. HOJE: só TERÇA (2).
// Segunda (weekday 1) fica reservada pro resumo semanal — NUNCA use a segunda
// aqui. Pra acrescentar dias: [2,4] terça+quinta, [2,4,6] +sábado, etc.
export const SEND_WEEKDAYS = [2];
const START_MS = Date.parse(PROGRAM_START + "T12:00:00Z");
const DAY_MS = 24 * 3600 * 1000;

const APP = "/app?login=1";

export const TIPS = [
  {
    slug: "responder-avaliacoes-google",
    tag: "Google",
    headline: "Quem reclamou talvez não volte. Mas quem está lendo, sim.",
    seoTitle: "Responder avaliações no Google: por que traz mais clientes",
    metaDescription: "A resposta que você dá numa avaliação é lida por dezenas de futuros clientes. Veja por que responder (bem) importa mais que a nota — e como fazer em 5 minutos.",
    lead: "Aquela avaliação parada, sem resposta, não foi escrita pra você. Foi escrita pro seu próximo cliente — e é ele quem está lendo agora.",
    paragraphs: [
      "Toda semana a gente abre dezenas de perfis e vê a mesma cena: uma avaliação ruim de meses atrás, parada, sem resposta. O dono nem lembra dela. Mas ela continua ali, sendo lida por quem ainda está decidindo se vai no seu negócio.",
      "O detalhe que quase ninguém percebe: aquela avaliação não foi escrita pra você. Foi escrita pro seu próximo cliente. Quem reclamou já foi. Quem importa é quem está com o celular na mão agora, comparando você com o concorrente e olhando como você reagiu.",
      "Silêncio ali diz \"ninguém toma conta disso\". Uma resposta calma, mesmo numa crítica dura, diz o contrário. E não é a nota que convence quem lê — é o tom.",
      "Resolver leva cinco minutos: abra o Google logado na conta da empresa, pesquise seu negócio e toque em Avaliações. Nas boas, diga o que a pessoa elogiou (não só \"obrigado\"). Nas ruins, não discuta — reconheça e chame pro particular: \"sinto muito, me chama no [telefone] que resolvo\".",
      "Quem lê julga muito mais o seu jeito de responder do que o motivo da reclamação. E metade dos seus concorrentes simplesmente não responde.",
    ],
    cta: { text: "Ver minhas avaliações →", url: APP },
  },
  {
    slug: "perguntas-e-respostas-google-meu-negocio",
    tag: "IA",
    headline: "Tem um campo do seu Google que o concorrente pode responder por você",
    seoTitle: "Perguntas e respostas do Google: preencha você mesmo (e por quê)",
    metaDescription: "A seção de Perguntas e respostas do seu perfil no Google é aberta — qualquer um responde, até um concorrente. Veja como tomar esse espaço de volta em minutos.",
    lead: "Poucos donos sabem: qualquer pessoa pode perguntar E responder na seção de Perguntas e respostas do seu perfil. Inclusive quem você não gostaria.",
    paragraphs: [
      "Poucos donos sabem, e é meio assustador quando descobrem: a seção de \"Perguntas e respostas\" do seu perfil no Google é aberta. Qualquer um pode fazer uma pergunta ali — e qualquer um pode respondê-la. Inclusive um cliente que entendeu tudo errado. Inclusive um concorrente.",
      "Já vimos \"Vocês ainda estão funcionando?\" respondido por um estranho com um \"acho que fecharam\". Fica lá, no ar, do lado do seu nome, pra quem pesquisa ver.",
      "A boa notícia é que dá pra tomar esse espaço de volta em poucos minutos — e ele rende mais do que parece. Esse conteúdo não é lido só por gente. O ChatGPT e o Gemini também olham ali quando alguém pede uma indicação. Com as dúvidas comuns já respondidas, com as suas palavras, você aparece na hora certa.",
      "Como fazer: abra seu negócio no Google Maps logado na conta da empresa e role até \"Perguntas e respostas\", perto das avaliações. Toque em \"Faça uma pergunta\", escreva uma dúvida real de cliente e responda você mesmo. Comece pelas que mais aparecem no balcão: aceita Pix, faz entrega, tem estacionamento, atende sábado.",
      "Pensa assim: se um cliente já te perguntou isso pessoalmente, outros dez pesquisaram no Google sem perguntar. Melhor acharem a sua resposta do que a de um desconhecido.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "horario-de-feriado-no-google",
    tag: "Google",
    headline: "Dois minutos antes do feriado que evitam uma estrela injusta",
    seoTitle: "Horário de feriado no Google: evite a nota 1 estrela injusta",
    metaDescription: "Cliente na porta fechada num feriado vira avaliação de 1 estrela — por um campo desatualizado. Veja como cadastrar o horário especial no Google em 2 minutos.",
    lead: "A pior nota ruim é a que você não merecia — o cliente que foi até a loja num feriado e achou fechado, porque o horário no Google estava desatualizado.",
    paragraphs: [
      "Semana dessas apareceu um perfil aqui com uma avaliação de uma estrela que não tinha nada a ver com o serviço. O cliente foi até a loja num feriado, achou fechado, e desabafou ali mesmo, na frente de todo mundo. O detalhe: a loja até tinha aberto em horário especial. Só que ninguém avisou o Google.",
      "É o tipo de nota ruim mais frustrante de todas — a que você não merecia. A pessoa confia no que o Google mostra, se desloca, encontra a porta fechada e descarrega. Não foi o seu produto nem o seu atendimento. Foi um campo desatualizado.",
      "Tem um agravante que pouca gente conhece: quando você não cadastra o horário de um feriado, o próprio Google avisa quem pesquisa que \"o horário pode variar\". A dúvida é plantada antes da pessoa sair de casa.",
      "Resolver é bobo: alguns dias antes do feriado, pesquise sua empresa no Google logado, entre em Editar perfil → Horários → Horários especiais e coloque a data com o horário certo, ou marque como fechado. Já aproveita e confere a véspera e a emenda, que costumam confundir.",
      "Vira um hábito fácil: feriado à vista, dois minutos no perfil antes de fechar a semana. Um lembrete no celular resolve.",
    ],
    cta: { text: "Atualizar meu horário →", url: APP },
  },
  {
    slug: "nome-endereco-telefone-iguais-google",
    tag: "IA",
    headline: "O erro invisível que faz o Google desconfiar de você",
    seoTitle: "Nome, endereço e telefone iguais: por que importa no Google e IA",
    metaDescription: "Informação desencontrada entre Google, redes e site faz o Google (e as IAs) desconfiarem e te deixarem de fora. Veja como padronizar seus dados em meia hora.",
    lead: "Seu telefone de um jeito no Google, outro no Instagram, um terceiro num guia antigo. Cada um certo — mas juntos criam um problema silencioso.",
    paragraphs: [
      "Esse é sorrateiro, porque nem parece um erro. Seu telefone está de um jeito no Google, com um dígito diferente no Instagram, e num guia antigo aparece o número que você nem usa mais. Cada um certo à sua maneira. Só que, juntos, eles criam um problema.",
      "O Google — e agora as IAs também — cruzam essas informações pra ter certeza de quem é você e onde você fica. Quando tudo bate, a confiança sobe. Quando cada lugar diz uma coisa, entra a dúvida. E negócio com informação desencontrada é deixado de lado na hora de recomendar, mesmo sem nada de errado com o serviço.",
      "A gente vê isso o tempo todo: empresa boa que \"some\" da busca não porque fez algo errado, mas porque mudou de telefone, de sala ou de horário e atualizou num lugar só.",
      "Como resolver: pega um papel e escreve a versão oficial — nome exato, endereço completo, telefone com DDD. Depois passa nos três lugares principais (Google, Instagram ou Facebook, e seu site se tiver) e deixa tudo idêntico. Idêntico mesmo: \"Av.\" num lugar e \"Avenida\" no outro já conta como diferente pra máquina.",
      "É meia hora de trabalho chato que resolve um problema que muita gente nem sabe que tem. E, depois de arrumado, é só manter.",
    ],
    cta: { text: "Conferir meus dados →", url: APP },
  },
  {
    slug: "posts-do-google-meu-negocio",
    tag: "Google",
    headline: "Quase ninguém usa esse espaço grátis do Google",
    seoTitle: "Posts do Google Meu Negócio: o espaço grátis que quase ninguém usa",
    metaDescription: "O Google deixa você publicar novidades e promoções direto no perfil — e mostra pra quem te busca. Veja como usar os posts e por que a constância importa.",
    lead: "Tem um espaço grátis no seu perfil do Google que a maioria nunca usou — e quem usa aparece na frente, porque o Google valoriza perfil com sinal de vida.",
    paragraphs: [
      "Tem um lugar no seu perfil do Google que quase ninguém preenche, e é de graça: os \"posts\" — aquele espacinho onde dá pra publicar um aviso, uma novidade, uma promoção. A maioria dos perfis que a gente abre nunca postou nada ali. E quem posta aparece na frente, porque o Google gosta de perfil que dá sinal de vida.",
      "Pensa no que passa pela cabeça de quem pesquisa você: se a última movimentação visível é de dois anos atrás, bate aquela dúvida — \"será que ainda funciona?\". Um post recente responde isso sem você dizer uma palavra.",
      "Não precisa ser nada elaborado. Uma novidade. Um horário especial. A promoção da semana. Uma foto do produto que acabou de chegar. Leva o mesmo tempo de um story no Instagram — só que aqui aparece pra quem já está te procurando, na hora de decidir.",
      "Como fazer: pesquise seu negócio no Google logado na conta da empresa e toque em \"Adicionar novidade\" (ou \"Promoções\"). Escolha entre novidade, oferta ou evento, escreva uma frase, coloque uma foto boa e publique. Se der, adiciona um botão tipo \"Ligar\" ou \"Como chegar\".",
      "O truque é a constância. Um post por semana, sempre no mesmo dia, já mantém o perfil vivo. Escolhe um dia fixo e vira rotina — cinco minutos, e você está fazendo o que a maioria dos concorrentes esquece.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "frase-que-define-seu-negocio",
    tag: "IA",
    headline: "Se perguntassem o que você faz, em uma frase, qual seria?",
    seoTitle: "A frase que define seu negócio (e ensina Google e IA a te indicar)",
    metaDescription: "\"Cabeleireiro\" é vago; \"salão de cachos no centro\" diz quando te recomendar. Veja como montar a frase que faz Google e IA saberem pra quem te mostrar.",
    lead: "Em uma frase, o que é o seu negócio? A resposta é o que ensina o Google e as IAs a te encaixar quando alguém pede uma indicação.",
    paragraphs: [
      "Responde rápido, sem pensar muito: em uma frase, o que é o seu negócio? Não o nome — o que você faz, pra quem e onde.",
      "Parece pergunta boba, mas é a chave de uma coisa importante. É mais ou menos assim que o Google e as IAs aprendem a te encaixar quando alguém pede uma indicação. \"Cabeleireiro\" é vago demais — tem milhares. Agora \"salão especializado em cachos no centro de Sorocaba\" já diz exatamente quando te recomendar. \"Mercado\" é genérico; \"mercadinho de bairro com hortifrúti e entrega na Vila Nova\" já tem endereço na resposta.",
      "Quanto mais genérica a sua descrição, mais você depende da sorte. Quanto mais específica, mais a máquina sabe pra quem te mostrar.",
      "E tem um bônus: essa mesma frase serve em todo lugar. Escreve uma vez e usa na descrição do Google, na bio do Instagram, no topo do site.",
      "Como fazer: monta a frase juntando três coisas — o que você é, sua especialidade e o bairro ou cidade. Depois cola na descrição do Google (Editar perfil → Descrição) e repete nas redes.",
      "Cinco minutos, e resolve uma confusão que segura muita gente boa: a máquina não te ignora por você ser ruim. Te ignora por não saber, com clareza, o que você é.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "fotos-no-perfil-do-google",
    tag: "Google",
    headline: "A foto que traz cliente não é a que você mais gosta",
    seoTitle: "Fotos no perfil do Google: quais realmente trazem cliente",
    metaDescription: "Não são as mais bonitas — são as mais reais e recentes. Veja que fotos convertem no seu perfil do Google e por que foto parada afasta cliente.",
    lead: "A foto que traz cliente não é a mais bonita nem a mais profissional. É a mais real — e a mais recente.",
    paragraphs: [
      "Quando a gente olha os perfis que mais convertem, tem um padrão nas fotos que chama atenção. Não são as mais bonitas nem as mais profissionais. São as mais reais — e as mais recentes.",
      "Quem está decidindo quer saber uma coisa antes de ir: \"como é lá dentro?\". Quer ver o produto de verdade (não o do banco de imagens), o balcão, o salão cheio num sábado, a equipe trabalhando. É isso que dá segurança pra sair de casa.",
      "E tem o outro lado, que quase ninguém liga: foto parada conta uma história ruim. Se a última imagem do seu perfil é de 2022, passa a sensação de negócio meio abandonado — mesmo que você esteja lotado todo dia. O Google também repara: perfil com foto nova aparece mais.",
      "Como fazer é a parte fácil: tira uma foto hoje, com luz boa — um produto, o ambiente, alguém da equipe. Abre o Google logado na conta da empresa, toca em \"Adicionar foto\" e sobe, escolhendo a categoria certa (fachada, ambiente, produto).",
      "O segredo não é um ensaio caro uma vez. É uma foto por semana, sempre. Deixa o celular te lembrar numa segunda de manhã. Em um mês você tem um perfil que parece vivo — e é essa impressão que faz o cliente escolher você.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "manter-o-perfil-do-google-atualizado",
    tag: "IA",
    headline: "O que separa quem sobe de quem some no Google",
    seoTitle: "Manter o perfil do Google atualizado: o hábito que separa quem sobe",
    metaDescription: "Presença online não é tarefa de uma vez só. Veja por que a constância decide quem sobe e quem some — e a rotina de 10 minutos por semana que resolve.",
    lead: "A diferença entre os perfis que crescem e os que somem quase nunca é sorte ou verba. É constância.",
    paragraphs: [
      "Se tem uma diferença entre os perfis que crescem e os que somem, não é sorte nem verba. É constância. Os que sobem mexem no perfil de vez em quando; os que somem cadastraram tudo uma vez, lá atrás, e nunca mais olharam.",
      "Faz sentido quando você pensa como a máquina enxerga. O Google e as IAs gostam de sinais de vida: informação atualizada, foto nova, avaliação recente respondida. Um mercadinho de bairro que ajusta o horário do feriado, sobe uma foto do hortifrúti da semana e responde os clientes está, sem saber, dizendo \"estou aqui, ativo, cuidando disso\". Um perfil congelado há dois anos diz o contrário.",
      "Não é trabalho pesado — é o oposto. O problema é que, por ser pequeno, some da rotina. Aí passa mês sem ninguém olhar.",
      "O jeito que funciona é virar hábito curto e fixo. Uns dez minutos por semana, sempre no mesmo dia, com uma listinha mental: mudou algum horário? Tem foto nova pra subir? Tem avaliação sem resposta? Tem novidade pra postar?",
      "Marca esses dez minutos na agenda, como qualquer compromisso. É o esforço pequeno e repetido que, em alguns meses, coloca você na frente de quem fez tudo uma vez e esqueceu.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "descricao-do-perfil-no-google",
    tag: "Google",
    headline: "O cliente não procura pelo nome da sua loja",
    seoTitle: "Descrição do Google: escreva com as palavras que o cliente busca",
    metaDescription: "O cliente não procura pelo nome da sua loja — procura pelo que precisa. Veja como escrever a descrição do seu perfil com as palavras que ele digita.",
    lead: "O cliente não digita o nome da sua empresa no Google. Ele digita o que precisa — e a sua descrição precisa falar essas palavras.",
    paragraphs: [
      "Faz um teste rápido: quando você precisa de um lugar novo, o que digita no Google? Provavelmente não o nome de uma empresa que você nem conhece. Você digita o que precisa — \"farmácia de plantão perto de mim\", \"oficina que atende sábado\", \"pet shop com banho e tosa no [bairro]\".",
      "Seus clientes fazem igual. E aqui tem um detalhe que muita gente passa batido: a descrição do seu perfil no Google devia falar essas palavras — as que o cliente digita —, não só o nome fantasia e um \"somos os melhores da região\".",
      "Pensa na descrição como a resposta pra pergunta \"isso aqui é pra mim?\". Quanto mais claro você diz o que faz, pra quem e onde, mais fácil o Google te mostrar pra pessoa certa — e mais rápido ela decide.",
      "Como fazer: pesquise seu negócio no Google logado, entre em \"Editar perfil\" e ache o campo \"Descrição da empresa\". Reescreve pensando no cliente: ramo, especialidade e bairro. \"Clínica de fisioterapia com atendimento a domicílio na Vila Hortência\" diz muito mais do que \"a melhor clínica da cidade\".",
      "Foge dos elogios genéricos. \"Tradição e qualidade\" não ajuda ninguém a te achar. O que ajuda é a palavra exata que a pessoa está digitando, com pressa, agora.",
    ],
    cta: { text: "Ver minha descrição →", url: APP },
  },
  {
    slug: "avaliacoes-que-a-ia-le",
    tag: "IA",
    headline: "As IAs leem suas avaliações — e não é só a nota que conta",
    seoTitle: "As IAs leem suas avaliações — e não é só a nota que conta",
    metaDescription: "ChatGPT e Gemini leem o texto das suas avaliações pra decidir se te indicam. Veja por que avaliações detalhadas valem mais — e como incentivá-las.",
    lead: "Todo mundo sabe que avaliação conta pela nota. O que quase ninguém percebeu é que tem uma plateia nova lendo o texto delas: as IAs.",
    paragraphs: [
      "Todo mundo sabe que avaliação conta pela nota. O que quase ninguém percebeu ainda é que tem uma plateia nova lendo o texto delas: as IAs. Quando alguém pergunta ao ChatGPT ou ao Gemini por uma indicação, essas ferramentas passam o olho no que os clientes escreveram sobre você — e usam isso pra decidir se te recomendam e como te descrevem.",
      "Isso muda a conta. Uma avaliação que diz só \"ótimo, recomendo\" vale pela estrela. Mas uma que diz \"fui no salão pra uma progressiva e ficou impecável, atendimento ótimo\" carrega palavras — progressiva, atendimento — que ensinam a máquina pra que você é bom. É diferença de qualidade, não só de quantidade.",
      "Não dá pra ditar o que o cliente escreve. Mas dá pra influenciar com leveza. Quando pedir a avaliação, uma frase simples ajuda: \"se puder, conta rapidinho o que você fez aqui e como foi\". A academia que sugere \"fala do que mais te ajudou\" colhe textos bem mais ricos do que um \"avalia a gente\".",
      "E responder também entra nisso: a sua resposta é mais texto sobre o seu negócio, lido pela mesma máquina.",
      "No fim, avaliação virou duas coisas ao mesmo tempo — prova pra quem lê e informação pra quem recomenda. Quanto mais rica, melhor nos dois.",
    ],
    cta: { text: "Ver minhas avaliações →", url: APP },
  },
  {
    slug: "produtos-e-servicos-no-google",
    tag: "Google",
    headline: "A vitrine que o Google mostra por você — se você preencher",
    seoTitle: "Produtos e serviços no Google: a vitrine que quase ninguém preenche",
    metaDescription: "Cada produto ou serviço listado no seu perfil vira uma palavra que o Google associa a você. Veja como preencher essa vitrine — e por que rende tanto.",
    lead: "Tem uma parte do seu perfil que funciona como vitrine e quase ninguém arruma: a lista de produtos e serviços.",
    paragraphs: [
      "Tem uma parte do perfil que funciona como vitrine e quase ninguém arruma: a lista de produtos e serviços. É ali que um salão listaria corte, escova, coloração, progressiva, cada um com preço; uma oficina, troca de óleo, alinhamento, revisão; uma clínica, as especialidades que atende.",
      "Parece detalhe, mas muda duas coisas. Pra quem olha: a pessoa bate o olho e já sabe se você faz o que ela precisa, sem ligar. E o que quase ninguém sabe: cada item que você escreve ali vira uma palavra que o Google associa ao seu negócio. Quanto mais específico, mais fácil aparecer na busca certa.",
      "O engraçado é que a maioria dos concorrentes deixa esse espaço vazio. É daquelas coisas baratas que já te colocam na frente só por ter feito.",
      "Como fazer: pesquise seu negócio no Google logado e toque em \"Editar produtos\" ou \"Editar serviços\". Adiciona item por item — nome, e se der, preço e foto. Não precisa listar tudo de uma vez; começa pelos cinco ou seis que mais saem.",
      "Reserva quinze minutos numa tarde parada. É tarefa que você faz uma vez e fica trabalhando por você por meses.",
    ],
    cta: { text: "Ver meus serviços →", url: APP },
  },
  {
    slug: "site-simples-para-seu-negocio",
    tag: "IA",
    headline: "Você não precisa de um site caro. Precisa de um cantinho seu.",
    seoTitle: "Site simples para negócio local: você não precisa de site caro",
    metaDescription: "Não é sobre ter um site bonito — é ter um lugar seu, claro, que o Google e as IAs usem como fonte confiável. Veja o mínimo que resolve (e é grátis).",
    lead: "\"Presença na internet\" faz o dono de negócio pequeno imaginar site caro e agência. É bem mais simples — e mais importante — do que parece.",
    paragraphs: [
      "Sempre que o assunto é \"presença na internet\", o dono de negócio pequeno já imagina site caro, agência, mensalidade — e desiste antes de começar. Mas a coisa é bem mais simples do que parece, e mais importante do que muita gente acha.",
      "O ponto não é ter um site bonito. É ter um lugar seu, claro, onde você diga o que faz, onde fica, o horário e como falar com você. Por quê? Porque o Google e as IAs procuram uma fonte confiável sobre o seu negócio pra cruzar com o resto. Um perfil sozinho ajuda; um perfil mais um cantinho próprio, batendo a informação, dá muito mais segurança pra máquina te recomendar.",
      "E não precisa de nada sofisticado. Um mercado de bairro se resolve com uma página simples: nome, endereço, horário, um mapa e um botão de WhatsApp. Uma autopeças, a mesma coisa mais a lista do que vende. Inclusive o próprio Google monta um site básico de graça, a partir do seu perfil.",
      "O mínimo hoje: pesquise seu negócio no Google logado, entre em \"Editar perfil\" e procure a opção \"Site\" — ele cria um automático que você só ajusta. Se já tem site, abre e lê como um cliente novo leria: está claro o que você faz, onde fica e como chamar?",
      "Não precisa ser perfeito. Precisa existir e estar certo.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "atributos-do-perfil-google",
    tag: "Google",
    headline: "Os detalhes que o cliente filtra — e você deixou em branco",
    seoTitle: "Atributos do Google: os detalhes que o cliente filtra",
    metaDescription: "Estacionamento, aceita Pix, acessível: são atributos que o cliente filtra no Google Maps. Campo vazio te tira da lista. Veja como preencher em minutos.",
    lead: "No Google Maps o cliente filtra por \"aceita cartão\", \"tem estacionamento\", \"acessível\". Quem não preencheu esses campos some da lista dele.",
    paragraphs: [
      "Repara numa coisa na próxima vez que procurar algo no Google Maps: dá pra filtrar. \"Aberto agora\", \"aceita cartão\", \"tem estacionamento\", \"acessível\". A pessoa marca o que precisa e quem não tem aquilo simplesmente some da lista dela.",
      "Esses filtros vêm de um lugar que muita gente ignora no perfil: os atributos. São os campinhos de \"sim ou não\" — wi-fi, estacionamento, aceita Pix, acessível para cadeirantes, pet friendly, agendamento online. Parecem bobos, mas cada um resolve uma dúvida real e, pra quem filtra por aquilo, decide se você aparece ou não.",
      "Pensa no dia a dia: quem procura academia perto filtra por estacionamento; quem vai à autopeças quer saber se aceita Pix; a mãe com carrinho procura loja acessível. Campo vazio, o Google não sabe — e na dúvida, te deixa de fora.",
      "Como fazer: pesquise seu negócio no Google logado, entre em \"Editar perfil\" e procure a seção de atributos (às vezes aparece como \"Comodidades\" ou \"Do estabelecimento\"). Marca tudo que se aplica, com sinceridade. Leva uns minutos.",
      "É de graça, ninguém vê você fazendo, e mesmo assim quase nenhum concorrente preenche direito. Um daqueles ajustes silenciosos que trabalham por você toda vez que alguém aperta um filtro.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "como-o-chatgpt-recomenda-negocios",
    tag: "IA",
    headline: "A pergunta que seu cliente já está fazendo pro ChatGPT",
    seoTitle: "Como o ChatGPT recomenda um negócio (e não outro)",
    metaDescription: "Cada vez mais gente pede indicação direto pra uma IA. Veja como ChatGPT e Gemini escolhem quem recomendar — e o que faz o seu nome aparecer.",
    lead: "Uma parte crescente dos clientes já pula o Google e pergunta direto pro ChatGPT: \"me indica uma boa da minha região\". Seu nome aparece?",
    paragraphs: [
      "Antigamente, procurar um serviço novo era abrir o Google, ver uma lista e comparar. Ainda é assim pra muita gente. Mas uma parte crescente já pula essa etapa: abre o ChatGPT (ou o Gemini) e pergunta direto — \"me indica uma boa clínica de fisioterapia no meu bairro\". E vai no que a resposta disser, sem abrir dez abas.",
      "Isso levanta uma pergunta desconfortável: quando alguém faz essa pergunta sobre o seu ramo, na sua cidade, o seu nome aparece? Pra muita gente boa, hoje a resposta é não. E não por ser ruim.",
      "A diferença é que a IA não te conhece de perto. Ela monta a resposta juntando o que encontra espalhado pela internet — seu perfil no Google, o que os clientes escrevem, se a informação bate de um lugar pro outro. Quem tem essa presença clara e consistente é lembrado. Quem tem pouca pegada, ou informação desencontrada, não entra na conversa — mesmo sendo ótimo no que faz.",
      "A boa notícia é que não tem mágica. Tudo que a gente vem conversando aqui — perfil completo, dados iguais em todo lugar, avaliações chegando, informação atualizada — é exatamente o que essas ferramentas usam pra decidir. Você não controla a resposta da IA. Mas alimenta ela, aos poucos, com cada um desses ajustes.",
      "Não é sobre entender de tecnologia. É sobre existir, de forma organizada, onde a decisão está sendo tomada agora.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "mensagens-do-google-meu-negocio",
    tag: "Google",
    headline: "A pergunta que o cliente manda — e ninguém responde",
    seoTitle: "Mensagens do Google Meu Negócio: o canal quente sem resposta",
    metaDescription: "O Google deixa o cliente te mandar mensagem direto do perfil — mas mensagem parada manda ele pro concorrente. Veja como ativar e responder a tempo.",
    lead: "Quem manda mensagem pelo Google já está quase decidindo. Mas mensagem que fica dias sem resposta faz o cliente ir pro concorrente que respondeu.",
    paragraphs: [
      "Teve um caso que ilustra bem. Um pet shop tinha a opção de mensagem ativada no Google e nem sabia. As perguntas chegavam — \"vocês fazem banho em cão grande?\", \"tem horário vago hoje?\" — e ficavam lá, sem resposta, às vezes por dias. Do outro lado, o cliente interpretava o silêncio do jeito óbvio: foi pro concorrente que respondeu.",
      "O Google deixa o cliente te mandar mensagem direto do perfil, meio como um WhatsApp. É um canal quente — quem manda mensagem já está quase decidindo. Mas só ajuda se tiver alguém do outro lado. Mensagem parada é pior do que não ter: cria expectativa e frustra.",
      "Vale por um motivo simples: numa clínica, num salão, numa oficina, muita gente prefere tirar a dúvida por texto antes de ligar. Se você responde rápido, sai na frente.",
      "Como fazer: pesquise seu negócio no Google logado e procure \"Mensagens\" pra ativar. Configura uma resposta automática de boas-vindas (\"Oi! Já te respondemos, um instante\") e instala o app do Google Maps no celular pra receber tudo por lá.",
      "O combinado com a equipe é o que importa: alguém olha e responde no mesmo dia. Nesse caso, rapidez é o que fecha.",
    ],
    cta: { text: "Ativar mensagens →", url: APP },
  },
  {
    slug: "categoria-do-google-meu-negocio",
    tag: "Google",
    headline: "Escolher a categoria errada te esconde de metade dos clientes",
    seoTitle: "Categoria do Google Meu Negócio: a errada te esconde de clientes",
    metaDescription: "A categoria do seu perfil decide em quais buscas você aparece. Categoria genérica te esconde. Veja como escolher a principal e as secundárias.",
    lead: "A categoria do seu perfil é escolhida em dois segundos, quase no chute — e é ela que decide em quais buscas do Google você aparece.",
    paragraphs: [
      "Tem uma escolha no seu perfil que pesa mais do que quase tudo, e é feita em dois segundos, quase no chute: a categoria. Aquela linha que diz o que você é — \"salão de beleza\", \"oficina mecânica\", \"clínica odontológica\". Muita gente marca a mais próxima na pressa do cadastro e nunca mais volta ali. Só que é ela que diz ao Google em quais buscas você deveria aparecer.",
      "E o detalhe que muda o jogo: dá pra ter uma categoria principal e várias secundárias. Uma clínica que só marcou \"clínica médica\" some das buscas por \"dermatologista\" ou \"clínica de vacinas\", mesmo fazendo isso. Uma oficina que pôs só \"oficina mecânica\" não aparece pra quem procura \"troca de óleo\" ou \"funilaria\". Uma loja cadastrada genérica perde pra quem foi específico.",
      "Vale revisar com calma, porque quase ninguém faz. Enquanto o concorrente deixou no automático, você pode cobrir cada busca que faz sentido pro seu negócio.",
      "Como fazer: pesquise seu negócio no Google logado, entre em \"Editar perfil\" e ache \"Categoria\". Confirma se a principal é a mais certa (a que melhor descreve seu carro-chefe) e adiciona as secundárias, uma por serviço ou linha que você realmente faz.",
      "Cinco minutos aqui rendem mais do que muita coisa. É escolher, com clareza, em quais prateleiras do Google você quer estar.",
    ],
    cta: { text: "Ver meu perfil →", url: APP },
  },
  {
    slug: "melhor-momento-para-pedir-avaliacao",
    tag: "Google",
    headline: "O melhor momento pra pedir uma avaliação dura uns 30 segundos",
    seoTitle: "O melhor momento pra pedir uma avaliação no Google",
    metaDescription: "Pedir avaliação por mensagem dias depois quase não funciona. O momento certo dura 30 segundos, logo após o serviço. Veja como aproveitá-lo.",
    lead: "A maioria dos pedidos de avaliação chega tarde demais. O momento que funciona dura trinta segundos — e você já conhece.",
    paragraphs: [
      "A maioria dos pedidos de avaliação chega tarde demais. O cliente foi bem atendido, foi embora feliz, e três dias depois recebe um \"poderia nos avaliar?\" por mensagem — quando a lembrança já esfriou e ele está no meio de outra coisa. Quase ninguém responde a isso.",
      "O melhor momento é bem mais curto, e você já conhece: aqueles trinta segundos logo depois do serviço, com a pessoa ainda ali, satisfeita. O cabeleireiro que acabou de mostrar o resultado no espelho. O mecânico entregando a chave. A recepção da clínica confirmando o retorno. Ali o cliente está no pico da boa impressão — e é ali que ele avalia, se você facilitar.",
      "Facilitar é a palavra. Ninguém vai parar pra procurar seu negócio no Google e digitar do zero. Mas quase todo mundo encosta o celular num dispositivo ou escaneia um QR se você entregar pronto e disser \"dá um toque aqui, leva dez segundos\".",
      "Duas coisas ajudam muito: combinar com a equipe pra virar parte do atendimento (não algo que só o dono faz), e deixar o caminho a um toque de distância, no balcão ou no caixa.",
      "Não é sobre pedir mais. É sobre pedir na hora certa, do jeito fácil. A conta muda sozinha quando isso vira rotina.",
    ],
    cta: { text: "Ver minhas avaliações →", url: APP },
  },
  {
    slug: "responder-avaliacoes-positivas-google",
    tag: "Google",
    headline: "Você responde as reclamações. E os elogios?",
    seoTitle: "Responder avaliações positivas no Google: por que vale a pena",
    metaDescription: "Quase todo dono responde só as críticas. Responder os elogios cria vínculo, muda a imagem do perfil e alimenta Google e IAs. Veja como fazer.",
    lead: "Você responde as reclamações — corre pra apagar o incêndio. Mas e os elogios, parados ali sem resposta? Eles rendem mais do que parece.",
    paragraphs: [
      "A maioria dos donos que responde avaliações faz isso só nas ruins — corre pra apagar o incêndio. Faz sentido, mas deixa passar metade da oportunidade. As boas ficam ali, um monte de \"adorei\", \"atendimento nota mil\", sem nenhuma resposta. E responder elogio rende mais do que parece.",
      "Pra quem escreveu: um cliente que elogiou e recebeu um \"que bom que você gostou, obrigado por voltar!\" sente que foi visto. Isso cria vínculo — e cliente que se sente visto volta e indica. É barato demais pra deixar passar.",
      "Pra quem lê: um perfil onde o dono responde todo mundo, elogio e crítica, passa uma imagem completamente diferente de um que só aparece pra se defender. Mostra alguém presente, que se importa com quem entra.",
      "E tem o terceiro, que quase ninguém liga: cada resposta é mais texto vivo no seu perfil, com as palavras do seu negócio. Um pet shop que responde \"que alegria saber que o Thor saiu cheiroso do banho!\" está, de quebra, reforçando pro Google e pras IAs o que ele faz.",
      "Como fazer é o de sempre, só que agora também nas positivas: entra em Avaliações e responde as últimas, sem exceção. Nas boas, foge do \"obrigado\" solto — cita o que a pessoa elogiou, com o nome dela se der.",
      "Dez minutos por semana e você tem um perfil que conversa, não um que só se explica.",
    ],
    cta: { text: "Ver minhas avaliações →", url: APP },
  },
];

// ── Rótulo do tema (badge/eyebrow) ──────────────────────────
export function themeLabel(tag) {
  return tag === "IA" ? "Presença em IA" : "Google Meu Negócio";
}

// ── Agenda (1 dica por dia de envio: terça e quinta) ────────
const dateStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const isSendDay = (ms) => SEND_WEEKDAYS.includes(new Date(ms).getUTCDay());
// Próximo instante de envio ESTRITAMENTE após `ms`.
function nextSendMs(ms) { let n = ms + DAY_MS; while (!isSendDay(n)) n += DAY_MS; return n; }
// 1º instante de envio (12:00 UTC, dia de SEND_WEEKDAYS) em/após PROGRAM_START.
function firstSendMs() { let ms = START_MS; while (!isSendDay(ms)) ms += DAY_MS; return ms; }
// Instante de envio da dica de índice i (i-ésimo dia de envio desde o início).
function sendMsOf(i) { let ms = firstSendMs(); for (let k = 0; k < i; k++) ms = nextSendMs(ms); return ms; }

// periodNumber = índice do último envio já ocorrido (0 antes do 1º envio).
export function periodNumber(now = Date.now()) {
  const first = firstSendMs();
  if (now < first) return 0;
  let ms = first, idx = 0;
  while (true) {
    const n = nextSendMs(ms);
    if (n > now) return idx;
    ms = n; idx++;
  }
}
export function currentTipIndex(now = Date.now()) {
  return periodNumber(now) % TIPS.length;
}
export function currentTip(now = Date.now()) {
  return TIPS[currentTipIndex(now)];
}
// Chave estável do período atual — dedupe do e-mail (1 envio por período).
export function periodKey(now = Date.now()) {
  return "p" + periodNumber(now);
}
export function publishedCount(now = Date.now()) {
  if (!ARTICLES_ARMED) return 0;     // fábrica desarmada: nenhum artigo no ar
  if (now < firstSendMs()) return 0; // antes do 1º envio: nenhum artigo no ar
  return Math.min(periodNumber(now) + 1, TIPS.length);
}
export function publishedTips(now = Date.now()) {
  return TIPS.slice(0, publishedCount(now));
}
export function articleUrl(tip) {
  return `/artigos/${tip.slug}`;
}

// ── Datas (envio, prévia, publicação do artigo) ─────────────
// Data em que a dica de índice i é enviada aos clientes (= dia do artigo no ar).
export function sendDateOf(i) { return dateStr(sendMsOf(i)); }
export function publishDateOf(i) { return dateStr(sendMsOf(i)); }
// Data em que a prévia da dica i vai pro admin (1 dia antes do envio).
export function previewDateOf(i) { return dateStr(sendMsOf(i) - DAY_MS); }
export function todayStr(now = Date.now()) { return dateStr(now); }
// Período cuja PRÉVIA vence HOJE (o envio é AMANHÃ), ou null.
export function previewPeriodDueToday(now = Date.now()) {
  const tomorrow = dateStr(now + DAY_MS);
  const p = periodNumber(now + DAY_MS);
  return sendDateOf(p) === tomorrow ? p : null;
}
export function periodLabel(i) { return "p" + i; }
