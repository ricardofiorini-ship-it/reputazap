import React from 'react'

// ─────────────────────────────────────────────────────────────
// Dashboard StarTouch — V2 (mockup funcional)
// Foco: reputação · crescimento · ranking · resultado
// Plano: usar ?plan=free ou ?plan=pro na URL pra alternar
// ─────────────────────────────────────────────────────────────

const MOCK = {
  biz: { name: 'Café Bella Vista', placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' /* mock — usado pra link "Responder no Google" */ },
  kpis: {
    rating: 5.0,
    reviewCount: 12,
    rankingPos: 3,
    totalCompetitors: 12,
    newLast30Days: 7,
    nextGoal: { reviewsToNext: 2, targetPosition: 2 }
  },
  hero: { reviewsToNext: 2, progressPct: 83 },
  growthPct: 41,
  // Tendência das últimas avaliações: a média das últimas 5 vs a média geral
  trend: { recentAvg: 4.8, overallAvg: 4.6, direction: 'up' /* 'up' | 'down' | 'flat' */ },
  // Sugestões da semana (pushs de direção)
  weekActions: [
    { icon: '🎯', text: 'Foque em pedir 2 avaliações no atendimento essa semana — leva você pro Top 2.', kind: 'goal' },
    { icon: '💬', text: 'Responda as 5 avaliações pendentes hoje — Google premia perfis ativos.',         kind: 'action' },
    { icon: '📸', text: 'Atualize as fotos do seu Google Meu Negócio (último upload faz 60 dias).',       kind: 'tip' }
  ],
  ranking: [
    { pos: 1, medal: '🥇', name: 'Empresa A',         rating: 5.0, reviews: 25, you: false },
    { pos: 2, medal: '🥈', name: 'Empresa B',         rating: 5.0, reviews: 14, you: false },
    { pos: 3, medal: '🥉', name: 'Café Bella Vista',  rating: 5.0, reviews: 12, you: true  },
    { pos: 4, medal: '',   name: 'Empresa C',         rating: 4.9, reviews: 11, you: false },
    { pos: 5, medal: '',   name: 'Empresa D',         rating: 4.8, reviews: 9,  you: false }
  ],
  unrepliedReviews: 5,
  recentReviews: [
    { name: 'Ana Martins',    rating: 5, comment: 'Atendimento incrível, super atenciosos. Voltarei sempre!',         date: 'Há 2 dias',    initials: 'AM', color: '#F59E0B' },
    { name: 'Bruno Lima',     rating: 5, comment: 'Café muito bom, ambiente aconchegante e equipe atenciosa.',         date: 'Há 4 dias',    initials: 'BL', color: '#10B981' },
    { name: 'Carla Souza',    rating: 5, comment: 'Tudo perfeito! Recomendo demais.',                                   date: 'Há 1 semana',  initials: 'CS', color: '#8B5CF6' },
    { name: 'Diego Pereira',  rating: 5, comment: 'Excelente! O capuccino é um dos melhores da cidade.',                date: 'Há 1 semana',  initials: 'DP', color: '#EC4899' },
    { name: 'Eduarda Castro', rating: 4, comment: 'Muito bom, só a espera demorou um pouco no horário de pico.',        date: 'Há 2 semanas', initials: 'EC', color: '#06B6D4' }
  ],
  capturePoints: [
    { name: 'Placa de Balcão',  reviewsGenerated: 15 },
    { name: 'Cartão NFC',       reviewsGenerated: 7  },
    { name: 'Pulseira NFC',     reviewsGenerated: 3  }
  ],
  evolution: {
    reviews:  [5, 5, 6, 6, 7, 7, 8, 9, 10, 11, 11, 12],
    rating:   [4.6, 4.7, 4.7, 4.8, 4.8, 4.8, 4.9, 4.9, 4.9, 5.0, 5.0, 5.0],
    rankings: [9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3]
  },
  // Concorrentes (Inteligência Competitiva)
  // distance: metros até o seu negócio. angle: ângulo (radianos) pro mapa SVG.
  competitors: [
    { id: 1,  pos: 1,  medal:'🥇', name:'Empresa A',        rating: 5.0, reviews: 25, weekGrowth: +3, distance:  320, angle: 0.4, history:[18,19,20,21,21,22,23,24,24,24,25,25], color:'#F59E0B', initials:'EA' },
    { id: 2,  pos: 2,  medal:'🥈', name:'Empresa B',        rating: 5.0, reviews: 14, weekGrowth: +1, distance:  480, angle: 1.9, history:[10,10,11,11,11,12,12,13,13,13,14,14], color:'#10B981', initials:'EB' },
    { id: 3,  pos: 3,  medal:'🥉', name:'Café Bella Vista', rating: 5.0, reviews: 12, weekGrowth: +2, distance:    0, angle: 0,   history:[5,5,6,6,7,7,8,9,10,11,11,12],         color:'#1A73E8', initials:'CB', isYou: true },
    { id: 4,  pos: 4,            name:'Empresa C',        rating: 4.9, reviews: 11, weekGrowth:  0, distance:  580, angle: 3.2, history:[10,10,10,11,11,11,11,11,11,11,11,11], color:'#8B5CF6', initials:'EC' },
    { id: 5,  pos: 5,            name:'Empresa D',        rating: 4.8, reviews:  9, weekGrowth: +1, distance:  710, angle: 4.7, history:[5,5,6,6,6,7,7,7,8,8,8,9],             color:'#EC4899', initials:'ED' },
    { id: 6,  pos: 6,            name:'Empresa E',        rating: 4.8, reviews:  9, weekGrowth:  0, distance:  860, angle: 0.9, history:[8,8,8,8,8,8,9,9,9,9,9,9],              color:'#06B6D4', initials:'EE' },
    { id: 7,  pos: 7,            name:'Empresa F',        rating: 4.7, reviews:  8, weekGrowth: +2, distance:  990, angle: 2.6, history:[4,4,5,5,5,6,6,6,7,7,8,8],              color:'#84CC16', initials:'EF' },
    { id: 8,  pos: 8,            name:'Empresa G',        rating: 4.7, reviews:  7, weekGrowth:  0, distance: 1180, angle: 5.5, history:[6,6,7,7,7,7,7,7,7,7,7,7],              color:'#F97316', initials:'EG' },
    { id: 9,  pos: 9,            name:'Empresa H',        rating: 4.6, reviews:  6, weekGrowth: +1, distance: 1450, angle: 1.3, history:[3,3,4,4,4,4,5,5,5,5,6,6],              color:'#06B6D4', initials:'EH' },
    { id: 10, pos: 10,           name:'Empresa I',        rating: 4.5, reviews:  5, weekGrowth:  0, distance: 1620, angle: 3.8, history:[5,5,5,5,5,5,5,5,5,5,5,5],              color:'#A855F7', initials:'EI' },
    { id: 11, pos: 11,           name:'Empresa J',        rating: 4.4, reviews:  4, weekGrowth:  0, distance: 1780, angle: 5.0, history:[3,3,3,3,4,4,4,4,4,4,4,4],              color:'#14B8A6', initials:'EJ' },
    { id: 12, pos: 12,           name:'Empresa K',        rating: 4.2, reviews:  3, weekGrowth: -1, distance: 1850, angle: 2.2, history:[5,5,5,5,4,4,4,4,4,3,3,3],              color:'#EF4444', initials:'EK' }
  ],
  // Minhas metas (gamificação)
  goals: [
    { label:'Top 5', achieved: true,  reviewsToNext: 0, progressPct: 100 },
    { label:'Top 3', achieved: true,  reviewsToNext: 0, progressPct: 100, current: true },
    { label:'Top 2', achieved: false, reviewsToNext: 2, progressPct: 86,  target:'Empresa B (14 avaliações)' },
    { label:'Top 1', achieved: false, reviewsToNext: 14, progressPct: 48, target:'Empresa A (25 avaliações)' }
  ],
  // Alertas (Feature 3)
  alerts: [
    { id: 1,  type:'promotion', icon:'🏆', title:'Você entrou no Top 3!',                            detail:'Subiu da 4ª pra 3ª posição na sua categoria.',                       when:'Há 2 horas',  isNew:true,  category:'ranking' },
    { id: 2,  type:'threat',    icon:'⚠️', title:'Empresa A ganhou 5 avaliações em 3 dias',          detail:'Cresceu de 20 pra 25 avaliações — está acelerando.',                  when:'Hoje 10:42',  isNew:true,  category:'concorrente' },
    { id: 3,  type:'goal',      icon:'🎯', title:'Você está a 2 avaliações do Top 2',                detail:'Foque em pedir avaliações essa semana e suba uma posição.',           when:'Hoje 09:15',  isNew:true,  category:'ranking' },
    { id: 4,  type:'advance',   icon:'↑',  title:'Você ultrapassou Empresa C',                       detail:'Ganhou 1 posição no ranking.',                                        when:'Ontem 18:30',              category:'ranking' },
    { id: 5,  type:'review',    icon:'⭐', title:'Nova avaliação 5 estrelas de Maria S.',            detail:'"Atendimento incrível, super atenciosos!"',                           when:'Ontem 14:22',              category:'avaliacao' },
    { id: 6,  type:'regression',icon:'↓',  title:'Empresa B passou você',                            detail:'Você caiu da 2ª pra 3ª posição.',                                     when:'Há 2 dias',                category:'ranking' },
    { id: 7,  type:'review',    icon:'⭐', title:'Nova avaliação 4 estrelas de Bruno L.',            detail:'"Café muito bom, espera só demorou um pouco no horário de pico."',     when:'Há 3 dias',                category:'avaliacao' },
    { id: 8,  type:'review',    icon:'⭐', title:'Nova avaliação 5 estrelas de Carla S.',            detail:'"Tudo perfeito! Recomendo."',                                          when:'Há 4 dias',                category:'avaliacao' },
    { id: 9,  type:'threat',    icon:'⚠️', title:'Empresa F ganhou 4 avaliações na semana',          detail:'Crescimento acelerado — pode ameaçar sua posição.',                   when:'Há 5 dias',                category:'concorrente' },
    { id: 10, type:'promotion', icon:'🏆', title:'Sua nota chegou a 5.0!',                           detail:'Você atingiu nota máxima na sua categoria.',                          when:'Há 1 semana',              category:'ranking' }
  ],
  alertStats: { newToday: 3, weekly: 12, positionChanges: 2 },
  alertChannels: {
    dashboard: { enabled: true,  locked: true },
    email:     { enabled: true,  frequency: 'realtime' },
    whatsapp:  { enabled: false, phone: '' }
  },

  // Relatórios (Feature 5)
  reports: {
    weekly: {
      period: 'Semana de 23 a 29 de maio · 2026',
      sentAt: 'Enviado segunda-feira 30 mai · 08:00',
      summary: {
        newReviews: 3,        newReviewsDelta: +1,
        ratingDelta: +0.1,    currentRating: 5.0,
        positionDelta: +1,    currentPosition: 3,
        competitorDelta: -2   // ficou 2 av. mais próximo do próximo
      },
      chart: [4.8, 4.8, 4.9, 4.9, 5.0, 5.0, 5.0],
      chartLabels: ['23', '24', '25', '26', '27', '28', '29'],
      topReviews: [
        { name:'Maria Silva',   rating: 5, comment:'"Atendimento incrível, super atenciosos!"',          initials:'MS', color:'#F59E0B', when:'Há 2 dias' },
        { name:'Bruno Lima',    rating: 4, comment:'"Café muito bom, só a espera demorou um pouco."',     initials:'BL', color:'#10B981', when:'Há 4 dias' },
        { name:'Carla Souza',   rating: 5, comment:'"Tudo perfeito! Recomendo demais."',                  initials:'CS', color:'#8B5CF6', when:'Há 6 dias' }
      ],
      rankingMoves: [
        { type:'up',   icon:'↑',  text:'Você subiu da 4ª pra 3ª posição',           highlight: true  },
        { type:'down', icon:'↓',  text:'Empresa C caiu da 3ª pra 4ª posição'  },
        { type:'risk', icon:'⚠️', text:'Empresa F está crescendo rápido (+2 avaliações)' }
      ],
      competitorComparison: [
        { name:'Empresa A',         pos: 1, reviews: 25, weekChange: +3 },
        { name:'Empresa B',         pos: 2, reviews: 14, weekChange: +1 },
        { name:'Café Bella Vista',  pos: 3, reviews: 12, weekChange: +2, isYou: true },
        { name:'Empresa C',         pos: 4, reviews: 11, weekChange:  0 }
      ],
      opportunities: [
        { icon:'🎯', text:'Faltam apenas 2 avaliações pra ultrapassar Empresa B e entrar no Top 2.' },
        { icon:'💬', text:'Você tem 5 avaliações sem resposta — respondê-las melhora ranking no Google.' },
        { icon:'📸', text:'Sua última foto no Google Meu Negócio é de 60 dias atrás. Suba 1 esse mês.' }
      ]
    },
    monthly: {
      period: 'Mês de Maio · 2026',
      sentAt: 'Enviado dia 1 de junho · 08:00',
      summary: {
        newReviews: 7,        newReviewsDelta: +3,
        ratingDelta: +0.2,    currentRating: 5.0,
        positionDelta: +2,    currentPosition: 3,
        competitorDelta: -4
      },
      chart: [4.6, 4.7, 4.7, 4.8, 4.8, 4.8, 4.9, 4.9, 4.9, 5.0, 5.0, 5.0],
      chartLabels: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
      topReviews: [
        { name:'Maria Silva',     rating: 5, comment:'"Atendimento incrível, super atenciosos!"',         initials:'MS', color:'#F59E0B', when:'Há 2 dias' },
        { name:'Diego Pereira',   rating: 5, comment:'"Excelente! O capuccino é um dos melhores."',       initials:'DP', color:'#EC4899', when:'Há 1 semana' },
        { name:'Eduarda Castro',  rating: 4, comment:'"Muito bom, só a espera demorou um pouco."',         initials:'EC', color:'#06B6D4', when:'Há 2 semanas' }
      ],
      rankingMoves: [
        { type:'up',   icon:'↑',  text:'Você subiu da 5ª pra 3ª posição no mês',  highlight: true  },
        { type:'up',   icon:'↑',  text:'Ultrapassou Empresa C e Empresa D'  },
        { type:'risk', icon:'⚠️', text:'Empresa A continua crescendo forte (+8 avaliações no mês)' }
      ],
      competitorComparison: [
        { name:'Empresa A',         pos: 1, reviews: 25, weekChange: +8 },
        { name:'Empresa B',         pos: 2, reviews: 14, weekChange: +4 },
        { name:'Café Bella Vista',  pos: 3, reviews: 12, weekChange: +7, isYou: true },
        { name:'Empresa C',         pos: 4, reviews: 11, weekChange: +1 }
      ],
      opportunities: [
        { icon:'📈', text:'Sua nota subiu de 4.8 pra 5.0 no mês — capitalize isso com posts e flyers.' },
        { icon:'🎯', text:'Mantendo o ritmo de 7 avaliações/mês, em 60 dias você ultrapassa a Empresa A.' },
        { icon:'🛎️', text:'Considere ativar pulseira NFC pros garçons: hoje só placa de mesa gera reviews.' }
      ]
    }
  },
  reportSettings: {
    email: 'ricardo@cafebellavista.com.br',
    weeklyEnabled: true,
    monthlyEnabled: true,
    weeklyDay: 'monday',   // dia da semana
    monthlyDay: 1          // dia do mês
  },

  // Loja — produtos reais StarTouch (catálogo + preços oficiais em /kit)
  products: [
    { id:'placa-balcao', img:'/gadget-placa.png',    name:'Placa de balcão', desc:'Acrílico premium pro caixa. Cliente toca pra avaliar ao pagar.',          buyUrl:'/kit' },
    { id:'cartao-nfc',   img:'/gadget-cartao.png',   name:'Cartão NFC',      desc:'Pro garçom carregar — toca no celular do cliente após o atendimento.', buyUrl:'/kit' },
    { id:'pulseira-nfc', img:'/gadget-pulseira.png', name:'Pulseira NFC',    desc:'Pro garçom usar no pulso — toca no cliente após o atendimento.',         buyUrl:'/kit' }
  ],
  kit: {
    icon: '🎁',
    name:'Catálogo completo no shop',
    desc:'Veja todos os produtos com preços, escolha tamanhos, monte seu kit e compre direto no nosso shop oficial.',
    buyUrl:'/kit'
  },

  // Configurações
  user: {
    name:'Ricardo Fiorini',
    email:'ricardo@cafebellavista.com.br',
    phone:'(11) 99999-9999',
    initials:'RF'
  },
  businessInfo: {
    name:'Café Bella Vista',
    category:'Cafeteria',
    address:'Rua das Flores, 123 — Pinheiros, São Paulo · SP',
    phone:'(11) 3456-7890',
    placeId:'ChIJN1t_tDeuEmsRUsoyG83frY4',
    gmapsUrl:'https://maps.google.com/?cid=12345'
  },
  billing: {
    plan:'Plano Pro',
    monthlyPrice: 19.90,
    nextChargeAt:'5 de junho · 2026',
    paymentMethod:'Cartão Visa •••• 4242',
    status:'active',
    sinceDate:'5 de maio · 2026',
    invoices: [
      { date:'5 mai 2026',  amount: 19.90, status:'paid' },
      { date:'5 abr 2026',  amount: 19.90, status:'paid' },
      { date:'5 mar 2026',  amount: 19.90, status:'paid' }
    ]
  }
}

// ─────────────────────────────────────────────────────────────
// DATA LAYER — chamadas pras APIs reais
// Estratégia: real sobrescreve mock. Telas sem backend ainda
// continuam mostrando mock automaticamente.
// ─────────────────────────────────────────────────────────────
async function apiCall(path, opts = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rz_token') : null
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const j = await res.json(); if (j.error) msg = j.error } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// Cores estáveis pros avatars das avaliações
const REVIEW_COLORS = ['#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#A855F7']
function colorFromName(name) {
  if (!name) return REVIEW_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return REVIEW_COLORS[Math.abs(h) % REVIEW_COLORS.length]
}
function initialsFromName(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
function relativeDate(unixOrIso) {
  if (!unixOrIso) return 'recente'
  const t = typeof unixOrIso === 'number' ? unixOrIso * 1000 : Date.parse(unixOrIso)
  if (!t) return 'recente'
  const diffDays = Math.floor((Date.now() - t) / 86400000)
  if (diffDays < 1)   return 'hoje'
  if (diffDays < 2)   return 'ontem'
  if (diffDays < 7)   return `há ${diffDays} dias`
  if (diffDays < 14)  return 'há 1 semana'
  if (diffDays < 30)  return `há ${Math.floor(diffDays/7)} semanas`
  if (diffDays < 60)  return 'há 1 mês'
  return `há ${Math.floor(diffDays/30)} meses`
}

// Hook que carrega dados reais do user logado.
// Retorna { loading, error, biz, reviews, bizInfo, competitors, plates, hasBusiness }
function useRealData(user, demoMode) {
  const [state, setState] = React.useState({
    loading: !demoMode && !!user,
    error: null,
    biz: null,
    reviews: [],
    bizInfo: null,
    competitors: null,
    plates: null,
    hasBusiness: false
  })

  React.useEffect(() => {
    if (demoMode || !user) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))

    ;(async () => {
      try {
        const myBizRes = await apiCall('/api/mybiz')
        const biz = myBizRes.business || null
        if (!biz || !biz.place_id) {
          if (!cancelled) setState({ loading: false, error: null, biz, reviews: [], bizInfo: null, competitors: null, plates: null, hasBusiness: false })
          return
        }
        // Categoria customizada — agora persiste no banco (businesses.category_override).
        // Fallback: localStorage.rz_activity (legado). Migração: se backend não tem mas
        // localStorage sim, fazer upload na 1ª carga (uma vez só, depois limpar localStorage).
        let keyword = (biz.category_override || '').trim()
        if (!keyword && typeof window !== 'undefined') {
          const legacy = (localStorage.getItem('rz_activity') || '').trim()
          if (legacy) {
            keyword = legacy
            // Upload pro banco (não-bloqueante) + limpa localStorage
            apiCall('/api/savebiz', {
              method: 'POST',
              body: JSON.stringify({ category_override: legacy })
            }).then(() => {
              try { localStorage.removeItem('rz_activity') } catch {}
            }).catch(() => { /* silencioso — tenta de novo na próxima carga */ })
          }
        }
        const competitorsUrl = keyword
          ? `/api/competitors?keyword=${encodeURIComponent(keyword)}`
          : '/api/competitors'

        // 4 chamadas em paralelo: reviews (público), bizinfo (público, traz endereço/foto/categoria),
        // competitors (auth), plates (auth)
        const [reviewsRes, bizInfoRes, competitorsRes, platesRes] = await Promise.all([
          fetch(`/api/reviews?place_id=${encodeURIComponent(biz.place_id)}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/bizinfo?place_id=${encodeURIComponent(biz.place_id)}`).then(r => r.json()).catch(() => ({})),
          apiCall(competitorsUrl).catch(() => null),
          apiCall('/api/plates?action=my-plates').catch(() => null)
        ])
        if (!cancelled) {
          setState({
            loading: false, error: null,
            biz,
            reviews: reviewsRes.reviews || [],
            bizInfo: {
              rating: reviewsRes.rating ?? bizInfoRes.rating ?? biz.rating,
              total: reviewsRes.total ?? bizInfoRes.total ?? biz.total_reviews,
              name: reviewsRes.name ?? bizInfoRes.name ?? biz.name,
              address: bizInfoRes.address || null,
              phone: bizInfoRes.phone || null,
              gmapsUrl: bizInfoRes.gmapsUrl || null,
              category: bizInfoRes.category || null,
              photoUrl: bizInfoRes.photoUrl || null
            },
            competitors: competitorsRes,
            plates: platesRes?.plates || [],
            hasBusiness: true
          })
        }
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e.message, biz: null, reviews: [], bizInfo: null, competitors: null, plates: null, hasBusiness: false })
      }
    })()

    return () => { cancelled = true }
  }, [user, demoMode])

  return state
}

