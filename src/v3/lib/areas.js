// ============================================================
// StarTouch V3 — o mapa do produto
// ============================================================
// A barra lateral lista ÁREAS. Área não tem preço; recurso tem. Por isso o
// selo `PRO` só sobe pra barra quando a área inteira é inequivocamente paga —
// hoje só Clientes e Resultados. Área mista (Experiência, Dispositivos,
// Reputação) classifica por dentro, na tabela de recursos de cada tela.
//
// A régua que governa isto (29/08/2026): nenhuma reorganização de interface
// pode transformar em pago, em silêncio, algo que o cliente já recebe de
// graça. Foi ela que tirou a contagem de toques de Resultados — ela é
// gratuita e continua morando em Dispositivos.
//
// STATUS é o outro eixo, e existe SÓ no desenvolvimento privado:
//   pronto  → funciona hoje
//   constr  → definido, sendo construído
//   defin   → conceito é do produto, falta fechar comportamento
//   nao     → área prevista, sem definição suficiente (não recebe selo:
//             não se adivinha monetização de produto que não foi desenhado)
// Antes de qualquer abertura ao público, esses marcadores são revisados.
// ============================================================
import {
  Home, Sparkles, Tablet, Star, UserPlus, Users,
  TrendingUp, Zap, PlayCircle, Compass, Settings, HelpCircle
} from 'lucide-react'

export const STATUS_TXT = {
  pronto: 'Pronto',
  constr: 'Em construção',
  defin:  'Em definição',
  nao:    'Não definido'
}
export const STATUS_CHIP = { pronto: 'chip g', constr: 'chip', defin: 'chip a', nao: 'chip n' }

export const GRUPOS = [
  { titulo: null,          ids: ['inicio'] },
  { titulo: 'Experiência', ids: ['experiencia', 'dispositivos'] },
  { titulo: 'Negócio',     ids: ['reputacao', 'clientes', 'equipe', 'resultados'] },
  { titulo: 'Crescer',     ids: ['ferramentas', 'aprender', 'tendencias'] },
  { titulo: 'Geral',       ids: ['config', 'ajuda'] }
]