// Nome humano dos product_types do banco
const PRODUCT_LABELS = {
  placa_balcao: 'Placa de Balcão',
  placa_mesa:   'Placa de Mesa',
  placa_parede: 'Placa de Parede',
  pulseira_nfc: 'Pulseira NFC',
  adesivo_nfc:  'Adesivo NFC',
  cartao_nfc:   'Cartão NFC'
}

// Compõe `d` (dados pra UI) misturando real + MOCK. Real sobrescreve, mock preenche gaps.
function buildData(real, user, demoMode) {
  if (demoMode || !real.hasBusiness) return MOCK
  const { biz, bizInfo, reviews, competitors, plates } = real

  // Capture points reais: agrupa plates ATIVAS por product_type, soma total_taps
  const activePlates = (plates || []).filter(p => p.status === 'active')
  const byType = {}
  for (const p of activePlates) {
    if (!byType[p.product_type]) byType[p.product_type] = { count: 0, taps: 0 }
    byType[p.product_type].count += 1
    byType[p.product_type].taps += (p.total_taps || 0)
  }
  const realCapturePoints = Object.entries(byType).map(([type, data]) => ({
    name: PRODUCT_LABELS[type] || type,
    reviewsGenerated: data.taps,
    devicesCount: data.count
  }))
  const rating = bizInfo?.rating ?? MOCK.kpis.rating
  const total  = bizInfo?.total  ?? MOCK.kpis.reviewCount

  // Concorrentes — só sobrescreve se a API retornou algo válido
  const compData = (competitors && competitors.enough && competitors.top) ? (() => {
    // IMPORTANTE: backend já manda `top` na ordem real do Google (gscore = rating × log10(reviews))
    // NÃO reordenar — senão posição do KPI (rank_google) fica diferente da posição na lista.
    const list = competitors.top.map((c, i) => {
      const isLocked = !c.name && !c.is_me  // name veio null e não sou eu → backend bloqueou
      return {
        id: c.place_id || i,
        pos: i + 1,
        medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
        name: c.name || (isLocked ? null : `Concorrente ${i + 1}`),
        locked: isLocked,
        rating: c.rating,
        reviews: c.reviews,
        // weekGrowth/distance/history são null pra UI saber esconder (em vez de mostrar 0 falso)
        weekGrowth: null,
        distance: null,
        history: null,
        color: isLocked ? '#94A3B8' : colorFromName(c.name || `${i}`),
        initials: isLocked ? '🔒' : initialsFromName(c.name || `C${i}`),
        isYou: c.is_me
      }
    })
    return {
      rankingPos: competitors.rank_google,
      totalCompetitors: competitors.total,
      reviewsToNext: competitors.ahead ? Math.max(0, competitors.ahead.reviews - (competitors.me?.reviews || 0)) : 0,
      list,
      // Mini ranking pro Painel (top 5)
      rankingMini: list.slice(0, 5).map(c => ({
        pos: c.pos, medal: c.medal, name: c.name, rating: c.rating, reviews: c.reviews, you: c.isYou
      }))
    }
  })() : null

  // Hero "quanto falta pra subir" baseado em dados reais quando disponível
  const hero = compData?.reviewsToNext != null
    ? { reviewsToNext: compData.reviewsToNext, progressPct: Math.min(100, Math.max(10, 100 - compData.reviewsToNext * 6)) }
    : MOCK.hero

  return {
    ...MOCK,
    biz: { id: biz.id, name: biz.name, placeId: biz.place_id },
    kpis: {
      ...MOCK.kpis,
      rating: typeof rating === 'number' ? rating : MOCK.kpis.rating,
      reviewCount: typeof total === 'number' ? total : MOCK.kpis.reviewCount,
      rankingPos: compData?.rankingPos ?? MOCK.kpis.rankingPos,
      totalCompetitors: compData?.totalCompetitors ?? MOCK.kpis.totalCompetitors,
      nextGoal: compData
        ? { reviewsToNext: compData.reviewsToNext, targetPosition: Math.max(1, (compData.rankingPos || 2) - 1) }
        : MOCK.kpis.nextGoal
    },
    hero,
    // Se a API retornou dados reais, usa; senão mostra vazio (NÃO mock) pra UI ser honesta
    ranking: compData?.rankingMini ?? [],
    competitors: compData?.list ?? [],
    // capturePoints reais — array vazio se não tem placa ativa (empty state honesto)
    capturePoints: realCapturePoints,
    recentReviews: (reviews && reviews.length > 0)
      ? reviews.slice(0, 5).map(r => {
          // /api/reviews retorna shape: { author, avatar, rating, text, date, ... }
          const name = r.author || r.author_name || 'Cliente Google'
          return {
            name,
            rating: r.rating || 5,
            comment: r.text || '',
            date: r.date || relativeDate(r.time || r.id),
            initials: r.avatar || initialsFromName(name),
            color: colorFromName(name)
          }
        })
      : MOCK.recentReviews,
    user: {
      ...MOCK.user,
      name: user?.name || user?.email || MOCK.user.name,
      email: user?.email || MOCK.user.email
    },
    // Sem mock vazando: campos sem dados reais ficam null e a UI mostra "—"
    businessInfo: {
      name: biz.name,
      placeId: biz.place_id,
      category: bizInfo?.category || null,        // categoria do Google (types)
      address: bizInfo?.address || null,          // formatted_address real do Google
      phone: bizInfo?.phone || null,              // telefone real do Google
      gmapsUrl: bizInfo?.gmapsUrl || `https://www.google.com/maps/place/?q=place_id:${biz.place_id}`
    },
    // Categoria ativa do ranking — override no banco vence sobre a do Google
    activeCategory: (biz.category_override || '').trim() || bizInfo?.category || null,
    googleCategory: bizInfo?.category || null,
    categoryOverride: (biz.category_override || '').trim() || null,
    billing: {
      ...MOCK.billing,
      plan: biz.plan === 'pro' ? 'Plano Pro' : 'Plano Free',
      status: biz.stripe_subscription_status || MOCK.billing.status
    }
  }
}

const T = {
  bg:'#F7F8FA', surface:'#FFFFFF', border:'#EAEDF1',
  text:'#0F172A', textMid:'#475569', textDim:'#94A3B8',
  blue:'#1A73E8', blueDk:'#0F4DAE', blueSoft:'#EAF2FE',
  green:'#10B981', greenSoft:'#ECFDF5',
  amber:'#F59E0B', amberSoft:'#FEF7E6', amberBg:'#FFFBEB',
  red:'#EF4444',
  shadow:'0 1px 2px rgba(15,23,42,0.04), 0 6px 24px -8px rgba(15,23,42,0.08)',
  shadowSm:'0 1px 2px rgba(15,23,42,0.06)'
}

// Detect mobile via media-query hook (no extra deps)
function useIsMobile(bp = 768) {
  const [m, setM] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    const upd = () => setM(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [bp])
  return m
}

// Admin emails — devem casar com api/competitors.js ADMIN_EMAIL
const ADMIN_EMAILS = ['ricardo.fiorini@gmail.com']
const isAdminUser = (user) => !!user && ADMIN_EMAILS.includes((user.email || '').toLowerCase())

function getPlan(realBiz, demoMode, user) {
  // URL ?plan=free|pro só vale em demoMode OU quando ainda não tem negócio real
  // (em produção, NUNCA permitir bypass do paywall pelo URL)
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search).get('plan')
    if ((p === 'free' || p === 'pro') && (demoMode || !realBiz)) return p
  }
  // Admin vê tudo como Pro automaticamente (já tinha esse override no backend)
  if (isAdminUser(user)) return 'pro'
  // Sem override válido: usa plano real do biz (default = free)
  if (realBiz) return realBiz.plan === 'pro' ? 'pro' : 'free'
  return 'pro' // demo default
}

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────
function Card({ children, style, padded = true, accent }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      padding: padded ? 24 : 0,
      position: 'relative',
      overflow: 'hidden',
      ...(accent && { borderTop: `3px solid ${accent}` }),
      ...style
    }}>{children}</div>
  )
}
function Section({ children, style }) {
  return <div style={{ marginBottom: 24, ...style }}>{children}</div>
}
function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display:'inline-flex', gap:1, color:'#FBBC04', fontSize:size, lineHeight:1 }}>
      {[1,2,3,4,5].map(i => <span key={i}>{i <= Math.round(rating) ? '★' : '☆'}</span>)}
    </span>
  )
}
function Trend({ value, suffix = '' }) {
  const positive = value >= 0
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:12, fontWeight:600,
      color: positive ? T.green : T.red,
      background: positive ? T.greenSoft : '#FEE2E2',
      borderRadius:999, padding:'2px 8px'
    }}>
      {positive ? '▲' : '▼'} {Math.abs(value)}{suffix}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Top Tabs — navegação principal
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'painel',       icon: '📊', label: 'Painel',       pro: false },
  { id: 'concorrentes', icon: '🏆', label: 'Concorrentes', pro: true },
  { id: 'alertas',      icon: '🔔', label: 'Alertas',      pro: true },
  { id: 'avaliacoes',   icon: '⭐', label: 'Avaliações',   pro: false },
  { id: 'relatorios',   icon: '📈', label: 'Relatórios',   pro: true },
  { id: 'loja',         icon: '🛍️', label: 'Loja',         pro: false }
]

// ─────────────────────────────────────────────────────────────
// Bottom Tab Bar — mobile (4 itens principais + Mais → bottom sheet)
// Spec: Nubank/Mercado Livre/Stripe app style.
// ─────────────────────────────────────────────────────────────
const MOBILE_PRIMARY_TABS = [
  { id: 'painel',       icon: '🏠', label: 'Painel'       },
  { id: 'avaliacoes',   icon: '⭐', label: 'Avaliações'   },
  { id: 'concorrentes', icon: '🏆', label: 'Concorrentes', pro: true },
  { id: 'more',         icon: '☰',  label: 'Mais'         }
]

function BottomTabBar({ active, onChange, plan, onOpenMore, moreOpen }) {
  return (
    <nav style={{
      position:'fixed', bottom: 0, left: 0, right: 0,
      background:'rgba(255,255,255,0.96)', backdropFilter:'blur(20px)',
      borderTop:'1px solid '+T.border,
      display:'flex', zIndex: 50,
      paddingBottom:'env(safe-area-inset-bottom, 0)',
      boxShadow:'0 -2px 12px rgba(15,23,42,0.06)'
    }}>
      {MOBILE_PRIMARY_TABS.map(tab => {
        const isMore = tab.id === 'more'
        const isActive = isMore ? moreOpen : active === tab.id
        const isLocked = tab.pro && plan === 'free'
        return (
          <a
            key={tab.id}
            href={isLocked ? '/plano-pro' : '#'}
            onClick={(e) => {
              if (isLocked) return
              e.preventDefault()
              if (isMore) { onOpenMore(); return }
              onChange(tab.id)
            }}
            style={{
              flex: 1, minWidth: 0, maxWidth:'25%',
              display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              padding:'10px 2px 12px',
              color: isActive ? T.blue : T.textMid,
              textDecoration:'none',
              position:'relative',
              borderTop: isActive ? `2px solid ${T.blue}` : '2px solid transparent',
              transition:'color .12s, border-color .12s',
              overflow:'hidden'
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10.5, fontWeight: isActive ? 700 : 500,
              whiteSpace:'nowrap', textAlign:'center', maxWidth:'100%'
            }}>{tab.label}</span>
            {isLocked && (
              <span style={{
                position:'absolute', top: 4, right: 'calc(50% - 22px)',
                fontSize: 9, padding:'1px 4px', borderRadius: 3,
                background:'#FBBC04', color:'#78350F', fontWeight: 800
              }}>🔒</span>
            )}
          </a>
        )
      })}
    </nav>
  )
}

// Bottom Sheet "Mais" — overlay com secundários
function MoreSheet({ open, onClose, onPick, plan, user, onLogout }) {
  // Fecha com ESC
  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const items = [
    { label:'Alertas',     icon:'🔔', tabId:'alertas',    pro: true  },
    { label:'Relatórios',  icon:'📊', tabId:'relatorios', pro: true  },
    { label:'Loja',        icon:'🛒', tabId:'loja'                   },
    { label:'Configurações', icon:'⚙️', tabId:'config', hash:'negocio' },
    { label:'Minha conta', icon:'👤', tabId:'config', hash:'conta' }
  ]

  const handleLogout = (e) => {
    e.preventDefault()
    onClose()
    onLogout && onLogout()
  }

  const displayName = (user && (user.name || user.email)) || 'Sua conta'
  const displayEmail = (user && user.email) || ''

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset: 0, background:'rgba(15,23,42,.55)',
          zIndex: 60, animation:'fadeInBs .15s ease-out'
        }}/>
      <style>{`
        @keyframes fadeInBs{from{opacity:0}to{opacity:1}}
        @keyframes slideUpBs{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>
      {/* Sheet */}
      <div style={{
        position:'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
        background: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow:'0 -8px 32px rgba(15,23,42,.18)',
        animation:'slideUpBs .22s cubic-bezier(.22,.61,.36,1)',
        paddingBottom:'calc(env(safe-area-inset-bottom, 0) + 12px)',
        maxHeight:'85vh', overflowY:'auto'
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 999, background:'#CBD5E1',
          margin:'10px auto 14px'
        }}/>

        {/* User header */}
        <div style={{ padding:'4px 20px 16px', borderBottom:'1px solid '+T.border, marginBottom: 10 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius:'50%', background: T.blue, color:'#fff',
              display:'grid', placeItems:'center', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>
              {(displayName || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
              {displayEmail && <div style={{ fontSize: 12, color: T.textMid, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayEmail}</div>}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div style={{ padding:'0 8px' }}>
          {items.map((it, i) => {
            const isLocked = it.pro && plan === 'free'
            return (
              <a
                key={i}
                href={isLocked ? '/plano-pro' : '#'}
                onClick={(e) => {
                  if (isLocked) return
                  e.preventDefault()
                  onPick(it.tabId, it.hash)
                  onClose()
                }}
                style={{
                  display:'flex', alignItems:'center', gap: 14,
                  padding:'14px 14px', borderRadius: 12, textDecoration:'none',
                  color: T.text, fontSize: 15, fontWeight: 500,
                  marginBottom: 2
                }}
              >
                <span style={{ fontSize: 22, width: 28, textAlign:'center' }}>{it.icon}</span>
                <span style={{ flex: 1 }}>{it.label}</span>
                {isLocked && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing:'.05em',
                    background:'#FBBC04', color:'#78350F',
                    padding:'2px 7px', borderRadius: 5
                  }}>PRO</span>
                )}
                {!isLocked && <span style={{ color: T.textDim, fontSize: 18 }}>›</span>}
              </a>
            )
          })}

          {/* Sair separado */}
          <div style={{ borderTop:'1px solid '+T.border, marginTop: 8, paddingTop: 8 }}>
            <a
              href="/"
              onClick={handleLogout}
              style={{
                display:'flex', alignItems:'center', gap: 14,
                padding:'14px 14px', borderRadius: 12, textDecoration:'none',
                color: T.red, fontSize: 15, fontWeight: 500
              }}
            >
              <span style={{ fontSize: 22, width: 28, textAlign:'center' }}>🚪</span>
              <span style={{ flex: 1 }}>Sair</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

function TopTabs({ active, onChange, plan, isMobile }) {
  const scrollerRef = React.useRef(null)
  const activeRef = React.useRef(null)
  const [showFadeRight, setShowFadeRight] = React.useState(false)
  const [showFadeLeft, setShowFadeLeft] = React.useState(false)

  // Atualiza fade indicators (mostra que tem mais conteúdo scrollavel)
  const updateFades = React.useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setShowFadeLeft(el.scrollLeft > 4)
    setShowFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  React.useEffect(() => {
    updateFades()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateFades, { passive: true })
    window.addEventListener('resize', updateFades)
    return () => {
      el.removeEventListener('scroll', updateFades)
      window.removeEventListener('resize', updateFades)
    }
  }, [updateFades])

  // Quando troca de aba em mobile, centraliza a ativa no scroller.
  // Em desktop as 6 abas cabem juntas — não precisa scroll (e scrollIntoView
  // global causava jump horizontal indesejado na página inteira).
  React.useEffect(() => {
    if (!isMobile || !activeRef.current || !scrollerRef.current) return
    const el = activeRef.current
    const scroller = scrollerRef.current
    const offset = el.offsetLeft - (scroller.clientWidth / 2) + (el.clientWidth / 2)
    scroller.scrollTo({ left: Math.max(0, offset), behavior:'smooth' })
  }, [active, isMobile])

  return (
    <div style={{
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      position: 'sticky',
      top: isMobile ? 56 : 60, // logo abaixo do header
      zIndex: 49,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255,255,255,0.92)'
    }}>
      <div style={{ position:'relative', maxWidth: 1280, margin: '0 auto' }}>
        <div ref={scrollerRef} style={{
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          <style>{`
            /* Hide webkit scrollbar */
            div[style*="overflowX: auto"]::-webkit-scrollbar{display:none}
          `}</style>
        {TABS.map(tab => {
          const isActive = active === tab.id
          const isLocked = tab.pro && plan === 'free'
          return (
            <a
              key={tab.id}
              ref={isActive ? activeRef : null}
              href={isLocked ? '/plano-pro' : '#'}
              onClick={(e) => {
                if (isLocked) return // deixa o href levar
                e.preventDefault()
                onChange(tab.id)
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: isMobile ? 5 : 7,
                padding: isMobile ? '14px 10px 12px' : '14px 14px 12px',
                fontSize: isMobile ? 12.5 : 13.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? T.blue : T.textMid,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderBottom: isActive ? `2px solid ${T.blue}` : '2px solid transparent',
                transition: 'color .12s, border-color .12s',
                flexShrink: 0,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = T.text }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = T.textMid }}
            >
              <span style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {isLocked && (
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em',
                  background: '#FBBC04', color: '#78350F',
                  padding: '2px 6px', borderRadius: 5, marginLeft: 2
                }}>PRO</span>
              )}
            </a>
          )
        })}
        </div>
        {/* Fade gradient indicators — sinaliza scroll lateral */}
        {showFadeLeft && (
          <div style={{
            position:'absolute', top: 0, bottom: 0, left: 0, width: 24,
            background:'linear-gradient(to right, rgba(255,255,255,.95), rgba(255,255,255,0))',
            pointerEvents:'none', zIndex: 1
          }}/>
        )}
        {showFadeRight && (
          <div style={{
            position:'absolute', top: 0, bottom: 0, right: 0, width: 28,
            background:'linear-gradient(to left, rgba(255,255,255,.95), rgba(255,255,255,0))',
            pointerEvents:'none', zIndex: 1,
            display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight: 4
          }}>
            <span style={{ fontSize: 14, color: T.textMid, opacity: 0.7 }}>›</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Placeholder pras telas ainda não construídas
function ComingSoon({ icon, title, desc, plan }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px', textAlign: 'center' }}>
      <Card style={{ padding: '60px 32px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{icon}</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: T.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ fontSize: 15, color: T.textMid, margin: '0 0 28px', lineHeight: 1.6 }}>{desc}</p>
        {plan === 'free' ? (
          <a href="/plano-pro" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: T.blue, color: '#fff',
            padding: '13px 24px', borderRadius: 11,
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(26,115,232,0.30)'
          }}>
            Desbloquear no Plano Pro →
          </a>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: T.blueSoft, color: T.blueDk,
            padding: '11px 20px', borderRadius: 999,
            fontSize: 13, fontWeight: 600
          }}>
            🔨 Em construção · liberado em breve
          </div>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TELA: CONCORRENTES (Inteligência Competitiva)
// ─────────────────────────────────────────────────────────────

// Sparkline mini-chart (linha + área)
function Sparkline({ data, color = T.blue, w = 80, h = 28 }) {
  // Sem dados, sem variação ou data inválida → não renderiza (evita crash com null/[])
  if (!Array.isArray(data) || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  if (max === min) return null
  const range = max - min
  const xs = data.map((_, i) => (i / (data.length - 1)) * w)
  const ys = data.map(v => h - ((v - min) / range) * (h - 4) - 2)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = `${path} L ${w},${h} L 0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display:'block' }}>
      <path d={area} fill={color} opacity="0.12"/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CompetitorStats({ youPos, total, reviewsToNext, risingCount, isMobile }) {
  const Item = ({ label, value, sub, accent }) => (
    <div style={{
      flex: 1,
      padding: isMobile ? '14px 16px' : '18px 20px',
      borderRight: !isMobile ? `1px solid ${T.border}` : 'none',
      borderBottom: isMobile ? `1px solid ${T.border}` : 'none'
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textDim, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: accent || T.text, letterSpacing:'-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>{sub}</div>
    </div>
  )
  return (
    <Card padded={false} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow:'hidden' }}>
      <Item label="Sua posição" value={`#${youPos}`} sub={`de ${total} empresas`} accent={T.blue}/>
      <Item label="Falta pra subir" value={`${reviewsToNext} ${reviewsToNext === 1 ? 'avaliação' : 'avaliações'}`} sub={`pra alcançar a #${youPos - 1}`} accent={T.amber}/>
      <Item label="Em alta na sua categoria" value={`${risingCount} concorrente${risingCount > 1 ? 's' : ''}`} sub="cresceu essa semana" accent={T.green}/>
    </Card>
  )
}