export const AREAS = {
  inicio: {
    nome: 'Início', icon: Home, status: 'constr', tela: 'inicio',
    sub: 'O que aconteceu no seu negócio'
  },

  experiencia: {
    nome: 'Experiência do Cliente', icon: Sparkles, status: 'constr', tela: 'experiencia',
    sub: 'O que acontece depois que alguém encosta o celular'
  },

  dispositivos: {
    nome: 'Dispositivos', icon: Tablet, status: 'pronto', tela: 'dispositivos',
    sub: 'Seus pontos de contato com o cliente'
  },

  reputacao: {
    nome: 'Reputação', icon: Star, status: 'pronto', tela: 'reputacao',
    sub: 'Sua nota, suas avaliações e sua posição na região'
  },

  clientes: {
    nome: 'Clientes', icon: UserPlus, status: 'defin', pro: true,
    sub: 'Transformar toques anônimos em relacionamento',
    lead: 'Hoje os toques nos seus dispositivos são anônimos',
    corpo: 'Eles contam quantas pessoas encostaram o celular, mas não deixam nenhum caminho de volta até elas. Esta área vai abrir esse caminho — sempre por vontade do cliente, nunca por captura escondida.',
    recursos: [
      { n: 'Captação de contato', d: 'a pessoa deixa nome e WhatsApp em troca de um benefício', p: 'pro', s: 'defin' },
      { n: 'Pesquisas', d: 'uma pergunta, respondida no próprio celular', p: 'pro', s: 'defin' },
      { n: 'Sugestões e reclamações', p: 'pro', s: 'defin' },
      { n: 'Promoções com cadastro', d: 'conecta com Ferramentas', p: 'pro', s: 'nao' }
    ],
    decidido: [
      'Nada aqui filtra quem pode avaliar no Google — são caminhos independentes',
      'Consentimento, retenção, exportação e exclusão nascem junto, não depois',
      'O dado é do lojista; a StarTouch trata por conta dele'
    ],
    falta: [
      'O texto do consentimento e onde ele fica gravado',
      'Prazo de guarda de cada tipo de dado',
      'A revisão da Política de Privacidade, que precisa sair antes da primeira linha'
    ]
  },

  equipe: {
    nome: 'Equipe e Unidades', icon: Users, status: 'nao',
    sub: 'Pessoas e locais do negócio',
    lead: 'A área existe no mapa, mas ainda não sabemos o que ela faz',
    corpo: 'O cartão de um vendedor já é um dispositivo com nome e contagem próprios — a leitura por pessoa sai inteira em Dispositivos. Antes de construir, precisamos saber o que esta área faria que aquela não faz.',
    decidido: [
      'Cartões individuais já existem e já são medidos por pessoa',
      'As tabelas novas nasceram penduradas no negócio, não no usuário: multi-unidade depois não exige reescrita'
    ],
    falta: [
      'É login para funcionários, comparação entre unidades, ou só uma leitura?',
      'Hoje é um negócio por conta no banco — multi-unidade de verdade exige mudar isso',
      'Ranking de funcionário foi descartado como narrativa: o que entra no lugar?'
    ]
  },

  resultados: {
    nome: 'Resultados', icon: TrendingUp, status: 'constr', pro: true,
    sub: 'Para onde as pessoas foram depois de tocar',
    lead: 'A camada de cruzamento, e ela nasce Pro inteira',
    corpo: 'A contagem de toques NÃO foi movida para cá: ela continua gratuita em Dispositivos, com histórico, último toque e períodos. Aqui ela reaparece apenas como denominador — o número de baixo da conta. O que se paga é o cruzamento, nunca o número que o cliente já tinha.',
    recursos: [
      { n: 'Para onde as pessoas foram', d: 'por botão do menu', p: 'pro', s: 'constr' },
      { n: 'Desempenho por experiência', p: 'pro', s: 'constr' },
      { n: 'Toques cruzados com destino e comportamento', p: 'pro', s: 'constr' },
      { n: 'Comparação entre períodos', p: 'pro', s: 'defin' }
    ],
    decidido: [
      'A área é 100% Pro e por isso leva selo na barra',
      'Nada gratuito foi movido para cá: a contagem segue em Dispositivos',
      'O log de cliques já está modelado e nasce junto com o Menu Inteligente'
    ],
    falta: [
      '“Taxa de conversão” precisa de definição: toque → clique nós medimos; toque → avaliação publicada o Google não devolve'
    ]
  },

  ferramentas: {
    nome: 'Ferramentas', icon: Zap, status: 'defin',
    sub: 'Recursos de relacionamento que crescem com o tempo',
    lead: 'A primeira ferramenta seria Promoções',
    corpo: 'Uma oferta com título, descrição, imagem, validade e cupom, distribuída pelo menu, por QR Code ou por link — e, opcionalmente, exigindo cadastro, o que a conecta com Clientes.',
    recursos: [
      { n: 'Promoções', d: 'título, validade, cupom, distribuição', p: 'pro', s: 'defin' },
      { n: 'Campanhas, cupons e fidelização', p: 'pro', s: 'nao' }
    ],
    decidido: [
      'Os campos da promoção estão descritos no briefing',
      'A distribuição reusa o mesmo endereço público do menu'
    ],
    falta: [
      'Se a promoção exige cadastro, ela depende de Clientes existir primeiro',
      'Quantas promoções ativas ao mesmo tempo',
      'Se alguma ferramenta futura for gratuita, a área deixa de ser candidata a selo'
    ]
  },

  aprender: {
    nome: 'Aprender & Melhorar', icon: PlayCircle, status: 'nao',
    sub: 'Conteúdo ligado ao que a plataforma percebe',
    lead: 'A matéria-prima já existe — o comportamento é que não',
    corpo: 'O projeto já tem uma fábrica de artigos publicando conteúdo no site. Falta a parte que dá sentido à área: ligar o conteúdo ao diagnóstico, do tipo “você teve 438 interações e 17 avaliações — veja como pedir avaliação naturalmente”.',
    decidido: ['A fábrica de artigos existe e publica hoje', 'Os dados de diagnóstico existem'],
    falta: [
      'Que gatilho dispara qual conteúdo',
      'Vídeo, texto ou os dois',
      'Se é biblioteca navegável ou só recomendação pontual'
    ]
  },

  tendencias: {
    nome: 'Tendências', icon: Compass, status: 'nao',
    sub: 'O que está mudando no seu segmento',
    lead: 'O nome saiu do caminho; o escopo ainda não',
    corpo: 'Era “Radar do Mercado” e virou Tendências, para não disputar identidade com o IA Radar, que já está no ar em /radar com finalidade própria — medir se as inteligências artificiais citam o negócio. O conceito segue o mesmo: o que está mudando no segmento do cliente, respondendo sempre o que aconteceu, por que importa e o que dá para fazer.',
    decidido: [
      'O nome não colide mais com o IA Radar',
      'O formato está claro: o que aconteceu, por que importa, o que fazer'
    ],
    falta: [
      'De onde vem o dado de tendência do segmento',
      'Como não virar feed genérico de notícias, que foi descartado',
      'Se a leitura é por categoria do Google ou pela categoria escolhida pelo lojista'
    ]
  },

  config: {
    nome: 'Configurações', icon: Settings, status: 'pronto',
    sub: 'Conta, negócio e plano',
    lead: 'Já existe no painel atual',
    corpo: 'Dados da conta, dados do negócio (inclusive a categoria de comparação editável) e a gestão do plano. Na Fase 1 a tela ainda vive no painel atual — o link abre lá.',
    externo: { url: '/app?tab=config', label: 'Abrir no painel atual' },
    recursos: [
      { n: 'Conta e senha', p: 'free', s: 'pronto' },
      { n: 'Negócio, endereço e categoria de comparação', p: 'free', s: 'pronto' },
      { n: 'Plano e assinatura', p: 'free', s: 'pronto' }
    ]
  },

  ajuda: {
    nome: 'Ajuda e Suporte', icon: HelpCircle, status: 'pronto',
    sub: 'Central de ajuda e conversa direta',
    lead: 'Já existe: central de ajuda e suporte por WhatsApp',
    corpo: 'Na casca nova ganha um lugar fixo na navegação em vez de viver só no botão flutuante.',
    externo: { url: '/ajuda', label: 'Abrir a central de ajuda' },
    recursos: [
      { n: 'Central de ajuda', p: 'free', s: 'pronto' },
      { n: 'Suporte por WhatsApp', p: 'free', s: 'pronto' }
    ]
  }
}

export const IDS = Object.keys(AREAS)