function FilterChips({ active, onChange, counts }) {
  const chips = [
    { id: 'all',    label: 'Todos',          count: counts.all },
    { id: 'ahead',  label: 'À sua frente',   count: counts.ahead },
    { id: 'behind', label: 'Atrás de você',  count: counts.behind },
    { id: 'rising', label: 'Em alta 📈',     count: counts.rising }
  ]
  return (
    <div style={{ display:'flex', gap: 8, flexWrap:'wrap', marginBottom: 16 }}>
      {chips.map(c => {
        const isActive = active === c.id
        return (
          <button key={c.id}
            onClick={() => onChange(c.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${isActive ? T.blue : T.border}`,
              background: isActive ? T.blue : '#fff',
              color: isActive ? '#fff' : T.textMid,
              fontFamily:"'Inter', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .12s'
            }}>
            {c.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({c.count})</span>
          </button>
        )
      })}
    </div>
  )
}

function CompetitorCard({ comp, youReviews }) {
  const diff = comp.reviews - youReviews // positivo = à frente, negativo = atrás
  const aheadOfYou = diff > 0
  const isYou = comp.isYou
  const isLocked = comp.locked
  const closeTarget = aheadOfYou && diff <= 3 && !isLocked // alvo próximo

  return (
    <Card style={{
      padding: '16px 18px',
      background: isYou ? T.blueSoft : '#fff',
      border: isYou ? `1.5px solid #B9D6FB` : `1px solid ${T.border}`
    }}>
      <div style={{ display:'flex', gap: 14, alignItems:'flex-start' }}>
        {/* Position + medal */}
        <div style={{
          flexShrink: 0,
          width: 44, height: 44, borderRadius: 11,
          background: isYou ? T.blue : '#F1F5F9',
          color: isYou ? '#fff' : T.textMid,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight: 700, fontSize: 15
        }}>
          {comp.medal || `#${comp.pos}`}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4, flexWrap:'wrap' }}>
            {isLocked ? (
              <span style={{ fontSize: 15, fontWeight: 700, color: T.textMid, display:'inline-flex', alignItems:'center', gap: 6 }}>
                🔒 Concorrente oculto
                <a href="/plano-pro" style={{ fontSize: 11, fontWeight: 700, color: T.blue, background: T.blueSoft, padding:'2px 7px', borderRadius: 5, textDecoration:'none' }}>Desbloquear</a>
              </span>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{comp.name}</span>
            )}
            {isYou && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.blue, background:'#fff', border:`1px solid ${T.blue}`, borderRadius: 5, padding:'1px 6px' }}>VOCÊ</span>}
            {closeTarget && !isYou && <span style={{ fontSize: 10.5, fontWeight: 700, color:'#92400E', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius: 5, padding:'1px 6px' }}>🎯 ALVO PRÓXIMO</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 10, fontSize: 12.5, color: T.textMid, marginBottom: 10, flexWrap:'wrap' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 4 }}>
              <Stars rating={comp.rating} size={11}/> <strong style={{ color: T.text, fontSize: 12 }}>{comp.rating.toFixed(1)}</strong>
            </span>
            <span style={{ color: T.textDim }}>·</span>
            <span><strong style={{ color: T.text, fontSize: 12 }}>{comp.reviews}</strong> avaliações</span>
            <span style={{ color: T.textDim }}>·</span>
            <span style={{
              display:'inline-flex', alignItems:'center', gap: 3,
              color: comp.weekGrowth > 0 ? T.green : comp.weekGrowth < 0 ? T.red : T.textDim,
              fontWeight: 600
            }}>
              {comp.weekGrowth > 0 ? '▲' : comp.weekGrowth < 0 ? '▼' : '—'} {Math.abs(comp.weekGrowth) || 0} essa semana
            </span>
          </div>

          {/* Diff vs você (texto contextual) */}
          {!isYou && (
            <div style={{ fontSize: 12.5, color: T.textMid, marginBottom: 10 }}>
              {aheadOfYou
                ? <>Falta <strong style={{ color: T.text }}>{diff} avaliações</strong> pra você ultrapassar</>
                : <>Você está <strong style={{ color: T.text }}>{Math.abs(diff)} avaliação{Math.abs(diff) !== 1 ? 'es' : ''} à frente</strong></>
              }
            </div>
          )}
        </div>

        {/* Sparkline */}
        <div style={{ flexShrink: 0, paddingTop: 4 }}>
          <Sparkline data={comp.history} color={isYou ? T.blue : aheadOfYou ? T.amber : '#94A3B8'} w={70} h={32}/>
          <div style={{ fontSize: 10.5, color: T.textDim, textAlign:'center', marginTop: 2 }}>90 dias</div>
        </div>
      </div>
    </Card>
  )
}

function MyGoalsCard({ goals }) {
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🎯</span>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Minhas Metas no Ranking</h3>
      </div>
      <p style={{ fontSize: 13, color: T.textMid, margin:'0 0 18px' }}>Acompanhe sua jornada rumo ao topo da sua categoria.</p>
      <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
        {goals.map((g, i) => {
          const isCurrent = g.current
          return (
            <div key={i} style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: g.achieved ? T.greenSoft : '#F8FAFC',
              border: `1px solid ${isCurrent ? T.green : g.achieved ? '#86EFAC' : T.border}`
            }}>
              <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: g.achieved ? T.green : T.border,
                  color: g.achieved ? '#fff' : T.textMid,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0
                }}>{g.achieved ? '✓' : '○'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{g.label}</span>
                {isCurrent && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.green, background:'#fff', border:`1px solid ${T.green}`, borderRadius: 5, padding:'1px 6px' }}>VOCÊ ESTÁ AQUI</span>}
                <span style={{ marginLeft:'auto', fontSize: 12, fontWeight: 600, color: g.achieved ? '#065F46' : T.textMid }}>
                  {g.achieved ? 'Conquistado' : `Faltam ${g.reviewsToNext} avaliações`}
                </span>
              </div>
              {!g.achieved && (
                <>
                  <div style={{ height: 6, background: T.border, borderRadius: 999, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: g.progressPct + '%', background: T.blue, borderRadius: 999 }}/>
                  </div>
                  {g.target && <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 6 }}>Alvo: {g.target}</div>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Benchmark da categoria — sua nota vs média/top/mediana
// ─────────────────────────────────────────────────────────────
function CategoryBenchmark({ data, list, isMobile }) {
  if (!list.length) return null
  const others = list.filter(c => !c.isYou && !c.locked)
  const allReviews = [...others.map(c => c.reviews), data.kpis.reviewCount].sort((a,b) => a-b)
  const allRatings = [...others.map(c => c.rating), data.kpis.rating]

  const avgRating = (allRatings.reduce((s,r) => s+r, 0) / allRatings.length).toFixed(1)
  const topReviews = Math.max(...allReviews)
  const topComp = list.find(c => c.reviews === topReviews) || null
  const median = allReviews[Math.floor(allReviews.length / 2)]
  const youRating = data.kpis.rating
  const youReviews = data.kpis.reviewCount

  const ratingDelta = (youRating - parseFloat(avgRating)).toFixed(1)

  const items = [
    {
      label:'Sua nota',
      value: youRating.toFixed(1),
      hint: youRating >= parseFloat(avgRating)
        ? <span style={{ color: T.green }}>{ratingDelta > 0 ? `+${ratingDelta}` : ratingDelta} vs média</span>
        : <span style={{ color: T.red }}>{ratingDelta} vs média</span>,
      icon:'⭐',
      accent: T.blue
    },
    {
      label:'Média da categoria',
      value: avgRating,
      hint:`com ${allRatings.length} negócios`,
      icon:'📊',
      accent: T.textMid
    },
    {
      label:'Líder em volume',
      value: topReviews,
      hint: topComp ? (topComp.locked ? '🔒 nome oculto' : topComp.isYou ? '(você!)' : topComp.name) : '—',
      icon:'🥇',
      accent: T.amber
    },
    {
      label:'Mediana da região',
      value: median,
      hint: youReviews >= median ? <span style={{ color: T.green }}>Acima da mediana</span> : <span style={{ color: T.red }}>Abaixo da mediana</span>,
      icon:'📍',
      accent: T.textMid
    }
  ]

  return (
    <Card>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
          📊 Benchmark da categoria
        </h3>
        <div style={{ fontSize: 12.5, color: T.textMid }}>Como você se compara nos índices da sua categoria.</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: 14, background: T.bg, border:'1px solid '+T.border, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: T.textMid, fontWeight: 600, letterSpacing:'.02em', textTransform:'uppercase', marginBottom: 4, display:'flex', alignItems:'center', gap: 4 }}>
              <span style={{ fontSize: 12 }}>{it.icon}</span>{it.label}
            </div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 26, fontWeight: 800, color: it.accent, letterSpacing:'-0.02em', lineHeight: 1, marginBottom: 4 }}>
              {it.value}
            </div>
            <div style={{ fontSize: 11.5, color: T.textDim, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.hint}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Mapa SVG dos concorrentes
// ─────────────────────────────────────────────────────────────
function CompetitorMap({ list, isMobile }) {
  if (!list.length) return null

  // Sem distâncias reais (backend ainda não retorna lat/lng) → empty state honesto
  const hasAnyDistance = list.some(c => !c.isYou && typeof c.distance === 'number' && c.distance > 0)
  if (!hasAnyDistance) {
    return (
      <Card padded={false} style={{ padding: 22 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
            🗺️ Mapa de concorrência
          </h3>
          <div style={{ fontSize: 12.5, color: T.textMid }}>Em breve: posição geográfica de cada concorrente em relação a você.</div>
        </div>
        <div style={{
          padding: 28, borderRadius: 12, background: T.bg,
          border:'1px dashed '+T.border, textAlign:'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
          <div style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.5, maxWidth: 420, margin:'0 auto' }}>
            Estamos integrando o Google Maps pra mostrar onde cada concorrente está em volta de você. Por enquanto, veja o ranking detalhado abaixo.
          </div>
        </div>
      </Card>
    )
  }

  const W = isMobile ? 340 : 720
  const H = isMobile ? 340 : 380
  const cx = W / 2, cy = H / 2
  const maxR = Math.min(W, H) / 2 - 30
  const maxDistance = Math.max(...list.filter(c => !c.isYou).map(c => c.distance || 0)) || 2000
  const scale = maxR / maxDistance

  const others = list.filter(c => !c.isYou && c.distance != null && c.angle != null)
  const me = list.find(c => c.isYou)

  return (
    <Card padded={false} style={{ padding: 18 }}>
      <div style={{ marginBottom: 14, display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
            🗺️ Mapa de concorrência
          </h3>
          <div style={{ fontSize: 12.5, color: T.textMid }}>Quem disputa o cliente que está pertinho de você.</div>
        </div>
        <div style={{ display:'flex', gap: 10, fontSize: 11, flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius:'50%', background: T.blue, display:'inline-block' }}/>Você</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius:'50%', background: T.amber, display:'inline-block' }}/>À sua frente</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius:'50%', background:'#CBD5E1', display:'inline-block' }}/>Atrás</span>
        </div>
      </div>

      <div style={{
        position:'relative', borderRadius: 12, overflow:'hidden',
        background:'linear-gradient(135deg,#F1F5F9 0%, #E2E8F0 100%)',
        border:'1px solid '+T.border, aspectRatio: `${W}/${H}`
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
          {/* Grid lines (estilo mapa abstrato) */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)"/>

          {/* Anéis de distância */}
          {[0.33, 0.66, 1].map((p, i) => (
            <circle key={i} cx={cx} cy={cy} r={maxR * p}
              fill="none" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.5"/>
          ))}
          {/* Labels dos anéis */}
          {[0.33, 0.66, 1].map((p, i) => {
            const m = Math.round((maxDistance * p) / 100) * 100
            return (
              <text key={i} x={cx} y={cy - maxR * p - 4} fontSize="9.5" fill="#94A3B8" textAnchor="middle" fontWeight="600">
                {m < 1000 ? `${m}m` : `${(m/1000).toFixed(1)}km`}
              </text>
            )
          })}

          {/* Linhas radiais sutis */}
          {[0, 1, 2, 3].map(i => (
            <line key={i}
              x1={cx} y1={cy}
              x2={cx + Math.cos(i * Math.PI / 4) * maxR}
              y2={cy + Math.sin(i * Math.PI / 4) * maxR}
              stroke="#CBD5E1" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.4"/>
          ))}

          {/* Concorrentes */}
          {others.map(c => {
            const r = (c.distance || 0) * scale
            const x = cx + Math.cos(c.angle) * r
            const y = cy + Math.sin(c.angle) * r
            const ahead = c.reviews > (me?.reviews || 0)
            const pinColor = ahead ? T.amber : '#CBD5E1'
            return (
              <g key={c.id}>
                {/* "rastro" do pino */}
                <ellipse cx={x} cy={y + 9} rx={7} ry={2.5} fill="rgba(15,23,42,.18)"/>
                <circle cx={x} cy={y} r={11} fill={pinColor} stroke="#fff" strokeWidth="2"/>
                <text x={x} y={y + 3.5} fontSize="9" fontWeight="800" fill="#fff" textAnchor="middle">{c.pos}</text>
              </g>
            )
          })}

          {/* Você (centro, destaque) */}
          {me && (
            <g>
              <circle cx={cx} cy={cy} r={20} fill={T.blue} opacity="0.12"/>
              <circle cx={cx} cy={cy} r={14} fill={T.blue} opacity="0.25"/>
              <ellipse cx={cx} cy={cy + 11} rx={9} ry={3} fill="rgba(15,23,42,.25)"/>
              <circle cx={cx} cy={cy} r={13} fill={T.blue} stroke="#fff" strokeWidth="2.5"/>
              <text x={cx} y={cy + 4} fontSize="11" fontWeight="800" fill="#fff" textAnchor="middle">VC</text>
            </g>
          )}
        </svg>
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: T.textDim, textAlign:'center', display:'flex', justifyContent:'center', alignItems:'center', gap: 6 }}>
        <span>📍</span>
        <span>Posições relativas das {others.length} cafeterias da sua categoria. Anéis = distância até você.</span>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Linha de concorrente premium — com distância, alvo e CTA
// ─────────────────────────────────────────────────────────────
function EnhancedCompetitorRow({ comp, youReviews, isMobile }) {
  const diff = comp.reviews - youReviews
  const aheadOfYou = diff > 0
  const isYou = comp.isYou
  const isLocked = comp.locked
  const closeTarget = aheadOfYou && diff <= 3 && !isLocked
  const distance = comp.distance != null
    ? (comp.distance < 1000 ? `${comp.distance}m` : `${(comp.distance/1000).toFixed(1)}km`)
    : null

  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: isYou ? T.blueSoft : '#fff',
      border: isYou ? '1.5px solid #B9D6FB' : '1px solid '+T.border,
      display:'flex', gap: 12, alignItems:'flex-start'
    }}>
      {/* Posição + medalha */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isYou ? T.blue : '#F1F5F9', color: isYou ? '#fff' : T.textMid,
        display:'grid', placeItems:'center', fontWeight: 800, fontSize: 14
      }}>
        {comp.medal || `#${comp.pos}`}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4, flexWrap:'wrap' }}>
          {isLocked ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: T.textMid, display:'inline-flex', alignItems:'center', gap: 6 }}>
              🔒 Concorrente oculto
              <a href="/plano-pro" style={{ fontSize: 10, fontWeight: 700, color: T.blue, background: T.blueSoft, padding:'2px 6px', borderRadius: 4, textDecoration:'none' }}>Desbloquear</a>
            </span>
          ) : (
            <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text }}>{comp.name}</span>
          )}
          {isYou && <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, background:'#fff', border:`1px solid ${T.blue}`, borderRadius: 4, padding:'1px 5px' }}>VOCÊ</span>}
          {closeTarget && !isYou && <span style={{ fontSize: 10, fontWeight: 700, color:'#92400E', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius: 4, padding:'1px 5px' }}>🎯 ALVO</span>}
        </div>

        {/* Métricas em linha */}
        <div style={{ display:'flex', alignItems:'center', gap: 10, fontSize: 12, color: T.textMid, flexWrap:'wrap', marginBottom: 6 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap: 3 }}>
            <Stars rating={comp.rating} size={10}/>
            <strong style={{ color: T.text, fontSize: 11.5 }}>{comp.rating.toFixed(1)}</strong>
          </span>
          <span style={{ color: T.textDim }}>·</span>
          <span><strong style={{ color: T.text, fontSize: 11.5 }}>{comp.reviews}</strong> {comp.reviews === 1 ? 'avaliação' : 'avaliações'}</span>
          {comp.weekGrowth != null && (
            <>
              <span style={{ color: T.textDim }}>·</span>
              <span style={{
                display:'inline-flex', alignItems:'center', gap: 2,
                color: comp.weekGrowth > 0 ? T.green : comp.weekGrowth < 0 ? T.red : T.textDim,
                fontWeight: 600
              }}>
                {comp.weekGrowth > 0 ? '▲' : comp.weekGrowth < 0 ? '▼' : '—'}{Math.abs(comp.weekGrowth) || 0}/sem
              </span>
            </>
          )}
          {distance && (
            <>
              <span style={{ color: T.textDim }}>·</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap: 3 }}>📍 {distance}</span>
            </>
          )}
        </div>

        {/* Diff vs você */}
        {!isYou && (
          <div style={{ fontSize: 12.5, color: T.textMid }}>
            {aheadOfYou
              ? <>Falta{diff === 1 ? '' : 'm'} <strong style={{ color: T.text }}>{diff} {diff === 1 ? 'avaliação' : 'avaliações'}</strong> pra ultrapassar</>
              : diff === 0
              ? <>Empatados em avaliações</>
              : <>Você está <strong style={{ color: T.text }}>{Math.abs(diff)} {Math.abs(diff) === 1 ? 'avaliação' : 'avaliações'} à frente</strong></>
            }
          </div>
        )}
      </div>

      {/* Mini sparkline — só renderiza se tem histórico com variação real */}
      {!isMobile && Array.isArray(comp.history) && comp.history.length >= 2 && (
        <div style={{ flexShrink: 0 }}>
          <Sparkline data={comp.history} color={isYou ? T.blue : aheadOfYou ? T.amber : '#94A3B8'} w={60} h={28}/>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Simulador de crescimento
// ─────────────────────────────────────────────────────────────
function GrowthSimulator({ data, list, isMobile }) {
  const [perWeek, setPerWeek] = React.useState(2)
  const youReviews = data.kpis.reviewCount
  const youPos = data.kpis.rankingPos
  const allOthers = list.filter(c => !c.isYou && !c.locked).map(c => ({
    pos: c.pos,
    reviews: c.reviews,
    growth: c.weekGrowth
  }))

  // Projeta posição em N semanas — para cada concorrente, sua média + nosso perWeek
  function projectPos(weeks) {
    const myFuture = youReviews + perWeek * weeks
    let pos = 1
    for (const o of allOthers) {
      const theirFuture = o.reviews + (o.growth || 0) * weeks
      if (theirFuture > myFuture) pos++
    }
    return { pos, my: myFuture }
  }

  const w4  = projectPos(4)   // ~30 dias
  const w8  = projectPos(8)   // ~60 dias
  const w12 = projectPos(12)  // ~90 dias

  const positionChange = (p) => {
    if (p === youPos) return { txt:'Mantém posição', color: T.textMid }
    if (p < youPos) return { txt:`Sobe pra ${p}º`, color: T.green }
    return { txt:`Cai pra ${p}º`, color: T.red }
  }

  return (
    <Card>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
          🚀 Simulador de crescimento
        </h3>
        <div style={{ fontSize: 12.5, color: T.textMid }}>"E se eu conseguisse <strong>{perWeek}</strong> nova{perWeek !== 1 ? 's' : ''} avaliação/semana?"</div>
      </div>

      {/* Slider */}
      <div style={{ padding:'8px 4px 16px' }}>
        <input
          type="range"
          min="1" max="10" step="1"
          value={perWeek}
          onChange={(e) => setPerWeek(parseInt(e.target.value))}
          style={{ width:'100%', accentColor: T.blue, cursor:'pointer' }}
        />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color: T.textDim, marginTop: 4 }}>
          <span>1/sem</span>
          <span>5/sem</span>
          <span>10/sem</span>
        </div>
      </div>

      {/* Projeções */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label:'Em 30 dias', proj: w4,  d:'+30d' },
          { label:'Em 60 dias', proj: w8,  d:'+60d' },
          { label:'Em 90 dias', proj: w12, d:'+90d' }
        ].map((it, i) => {
          const change = positionChange(it.proj.pos)
          return (
            <div key={i} style={{
              padding: isMobile ? 12 : 14, borderRadius: 10,
              background: T.bg, border:'1px solid '+T.border, textAlign:'center'
            }}>
              <div style={{ fontSize: 10.5, color: T.textDim, fontWeight: 600, letterSpacing:'.04em', textTransform:'uppercase', marginBottom: 4 }}>{it.label}</div>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 800, color: T.text, letterSpacing:'-0.02em', lineHeight: 1, marginBottom: 4 }}>
                #{it.proj.pos}
              </div>
              <div style={{ fontSize: 11, color: change.color, fontWeight: 600, marginBottom: 4 }}>
                {change.txt}
              </div>
              <div style={{ fontSize: 11, color: T.textDim }}>
                {it.proj.my} avaliações totais
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: 14, padding: 12, background: T.blueSoft, borderRadius: 8,
        fontSize: 12.5, color: T.blueDk, lineHeight: 1.5
      }}>
        💡 <b>Como capitar {perWeek}/semana?</b> {
          perWeek <= 2 ? 'Ative a placa de balcão — toque do cliente após pagar gera ~3 avaliações/semana automaticamente.' :
          perWeek <= 5 ? 'Combine placa de balcão + cartão NFC do garçom — multiplica os pontos de contato em 2-3x.' :
                         'Kit completo (placa + cartão + pulseira) + treinamento da equipe pra pedir avaliação no fim do atendimento.'
        }
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Oportunidades acionáveis
// ─────────────────────────────────────────────────────────────
function OpportunitiesPanel({ data, list, isMobile }) {
  if (!list.length) return null
  const youPos = data.kpis.rankingPos
  const youReviews = data.kpis.reviewCount
  const ahead = list.filter(c => !c.isYou && !c.locked && c.reviews > youReviews).sort((a,b) => a.reviews - b.reviews)
  const rising = list.filter(c => !c.isYou && !c.locked && c.weekGrowth >= 2 && c.reviews <= youReviews + 5)
  const closeUp = ahead.find(c => c.reviews - youReviews <= 3)
  const top1 = list.find(c => c.pos === 1)

  const ops = []
  if (closeUp) {
    ops.push({
      icon:'🎯',
      color: T.green,
      bg: T.greenSoft,
      title:`Subir pro Top ${closeUp.pos} está perto`,
      text:`Faltam ${closeUp.reviews - youReviews} ${closeUp.reviews - youReviews === 1 ? 'avaliação' : 'avaliações'} pra ultrapassar ${closeUp.locked ? 'o próximo' : closeUp.name}. Em 1-2 semanas com captação consistente.`,
      cta:{ label:'Ativar mais placas', href:'/ativar-codigo' }
    })
  }
  if (rising.length > 0) {
    const r = rising[0]
    ops.push({
      icon:'🚨',
      color: T.red,
      bg:'#FEF2F2',
      title:`${r.locked ? 'Um concorrente' : r.name} está acelerando`,
      text:`Cresce ${r.weekGrowth} ${r.weekGrowth === 1 ? 'avaliação' : 'avaliações'} por semana — o dobro da média da categoria. Pode passar você em ${Math.ceil((youReviews - r.reviews + 1) / Math.max(1, r.weekGrowth - 1))} semanas se não reagir.`,
      cta:{ label:'Ver simulador', href:'#simulador' }
    })
  }
  if (top1 && !top1.isYou && data.kpis.rating >= 4.8) {
    ops.push({
      icon:'⭐',
      color: T.blue,
      bg: T.blueSoft,
      title:'Sua nota é igual ou maior que a do líder',
      text:`Sua reputação de qualidade está no topo. Falta volume: o líder tem ${top1.reviews} avaliações e você ${youReviews}.`,
      cta:{ label:'Comprar dispositivos', href:'/kit' }
    })
  }
  if (youPos <= 3) {
    ops.push({
      icon:'🏆',
      color: T.amber,
      bg:'#FFFBEB',
      title:'Você está no Top 3 — capitalize',
      text:'97% dos clientes escolhem entre os 3 primeiros. Compartilhe seu link nas redes sociais e flyers pra manter o ritmo.',
      cta:{ label:'Pegar link de avaliação', href:'/app?tab=loja' }
    })
  }

  if (ops.length === 0) return null

  return (
    <Card>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
          💡 Oportunidades pra subir
        </h3>
        <div style={{ fontSize: 12.5, color: T.textMid }}>O que fazer agora pra ganhar posições com mais velocidade.</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        {ops.map((op, i) => (
          <div key={i} style={{
            padding: 14, borderRadius: 10, background: op.bg,
            border:`1px solid ${op.color}33`
          }}>
            <div style={{ display:'flex', gap: 10, alignItems:'flex-start' }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{op.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 4, lineHeight: 1.35 }}>
                  {op.title}
                </div>
                <div style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.5, marginBottom: 8 }}>
                  {op.text}
                </div>
                <a href={op.cta.href} style={{
                  display:'inline-block', fontSize: 12, fontWeight: 700, color: op.color,
                  textDecoration:'none', borderBottom:`1px dashed ${op.color}`
                }}>{op.cta.label} →</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CompetitorsScreen({ data, isMobile }) {
  const [filter, setFilter] = React.useState('all')
  const [sortMode, setSortMode] = React.useState('position') // 'position' | 'distance' | 'growth'
  const youReviews = data.kpis.reviewCount
  const youPos = data.kpis.rankingPos
  const list = data.competitors || []

  // Empty state — API ainda não retornou concorrentes (ou negócio em região rarefeita)
  if (list.length === 0) {
    return (
      <main style={{ maxWidth: 720, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            🏆 Inteligência Competitiva
          </h1>
        </div>
        <Card style={{ textAlign:'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
          <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
            Coletando concorrentes da sua região
          </h2>
          <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, margin:'0 0 18px' }}>
            A gente está vasculhando o Google pra encontrar quem disputa o ranking com você na sua categoria e raio.
            Isso pode levar alguns segundos no primeiro acesso.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: T.blue, color:'#fff', border:'none', borderRadius: 9,
            padding:'10px 20px', fontSize: 13.5, fontWeight: 700, cursor:'pointer'
          }}>Recarregar</button>
        </Card>
      </main>
    )
  }

  const ahead  = list.filter(c => !c.isYou && c.reviews >  youReviews)
  const behind = list.filter(c => !c.isYou && c.reviews <= youReviews)
  const rising = list.filter(c => !c.isYou && c.weekGrowth >= 2)

  let visible = filter === 'ahead'  ? [list.find(c => c.isYou), ...ahead].filter(Boolean)
              : filter === 'behind'  ? [list.find(c => c.isYou), ...behind].filter(Boolean)
              : filter === 'rising'  ? [list.find(c => c.isYou), ...rising].filter(Boolean)
              : list

  // Ordenação (mantém você sempre presente; ordena resto pelo modo)
  if (sortMode === 'distance') {
    visible = [...visible].sort((a, b) => (a.distance ?? 9e9) - (b.distance ?? 9e9))
  } else if (sortMode === 'growth') {
    visible = [...visible].sort((a, b) => (b.weekGrowth ?? -9e9) - (a.weekGrowth ?? -9e9))
  }
  // sortMode === 'position' usa a ordem natural (pos)

  const counts = { all: list.length, ahead: ahead.length, behind: behind.length, rising: rising.length }

  const sortChips = [
    { key:'position', label:'Por posição' },
    { key:'distance', label:'Por distância' },
    { key:'growth',   label:'Em alta' }
  ]

  return (
    <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          🏆 Inteligência Competitiva
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          {data.kpis.totalCompetitors > 0 ? `${data.kpis.totalCompetitors} negócios na sua categoria num raio de 3km. Sua presença local em detalhe.` : 'Sua presença local em detalhe.'}
        </p>
      </div>

      {/* Quick stats */}
      <Section>
        <CompetitorStats
          youPos={youPos}
          total={list.length}
          reviewsToNext={data.hero.reviewsToNext}
          risingCount={rising.length}
          isMobile={isMobile}
        />
      </Section>

      {/* BENCHMARK DA CATEGORIA */}
      <Section><CategoryBenchmark data={data} list={list} isMobile={isMobile}/></Section>

      {/* MAPA + LISTA — grid 2 colunas no desktop */}
      <Section>
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 380px',
          gap: isMobile ? 16 : 20
        }}>
          {/* Esquerda: Mapa em cima + Lista */}
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <CompetitorMap list={list} isMobile={isMobile}/>

            <Card>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 8px', display:'inline-flex', alignItems:'center', gap: 8 }}>
                  📋 Ranking detalhado
                </h3>
                <FilterChips active={filter} onChange={setFilter} counts={counts}/>
                <div style={{ display:'flex', gap: 6, marginTop: 8, flexWrap:'wrap' }}>
                  {sortChips.map(s => {
                    const a = sortMode === s.key
                    return (
                      <button key={s.key} onClick={() => setSortMode(s.key)} style={{
                        fontSize: 11, fontWeight: 600, padding:'4px 10px', borderRadius: 6,
                        border:'1px solid', borderColor: a ? T.blue : T.border,
                        background: a ? T.blueSoft : '#fff',
                        color: a ? T.blueDk : T.textMid, cursor:'pointer'
                      }}>{s.label}</button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                {visible.map(c => (
                  <EnhancedCompetitorRow key={c.id} comp={c} youReviews={youReviews} isMobile={isMobile}/>
                ))}
              </div>
            </Card>
          </div>

          {/* Direita: Simulador + Oportunidades + Metas */}
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <div id="simulador">
              <GrowthSimulator data={data} list={list} isMobile={isMobile}/>
            </div>
            <OpportunitiesPanel data={data} list={list} isMobile={isMobile}/>
            <MyGoalsCard goals={data.goals}/>
          </div>
        </div>
      </Section>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// ALERTAS — tipos, cores e ícones
// ─────────────────────────────────────────────────────────────
const ALERT_STYLES = {
  promotion:  { bg:'#ECFDF5', border:'#A7F3D0', dot:'#10B981', label:'Conquista'   },
  threat:     { bg:'#FFFBEB', border:'#FDE68A', dot:'#F59E0B', label:'Ameaça'      },
  regression: { bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444', label:'Queda'       },
  advance:    { bg:'#EFF6FF', border:'#BFDBFE', dot:'#1A73E8', label:'Avanço'      },
  review:     { bg:'#F8FAFC', border:'#E2E8F0', dot:'#64748B', label:'Avaliação'   },
  goal:       { bg:'#FEFCE8', border:'#FEF08A', dot:'#CA8A04', label:'Meta'        }
}

function AlertStats({ stats, isMobile }) {
  const items = [
    { label:'Novos hoje',      value: stats.newToday,        sub:'requerem atenção', accent: T.blue },
    { label:'Essa semana',     value: stats.weekly,          sub:'eventos no total',  accent: T.green },
    { label:'Mudanças no Top 3', value: stats.positionChanges, sub:'nos últimos 7 dias', accent: T.amber }
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 8 : 12 }}>
      {items.map((it,i) => (
        <Card key={i} padded={false} style={{ padding: isMobile ? 12 : 18 }}>
          <div style={{ fontSize: isMobile ? 11 : 12, color: T.textMid, fontWeight:600, letterSpacing:'.02em', textTransform:'uppercase', marginBottom: 4 }}>{it.label}</div>
          <div style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: it.accent, letterSpacing:'-0.02em', lineHeight: 1 }}>{it.value}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: T.textDim, marginTop: 4 }}>{it.sub}</div>
        </Card>
      ))}
    </div>
  )
}

function AlertFilterChips({ active, onChange, counts }) {
  const chips = [
    { key:'all',          label:'Todos',         count: counts.all },
    { key:'ranking',      label:'Ranking',       count: counts.ranking },
    { key:'concorrente',  label:'Concorrentes',  count: counts.concorrente },
    { key:'avaliacao',    label:'Avaliações',    count: counts.avaliacao }
  ]
  return (
    <div style={{ display:'flex', gap: 8, marginBottom: 14, flexWrap:'wrap' }}>
      {chips.map(c => {
        const isActive = active === c.key
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            style={{
              border:'1px solid', borderColor: isActive ? T.blue : T.border,
              background: isActive ? T.blue : T.surface,
              color: isActive ? '#fff' : T.textMid,
              padding:'7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor:'pointer',
              transition:'all .15s', display:'inline-flex', alignItems:'center', gap: 6
            }}
          >
            {c.label}
            <span style={{
              background: isActive ? 'rgba(255,255,255,.22)' : T.bg,
              color: isActive ? '#fff' : T.textMid,
              fontSize: 11, fontWeight: 700, padding:'1px 7px', borderRadius: 999, lineHeight:'16px'
            }}>{c.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function AlertItem({ alert }) {
  const s = ALERT_STYLES[alert.type] || ALERT_STYLES.review
  return (
    <Card padded={false} style={{ padding: 14, position:'relative', borderColor: s.border, background: s.bg }}>
      {alert.isNew && (
        <span style={{
          position:'absolute', top: 14, right: 14, background: T.blue, color:'#fff',
          fontSize: 10, fontWeight: 800, letterSpacing:'.05em', padding:'2px 7px', borderRadius: 4
        }}>NOVO</span>
      )}
      <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background:'#fff',
          display:'grid', placeItems:'center', fontSize: 18, border:'1px solid '+s.border, flexShrink: 0
        }}>{alert.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 2, flexWrap:'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: s.dot, letterSpacing:'.05em',
              textTransform:'uppercase'
            }}>{s.label}</span>
            <span style={{ width: 3, height: 3, borderRadius:'50%', background: T.textDim, display:'inline-block' }}/>
            <span style={{ fontSize: 12, color: T.textDim }}>{alert.when}</span>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 3, paddingRight: alert.isNew ? 56 : 0 }}>
            {alert.title}
          </div>
          {alert.detail && (
            <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{alert.detail}</div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ChannelRow({ icon, name, desc, enabled, onToggle, locked, children }) {
  return (
    <div style={{
      padding:'14px 0', borderBottom:'1px solid '+T.border,
      display:'flex', alignItems:'flex-start', gap: 12
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, background: enabled ? T.blueSoft : T.bg,
        display:'grid', placeItems:'center', fontSize: 16, flexShrink: 0
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{name}</div>
          {/* Toggle switch */}
          <button
            disabled={locked}
            onClick={onToggle}
            aria-label={enabled ? 'Desativar' : 'Ativar'}
            style={{
              width: 38, height: 22, borderRadius: 999, border:'none',
              background: enabled ? T.blue : '#CBD5E1',
              position:'relative', cursor: locked ? 'not-allowed' : 'pointer',
              opacity: locked ? 0.6 : 1, transition:'background .15s', flexShrink: 0
            }}>
            <span style={{
              position:'absolute', top: 2, left: enabled ? 18 : 2,
              width: 18, height: 18, borderRadius:'50%', background:'#fff',
              transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,.2)'
            }}/>
          </button>
        </div>
        <div style={{ fontSize: 12, color: T.textMid, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
        {children && <div style={{ marginTop: 8 }}>{children}</div>}
      </div>
    </div>
  )
}

function AlertChannelsCard({ channels, onChange }) {
  const [emailFreq, setEmailFreq] = React.useState(channels.email.frequency)
  const [waPhone, setWaPhone] = React.useState(channels.whatsapp.phone)

  return (
    <Card padded={false} style={{ padding: 18 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🔔</span>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
          Onde você quer ser avisado?
        </h3>
      </div>
      <p style={{ fontSize: 12.5, color: T.textMid, margin:'0 0 6px', lineHeight: 1.45 }}>
        Escolha por onde receber os alertas em tempo real.
      </p>

      <ChannelRow
        icon="🖥️"
        name="No painel"
        desc="Sino no topo do dashboard · sempre ligado"
        enabled={channels.dashboard.enabled}
        locked={channels.dashboard.locked}
      />

      <ChannelRow
        icon="✉️"
        name="Email"
        desc="Receba os alertas no seu email — funciona até com o painel fechado."
        enabled={channels.email.enabled}
        onToggle={() => onChange({ ...channels, email: { ...channels.email, enabled: !channels.email.enabled } })}
      >
        {channels.email.enabled && (
          <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
            {[
              { key:'realtime', label:'Tempo real' },
              { key:'daily',    label:'Resumo diário' },
              { key:'weekly',   label:'Resumo semanal' }
            ].map(opt => {
              const isActive = emailFreq === opt.key
              return (
                <button key={opt.key} onClick={() => setEmailFreq(opt.key)}
                  style={{
                    fontSize: 11.5, fontWeight: 600, padding:'5px 10px', borderRadius: 6,
                    border:'1px solid', borderColor: isActive ? T.blue : T.border,
                    background: isActive ? T.blueSoft : '#fff',
                    color: isActive ? T.blueDk : T.textMid, cursor:'pointer'
                  }}>{opt.label}</button>
              )
            })}
          </div>
        )}
      </ChannelRow>

      <ChannelRow
        icon="📱"
        name="WhatsApp"
        desc="Receba as ameaças críticas no seu WhatsApp na hora — quando um concorrente passar você ou ganhar 10 avaliações de uma vez."
        enabled={channels.whatsapp.enabled}
        onToggle={() => onChange({ ...channels, whatsapp: { ...channels.whatsapp, enabled: !channels.whatsapp.enabled } })}
      >
        {channels.whatsapp.enabled && (
          <input
            value={waPhone}
            onChange={e => setWaPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            style={{
              width:'100%', padding:'8px 10px', fontSize: 13,
              border:'1px solid '+T.border, borderRadius: 6, outline:'none', boxSizing:'border-box'
            }}
          />
        )}
      </ChannelRow>

      <div style={{
        marginTop: 14, padding: 12, background: T.blueSoft, borderRadius: 8,
        fontSize: 12.5, color: T.blueDk, lineHeight: 1.5
      }}>
        💡 <b>Dica:</b> deixe Email + WhatsApp ligados pra não perder nenhuma mudança importante no ranking.
      </div>
    </Card>
  )
}

function AlertsScreen({ data, isMobile, isReal }) {
  const [filter, setFilter] = React.useState('all')
  const [channels, setChannels] = React.useState(data.alertChannels)

  const visible = filter === 'all' ? data.alerts : data.alerts.filter(a => a.category === filter)

  const counts = {
    all:          data.alerts.length,
    ranking:      data.alerts.filter(a => a.category === 'ranking').length,
    concorrente:  data.alerts.filter(a => a.category === 'concorrente').length,
    avaliacao:    data.alerts.filter(a => a.category === 'avaliacao').length
  }

  return (
    <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          🔔 Alertas em tempo real
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          Saiba na hora quando um concorrente passa você, sair do Top ou ganhar várias avaliações.
        </p>
      </div>

      {/* Layout: feed (left, maior) + canais (right) */}
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 360px',
        gap: isMobile ? 16 : 24
      }}>
        {/* COLUNA ESQUERDA: feed ou empty state */}
        <div>
          {isReal ? (
            // Em modo real, ainda não temos cron diário detectando mudanças.
            // Em vez de mostrar alertas falsos com "Empresa A/C", mostramos empty state honesto.
            <Card style={{ textAlign:'center', padding: 40 }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>🔔</div>
              <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
                Coletando dados pra você
              </h2>
              <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, margin:'0 auto 18px', maxWidth: 480 }}>
                Estamos preparando o sistema pra detectar movimentações nos concorrentes da sua região.
                Você receberá o primeiro alerta assim que algo mudar no ranking — em geral nos primeiros 7 dias depois que ativar.
              </p>
              <div style={{
                display:'inline-flex', alignItems:'center', gap: 6,
                fontSize: 11.5, fontWeight: 700, color: '#92400E',
                background:'#FEF3C7', padding:'5px 10px', borderRadius: 6
              }}>🔬 BETA · alertas começarão em breve</div>
              <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5, marginTop: 22 }}>
                Enquanto isso, configure no card ao lado por onde você quer receber os alertas (email/WhatsApp).
              </p>
            </Card>
          ) : (
            <>
              <Section>
                <AlertStats stats={data.alertStats} isMobile={isMobile}/>
              </Section>
              <AlertFilterChips active={filter} onChange={setFilter} counts={counts}/>
              {visible.length === 0 ? (
                <Card style={{ textAlign:'center', padding: 40, color: T.textMid }}>
                  Nenhum alerta nessa categoria.
                </Card>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
                  {visible.map(a => <AlertItem key={a.id} alert={a}/>)}
                </div>
              )}
            </>
          )}
        </div>

        {/* COLUNA DIREITA: canais de notificação */}
        <div>
          <AlertChannelsCard channels={channels} onChange={setChannels}/>
        </div>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// RELATÓRIOS — sub-componentes
// ─────────────────────────────────────────────────────────────
function ReportPeriodTabs({ active, onChange, isMobile }) {
  const tabs = [
    { key:'weekly',  label:'Semanal', icon:'📅' },
    { key:'monthly', label:'Mensal',  icon:'📆' }
  ]
  return (
    <div style={{
      display:'inline-flex', background:'#fff', border:'1px solid '+T.border,
      borderRadius: 10, padding: 3, gap: 3
    }}>
      {tabs.map(t => {
        const a = active === t.key
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{
              border:'none', borderRadius: 8, padding: isMobile ? '8px 14px' : '9px 18px',
              fontSize: 13.5, fontWeight: 600, cursor:'pointer',
              background: a ? T.blue : 'transparent',
              color: a ? '#fff' : T.textMid,
              display:'inline-flex', alignItems:'center', gap: 6, transition:'all .15s'
            }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
          </button>
        )
      })}
    </div>
  )
}

function ReportHeader({ report, isMobile }) {
  return (
    <Card padded={false} style={{ padding: isMobile ? 20 : 28, background:'linear-gradient(135deg, #1A73E8 0%, #0F4DAE 100%)', borderColor:'transparent', color:'#fff' }}>
      <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing:'.06em', textTransform:'uppercase', opacity: 0.8, marginBottom: 6 }}>
            Relatório de reputação
          </div>
          <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, margin:'0 0 6px', letterSpacing:'-0.02em' }}>
            {report.period}
          </h2>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            ✉️ {report.sentAt}
          </div>
        </div>
        <div style={{ display:'flex', gap: 8, flexShrink: 0 }}>
          <button style={{
            background:'#fff', color: T.blueDk, border:'none', borderRadius: 8,
            padding:'10px 16px', fontSize: 13, fontWeight: 600, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap: 6
          }}>📥 Baixar PDF</button>
          <button style={{
            background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.3)',
            borderRadius: 8, padding:'10px 16px', fontSize: 13, fontWeight: 600, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap: 6
          }}>✉️ Enviar agora</button>
        </div>
      </div>
    </Card>
  )
}

function DeltaBadge({ value, suffix = '', invert = false }) {
  if (value === 0 || value == null) {
    return <span style={{ fontSize: 12, color: T.textDim, fontWeight: 600 }}>—</span>
  }
  const isPositive = invert ? value < 0 : value > 0
  const color = isPositive ? T.green : T.red
  const arrow = value > 0 ? '↑' : '↓'
  const abs = Math.abs(value)
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap: 3, fontSize: 12, fontWeight: 700,
      color, background: isPositive ? '#ECFDF5' : '#FEF2F2',
      padding:'2px 7px', borderRadius: 6
    }}>{arrow} {abs}{suffix}</span>
  )
}

function ReportSummaryGrid({ summary, isMobile }) {
  const items = [
    { label:'Novas avaliações', value: summary.newReviews,      delta: summary.newReviewsDelta, suffix:' vs anterior', icon:'⭐' },
    { label:'Nota atual',       value: summary.currentRating.toFixed(1), delta: summary.ratingDelta, suffix:'',  isFloat: true, icon:'📈' },
    { label:'Posição no rank',  value: `${summary.currentPosition}º`, delta: summary.positionDelta, suffix:' pos.', invert: false, icon:'🏆' },
    { label:'Próximo concorrente', value: `-${Math.abs(summary.competitorDelta)} ${Math.abs(summary.competitorDelta) === 1 ? 'avaliação' : 'avaliações'}`, delta: null, sub:'mais perto que antes', icon:'🎯' }
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12 }}>
      {items.map((it, i) => (
        <Card key={i} padded={false} style={{ padding: isMobile ? 14 : 18 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{it.icon}</span>
            <div style={{ fontSize: 11, color: T.textMid, fontWeight: 600, letterSpacing:'.02em', textTransform:'uppercase' }}>{it.label}</div>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8, flexWrap:'wrap', marginTop: 4 }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: T.text, letterSpacing:'-0.02em', lineHeight: 1 }}>{it.value}</div>
            {it.delta !== null && it.delta !== undefined && <DeltaBadge value={it.delta} suffix={it.suffix && it.suffix.startsWith(' ') ? '' : it.suffix}/>}
          </div>
          {it.sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{it.sub}</div>}
        </Card>
      ))}
    </div>
  )
}

function ReportSectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </h3>
      {sub && <div style={{ fontSize: 12.5, color: T.textMid }}>{sub}</div>}
    </div>
  )
}

function ReportRatingChart({ data, labels, mode }) {
  const w = 720, h = 180, padL = 36, padR = 16, padT = 14, padB = 26
  const max = Math.max(...data, 5)
  const min = Math.min(...data, 4)
  const range = max - min || 1
  const xs = data.map((_, i) => padL + (i * (w - padL - padR)) / (data.length - 1))
  const ys = data.map(v => padT + (h - padT - padB) - ((v - min) / range) * (h - padT - padB))
  const path = data.map((_, i) => (i === 0 ? 'M' : 'L') + xs[i] + ',' + ys[i]).join(' ')
  const areaPath = path + ` L${xs[xs.length - 1]},${h - padB} L${xs[0]},${h - padB} Z`
  return (
    <Card>
      <ReportSectionTitle icon="📈" title="Evolução da nota" sub={`Sua nota nos últimos ${mode === 'weekly' ? '7 dias' : '12 meses'}.`}/>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'auto', display:'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad-rep" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={T.blue} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={T.blue} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* grid horizontal */}
        {[0, 0.5, 1].map(p => (
          <line key={p} x1={padL} x2={w - padR} y1={padT + p * (h - padT - padB)} y2={padT + p * (h - padT - padB)} stroke={T.border} strokeDasharray="2 4"/>
        ))}
        {/* área */}
        <path d={areaPath} fill="url(#grad-rep)"/>
        {/* linha */}
        <path d={path} fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* pontos */}
        {data.map((v, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r={i === data.length - 1 ? 5 : 3} fill="#fff" stroke={T.blue} strokeWidth="2"/>
            {i === data.length - 1 && (
              <text x={xs[i]} y={ys[i] - 12} fontSize="11" fontWeight="700" fill={T.blueDk} textAnchor="middle">{v.toFixed(1)}</text>
            )}
          </g>
        ))}
        {/* labels x */}
        {labels.map((l, i) => (
          <text key={i} x={xs[i]} y={h - 8} fontSize="10" fill={T.textDim} textAnchor="middle">{l}</text>
        ))}
        {/* labels y */}
        <text x={padL - 6} y={padT + 4} fontSize="10" fill={T.textDim} textAnchor="end">{max.toFixed(1)}</text>
        <text x={padL - 6} y={h - padB + 4} fontSize="10" fill={T.textDim} textAnchor="end">{min.toFixed(1)}</text>
      </svg>
    </Card>
  )
}

function ReportReviewsList({ reviews }) {
  return (
    <Card>
      <ReportSectionTitle icon="⭐" title="Avaliações em destaque" sub="As que mais movimentaram sua reputação no período."/>
      <ul style={{ listStyle:'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 12 }}>
        {reviews.map((r, i) => (
          <li key={i} style={{ display:'flex', gap: 12, paddingBottom: 12, borderBottom: i < reviews.length - 1 ? '1px solid '+T.border : 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius:'50%', background: r.color, color:'#fff',
              display:'grid', placeItems:'center', fontWeight: 700, fontSize: 13, flexShrink: 0
            }}>{r.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 2, flexWrap:'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{r.name}</span>
                <Stars rating={r.rating} size={12}/>
                <span style={{ fontSize: 11, color: T.textDim }}>· {r.when}</span>
              </div>
              <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{r.comment}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ReportRankingMoves({ moves }) {
  const colors = {
    up:   { bg:'#ECFDF5', border:'#A7F3D0', dot:'#10B981' },
    down: { bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444' },
    risk: { bg:'#FFFBEB', border:'#FDE68A', dot:'#F59E0B' }
  }
  return (
    <Card>
      <ReportSectionTitle icon="🏆" title="Movimentação no ranking" sub="O que mudou na sua categoria no período."/>
      <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
        {moves.map((m, i) => {
          const c = colors[m.type] || colors.up
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap: 10, padding:'10px 12px',
              background: c.bg, border:'1px solid '+c.border, borderRadius: 8,
              fontWeight: m.highlight ? 700 : 500
            }}>
              <span style={{ fontSize: 16, color: c.dot, width: 18, textAlign:'center' }}>{m.icon}</span>
              <span style={{ fontSize: 13.5, color: T.text }}>{m.text}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ReportCompetitorTable({ rows }) {
  return (
    <Card>
      <ReportSectionTitle icon="🔍" title="Você vs concorrentes" sub="Comparativo direto com os 4 mais próximos."/>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: T.textMid, fontSize: 11, textTransform:'uppercase', letterSpacing:'.04em' }}>
              <th style={{ textAlign:'left',  padding:'6px 8px', fontWeight: 600, borderBottom:'1px solid '+T.border }}>#</th>
              <th style={{ textAlign:'left',  padding:'6px 8px', fontWeight: 600, borderBottom:'1px solid '+T.border }}>Empresa</th>
              <th style={{ textAlign:'right', padding:'6px 8px', fontWeight: 600, borderBottom:'1px solid '+T.border }}>Avaliações</th>
              <th style={{ textAlign:'right', padding:'6px 8px', fontWeight: 600, borderBottom:'1px solid '+T.border }}>No período</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: r.isYou ? T.blueSoft : 'transparent' }}>
                <td style={{ padding:'10px 8px', fontWeight: 700, color: r.isYou ? T.blueDk : T.text }}>{r.pos}º</td>
                <td style={{ padding:'10px 8px', fontWeight: 600, color: r.isYou ? T.blueDk : T.text }}>
                  {r.name} {r.isYou && <span style={{ fontSize: 10, fontWeight: 700, color: T.blue, background:'#fff', padding:'1px 5px', borderRadius: 4, marginLeft: 4 }}>VOCÊ</span>}
                </td>
                <td style={{ padding:'10px 8px', textAlign:'right', color: T.text, fontWeight: 600 }}>{r.reviews}</td>
                <td style={{ padding:'10px 8px', textAlign:'right' }}>
                  {r.weekChange === 0
                    ? <span style={{ color: T.textDim }}>—</span>
                    : <span style={{ color: r.weekChange > 0 ? T.green : T.red, fontWeight: 700 }}>
                        {r.weekChange > 0 ? '+' : ''}{r.weekChange}
                      </span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ReportOpportunities({ items }) {
  return (
    <Card style={{ background: T.amberSoft, borderColor:'#FDE68A' }}>
      <ReportSectionTitle icon="💡" title="Oportunidades pra essa semana" sub="O que fazer agora pra crescer mais rápido."/>
      <ul style={{ listStyle:'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 10 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display:'flex', gap: 10, alignItems:'flex-start', fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>{it.icon}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ReportSettingsCard({ settings, onChange }) {
  const [email, setEmail] = React.useState(settings.email)
  return (
    <Card>
      <ReportSectionTitle icon="⚙️" title="Configurar envio" sub="Receba este relatório direto no seu email."/>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 4 }}>Email do destinatário</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width:'100%', padding:'9px 12px', fontSize: 13.5,
            border:'1px solid '+T.border, borderRadius: 8, outline:'none', boxSizing:'border-box'
          }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
        <label style={{
          display:'flex', alignItems:'center', gap: 8, padding: 10,
          border:'1px solid '+T.border, borderRadius: 8, cursor:'pointer',
          background: settings.weeklyEnabled ? T.blueSoft : '#fff'
        }}>
          <input type="checkbox" defaultChecked={settings.weeklyEnabled} style={{ accentColor: T.blue }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Semanal</div>
            <div style={{ fontSize: 11, color: T.textMid }}>Toda segunda · 08:00</div>
          </div>
        </label>
        <label style={{
          display:'flex', alignItems:'center', gap: 8, padding: 10,
          border:'1px solid '+T.border, borderRadius: 8, cursor:'pointer',
          background: settings.monthlyEnabled ? T.blueSoft : '#fff'
        }}>
          <input type="checkbox" defaultChecked={settings.monthlyEnabled} style={{ accentColor: T.blue }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Mensal</div>
            <div style={{ fontSize: 11, color: T.textMid }}>Dia 1 · 08:00</div>
          </div>
        </label>
      </div>
      <button style={{
        marginTop: 14, width:'100%', background: T.blue, color:'#fff',
        border:'none', borderRadius: 8, padding:'10px 16px', fontSize: 13.5, fontWeight: 600, cursor:'pointer'
      }}>Salvar preferências</button>
    </Card>
  )
}

function ReportsScreen({ data, isMobile, isReal }) {
  const [mode, setMode] = React.useState('weekly')
  const report = data.reports[mode]

  return (
    <main style={{ maxWidth: 1100, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 18, display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            📈 Relatórios automáticos
          </h1>
          <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
            Toda segunda no seu email — evolução da nota, novas avaliações, ranking e oportunidades.
          </p>
        </div>
        <ReportPeriodTabs active={mode} onChange={setMode} isMobile={isMobile}/>
      </div>

      {isReal ? (
        // Em modo real, ainda não temos cron semanal/mensal montando relatório real.
        // Em vez de mostrar relatório fake com Maria Silva/Bruno Lima, mostramos
        // empty state honesto + form de configurar canal de envio.
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          <Card style={{ textAlign:'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📬</div>
            <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
              Seu primeiro relatório está sendo preparado
            </h2>
            <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, margin:'0 auto 18px', maxWidth: 480 }}>
              Toda segunda-feira, às 8h, você vai receber no email um resumo da sua reputação na semana — nota, novas avaliações, mudanças no ranking, oportunidades e comparativo com concorrentes.
              O primeiro chega depois que coletarmos pelo menos 7 dias de dados seus.
            </p>
            <div style={{
              display:'inline-flex', alignItems:'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, color: '#92400E',
              background:'#FEF3C7', padding:'5px 10px', borderRadius: 6, marginBottom: 18
            }}>🔬 BETA · relatórios em preparação</div>
            <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>
              Confirme abaixo o email pra envio e a frequência (semanal/mensal).
            </p>
          </Card>
          <ReportSettingsCard settings={data.reportSettings}/>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
          <ReportHeader report={report} isMobile={isMobile}/>
          <ReportSummaryGrid summary={report.summary} isMobile={isMobile}/>
          <ReportRatingChart data={report.chart} labels={report.chartLabels} mode={mode}/>

          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16
          }}>
            <ReportReviewsList reviews={report.topReviews}/>
            <ReportRankingMoves moves={report.rankingMoves}/>
          </div>

          <ReportCompetitorTable rows={report.competitorComparison}/>
          <ReportOpportunities items={report.opportunities}/>
          <ReportSettingsCard settings={data.reportSettings}/>
        </div>
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// LOJA — vitrine de produtos NFC
// ─────────────────────────────────────────────────────────────
function ProductCard({ p }) {
  return (
    <Card padded={false} style={{ padding: 0, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{
        height: 160, background:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        borderBottom:'1px solid '+T.border, padding: 10
      }}>
        <img src={p.img} alt={p.name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/>
      </div>
      <div style={{ padding: 16, display:'flex', flexDirection:'column', flex: 1 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: T.text, margin:'0 0 6px' }}>{p.name}</h3>
        <p style={{ fontSize: 12.5, color: T.textMid, margin:'0 0 14px', lineHeight: 1.5, flex: 1 }}>{p.desc}</p>
        <a href={p.buyUrl} style={{
          display:'block', background: T.blue, color:'#fff', textDecoration:'none',
          borderRadius: 9, padding:'10px 14px', fontSize: 13, fontWeight: 700,
          textAlign:'center'
        }}>Comprar →</a>
      </div>
    </Card>
  )
}

function KitCard({ k, isMobile }) {
  return (
    <Card padded={false} style={{
      padding: isMobile ? 20 : 28,
      background:'linear-gradient(135deg,#1A73E8 0%, #0F4DAE 100%)',
      borderColor:'transparent', color:'#fff', overflow:'hidden', position:'relative'
    }}>
      <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{
          width: 96, height: 96, borderRadius: 16, background:'rgba(255,255,255,.15)',
          display:'grid', placeItems:'center', fontSize: 52, flexShrink: 0
        }}>{k.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing:'.06em', background:'#FBBC04', color:'#78350F', padding:'3px 8px', borderRadius: 5, marginBottom: 8 }}>
            VER PREÇOS E MONTAR KIT
          </div>
          <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 20 : 24, fontWeight: 700, margin:'0 0 6px', letterSpacing:'-0.02em' }}>
            {k.name}
          </h2>
          <p style={{ fontSize: 13.5, opacity: 0.9, margin:'0 0 4px', lineHeight: 1.5 }}>{k.desc}</p>
        </div>
        <a href={k.buyUrl} style={{
          background:'#fff', color: T.blueDk, border:'none', borderRadius: 10,
          padding: isMobile ? '12px 20px' : '14px 28px', fontSize: 14, fontWeight: 700, cursor:'pointer',
          flexShrink: 0, width: isMobile ? '100%' : 'auto', textDecoration:'none',
          textAlign:'center', display:'inline-block'
        }}>Abrir shop →</a>
      </div>
    </Card>
  )
}

function LojaScreen({ data, isMobile, plan }) {
  return (
    <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          🛍️ Loja StarTouch
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          Placas, cartões e pulseiras NFC pra ampliar seus pontos de captação de avaliações.
        </p>
      </div>

      {/* Kit em destaque */}
      <Section><KitCard k={data.kit} isMobile={isMobile}/></Section>

      {/* Grid de produtos */}
      <Section>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 14px' }}>
          Produtos individuais
        </h2>
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14
        }}>
          {data.products.map(p => <ProductCard key={p.id} p={p}/>)}
        </div>
      </Section>

      {/* Trust / garantias */}
      <Card style={{ background: T.bg, borderColor: T.border }}>
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 16 : 24, textAlign:'center'
        }}>
          {[
            { icon:'🚚', t:'Envio rápido', d:'Despacho em 24h pela Jadlog/Correios' },
            { icon:'🛡️', t:'Garantia 90 dias', d:'Defeito de fabricação trocamos sem custo' },
            { icon:'📞', t:'Suporte WhatsApp', d:'Tira dúvidas direto com a gente' }
          ].map((it, i) => (
            <div key={i}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{it.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 2 }}>{it.t}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>{it.d}</div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// CONFIGURAÇÕES — Conta + Negócio + Plano
// ─────────────────────────────────────────────────────────────
function ConfigField({ label, value, type = 'text', readOnly, hint, action }) {
  const isEmpty = value == null || value === ''
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>{label}</label>
      <div style={{ display:'flex', gap: 8 }}>
        <input
          type={type}
          defaultValue={isEmpty ? '' : value}
          placeholder={isEmpty ? '— Não informado' : ''}
          readOnly={readOnly}
          style={{
            flex: 1, padding:'9px 12px', fontSize: 13.5,
            border:'1px solid '+T.border, borderRadius: 8, outline:'none',
            background: readOnly ? T.bg : '#fff',
            color: isEmpty ? T.textDim : T.text,
            fontStyle: isEmpty ? 'italic' : 'normal',
            boxSizing:'border-box'
          }}/>
        {action && (
          <button style={{
            background:'#fff', color: T.blue, border:'1px solid '+T.border, borderRadius: 8,
            padding:'9px 14px', fontSize: 12.5, fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap'
          }}>{action}</button>
        )}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function ConfigSectionCard({ icon, title, sub, children, anchor }) {
  return (
    <Card style={{ scrollMarginTop: 100 }} {...(anchor ? { id: anchor } : {})}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 2px', display:'inline-flex', alignItems:'center', gap: 8 }}>
          <span>{icon}</span>{title}
        </h2>
        {sub && <div style={{ fontSize: 13, color: T.textMid }}>{sub}</div>}
      </div>
      {children}
    </Card>
  )
}

function AccountSection({ user }) {
  return (
    <ConfigSectionCard anchor="conta" icon="👤" title="Minha conta" sub="Seus dados pessoais e acesso.">
      <ConfigField label="Nome completo"  value={user.name}/>
      <ConfigField label="Email"          value={user.email} type="email" hint="É também seu login."/>
      <ConfigField label="Telefone"       value={user.phone} type="tel"/>
      <ConfigField label="Senha"          value="••••••••" type="password" readOnly action="Alterar senha"/>
      <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
        <button style={{
          background: T.blue, color:'#fff', border:'none', borderRadius: 8,
          padding:'10px 18px', fontSize: 13.5, fontWeight: 700, cursor:'pointer'
        }}>Salvar alterações</button>
      </div>
    </ConfigSectionCard>
  )
}

function BusinessSection({ biz, googleCategory, categoryOverride }) {
  // Categoria customizada — agora persiste NO BANCO (businesses.category_override).
  // Sincroniza entre mobile, desktop e outros devices automaticamente.
  const savedCustom = categoryOverride || ''
  const [category, setCategory] = React.useState(savedCustom || googleCategory || '')
  const [savedNotice, setSavedNotice] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  // O que está sendo usado AGORA pra buscar concorrentes
  const activeCategory = savedCustom || googleCategory || '(automática)'
  const usingCustom = Boolean(savedCustom)

  async function handleSaveCategory() {
    setSaving(true)
    setSavedNotice('')
    try {
      const v = (category || '').trim()
      await apiCall('/api/savebiz', {
        method: 'POST',
        body: JSON.stringify({ category_override: v || null })
      })
      try { localStorage.removeItem('rz_activity') } catch {}
      setSavedNotice('✓ Categoria salva no seu perfil · sincroniza em todos os dispositivos. Recarregando…')
      setTimeout(() => window.location.reload(), 1100)
    } catch (e) {
      setSavedNotice('⚠️ Erro ao salvar: ' + (e.message || 'tente de novo'))
      setSaving(false)
    }
  }

  async function handleClearOverride() {
    setSaving(true)
    setSavedNotice('')
    try {
      await apiCall('/api/savebiz', {
        method: 'POST',
        body: JSON.stringify({ category_override: null })
      })
      try { localStorage.removeItem('rz_activity') } catch {}
      setSavedNotice('✓ Voltando pra categoria automática do Google…')
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setSavedNotice('⚠️ Erro: ' + (e.message || 'tente de novo'))
      setSaving(false)
    }
  }

  return (
    <ConfigSectionCard anchor="negocio" icon="🏢" title="Dados do negócio" sub="O que aparece nas suas placas, relatórios e nos alertas.">

      {/* Status visível da categoria em uso */}
      <div style={{
        marginBottom: 16, padding: 14, borderRadius: 10,
        background: usingCustom ? '#FFFBEB' : T.bg,
        border: usingCustom ? '1px solid #FDE68A' : '1px solid '+T.border
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing:'.05em', textTransform:'uppercase', color: T.textMid, marginBottom: 4 }}>
          Categoria sendo usada pro ranking
        </div>
        <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6, display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
          <span>{activeCategory}</span>
          {usingCustom && (
            <span style={{ fontSize: 10, fontWeight: 800, background:'#FBBC04', color:'#78350F', padding:'2px 6px', borderRadius: 4 }}>
              SALVA POR VOCÊ
            </span>
          )}
        </div>
        {usingCustom && googleCategory && (
          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 8 }}>
            Categoria automática do Google: <strong>{googleCategory}</strong>
          </div>
        )}
        {usingCustom && (
          <button onClick={handleClearOverride} disabled={saving} style={{
            background:'#fff', color: T.textMid, border:'1px solid '+T.border, borderRadius: 7,
            padding:'6px 12px', fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}>↺ Voltar pra categoria automática do Google</button>
        )}
      </div>

      {/* Categoria editável — controla a busca de concorrentes */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>
          Alterar palavra-chave da busca
        </label>
        <div style={{ display:'flex', gap: 8 }}>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={googleCategory ? `Ex: ${googleCategory}` : 'Ex: cafeteria, salão de beleza, clínica…'}
            style={{
              flex: 1, padding:'9px 12px', fontSize: 13.5,
              border:'1px solid '+T.border, borderRadius: 8, outline:'none',
              background:'#fff', color: T.text, boxSizing:'border-box'
            }}/>
          <button onClick={handleSaveCategory} disabled={saving} style={{
            background: saving ? T.textDim : T.blue, color:'#fff', border:'none', borderRadius: 8,
            padding:'9px 16px', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer', whiteSpace:'nowrap'
          }}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 4, lineHeight: 1.5 }}>
          Esse termo é usado pra buscar concorrentes na sua região. Se o Google te classificou diferente do que você é (ex: "loja" em vez de "padaria"), corrija aqui.
        </div>
        {savedNotice && (
          <div style={{
            marginTop: 8, padding:'8px 12px', background: T.greenSoft, border:'1px solid #A7F3D0',
            borderRadius: 8, fontSize: 12.5, color:'#065F46', fontWeight: 600
          }}>{savedNotice}</div>
        )}
      </div>

      <ConfigField label="Nome do negócio" value={biz.name}      readOnly hint="Vem do Google Meu Negócio."/>
      <ConfigField label="Endereço"        value={biz.address}   readOnly hint="Vem do Google Meu Negócio."/>
      <ConfigField label="Telefone"        value={biz.phone}     readOnly type="tel" hint="Vem do Google Meu Negócio."/>
      <ConfigField label="Google Place ID" value={biz.placeId}   readOnly hint="Identificador único do Google · não pode ser alterado."/>

      <div style={{
        marginTop: 16, padding: 14, background: T.blueSoft, borderRadius: 10,
        border:'1px solid #BFDBFE'
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.blueDk, marginBottom: 4 }}>
          Negócio errado vinculado?
        </div>
        <div style={{ fontSize: 12.5, color: T.blueDk, lineHeight: 1.5, marginBottom: 10 }}>
          Os dados acima são puxados do Google Meu Negócio do <strong>place_id</strong> vinculado. Se você vinculou o negócio errado (ou mudou de loja), troque pra refazer a busca de concorrentes na região certa.
        </div>
        <a href="/comece" style={{
          display:'inline-block', background: T.blue, color:'#fff',
          borderRadius: 8, padding:'9px 16px', fontSize: 13, fontWeight: 700,
          textDecoration:'none'
        }}>🔄 Trocar negócio vinculado</a>
      </div>

      <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
        <a href={biz.gmapsUrl} target="_blank" rel="noreferrer" style={{
          background:'#fff', color: T.blue, border:'1px solid '+T.border, borderRadius: 8,
          padding:'10px 16px', fontSize: 13, fontWeight: 600, textDecoration:'none',
          display:'inline-flex', alignItems:'center'
        }}>Ver no Google Maps ↗</a>
      </div>
    </ConfigSectionCard>
  )
}

function BillingSection({ billing, plan }) {
  return (
    <ConfigSectionCard anchor="plano" icon="💳" title="Plano e cobrança" sub="Seu plano atual, próxima cobrança e histórico de pagamentos.">
      {/* Card do plano atual */}
      <div style={{
        background: plan === 'pro' ? 'linear-gradient(135deg,#1A73E8,#0F4DAE)' : T.bg,
        color: plan === 'pro' ? '#fff' : T.text,
        borderRadius: 12, padding: 18, marginBottom: 18,
        border: plan === 'pro' ? 'none' : '1px solid '+T.border
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing:'.06em', opacity: 0.85, marginBottom: 4 }}>
              SEU PLANO ATUAL
            </div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing:'-0.02em' }}>
              {plan === 'pro' ? billing.plan : 'Plano Free'}
            </div>
            {plan === 'pro' && (
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                R$ {billing.monthlyPrice.toFixed(2).replace('.', ',')} / mês · ativo desde {billing.sinceDate}
              </div>
            )}
          </div>
          {plan === 'free' && (
            <a href="/plano-pro" style={{
              background: T.blue, color:'#fff', border:'none', borderRadius: 9,
              padding:'10px 18px', fontSize: 13.5, fontWeight: 700, textDecoration:'none'
            }}>Fazer upgrade pro Pro →</a>
          )}
        </div>
      </div>

      {plan === 'pro' && (
        <>
          <ConfigField label="Próxima cobrança" value={billing.nextChargeAt} readOnly/>
          <ConfigField label="Método de pagamento" value={billing.paymentMethod} readOnly action="Alterar"/>

          {/* Histórico */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Histórico de pagamentos</div>
            <div style={{ border:'1px solid '+T.border, borderRadius: 8, overflow:'hidden' }}>
              {billing.invoices.map((inv, i) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 14px', borderBottom: i < billing.invoices.length - 1 ? '1px solid '+T.border : 'none',
                  fontSize: 13
                }}>
                  <span style={{ color: T.textMid }}>{inv.date}</span>
                  <span style={{ fontWeight: 600, color: T.text }}>R$ {inv.amount.toFixed(2).replace('.', ',')}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.greenSoft, padding:'2px 7px', borderRadius: 5 }}>PAGO</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop:'1px solid '+T.border }}>
            <button style={{
              background:'#fff', color: T.red, border:'1px solid #FECACA', borderRadius: 8,
              padding:'9px 16px', fontSize: 12.5, fontWeight: 600, cursor:'pointer'
            }}>Cancelar assinatura</button>
            <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 6 }}>
              Você continua com acesso Pro até o fim do período pago.
            </div>
          </div>
        </>
      )}
    </ConfigSectionCard>
  )
}

function ConfigScreen({ data, isMobile, plan, isReal }) {
  // Scroll pro anchor da URL (#conta, #negocio, #plano)
  React.useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash)
        if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
      }, 80)
    }
  }, [])

  return (
    <main style={{ maxWidth: 860, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          ⚙️ Configurações
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          Gerencie sua conta, dados do negócio e plano.
        </p>
      </div>

      {isReal && (
        <div style={{
          background: T.blueSoft, border:'1px solid #BFDBFE', borderRadius: 10,
          padding:'10px 14px', marginBottom: 16,
          display:'flex', alignItems:'flex-start', gap: 10
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🚧</span>
          <div style={{ fontSize: 12.5, color: T.blueDk, lineHeight: 1.45 }}>
            <b>Modo leitura.</b> Seus dados reais aparecem abaixo — a edição completa (alterar nome, endereço, método de pagamento) chega na próxima atualização.
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
        <AccountSection user={data.user}/>
        <BusinessSection biz={data.businessInfo} googleCategory={data.googleCategory} categoryOverride={data.categoryOverride}/>
        <BillingSection billing={data.billing} plan={plan}/>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// Header — agora com dropdown do avatar
// ─────────────────────────────────────────────────────────────
function Header({ bizName, plan, isMobile, onNavigate, user, onLogout, demoMode }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const go = (anchor) => {
    setOpen(false)
    if (typeof window !== 'undefined') {
      window.location.hash = anchor
    }
    onNavigate && onNavigate('config')
  }

  // Iniciais e nome do dropdown — usa user real se tiver, senão fallback do mock
  const displayName  = (user && (user.name || user.email)) || 'Ricardo Fiorini'
  const displayEmail = (user && user.email) || 'ricardo@cafebellavista.com.br'
  const initials = (() => {
    const src = (user && (user.name || user.email)) || 'RF'
    const parts = src.split(/[\s@.]+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return src.slice(0, 2).toUpperCase()
  })()

  const handleLogout = (e) => {
    e.preventDefault()
    setOpen(false)
    if (onLogout) onLogout()
  }

  return (
    <header style={{
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      padding: isMobile ? '12px 16px' : '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8,
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255,255,255,0.85)'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 10 : 16, minWidth: 0 }}>
        <a href="/" style={{ display:'inline-flex', alignItems:'center', textDecoration:'none', flexShrink: 0 }}>
          <img src="/startouch-logo-dark.png" alt="StarTouch" style={{ height: isMobile ? 26 : 32, width:'auto' }}/>
        </a>
        {!isMobile && <div style={{ width: 1, height: 22, background: T.border }}/>}
        <div style={{ display:'flex', alignItems:'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background:'linear-gradient(135deg,#FBBC04,#EA4335,#4285F4)', flexShrink: 0 }}/>
          <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bizName}</span>
        </div>
      </div>

      <div ref={ref} style={{ display:'flex', alignItems:'center', gap: 10, flexShrink: 0, position:'relative' }}>
        {plan === 'pro' && (
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
            background: 'linear-gradient(135deg,#1A73E8,#0F4DAE)',
            color: '#fff', padding: '4px 9px', borderRadius: 6
          }}>PRO</span>
        )}

        {/* Avatar clicável */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Menu da conta"
          style={{
            width: 32, height: 32, borderRadius:'50%', background:'#1A73E8', color:'#fff',
            fontWeight: 700, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'center',
            border:'none', cursor:'pointer', padding: 0,
            boxShadow: open ? '0 0 0 3px '+T.blueSoft : 'none', transition:'box-shadow .15s'
          }}>{initials}</button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right: 0,
            background: T.surface, border:'1px solid '+T.border, borderRadius: 12,
            boxShadow:'0 8px 32px -4px rgba(15,23,42,.18)',
            minWidth: 240, padding: 6, zIndex: 60
          }}>
            <div style={{ padding:'8px 12px', borderBottom:'1px solid '+T.border, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{displayName}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>{displayEmail}</div>
              {demoMode && (
                <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, marginTop: 4, letterSpacing:'.05em' }}>🔬 MODO DEMO</div>
              )}
            </div>

            {[
              { label:'👤 Minha conta',       anchor:'conta'   },
              { label:'🏢 Dados do negócio',  anchor:'negocio' },
              { label:'💳 Plano e cobrança',  anchor:'plano'   }
            ].map(it => (
              <button key={it.anchor} onClick={() => go(it.anchor)}
                style={{
                  display:'flex', alignItems:'center', width:'100%',
                  padding:'9px 12px', border:'none', background:'transparent',
                  fontSize: 13, color: T.text, textAlign:'left', cursor:'pointer',
                  borderRadius: 6, gap: 8
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{it.label}</button>
            ))}

            <div style={{ borderTop:'1px solid '+T.border, marginTop: 4, paddingTop: 4 }}>
              <a href="/" onClick={handleLogout} style={{
                display:'flex', alignItems:'center', width:'100%',
                padding:'9px 12px', textDecoration:'none',
                fontSize: 13, color: T.red, gap: 8, borderRadius: 6, cursor:'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >🚪 Sair</a>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// KPI Cards
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: T.textMid }}>{label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginBottom: 5, flexWrap:'wrap' }}>
        <span style={{ fontFamily:"'Inter', sans-serif", fontSize: 32, fontWeight: 700, color: T.text, letterSpacing:'-0.025em', lineHeight: 1 }}>{value}</span>
        {trend != null && <Trend value={trend} />}
      </div>
      <p style={{ fontSize: 12, color: T.textDim, margin: 0 }}>{sub}</p>
    </Card>
  )
}

// Sugestões da semana (push de direção pro dono)
function WeekActions({ items, isMobile }) {
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14, gap: 8 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>🎯 Sugestões pra essa semana</h3>
        <span style={{ fontSize: 11.5, color: T.textDim }}>3 ações</span>
      </div>
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 10
      }}>
        {items.map((a, i) => (
          <div key={i} style={{
            display:'flex', gap: 10, padding: '12px 14px',
            borderRadius: 12, background: '#F8FAFC',
            border: `1px solid ${T.border}`,
            alignItems:'flex-start'
          }}>
            <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{a.icon}</span>
            <span style={{ fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{a.text}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Card AZUL = RESULTADO. Foco em crescimento. Sem CTA pra Pro.
function HeroPosition({ progressPct, currentPos, isMobile }) {
  return (
    <Card padded={false} style={{ background: `linear-gradient(135deg, ${T.blue} 0%, ${T.blueDk} 100%)`, border:'none', color:'#fff', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset: 0, background:'radial-gradient(ellipse 90% 60% at 110% 0%, rgba(255,255,255,0.12), transparent 60%)', pointerEvents:'none' }}/>
      <div style={{ padding: isMobile ? '24px 22px' : '34px 36px', position:'relative' }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, margin: 0 }}>Seu resultado</p>
        <h1 style={{
          fontFamily:"'Inter', sans-serif",
          fontSize: isMobile ? 24 : 34, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em',
          margin: '8px 0 12px', textWrap: 'balance'
        }}>
          🏆 Você está entre as melhores empresas da sua categoria.
        </h1>
        <p style={{ fontSize: isMobile ? 14.5 : 16, opacity: 0.95, lineHeight: 1.55, margin: '0 0 8px', maxWidth: 620 }}>
          Sua empresa ocupa atualmente a <strong style={{ color: '#FBBC04' }}>{currentPos}ª posição</strong> no ranking local.
        </p>
        <p style={{ fontSize: isMobile ? 13.5 : 15, opacity: 0.85, lineHeight: 1.55, margin: '0 0 22px', maxWidth: 620 }}>
          Continue conquistando avaliações para fortalecer sua presença no Google.
        </p>

        <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 22, maxWidth: 580 }}>
          <div style={{ flex: 1, height: 7, background:'rgba(255,255,255,0.18)', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height: '100%', width: progressPct + '%', background:'#FBBC04', borderRadius:999 }}/>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>{progressPct}%</span>
        </div>

        <button style={{
          background:'#fff', color: T.blueDk, border:'none', borderRadius: 11,
          padding: isMobile ? '13px 20px' : '14px 24px',
          fontSize: isMobile ? 14 : 15, fontWeight: 700, cursor:'pointer',
          display:'inline-flex', alignItems:'center', gap: 8,
          boxShadow:'0 4px 14px rgba(0,0,0,0.18)', fontFamily:"'Inter', sans-serif",
          width: isMobile ? '100%' : 'auto', justifyContent:'center'
        }}>
          🚀 Gerar mais avaliações →
        </button>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Ranking — com blur pra plano Free
// ─────────────────────────────────────────────────────────────
function RankingList({ items, isMobile, plan, category, onEditCategory }) {
  const locked = plan === 'free'
  const catLabel = category ? `${category.charAt(0).toUpperCase() + category.slice(1)} · 3km` : 'Sua categoria · 3km'
  return (
    <Card style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16, gap: 8, flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Ranking da sua região</h3>
        {locked
          ? <span style={{ fontSize: 11, fontWeight: 700, background: T.blueSoft, color: T.blue, padding:'4px 8px', borderRadius:6 }}>PRO</span>
          : (
            <span style={{ fontSize: 12, color: T.textDim, display:'inline-flex', alignItems:'center', gap: 6 }}>
              <span>{catLabel}</span>
              <button
                type="button"
                onClick={() => onEditCategory && onEditCategory()}
                style={{ background:'none', border:'none', padding: 0, color: T.blue, fontWeight: 600, fontSize: 12, cursor:'pointer' }}>
                ✏️ alterar
              </button>
            </span>
          )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 22, textAlign:'center', color: T.textMid, fontSize: 13 }}>
          📡 Coletando dados dos concorrentes da sua região…
        </div>
      ) : (
      <ol style={{ listStyle:'none', padding: 0, margin: 0 }}>
        {items.map(r => {
          const blurThis = locked && !r.you
          return (
            <li key={r.pos} style={{
              display:'flex', alignItems:'center', gap: 12,
              padding:'12px 12px',
              borderRadius: 12,
              background: r.you ? T.blueSoft : 'transparent',
              border: r.you ? `1px solid #B9D6FB` : '1px solid transparent',
              marginBottom: 4
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 9,
                background: r.you ? T.blue : '#F1F5F9',
                color: r.you ? '#fff' : T.textMid,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0
              }}>
                {r.medal || r.pos + 'º'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2,
                  ...(blurThis && { filter:'blur(5px)', userSelect:'none', pointerEvents:'none' })
                }}>
                  {blurThis ? 'Empresa concorrente XX' : r.name}
                  {r.you && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.blue, background:'#fff', border:`1px solid ${T.blue}`, borderRadius: 5, padding:'1px 6px', marginLeft: 6 }}>VOCÊ</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color: T.textMid }}>
                  <Stars rating={r.rating} size={11} />
                  <span>{r.rating.toFixed(1)}</span>
                  <span style={{ color: T.textDim }}>·</span>
                  <span>{r.reviews} avaliações</span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      )}

      {locked && (
        <div style={{
          marginTop: 18,
          padding: '20px 22px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1A73E8 0%, #0F4DAE 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.10), transparent 60%)', pointerEvents:'none' }}/>
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', background:'#FBBC04', color:'#78350F', padding:'3px 8px', borderRadius: 5 }}>PRO</span>
            </div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.25 }}>🔒 Quem está à sua frente?</div>
            <ul style={{ listStyle:'none', padding: 0, margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.6 }}>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0 }}>✓</span><span style={{ opacity: 0.95 }}>Quem ocupa cada posição</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0 }}>✓</span><span style={{ opacity: 0.95 }}>Quantas avaliações cada concorrente possui</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0 }}>✓</span><span style={{ opacity: 0.95 }}>Quanto falta para ultrapassá-los</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0 }}>✓</span><span style={{ opacity: 0.95 }}>Quem está crescendo mais rápido</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8 }}><span style={{ color:'#FBBC04', flexShrink: 0 }}>✓</span><span style={{ opacity: 0.95 }}>Alertas de mudanças no ranking</span></li>
            </ul>
            <a href="/plano-pro" style={{
              display:'inline-flex', alignItems:'center', gap: 8,
              background:'#FBBC04', color:'#78350F',
              padding: '11px 18px', borderRadius: 10,
              fontSize: 13.5, fontWeight: 800, textDecoration:'none',
              boxShadow: '0 4px 14px rgba(251,188,4,0.35)',
              width: '100%', justifyContent: 'center'
            }}>
              Desbloquear Inteligência Competitiva →
            </a>
          </div>
        </div>
      )}

      {!locked && (
        <div style={{ marginTop: 16, padding:'12px 14px', borderRadius: 10, background: T.greenSoft, fontSize: 13, color:'#065F46', display:'flex', alignItems:'center', gap: 8 }}>
          <span>🎯</span>
          <span><strong>Você está a apenas 2 avaliações</strong> do segundo colocado.</span>
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Evolution chart
// ─────────────────────────────────────────────────────────────
function EvolutionChart({ data, growthPct, isMobile }) {
  const W = 600, H = 200, pad = { l: 0, r: 12, t: 10, b: 30 }
  const points = data.reviews
  const max = Math.max(...points), min = Math.min(...points)
  const range = (max - min) || 1
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
  const xs = points.map((_, i) => pad.l + (i / (points.length - 1)) * cw)
  const ys = points.map(v => pad.t + ch - ((v - min) / range) * ch)
  const path = xs.map((x, i) => {
    if (i === 0) return `M ${x},${ys[i]}`
    const x0 = xs[i - 1], y0 = ys[i - 1], y1 = ys[i]
    const cx1 = x0 + (x - x0) / 2, cx2 = x0 + (x - x0) / 2
    return `C ${cx1},${y0} ${cx2},${y1} ${x},${y1}`
  }).join(' ')
  const area = `${path} L ${xs[xs.length - 1]},${pad.t + ch} L ${xs[0]},${pad.t + ch} Z`
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14, gap: 8 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Sua evolução</h3>
        <span style={{ display:'inline-flex', alignItems:'center', gap: 5, fontSize: 12, color: T.textMid }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: T.blue }}/>Avaliações
        </span>
      </div>
      {/* Destaque de conquista — % de crescimento */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap: 10,
        background: T.greenSoft, color:'#065F46',
        padding:'10px 14px', borderRadius: 10,
        marginBottom: 12
      }}>
        <span style={{ fontSize: 18 }}>📈</span>
        <span style={{ fontFamily:"'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: T.green, letterSpacing:'-0.02em' }}>+{growthPct}%</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>de crescimento nos últimos 90 dias</span>
      </div>
      <p style={{ fontSize: 12.5, color: T.textMid, margin: '0 0 8px' }}>
        Nota subiu de <strong>{data.rating[0].toFixed(1)}</strong> pra <strong>{data.rating[data.rating.length - 1].toFixed(1)}</strong> · Posição de <strong>{data.rankings[0]}º</strong> pra <strong>{data.rankings[data.rankings.length - 1]}º</strong>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:'100%', height: isMobile ? 160 : 200 }}>
        <defs>
          <linearGradient id="evoGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={T.blue} stopOpacity="0.20"/>
            <stop offset="100%" stopColor={T.blue} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + ch * t} y2={pad.t + ch * t} stroke={T.border} strokeDasharray="4 4"/>
        ))}
        <path d={area} fill="url(#evoGrad)" />
        <path d={path} fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5" fill="#fff" stroke={T.blue} strokeWidth="3"/>
      </svg>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Opportunities
// ─────────────────────────────────────────────────────────────
// Card AMARELO = AÇÃO IMEDIATA. Botão "Responder agora" abre Google direto.
function Opportunities({ count, placeId }) {
  // Link direto pra ver as reviews no Google (cliente acessa logado no GBP e responde lá)
  const googleUrl = placeId
    ? `https://search.google.com/local/reviews?placeid=${placeId}`
    : 'https://business.google.com/'
  return (
    <Card style={{ background: T.amberBg, border: `1px solid #FCD34D` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color:'#78350F', margin:'0 0 8px', lineHeight: 1.3 }}>
            Você possui <span style={{ color: T.amber }}>{count} avaliações</span> aguardando resposta.
          </h3>
          <p style={{ fontSize: 13, color:'#92400E', margin: 0, lineHeight: 1.55 }}>
            Empresas que respondem avaliações transmitem mais confiança e podem melhorar sua presença no Google.
          </p>
        </div>
      </div>

      <div style={{
        marginTop: 14,
        display:'flex', alignItems:'center', gap: 10,
        padding: '10px 12px',
        background:'#FFFFFF',
        border:'1px solid #FCD34D',
        borderRadius: 10,
        fontSize: 12.5, color:'#78350F', fontWeight: 600
      }}>
        <span style={{ fontSize: 16 }}>📈</span>
        <span>Negócios que respondem têm <strong style={{ color: T.amber }}>até 30% mais visitas</strong> no perfil.</span>
      </div>

      <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{
        marginTop: 14, background: T.amber, color:'#fff', border:'none', borderRadius: 10,
        padding:'11px 18px', fontSize: 13.5, fontWeight: 700, cursor:'pointer', textDecoration:'none',
        boxShadow:'0 4px 14px rgba(245,158,11,0.30)', fontFamily:"'Inter', sans-serif",
        width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap: 6
      }}>
        Responder no Google →
      </a>
      <p style={{ fontSize: 11.5, color:'#92400E', textAlign:'center', margin:'8px 0 0', opacity: 0.85 }}>
        Abre seu perfil do Google em nova aba
      </p>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Recent reviews
// ─────────────────────────────────────────────────────────────
function RecentReviews({ items, trend, isMobile, onSeeAll }) {
  const trendUp = trend?.direction === 'up'
  const trendDown = trend?.direction === 'down'
  const pillBg = trendUp ? T.greenSoft : trendDown ? '#FEE2E2' : '#F1F5F9'
  const pillFg = trendUp ? '#065F46' : trendDown ? '#991B1B' : T.textMid
  const arrow = trendUp ? '↑' : trendDown ? '↓' : '→'
  const label = trendUp ? 'acima da' : trendDown ? 'abaixo da' : 'em linha com a'
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14, gap: 8, flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Avaliações recentes</h3>
        <button
          type="button"
          onClick={() => onSeeAll && onSeeAll()}
          style={{ background:'none', border:'none', padding: 0, fontSize: 12.5, color: T.blue, fontWeight: 600, cursor:'pointer' }}>
          Ver todas →
        </button>
      </div>
      {trend && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap: 6,
          background: pillBg, color: pillFg,
          padding:'5px 10px', borderRadius: 999,
          fontSize: 12, fontWeight: 600,
          marginBottom: 12
        }}>
          <span style={{ fontWeight: 700 }}>{arrow}</span>
          <span>Média recente <strong>{trend.recentAvg.toFixed(1)}</strong> · {label} média geral <strong>{trend.overallAvg.toFixed(1)}</strong></span>
        </div>
      )}
      <ul style={{ listStyle:'none', padding: 0, margin: 0 }}>
        {items.map((r, i) => (
          <li key={i} style={{
            display:'flex', gap: 12, padding:'14px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${T.border}`
          }}>
            <div style={{
              width: 36, height: 36, borderRadius:'50%',
              background: r.color, color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 12.5, fontWeight: 700, flexShrink: 0
            }}>{r.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4, flexWrap:'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{r.name}</span>
                <Stars rating={r.rating} size={11} />
                <span style={{ fontSize: 11.5, color: T.textDim, marginLeft:'auto' }}>{r.date}</span>
              </div>
              <p style={{ fontSize: 13, color: T.textMid, margin: 0, lineHeight: 1.55 }}>"{r.comment}"</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal de ativação de placa (logged user → liga código a um negócio)
// ─────────────────────────────────────────────────────────────
function ActivatePlateModal({ businessId, onClose }) {
  const [code, setCode] = React.useState('')
  const [nick, setNick] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState(false)

  // Fecha com ESC
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) { setError('Digite o código do dispositivo.'); return }
    if (!businessId) { setError('Negócio não identificado. Recarregue a página.'); return }
    setLoading(true); setError('')
    try {
      await apiCall('/api/plates?action=activate', {
        method: 'POST',
        body: JSON.stringify({
          code: cleanCode,
          business_id: businessId,
          channel_name: nick.trim() || null
        })
      })
      setSuccess(true)
      // Recarrega pra a tela refletir nova placa
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setError(err.message || 'Erro ao ativar. Verifique o código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:'fixed', inset: 0, background:'rgba(15,23,42,.55)',
        display:'grid', placeItems:'center', zIndex: 100, padding: 16,
        animation:'fadeIn .15s ease-out'
      }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <Card padded={false} style={{ padding: 24, maxWidth: 440, width:'100%', position:'relative' }}>
        <button onClick={onClose} aria-label="Fechar" style={{
          position:'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 8,
          border:'none', background:'transparent', color: T.textMid, fontSize: 20, cursor:'pointer'
        }}>×</button>

        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: T.text, margin:'0 0 6px', letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap: 8 }}>
          📦 Ativar dispositivo
        </h2>
        <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.5 }}>
          Cole o código que veio na sua placa, cartão ou pulseira NFC. O código fica no verso, começa com <code style={{ background: T.bg, padding:'1px 5px', borderRadius: 4, fontSize: 12 }}>STAR-</code>.
        </p>

        {success ? (
          <div style={{
            padding: 18, background: T.greenSoft, border:'1px solid #A7F3D0', borderRadius: 10,
            display:'flex', alignItems:'center', gap: 10
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color:'#065F46' }}>Dispositivo ativado!</div>
              <div style={{ fontSize: 12.5, color:'#047857' }}>Atualizando a tela…</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>
              Código do dispositivo
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="STAR-XXXXX"
              style={{
                width:'100%', padding:'11px 14px', fontSize: 15, fontFamily:'monospace',
                letterSpacing:'.05em', textTransform:'uppercase',
                border:'1px solid '+T.border, borderRadius: 9, outline:'none', boxSizing:'border-box',
                marginBottom: 14
              }}/>

            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>
              Nome do ponto de captura <span style={{ color: T.textDim, fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Ex: Balcão principal, Mesa 5, Garçom João…"
              style={{
                width:'100%', padding:'10px 14px', fontSize: 13.5,
                border:'1px solid '+T.border, borderRadius: 9, outline:'none', boxSizing:'border-box',
                marginBottom: 6
              }}/>
            <div style={{ fontSize: 11.5, color: T.textDim, marginBottom: 16 }}>
              Aparece nos seus relatórios pra você saber qual ponto traz mais avaliações.
            </div>

            {error && (
              <div style={{
                padding:'10px 12px', background:'#FEF2F2', border:'1px solid #FECACA',
                borderRadius: 8, color: T.red, fontSize: 13, marginBottom: 14
              }}>⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width:'100%', background: loading ? T.textDim : T.blue, color:'#fff',
              border:'none', borderRadius: 10, padding:'12px 18px',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer'
            }}>
              {loading ? 'Ativando…' : 'Ativar dispositivo'}
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Capture points
// ─────────────────────────────────────────────────────────────
function CapturePoints({ items, businessId }) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const total = items.reduce((s, i) => s + (i.reviewsGenerated || 0), 0)
  const isEmpty = !items || items.length === 0
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4, gap: 8, flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>📍 Onde seus clientes avaliam</h3>
        {!isEmpty && <span style={{ fontSize: 12, color: T.textDim }}>{total} {total === 1 ? 'toque registrado' : 'toques registrados'}</span>}
      </div>
      <p style={{ fontSize: 13, color: T.textMid, margin:'0 0 18px' }}>
        {isEmpty
          ? 'Você ainda não tem dispositivos ativos. Coloque uma placa no balcão ou um cartão NFC pra começar a captar avaliações no piloto automático.'
          : 'Cada vez que um cliente toca/escaneia, conta aqui.'}
      </p>

      {isEmpty ? (
        <div style={{
          padding: 24, borderRadius: 12, background: T.bg, border:`1px dashed ${T.border}`,
          textAlign:'center'
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 14, lineHeight: 1.5 }}>
            Nenhum dispositivo ativo ainda.
          </div>
          <div style={{ display:'flex', gap: 8, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => setModalOpen(true)} style={{
              background: T.blue, color:'#fff', border:'none', borderRadius: 9,
              padding:'10px 16px', fontSize: 13, fontWeight: 700, cursor:'pointer'
            }}>Ativar código de placa →</button>
            <a href="/kit" style={{
              background:'#fff', color: T.blue, border:`1.5px solid ${T.blue}`, borderRadius: 9,
              padding:'10px 16px', fontSize: 13, fontWeight: 700, textDecoration:'none'
            }}>Comprar dispositivos</a>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 12, background:'#F8FAFC', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize: 12.5, color: T.textMid, fontWeight: 500, marginBottom: 4 }}>{it.name}</div>
                <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 26, fontWeight: 700, color: T.text, letterSpacing:'-0.025em', lineHeight: 1, marginBottom: 2 }}>{it.reviewsGenerated}</div>
                <div style={{ fontSize: 11.5, color: T.textDim }}>
                  {it.devicesCount ? `${it.devicesCount} ${it.devicesCount === 1 ? 'ativo' : 'ativos'} · ` : ''}toques
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setModalOpen(true)} style={{
            display:'block', marginTop: 18, background:'transparent', color: T.blue, border:`1.5px solid ${T.blue}`, borderRadius: 10,
            padding:'10px 18px', fontSize: 13, fontWeight: 600, cursor:'pointer',
            fontFamily:"'Inter', sans-serif", width:'100%', textAlign:'center'
          }}>
            + Ativar novo dispositivo
          </button>
        </>
      )}
      {modalOpen && (
        <ActivatePlateModal
          businessId={businessId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// BetaBanner — aviso de feature em demonstração (sem dados reais ainda)
// ─────────────────────────────────────────────────────────────
function BetaBanner({ feature, eta }) {
  return (
    <div style={{
      background:'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
      border:'1px solid #FCD34D', borderRadius: 12, padding:'12px 16px',
      marginBottom: 18, display:'flex', alignItems:'flex-start', gap: 12
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🔬</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color:'#78350F', marginBottom: 2 }}>
          {feature} · em demonstração
        </div>
        <div style={{ fontSize: 12.5, color:'#92400E', lineHeight: 1.45 }}>
          Os dados abaixo são de exemplo. {eta || 'Em breve conectado aos seus dados reais.'}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AVALIAÇÕES — tela completa (lista todas as reviews)
// ─────────────────────────────────────────────────────────────
function ReviewsScreen({ data, isMobile }) {
  const [starFilter, setStarFilter] = React.useState(0) // 0 = todas
  const reviews = data.recentReviews || []
  const visible = starFilter ? reviews.filter(r => r.rating === starFilter) : reviews

  const counts = [5, 4, 3, 2, 1].map(s => ({ s, n: reviews.filter(r => r.rating === s).length }))
  const total = reviews.length
  const avg = total ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total) : 0

  return (
    <main style={{ maxWidth: 980, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          ⭐ Suas avaliações
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          As últimas avaliações que seus clientes deixaram no Google.
        </p>
      </div>

      {/* Header com média + breakdown por estrela */}
      <Section>
        <Card>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: isMobile ? 16 : 28, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 40 : 52, fontWeight: 800, color: T.text, letterSpacing:'-0.03em', lineHeight: 1 }}>
                {(data.kpis.rating || avg).toFixed(1)}
              </div>
              <div style={{ margin:'4px 0' }}><Stars rating={data.kpis.rating || avg} size={isMobile ? 16 : 18}/></div>
              <div style={{ fontSize: 12.5, color: T.textMid }}>{data.kpis.reviewCount || total} avaliações</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
              {counts.map(({ s, n }) => {
                const pct = total ? (n / total) * 100 : 0
                return (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 14, color: T.textMid, fontWeight: 600 }}>{s}★</span>
                    <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 4, overflow:'hidden' }}>
                      <div style={{ width: pct + '%', height:'100%', background:'#FBBC04' }}/>
                    </div>
                    <span style={{ width: 24, color: T.textDim, fontSize: 12, textAlign:'right' }}>{n}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </Section>

      {/* Filtros */}
      <Section>
        <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
          <button onClick={() => setStarFilter(0)} style={{
            padding:'7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 999,
            border:'1px solid', borderColor: starFilter === 0 ? T.blue : T.border,
            background: starFilter === 0 ? T.blue : T.surface,
            color: starFilter === 0 ? '#fff' : T.textMid, cursor:'pointer'
          }}>Todas ({total})</button>
          {[5, 4, 3, 2, 1].map(s => {
            const n = counts.find(c => c.s === s)?.n || 0
            const active = starFilter === s
            return (
              <button key={s} onClick={() => setStarFilter(s)} disabled={n === 0} style={{
                padding:'7px 14px', fontSize: 13, fontWeight: 600, borderRadius: 999,
                border:'1px solid', borderColor: active ? T.blue : T.border,
                background: active ? T.blue : T.surface,
                color: active ? '#fff' : (n === 0 ? T.textDim : T.textMid),
                cursor: n === 0 ? 'not-allowed' : 'pointer', opacity: n === 0 ? 0.5 : 1
              }}>{s}★ ({n})</button>
            )
          })}
        </div>
      </Section>

      {/* Lista */}
      {visible.length === 0 ? (
        <Card style={{ textAlign:'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Nada por aqui ainda</div>
          <div style={{ fontSize: 13, color: T.textMid }}>
            {starFilter ? 'Nenhuma avaliação com essa nota.' : 'Quando alguém avaliar no Google, aparece aqui.'}
          </div>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          {visible.map((r, i) => (
            <Card key={i} padded={false} style={{ padding: 18 }}>
              <div style={{ display:'flex', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius:'50%', background: r.color, color:'#fff',
                  display:'grid', placeItems:'center', fontSize: 15, fontWeight: 700, flexShrink: 0
                }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 6, flexWrap:'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.name}</span>
                    <Stars rating={r.rating} size={13}/>
                    <span style={{ fontSize: 12, color: T.textDim, marginLeft:'auto' }}>{r.date}</span>
                  </div>
                  <p style={{ fontSize: 14, color: T.textMid, margin: 0, lineHeight: 1.55 }}>
                    {r.comment ? `"${r.comment}"` : <em style={{ color: T.textDim }}>(Cliente avaliou sem deixar comentário)</em>}
                  </p>
                  {data.biz.placeId && (
                    <a href={`https://search.google.com/local/reviews?placeid=${data.biz.placeId}`} target="_blank" rel="noreferrer" style={{
                      display:'inline-block', marginTop: 8, fontSize: 12, color: T.blue, fontWeight: 600, textDecoration:'none'
                    }}>Responder no Google ↗</a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// Estados especiais: loading, erro, sem-negócio
// ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display:'grid', placeItems:'center', minHeight:'calc(100vh - 80px)', padding: 40 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius:'50%',
          border:'3px solid '+T.border, borderTopColor: T.blue,
          margin:'0 auto 16px', animation:'rotateA2 0.8s linear infinite'
        }}/>
        <div style={{ fontSize: 14, color: T.textMid, fontWeight: 500 }}>Carregando seus dados…</div>
        <style>{`@keyframes rotateA2{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <main style={{ maxWidth: 560, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
      <Card style={{ padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
          Não conseguimos carregar seus dados
        </h2>
        <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.5 }}>
          {message || 'Erro de conexão. Verifique sua internet e tente novamente.'}
        </p>
        <button onClick={onRetry} style={{
          background: T.blue, color:'#fff', border:'none', borderRadius: 9,
          padding:'10px 20px', fontSize: 13.5, fontWeight: 700, cursor:'pointer'
        }}>Tentar novamente</button>
      </Card>
    </main>
  )
}

function NoBusinessScreen() {
  return (
    <main style={{ maxWidth: 560, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
      <Card style={{ padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: T.text, margin:'0 0 8px', letterSpacing:'-0.02em' }}>
          Vamos configurar seu negócio
        </h2>
        <p style={{ fontSize: 14, color: T.textMid, margin:'0 0 24px', lineHeight: 1.55 }}>
          Primeiro a gente precisa encontrar seu negócio no Google. Leva 1 minuto e desbloqueia todo o painel.
        </p>
        <a href="/comece" style={{
          display:'inline-block', background: T.blue, color:'#fff', textDecoration:'none',
          borderRadius: 10, padding:'12px 24px', fontSize: 14, fontWeight: 700,
          boxShadow:'0 4px 14px rgba(26,115,232,.3)'
        }}>Configurar agora →</a>
      </Card>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// Score StarTouch — índice 0-100 da presença local
// Composição: nota Google (50pts) + volume de avaliações (30pts) + posição relativa (20pts)
// Mostra o esforço total — quem só tem nota 5 com 3 reviews não vence quem tem 4.7 com 500.
// ─────────────────────────────────────────────────────────────
function calcStarTouchScore(d) {
  const rating  = d.kpis?.rating || 0
  const reviews = d.kpis?.reviewCount || 0
  const total   = d.kpis?.totalCompetitors || 0
  const pos     = d.kpis?.rankingPos || total

  const ratingPart   = (rating / 5) * 50                         // 0-50
  const reviewsPart  = Math.min(reviews / 100, 1) * 30           // satura em 100 reviews
  const positionPart = total > 0
    ? ((total - pos + 1) / total) * 20
    : 10                                                          // sem ranking ainda: meio termo
  return Math.max(0, Math.min(100, Math.round(ratingPart + reviewsPart + positionPart)))
}

// ─────────────────────────────────────────────────────────────
// Main layout
// ─────────────────────────────────────────────────────────────
export default function AppV2({ user = null, onLogout, demoMode = false } = {}) {
  const isMobile = useIsMobile(768)
  // Deep-link inicial: ?tab=X (vence) OU hash #conta|#negocio|#plano (vai pra config) OU painel
  const initialTab = (() => {
    if (typeof window === 'undefined') return 'painel'
    const qsTab = new URLSearchParams(window.location.search).get('tab')
    if (qsTab) return qsTab
    const hash = window.location.hash.replace('#', '')
    if (['conta', 'negocio', 'plano'].includes(hash)) return 'config'
    return 'painel'
  })()
  const [tab, setTab] = React.useState(initialTab)
  const [moreOpen, setMoreOpen] = React.useState(false)

  // Sincroniza URL com state — copiar/colar e F5 mantêm aba correta
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (tab === 'painel') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }
    // Mantém hash só pra config; em outras abas, limpa pra não confundir
    if (tab !== 'config') {
      url.hash = ''
    }
    window.history.replaceState({}, '', url.toString())
  }, [tab])

  // Helper pra navegar de bottom sheet "Mais" → tab + anchor opcional
  const navigateFromMore = React.useCallback((newTab, hash) => {
    if (typeof window !== 'undefined' && hash) {
      window.location.hash = hash
    }
    setTab(newTab)
  }, [])

  // Carrega dados reais via API (skipa em demoMode ou sem user)
  const real = useRealData(user, demoMode)

  // Plano real vence sobre URL em modo logado. URL override só rola em demo.
  // Admin (email hardcoded) tbm vê tudo como Pro automaticamente.
  const plan = getPlan(demoMode ? null : real.biz, demoMode, user)

  // Compõe dados: real sobrescreve mock; mock preenche lacunas
  const d = buildData(real, user, demoMode)

  // Header usa nome do negócio real
  const headerBizName = d.biz.name

  // Estados especiais — early return mantém Header pra usuário não ficar perdido
  if (real.loading) {
    return (
      <div style={{ background: T.bg, minHeight:'100vh' }}>
        <Header bizName={user?.email || 'Carregando…'} plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <LoadingScreen/>
      </div>
    )
  }
  if (real.error) {
    return (
      <div style={{ background: T.bg, minHeight:'100vh' }}>
        <Header bizName={user?.email || 'StarTouch'} plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <ErrorScreen message={real.error} onRetry={() => window.location.reload()}/>
      </div>
    )
  }
  if (!demoMode && user && !real.hasBusiness) {
    return (
      <div style={{ background: T.bg, minHeight:'100vh' }}>
        <Header bizName="Meu Negócio" plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <NoBusinessScreen/>
      </div>
    )
  }

  return (
    <div style={{
      background: T.bg, minHeight:'100vh',
      // Espaço pro bottom tab bar não cobrir o conteúdo final (só mobile)
      paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0))' : 0
    }}>
      <Header bizName={headerBizName} plan={plan} isMobile={isMobile} onNavigate={setTab} user={user} onLogout={onLogout} demoMode={demoMode} />
      {!isMobile && <TopTabs active={tab} onChange={setTab} plan={plan} isMobile={false} />}

      {/* Aba: CONCORRENTES (Pro) — Inteligência Competitiva FUNCIONAL */}
      {tab === 'concorrentes' && plan === 'pro' && (
        <CompetitorsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Aba: ALERTAS (Pro) — feed + canais (dados ainda em demonstração) */}
      {tab === 'alertas' && plan === 'pro' && (
        <AlertsScreen data={d} isMobile={isMobile} isReal={!demoMode && real.hasBusiness}/>
      )}

      {/* Aba: RELATÓRIOS (Pro) — newsletter semanal/mensal (dados ainda em demonstração) */}
      {tab === 'relatorios' && plan === 'pro' && (
        <ReportsScreen data={d} isMobile={isMobile} isReal={!demoMode && real.hasBusiness}/>
      )}

      {/* Aba: LOJA — vitrine de produtos NFC (free + pro) */}
      {tab === 'loja' && (
        <LojaScreen data={d} isMobile={isMobile} plan={plan}/>
      )}

      {/* Aba: AVALIAÇÕES — lista todas as reviews do Google (free + pro) */}
      {tab === 'avaliacoes' && (
        <ReviewsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Tela: CONFIGURAÇÕES — acessível via dropdown do avatar */}
      {tab === 'config' && (
        <ConfigScreen data={d} isMobile={isMobile} plan={plan} isReal={!demoMode && real.hasBusiness}/>
      )}

      {/* Outras abas ainda em construção */}
      {tab !== 'painel' && !(tab === 'concorrentes' && plan === 'pro') && !(tab === 'alertas' && plan === 'pro') && !(tab === 'relatorios' && plan === 'pro') && tab !== 'loja' && tab !== 'avaliacoes' && tab !== 'config' && (
        <ComingSoon
          icon={tab === 'concorrentes' ? '🏆' : tab === 'alertas' ? '🔔' : tab === 'relatorios' ? '📈' : '⭐'}
          title={
            tab === 'concorrentes' ? 'Inteligência Competitiva' :
            tab === 'alertas'      ? 'Alertas em tempo real' :
            tab === 'relatorios'   ? 'Relatórios completos' :
                                     'Todas as suas avaliações'
          }
          desc={
            tab === 'concorrentes' ? 'Veja quem está na sua frente, quanto falta pra ultrapassar e quem está crescendo mais rápido na sua categoria.' :
            tab === 'alertas'      ? 'Receba aviso na hora em que um concorrente passar você, sair do Top, ou ganhar várias avaliações de uma vez.' :
            tab === 'relatorios'   ? 'Toda segunda, no seu e-mail: evolução semanal, ranking, comparativos e oportunidades.' :
                                     'A lista completa de avaliações fica aqui em breve. Por enquanto, veja as últimas no Painel.'
          }
          plan={plan}
        />
      )}

      {tab === 'painel' && (
      <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>

        {/* Switch plano — só em demo (?demo=1). Em produção logada, o plano vem do banco. */}
        {demoMode && (
          <div style={{ display:'flex', gap: 8, marginBottom: 20, fontSize: 12, alignItems:'center' }}>
            <span style={{ fontSize: 11, color: T.textDim, marginRight: 4 }}>DEMO:</span>
            <a href="?demo=1&plan=free" style={{
              padding:'6px 12px', borderRadius:8, textDecoration:'none',
              background: plan === 'free' ? T.blue : '#fff',
              color: plan === 'free' ? '#fff' : T.textMid,
              border:`1px solid ${plan === 'free' ? T.blue : T.border}`,
              fontWeight: 600
            }}>Ver como FREE</a>
            <a href="?demo=1&plan=pro" style={{
              padding:'6px 12px', borderRadius:8, textDecoration:'none',
              background: plan === 'pro' ? T.blue : '#fff',
              color: plan === 'pro' ? '#fff' : T.textMid,
              border:`1px solid ${plan === 'pro' ? T.blue : T.border}`,
              fontWeight: 600
            }}>Ver como PRO</a>
          </div>
        )}

        {/* TITLE */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Olá, {d.biz.name}.
          </h1>
          <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
            Veja como seu negócio está crescendo · atualizado agora
          </p>
        </div>

        {/* KPI ROW — 6 cards (mobile vira 2x3, desktop continua 6 colunas) */}
        <Section>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
            gap: isMobile ? 10 : 12
          }}>
            <KpiCard icon="⭐" label="Nota Google"     value={d.kpis.rating.toFixed(1)} sub="Sua reputação atual"            trend={+0.4} />
            <KpiCard icon="📝" label="Avaliações"      value={d.kpis.reviewCount}      sub="Total recebidas"                trend={+d.kpis.newLast30Days} />
            <KpiCard icon="🏆" label="Ranking local"   value={`#${d.kpis.rankingPos}`}  sub={`Entre ${d.kpis.totalCompetitors} empresas`} trend={+2} />
            <KpiCard icon="📈" label="Últimos 30 dias" value={`+${d.kpis.newLast30Days}`} sub="Novas avaliações"             trend={+3} />
            <KpiCard icon="🎯" label="Próxima Meta"    value={`${d.kpis.nextGoal.reviewsToNext} ${d.kpis.nextGoal.reviewsToNext === 1 ? 'avaliação' : 'avaliações'}`} sub={`Para o Top ${d.kpis.nextGoal.targetPosition}`} />
            <KpiCard icon="🏅" label="Score StarTouch" value={`${calcStarTouchScore(d)}`} sub="Sua presença local · 0–100" />
          </div>
        </Section>

        {/* SUGESTÕES DA SEMANA (push de direção) */}
        <Section>
          <WeekActions items={d.weekActions} isMobile={isMobile} />
        </Section>

        {/* HERO POSITION = card de RESULTADO (sem CTA pra Pro) */}
        <Section>
          <HeroPosition
            progressPct={d.hero.progressPct}
            currentPos={d.kpis.rankingPos}
            isMobile={isMobile}
          />
        </Section>

        {/* RANKING (conversor pra Pro) + EVOLUTION (conquista) */}
        <Section>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 420px) 1fr',
            gap: isMobile ? 14 : 24
          }}>
            <RankingList items={d.ranking} isMobile={isMobile} plan={plan} category={d.activeCategory} onEditCategory={() => navigateFromMore('config', 'negocio')} />
            <EvolutionChart data={d.evolution} growthPct={d.growthPct} isMobile={isMobile} />
          </div>
        </Section>

        {/* OPPORTUNITY + RECENT REVIEWS */}
        <Section>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 360px) 1fr',
            gap: isMobile ? 14 : 24
          }}>
            <Opportunities count={d.unrepliedReviews} placeId={d.biz.placeId} />
            <RecentReviews items={d.recentReviews} trend={d.trend} isMobile={isMobile} onSeeAll={() => setTab('avaliacoes')} />
          </div>
        </Section>

        {/* CAPTURE POINTS */}
        <Section>
          <CapturePoints items={d.capturePoints} businessId={d.biz.id} />
        </Section>

      </main>
      )}

      {/* Bottom Tab Bar — só mobile, 4 itens + "Mais" abre sheet */}
      {isMobile && (
        <>
          <BottomTabBar
            active={tab}
            onChange={setTab}
            plan={plan}
            onOpenMore={() => setMoreOpen(true)}
            moreOpen={moreOpen}
          />
          <MoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            onPick={navigateFromMore}
            plan={plan}
            user={user}
            onLogout={onLogout}
          />
        </>
      )}
    </div>
  )
}
