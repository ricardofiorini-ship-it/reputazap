import React from 'react'
// A conta do Score StarTouch é COMPARTILHADA com o email semanal. Importar de
// dentro de `api/` é de propósito: o arquivo é puro (sem Node, sem React) e é
// o único jeito de garantir que painel e email nunca mais mostrem números
// diferentes pro mesmo negócio. Ver a nota longa em score-core.js.
import { calcularScore } from '../api/_lib/score-core.js'
import {
  Home, Star, ShoppingBag, ShoppingCart, Menu, Lock, Unlock, TrendingUp, TrendingDown,
  Bell, Target, Search, Award, Medal, Rocket, AlertTriangle, MessageSquare, Info,
  Settings, Mail, HelpCircle, Check, CheckCircle2, X, MapPin, BarChart3, User, Users,
  Camera, Lightbulb, Flame, Package, Phone, Building2, Wrench, FlaskConical, Calendar,
  Download, Send, FileText, Radar, Sparkles, Key, Gift, DoorOpen, Map, CreditCard,
  Image as ImageIcon, Store, PartyPopper, Construction, Monitor, Bookmark, RefreshCw,
  Truck, ShieldCheck, Siren, ClipboardList, Inbox, Tag, UtensilsCrossed, Hand, ChevronRight,
  Smartphone, QrCode, Pencil
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Registro de ícones para dados (campos `icon:` em MOCK/config/notificações).
// Substitui os emojis-string por chaves; <Ico name="trophy"/> renderiza o Lucide.
// (spec seção 2.1 — nenhum emoji na UI)
// ─────────────────────────────────────────────────────────────
const ICON_MAP = {
  trophy: Award, medal1: Medal, medal2: Medal, medal3: Medal, target: Target,
  chat: MessageSquare, camera: Camera, star: Star, warn: AlertTriangle, chart: BarChart3,
  trendup: TrendingUp, bell: Bell, rocket: Rocket, lightbulb: Lightbulb, siren: Siren,
  search: Search, mappin: MapPin, lock: Lock, unlock: Unlock, settings: Settings,
  mail: Mail, help: HelpCircle, user: User, users: Users, monitor: Monitor, flask: FlaskConical,
  calendar: Calendar, calendarMonth: Calendar, download: Download, send: Send, inbox: Inbox,
  bell2: Bell, cart: ShoppingCart, config: Settings, door: DoorOpen, map: Map, card: CreditCard,
  package: Package, phone: Phone, building: Building2, wrench: Construction, radar: Radar,
  sparkles: Sparkles, key: Key, gift: Gift, id: CreditCard, party: PartyPopper, store: Store,
  bag: ShoppingBag, home: Home, menu: Menu, award: Award, bookmark: Bookmark, refresh: RefreshCw,
  truck: Truck, shield: ShieldCheck, clipboard: ClipboardList, tag: Tag, food: UtensilsCrossed,
  image: ImageIcon, wave: Hand, check: Check, flame: Flame
}
function Ico({ name, size = 20, strokeWidth = 2, style, ...rest }) {
  const C = ICON_MAP[name]
  if (!C) return null
  return <C size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, ...style }} {...rest} />
}

// ─────────────────────────────────────────────────────────────
// Dashboard StarTouch — V2 (mockup funcional)
// Foco: reputação · crescimento · ranking · resultado
// Plano: usar ?plan=free ou ?plan=pro na URL pra alternar
// ─────────────────────────────────────────────────────────────

// WhatsApp oficial de suporte StarTouch
const SUPPORT_WA_NUMBER = '5511976944026'           // formato internacional (sem + nem espaços) usado em wa.me
const SUPPORT_WA_DISPLAY = '(11) 97694-4026'        // pra exibir bonito na UI
const SUPPORT_WA_DEFAULT_MSG = 'Oi! Sou cliente do StarTouch e preciso de ajuda.'

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
    { icon: 'target', text: 'Foque em pedir 2 avaliações no atendimento essa semana — leva você pro Top 2.', kind: 'goal' },
    { icon: 'chat', text: 'Responda as 5 avaliações pendentes hoje — Google premia perfis ativos.',         kind: 'action' },
    { icon: 'camera', text: 'Atualize as fotos do seu Google Meu Negócio (último upload faz 60 dias).',       kind: 'tip' }
  ],
  ranking: [
    { pos: 1, medal: 'medal1', name: 'Empresa A',         rating: 5.0, reviews: 25, you: false },
    { pos: 2, medal: 'medal2', name: 'Empresa B',         rating: 5.0, reviews: 14, you: false },
    { pos: 3, medal: 'medal3', name: 'Café Bella Vista',  rating: 5.0, reviews: 12, you: true  },
    { pos: 4, medal: '',   name: 'Empresa C',         rating: 4.9, reviews: 11, you: false },
    { pos: 5, medal: '',   name: 'Empresa D',         rating: 4.8, reviews: 9,  you: false }
  ],
  unrepliedReviews: 5,
  recentReviews: [
    { name: 'Fábio Nunes',    rating: 1, comment: 'Demorou demais e o pedido veio errado. Fiquei frustrado.',         date: 'Há 1 dia',     initials: 'FN', color: '#EF4444' },
    { name: 'Gabriela Reis',  rating: 2, comment: 'Esperava mais pelo preço. O atendimento foi meio frio.',            date: 'Há 3 dias',    initials: 'GR', color: '#F97316' },
    { name: 'Ana Martins',    rating: 5, comment: 'Atendimento incrível, super atenciosos. Voltarei sempre!',         date: 'Há 2 dias',    initials: 'AM', color: '#F59E0B' },
    { name: 'Bruno Lima',     rating: 5, comment: 'Café muito bom, ambiente aconchegante e equipe atenciosa.',         date: 'Há 4 dias',    initials: 'BL', color: '#10B981' },
    { name: 'Carla Souza',    rating: 5, comment: 'Tudo perfeito! Recomendo demais.',                                   date: 'Há 1 semana',  initials: 'CS', color: '#8B5CF6', replied: true },
    { name: 'Diego Pereira',  rating: 5, comment: 'Excelente! O capuccino é um dos melhores da cidade.',                date: 'Há 1 semana',  initials: 'DP', color: '#EC4899', replied: true },
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
    { id: 1,  pos: 1,  medal:'medal1', name:'Empresa A',        rating: 5.0, reviews: 25, weekGrowth: +3, distance:  320, angle: 0.4, history:[18,19,20,21,21,22,23,24,24,24,25,25], color:'#F59E0B', initials:'EA' },
    { id: 2,  pos: 2,  medal:'medal2', name:'Empresa B',        rating: 5.0, reviews: 14, weekGrowth: +1, distance:  480, angle: 1.9, history:[10,10,11,11,11,12,12,13,13,13,14,14], color:'#10B981', initials:'EB' },
    { id: 3,  pos: 3,  medal:'medal3', name:'Café Bella Vista', rating: 5.0, reviews: 12, weekGrowth: +2, distance:    0, angle: 0,   history:[5,5,6,6,7,7,8,9,10,11,11,12],         color:'#1A73E8', initials:'CB', isYou: true },
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
    { id: 1,  type:'promotion', icon:'trophy', title:'Você entrou no Top 3!',                            detail:'Subiu da 4ª pra 3ª posição na sua categoria.',                       when:'Há 2 horas',  isNew:true,  category:'ranking' },
    { id: 2,  type:'threat',    icon:'warn', title:'Empresa A ganhou 5 avaliações em 3 dias',          detail:'Cresceu de 20 pra 25 avaliações — está acelerando.',                  when:'Hoje 10:42',  isNew:true,  category:'concorrente' },
    { id: 3,  type:'goal',      icon:'target', title:'Você está a 2 avaliações do Top 2',                detail:'Foque em pedir avaliações essa semana e suba uma posição.',           when:'Hoje 09:15',  isNew:true,  category:'ranking' },
    { id: 4,  type:'advance',   icon:'↑',  title:'Você ultrapassou Empresa C',                       detail:'Ganhou 1 posição no ranking.',                                        when:'Ontem 18:30',              category:'ranking' },
    { id: 5,  type:'review',    icon:'star', title:'Nova avaliação 5 estrelas de Maria S.',            detail:'"Atendimento incrível, super atenciosos!"',                           when:'Ontem 14:22',              category:'avaliacao' },
    { id: 6,  type:'regression',icon:'↓',  title:'Empresa B passou você',                            detail:'Você caiu da 2ª pra 3ª posição.',                                     when:'Há 2 dias',                category:'ranking' },
    { id: 7,  type:'review',    icon:'star', title:'Nova avaliação 4 estrelas de Bruno L.',            detail:'"Café muito bom, espera só demorou um pouco no horário de pico."',     when:'Há 3 dias',                category:'avaliacao' },
    { id: 8,  type:'review',    icon:'star', title:'Nova avaliação 5 estrelas de Carla S.',            detail:'"Tudo perfeito! Recomendo."',                                          when:'Há 4 dias',                category:'avaliacao' },
    { id: 9,  type:'threat',    icon:'warn', title:'Empresa F ganhou 4 avaliações na semana',          detail:'Crescimento acelerado — pode ameaçar sua posição.',                   when:'Há 5 dias',                category:'concorrente' },
    { id: 10, type:'promotion', icon:'trophy', title:'Sua nota chegou a 5.0!',                           detail:'Você atingiu nota máxima na sua categoria.',                          when:'Há 1 semana',              category:'ranking' }
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
        { type:'risk', icon:'warn', text:'Empresa F está crescendo rápido (+2 avaliações)' }
      ],
      competitorComparison: [
        { name:'Empresa A',         pos: 1, reviews: 25, weekChange: +3 },
        { name:'Empresa B',         pos: 2, reviews: 14, weekChange: +1 },
        { name:'Café Bella Vista',  pos: 3, reviews: 12, weekChange: +2, isYou: true },
        { name:'Empresa C',         pos: 4, reviews: 11, weekChange:  0 }
      ],
      opportunities: [
        { icon:'target', text:'Faltam apenas 2 avaliações pra ultrapassar Empresa B e entrar no Top 2.' },
        { icon:'chat', text:'Você tem 5 avaliações sem resposta — respondê-las melhora ranking no Google.' },
        { icon:'camera', text:'Sua última foto no Google Meu Negócio é de 60 dias atrás. Suba 1 esse mês.' }
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
        { type:'risk', icon:'warn', text:'Empresa A continua crescendo forte (+8 avaliações no mês)' }
      ],
      competitorComparison: [
        { name:'Empresa A',         pos: 1, reviews: 25, weekChange: +8 },
        { name:'Empresa B',         pos: 2, reviews: 14, weekChange: +4 },
        { name:'Café Bella Vista',  pos: 3, reviews: 12, weekChange: +7, isYou: true },
        { name:'Empresa C',         pos: 4, reviews: 11, weekChange: +1 }
      ],
      opportunities: [
        { icon:'trendup', text:'Sua nota subiu de 4.8 pra 5.0 no mês — capitalize isso com posts e flyers.' },
        { icon:'target', text:'Mantendo o ritmo de 7 avaliações/mês, em 60 dias você ultrapassa a Empresa A.' },
        { icon:'bell', text:'Considere ativar pulseira NFC pros garçons: hoje só placa de mesa gera reviews.' }
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

  // Loja — produtos reais StarTouch (catálogo + preços oficiais em /kit).
  // Galeria (images) + specs espelham a vitrine da landing.
  products: [
    {
      id:'placa-balcao', name:'Placa de Balcão G', price:'R$ 79,90',
      img:'/gadget-placa.png',
      images:['/gadget-placa.png','/placa-g-2.png','/placa-g-3.png','/placa-g-4.png','/placa-g-5.png'],
      desc:'Acrílico premium com NFC + QR Code. O cliente toca o celular e avalia no Google em segundos.',
      specs:['Acrílico cristal premium com base inclinada','21 × 15 cm (display de balcão)','NFC + QR Code de fallback impresso','Sem app — o cliente não instala nada'],
      buyUrl:'/kit?add=placa-balcao'
    },
    {
      id:'placa-mesa', name:'Placa de Balcão M', price:'R$ 49,90',
      img:'/placa-m-1.png',
      images:['/placa-m-1.png','/placa-m-2.png','/placa-m-3.png','/placa-m-4.png'],
      desc:'A mesma placa NFC + QR Code, em versão compacta — pra balcões menores, mesas e recepções.',
      specs:['10 × 15 cm — compacta','Acrílico cristal premium','Proteção UV (não amarela)','NFC + QR Code de fallback'],
      buyUrl:'/kit?add=placa-mesa'
    },
    {
      id:'cartao-nfc', name:'Cartão de Avaliação NFC', price:'R$ 29,90',
      img:'/cartao-1.png',
      images:['/cartao-1.png','/cartao-2.png','/cartao-3.png','/cartao-4.png','/cartao-5.png','/cartao-6.png'],
      desc:'Do tamanho de um cartão de crédito. Ideal pra atendimento e um cartão por vendedor.',
      specs:['8,5 × 5,4 cm — cabe na carteira','PVC fosco premium','NFC + QR Code de fallback','Avaliação em menos de 30 segundos'],
      buyUrl:'/kit?add=cartao-nfc'
    },
    {
      id:'pulseira-nfc', name:'Pulseira NFC', price:'R$ 109,90', soldOut:true,
      img:'/gadget-pulseira.png',
      images:['/gadget-pulseira.png'],
      desc:'Pro atendente usar no pulso — toca no celular do cliente após o atendimento.',
      specs:['Silicone resistente','À prova d\'água','Ajuste universal'],
      buyUrl:'/kit'
    }
  ],
  kit: {
    icon: 'gift',
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
// Cabeçalho de identificação pras rotas PÚBLICAS que respondem diferente pra
// quem está logado (hoje: a cadência de medição do /api/diagnostico). Sem token
// devolve {} — a rota continua funcionando pro visitante.
function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rz_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
    const err = new Error(msg)
    err.status = res.status
    throw err
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

// Hook que carrega dados reais do user logado (ou do convidado, via place_id).
// Retorna { loading, error, authExpired, biz, reviews, bizInfo, plates, hasBusiness }
function useRealData(user, demoMode, guestMode = false, guestContext = null) {
  const [state, setState] = React.useState({
    loading: !demoMode && (!!user || guestMode),
    error: null,
    authExpired: false,
    biz: null,
    reviews: [],
    bizInfo: null,
    plates: null,
    alertPreferences: null,
    hasBusiness: false
  })

  React.useEffect(() => {
    if (demoMode || (!user && !guestMode)) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null, authExpired: false }))

    ;(async () => {
      // ── Modo CONVIDADO: só endpoints públicos (place_id), sem token ──
      if (guestMode) {
        // Sem negócio escolhido ainda → tela de busca (não busca dados)
        if (!guestContext?.placeId) {
          if (!cancelled) setState(s => ({ ...s, loading: false, hasBusiness: false }))
          return
        }
        try {
          const pid = guestContext.placeId
          const kw = (guestContext.keyword || '').trim()
          // A CHAMADA DA ARENA VELHA SAIU (03/ago). O convidado disparava
          // /api/diagnostico (raio único, ordem crua do Google) em TODA abertura
          // do painel, e o resultado só alimentava a lista de concorrentes que a
          // GRADE já substituiu na tela. Era uma medição paga ao Google por
          // visita, no caminho mais movimentado do site (anúncios), pra um
          // número que ninguém via. A grade continua medindo normalmente.
          const [bizInfoRes, reviewsRes] = await Promise.all([
            fetch(`/api/bizinfo?place_id=${encodeURIComponent(pid)}`).then(r => r.json()).catch(() => ({})),
            fetch(`/api/reviews?place_id=${encodeURIComponent(pid)}`).then(r => r.json()).catch(() => ({}))
          ])
          if (cancelled) return
          const name = reviewsRes.name || bizInfoRes.name || 'Seu negócio'
          const biz = { id: null, place_id: pid, name, category_override: kw, plan: 'free' }
          setState({
            loading: false, error: null, authExpired: false,
            biz,
            reviews: reviewsRes.reviews || [],
            bizInfo: {
              rating: reviewsRes.rating ?? bizInfoRes.rating ?? null,
              total: reviewsRes.total ?? bizInfoRes.total ?? null,
              name,
              address: bizInfoRes.address || null,
              phone: bizInfoRes.phone || null,
              gmapsUrl: bizInfoRes.gmapsUrl || null,
              category: bizInfoRes.category || null,
              photoUrl: bizInfoRes.photoUrl || null
            },
            plates: [],
            alertPreferences: null,
            hasBusiness: true
          })
        } catch (e) {
          if (!cancelled) setState(s => ({ ...s, loading: false, error: e.message || 'Erro ao carregar' }))
        }
        return
      }

      try {
        // Cache-buster: garante que browser/CDN não devolvam resposta antiga sem colunas novas
        const cb = '?_t=' + Date.now()
        const myBizRes = await apiCall('/api/mybiz' + cb)
        const biz = myBizRes.business || null
        if (!biz || !biz.place_id) {
          if (!cancelled) setState({ loading: false, error: null, biz, reviews: [], bizInfo: null, plates: null, alertPreferences: null, hasBusiness: false })
          return
        }
        // Categoria customizada — fonte única é businesses.category_override no banco.
        // Limpa localStorage legado SEM fazer upload (auto-upload causava sobrescrita
        // do valor do banco quando devices abriam fora de ordem).
        if (typeof window !== 'undefined' && localStorage.getItem('rz_activity')) {
          try { localStorage.removeItem('rz_activity') } catch {}
        }
        // O /api/competitors SAIU daqui (03/ago) — mesma faxina do convidado.
        // Ele custava uma medição no Google a cada abertura de painel e o que
        // sobrava dele na tela era o rótulo da busca (que agora vem da grade) e
        // uma frase da saudação (idem). A posição nunca mais sai dele: é a arena
        // que se contradizia com o Hero. O endpoint segue de pé pro /App.jsx
        // antigo e pros snapshots.
        // 4 chamadas em paralelo: reviews + bizinfo (públicas), plates + alert prefs (auth)
        const [reviewsRes, bizInfoRes, platesRes, alertPrefsRes] = await Promise.all([
          fetch(`/api/reviews?place_id=${encodeURIComponent(biz.place_id)}`).then(r => r.json()).catch(() => ({})),
          fetch(`/api/bizinfo?place_id=${encodeURIComponent(biz.place_id)}`).then(r => r.json()).catch(() => ({})),
          apiCall('/api/plates?action=my-plates').catch(() => null),
          apiCall('/api/alerts?action=preferences').catch(() => null)
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
            plates: platesRes?.plates || [],
            alertPreferences: alertPrefsRes?.preferences || null,
            hasBusiness: true
          })
        }
      } catch (e) {
        if (cancelled) return
        // Token expirado/inválido — vai virar fluxo de logout no AppV2
        const isAuth = e.status === 401 || /token/i.test(e.message || '')
        setState({
          loading: false,
          error: e.message,
          authExpired: isAuth,
          biz: null, reviews: [], bizInfo: null, plates: null, alertPreferences: null, hasBusiness: false
        })
      }
    })()

    return () => { cancelled = true }
  }, [user, demoMode, guestMode, guestContext?.placeId, guestContext?.keyword])

  return state
}

// Nome humano dos product_types do banco
const PRODUCT_LABELS = {
  placa_balcao: 'Placa de Balcão',
  placa_mesa:   'Placa de Mesa',
  placa_parede: 'Placa de Parede',
  pulseira_nfc: 'Pulseira NFC',
  cartao_nfc:   'Cartão NFC'
}

// Compõe `d` (dados pra UI) misturando real + MOCK. Real sobrescreve, mock preenche gaps.
function buildData(real, user, demoMode) {
  if (demoMode || !real.hasBusiness) return MOCK
  const { biz, bizInfo, reviews, plates, alertPreferences } = real

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

  // A ARENA VELHA SAIU DAQUI (03/ago). Este bloco traduzia a resposta do
  // /api/competitors (um raio só, ordem crua do Google) em posição, "faltam N
  // avaliações pro próximo" e lista de concorrentes. Era a SEGUNDA medição de
  // posição do painel — a que discordava do Hero e fazia o mesmo negócio ler
  // "1º de 13" em cima e "faltam 293 pro 2º lugar" na tarja. A GRADE é a fonte
  // única agora; quem precisa de posição lê `d.gridPos`, não daqui.
  //
  // Os campos continuam existindo como `null` DE PROPÓSITO: `...MOCK` espalha
  // os valores de demonstração por cima, e sem o null explícito o painel de um
  // negócio real voltaria a exibir o "#3 de 12" do mock como se fosse dele.

  return {
    ...MOCK,
    biz: { id: biz.id, name: biz.name, placeId: biz.place_id },
    kpis: {
      ...MOCK.kpis,
      rating: typeof rating === 'number' ? rating : MOCK.kpis.rating,
      reviewCount: typeof total === 'number' ? total : MOCK.kpis.reviewCount,
      // Sem dado real de ranking → null (NÃO cair no MOCK "#3 de 12", que
      // aparecia igual pra todos e mentia a posição no card do score StarTouch).
      rankingPos: null,
      totalCompetitors: null,
      nextGoal: null
    },
    hero: { reviewsToNext: null, progressPct: null },
    ranking: [],
    // capturePoints reais — array vazio se não tem placa ativa (empty state honesto)
    capturePoints: realCapturePoints,
    // Lista bruta das placas ativas (com código, channel_name, taps) — pro detalhamento na UI
    activePlates: activePlates,
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
      : [],  // negócio real sem reviews: empty state honesto (não MOCK "Carla Souza")
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
      photoUrl: bizInfo?.photoUrl || null,        // foto de capa real do Google (perfil completo)
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
    },
    // Preferências de alertas vindas do banco (Fase 2a). Shape compatível com AlertChannelsCard.
    alertChannels: alertPreferences ? {
      dashboard: { enabled: alertPreferences.dashboard_enabled !== false, locked: true },
      email: {
        enabled: !!alertPreferences.email_enabled,
        frequency: alertPreferences.email_frequency || 'realtime',
        emailTo: alertPreferences.email_to || ''
      },
      whatsapp: {
        enabled: !!alertPreferences.whatsapp_enabled,
        phone: alertPreferences.whatsapp_phone || '',
        criticalOnly: alertPreferences.whatsapp_critical_only !== false
      }
    } : MOCK.alertChannels
  }
}

// Tokens de cor — PAINEL-V3 (spec seção 2.2). O projeto não usa Tailwind (conflito
// registrado no relatório): os tokens vivem aqui no objeto T (usado pelos estilos
// inline) + em variáveis CSS no v2.css. As chaves LEGADAS (blue/green/amber/…)
// foram repontadas pros novos valores pra não quebrar os componentes existentes.
const T = {
  // Neutros
  bg:'#F8FAFC', surface:'#FFFFFF', border:'#E2E8F0',
  text:'#0F172A', textMid:'#475569', textDim:'#64748B', textMuted:'#64748B',
  // Semânticos (nomes da spec)
  primary:'#2563EB', primaryDark:'#1E40AF', primarySoft:'#EFF6FF',
  accent:'#F59E0B', success:'#10B981', danger:'#EF4444',
  // Legado → mesmos valores novos (compat com estilos inline existentes)
  blue:'#2563EB', blueDk:'#1E40AF', blueSoft:'#EFF6FF',
  green:'#10B981', greenSoft:'#ECFDF5',
  amber:'#F59E0B', amberSoft:'#FEF7E6', amberBg:'#FFFBEB',
  red:'#EF4444',
  // Sombra única sutil (spec 2.4)
  shadow:'0 1px 3px rgba(0,0,0,0.06)',
  shadowSm:'0 1px 3px rgba(0,0,0,0.06)'
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

// ── Medição do funil do convidado (anônimo) ──────────────────
// Dispara o evento no GA4 E grava no nosso banco (/api/track), pra alimentar o
// painel /admin/funil. anon_id = id aleatório do navegador (não identifica ninguém).
function anonId() {
  try {
    let id = localStorage.getItem('rz_anon')
    if (!id) { id = 'a' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('rz_anon', id) }
    return id
  } catch { return null }
}
function trackFunnel(step, meta) {
  try { if (typeof window !== 'undefined' && window.gtag) window.gtag('event', step, meta || {}) } catch {}
  try {
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ step, anon_id: anonId(), meta: meta || {} })
    }).catch(() => {})
  } catch {}
}

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
function Card({ children, style, padded = true, accent, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.surface,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      padding: padded ? 24 : 0,
      position: 'relative',
      overflow: 'hidden',
      ...(onClick && { cursor: 'pointer' }),
      ...(accent && { borderTop: `3px solid ${accent}` }),
      ...style
    }}>{children}</div>
  )
}
function Section({ children, style, id }) {
  return <div id={id} style={{ marginBottom: 24, scrollMarginTop: 100, ...style }}>{children}</div>
}
function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display:'inline-flex', gap:1, color:'#FBBC04', fontSize:size, lineHeight:1 }}>
      {[1,2,3,4,5].map(i => <Star key={i} size={13} strokeWidth={2} fill={i <= Math.round(rating) ? '#F59E0B' : 'none'} color={i <= Math.round(rating) ? '#F59E0B' : '#CBD5E1'} style={{ verticalAlign:'middle' }}/>)}
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
  { id: 'painel',       icon: 'chart', label: 'Painel',       pro: false },
  // TEMPORÁRIO: Alertas/Relatórios (Pro) escondidos até termos segurança pra
  // vender. Pra reexibir, descomente as 2 linhas abaixo.
  // (Concorrentes NÃO está aqui: a tela foi removida em 03/ago — ver a nota no
  // render. Reconstruir sobre a grade, não descomentar.)
  // { id: 'alertas',      icon: 'bell', label: 'Alertas',      pro: true },
  { id: 'avaliacoes',   icon: 'star', label: 'Avaliações',   pro: false },
  // { id: 'relatorios',   icon: 'trendup', label: 'Relatórios',   pro: true },
  { id: 'loja',         icon: 'bag', label: 'Loja',         pro: false }
]

// ─────────────────────────────────────────────────────────────
// Bottom Tab Bar — mobile (4 itens principais + Mais → bottom sheet)
// Spec: Nubank/Mercado Livre/Stripe app style.
// ─────────────────────────────────────────────────────────────
const MOBILE_PRIMARY_TABS = [
  { id: 'painel',       icon: 'home', label: 'Painel'       },
  { id: 'avaliacoes',   icon: 'star', label: 'Avaliações'   },
  { id: 'loja',         icon: 'bag', label: 'Loja'         },
  { id: 'more',         icon: 'menu',  label: 'Mais'         }
]

// ─────────────────────────────────────────────────────────────
// FAB de suporte WhatsApp — botão flutuante presente em todo /app
// ─────────────────────────────────────────────────────────────
function SupportFAB({ isMobile }) {
  const [hover, setHover] = React.useState(false)
  const [pulse, setPulse] = React.useState(true)
  // Some o pulse depois de 6s pra não distrair eternamente
  React.useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // Esconde ao rolar PRA BAIXO (leitura) e reaparece ao rolar pra cima / no topo.
  // Garante que o FAB não cubra elementos interativos dos cards durante o scroll.
  const [hidden, setHidden] = React.useState(false)
  React.useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY + 6 && y > 120) setHidden(true)
      else if (y < lastY - 6) setHidden(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const href = `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(SUPPORT_WA_DEFAULT_MSG)}`
  // No mobile sobe pra não colidir com a BottomTabBar (altura ~62 + safe-area)
  const bottom = isMobile
    ? 'calc(76px + env(safe-area-inset-bottom, 0px))'
    : 24
  const size = 52   // spec 2.5 — FAB reduzido pra 52px

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Falar com suporte StarTouch no WhatsApp ${SUPPORT_WA_DISPLAY}`}
      title={`Suporte StarTouch · WhatsApp ${SUPPORT_WA_DISPLAY}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed',
        right: isMobile ? 16 : 24,
        bottom,
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#25D366',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hover
          ? '0 12px 28px rgba(37,211,102,0.45), 0 4px 12px rgba(0,0,0,0.12)'
          : '0 8px 20px rgba(37,211,102,0.35), 0 2px 6px rgba(0,0,0,0.10)',
        transform: hidden
          ? 'translateY(160%)'
          : (hover ? 'translateY(-2px) scale(1.04)' : 'translateY(0) scale(1)'),
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'transform .22s ease, opacity .22s ease, box-shadow .18s ease',
        zIndex: 60,                                            // acima da BottomTabBar (50), abaixo de modais (100+)
        textDecoration: 'none'
      }}
    >
      {/* halo pulsante por alguns segundos no primeiro carregamento */}
      {pulse && (
        <span style={{
          position:'absolute', inset: 0, borderRadius: '50%',
          background:'#25D366', opacity: 0.35,
          animation: 'st-fab-pulse 1.6s ease-out infinite'
        }} />
      )}
      <style>{`
        @keyframes st-fab-pulse {
          0%   { transform: scale(1);    opacity: 0.35; }
          70%  { transform: scale(1.55); opacity: 0;    }
          100% { transform: scale(1.55); opacity: 0;    }
        }
      `}</style>
      {/* logo WhatsApp oficial (simplified) */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size * 0.55} height={size * 0.55} aria-hidden="true" style={{ position:'relative' }}>
        <path fill="currentColor" d="M16.001 3C9.373 3 4 8.373 4 15c0 2.252.624 4.36 1.706 6.165L4 29l8.06-1.667A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3Zm0 21.6c-1.747 0-3.4-.46-4.825-1.293l-.345-.205-4.78.988.999-4.654-.225-.359A9.55 9.55 0 0 1 6.4 15c0-5.293 4.308-9.6 9.601-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6Zm5.522-7.182c-.302-.151-1.792-.884-2.07-.985-.279-.101-.481-.151-.683.151-.202.302-.783.985-.96 1.187-.176.202-.353.227-.655.076-.302-.151-1.276-.47-2.43-1.5-.898-.8-1.504-1.79-1.681-2.093-.176-.302-.019-.466.132-.616.135-.135.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.076-.151-.683-1.647-.936-2.256-.247-.594-.498-.513-.683-.523l-.581-.01c-.202 0-.53.076-.806.378-.279.302-1.061 1.037-1.061 2.528 0 1.49 1.087 2.93 1.238 3.132.151.202 2.14 3.27 5.187 4.586.725.313 1.29.5 1.731.64.727.231 1.388.198 1.91.12.583-.087 1.792-.732 2.045-1.439.252-.706.252-1.31.176-1.439-.076-.126-.279-.202-.581-.353Z"/>
      </svg>
    </a>
  )
}

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
        const isLocked = false   // tudo free: sem selo na barra mobile
        return (
          <a
            key={tab.id}
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (isMore) { onOpenMore(); return }
              onChange(tab.id)  // Pro pro Free abre o preview borrado (upsell dentro)
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
            <span style={{ lineHeight: 1, marginBottom: 4, display:'inline-flex' }}><Ico name={tab.icon} size={24}/></span>
            <span style={{
              fontSize: 11.5, fontWeight: isActive ? 600 : 500,
              whiteSpace:'nowrap', textAlign:'center', maxWidth:'100%'
            }}>{tab.label}</span>
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
    // TEMPORÁRIO: Alertas/Relatórios (Pro) escondidos até termos segurança
    // pra vender. Pra reexibir, descomente as 2 linhas abaixo.
    // { label:'Alertas',     icon:'bell', tabId:'alertas',    pro: true  },
    // { label:'Relatórios',  icon:'chart', tabId:'relatorios', pro: true  },
    { label:'Loja',        icon:'cart', tabId:'loja'                   },
    { label:'Configurações', icon:'settings', tabId:'config', hash:'negocio' },
    { label:'Minha conta', icon:'user', tabId:'config', hash:'conta' },
    { label:'Central de ajuda', icon:'help', href:'/ajuda', external: true }
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
            const isLocked = false   // tudo free: sem selo PRO na lista
            // Item com link externo (ex: Central de ajuda → /ajuda em nova aba)
            const isExternal = !!it.external
            const targetHref = isExternal ? it.href : '#'
            return (
              <a
                key={i}
                href={targetHref}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener' : undefined}
                onClick={(e) => {
                  if (isExternal) { onClose(); return }                    // deixa o link abrir em nova aba
                  e.preventDefault()
                  onPick(it.tabId, it.hash)   // Pro pro Free abre o preview borrado
                  onClose()
                }}
                style={{
                  display:'flex', alignItems:'center', gap: 14,
                  padding:'14px 14px', borderRadius: 12, textDecoration:'none',
                  color: T.text, fontSize: 15, fontWeight: 500,
                  marginBottom: 2
                }}
              >
                <span style={{ width: 28, display:'inline-flex', justifyContent:'center' }}><Ico name={it.icon} size={22}/></span>
                <span style={{ flex: 1 }}>{it.label}</span>
                {isLocked && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing:'.05em',
                    background:'#FBBC04', color:'#78350F',
                    padding:'2px 7px', borderRadius: 5
                  }}>PRO</span>
                )}
                {!isLocked && !isExternal && <span style={{ color: T.textDim, fontSize: 18 }}>›</span>}
                {isExternal && <span style={{ color: T.textDim, fontSize: 14 }}>↗</span>}
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
              <span style={{ width: 28, display:'inline-flex', justifyContent:'center' }}><DoorOpen size={20}/></span>
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
      top: isMobile ? 58 : 70, // logo abaixo do header (header ficou mais alto com logo proeminente)
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
          const isLocked = false   // tudo free: sem selo PRO na navegação
          return (
            <a
              key={tab.id}
              ref={isActive ? activeRef : null}
              href="#"
              onClick={(e) => {
                // Aba Pro pro Free agora abre o PREVIEW borrado (com upsell dentro),
                // em vez de redirecionar pra /plano-pro.
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
              <span style={{ lineHeight: 1, display:'inline-flex' }}><Ico name={tab.icon} size={17}/></span>
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
        <div style={{ marginBottom: 20, color: T.primary, display:'flex', justifyContent:'center' }}><Ico name={icon} size={48}/></div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: T.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ fontSize: 15, color: T.textMid, margin: '0 0 28px', lineHeight: 1.6 }}>{desc}</p>
        {false ? (
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
            Em construção · liberado em breve
          </div>
        )}
      </Card>
    </div>
  )
}

// Preview Pro borrado — Free vê a tela cheia (com dados de demonstração) atrás
// de um vidro fosco + card de upsell, pra entender o que está perdendo.
function ProPreview({ tab, isMobile, children }) {
  const C = {
    concorrentes: { icon:'trophy', title:'Inteligência Competitiva', sub:'Veja quem disputa o ranking com você — e nunca seja pego de surpresa.',
      bullets:['Os nomes de quem está na sua frente','Aviso na hora quando alguém te ultrapassar','Quem está crescendo mais rápido','Evolução semana a semana'] },
    alertas: { icon:'bell', title:'Vigie seu ranking 24/7', sub:'O alerta de avaliação negativa já é seu, de graça. O Pro adiciona a vigilância do ranking — direto no seu email:',
      bullets:['Um concorrente te ultrapassou no ranking','Sua nota caiu — ou bateu um novo recorde','Resumo toda segunda: o que mudou e o que fazer'] },
    relatorios: { icon:'trendup', title:'Relatórios semanais', sub:'Toda segunda no seu email: sua evolução e o que fazer.',
      bullets:['Evolução de nota e posição','Comparativo com os concorrentes','Oportunidades pra crescer mais rápido'] }
  }[tab] || { icon:'lock', title:'Recurso Pro', sub:'', bullets:[] }

  return (
    <div style={{ position:'relative', maxHeight: 820, overflow:'hidden' }}>
      <div aria-hidden="true" style={{ filter:'blur(6px)', pointerEvents:'none', userSelect:'none', opacity:0.9 }}>
        {children}
      </div>
      <div style={{
        position:'absolute', inset:0, display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding: isMobile ? '36px 16px' : '60px 24px',
        background:'linear-gradient(180deg, rgba(247,248,250,0.45) 0%, rgba(247,248,250,0.88) 55%)'
      }}>
        <Card style={{ maxWidth: 440, textAlign:'center', padding: isMobile ? '28px 22px' : '34px 30px', boxShadow:'0 16px 48px rgba(15,23,42,0.20)' }}>
          <span style={{ display:'inline-block', fontSize: 11, fontWeight: 800, letterSpacing:'0.08em', background:'#FBBC04', color:'#78350F', padding:'3px 9px', borderRadius: 6, marginBottom: 12 }}>PRO</span>
          <div style={{ lineHeight: 1, marginBottom: 10, color: T.primary }}><Ico name={C.icon} size={40}/></div>
          <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 21, fontWeight: 800, color: T.text, margin:'0 0 8px', letterSpacing:'-0.02em' }}>{C.title}</h2>
          <p style={{ fontSize: 14, color: T.textMid, lineHeight: 1.55, margin:'0 0 16px' }}>{C.sub}</p>
          <ul style={{ listStyle:'none', padding: 0, margin:'0 0 20px', textAlign:'left', display:'inline-block' }}>
            {C.bullets.map((b, i) => (
              <li key={i} style={{ display:'flex', alignItems:'flex-start', gap: 8, fontSize: 13.5, color: T.text, marginBottom: 8 }}>
                <span style={{ color: T.green, flexShrink: 0, display:'inline-flex' }}><Check size={14} strokeWidth={3}/></span><span>{b}</span>
              </li>
            ))}
          </ul>
          <div>
            <a href="/plano-pro" style={{
              display:'inline-flex', alignItems:'center', gap: 8, background: T.blue, color:'#fff',
              padding:'13px 26px', borderRadius: 11, fontSize: 14.5, fontWeight: 700, textDecoration:'none',
              boxShadow:'0 6px 18px rgba(26,115,232,0.32)'
            }}>Desbloquear no Plano Pro</a>
          </div>
          <p style={{ fontSize: 11.5, color: T.textDim, marginTop: 12 }}>Tudo isso com os dados reais do seu negócio.</p>
        </Card>
      </div>
    </div>
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
        }}><Ico name={alert.icon} size={18}/></div>
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
        display:'grid', placeItems:'center', flexShrink: 0, color: enabled ? T.primary : T.textDim
      }}><Ico name={icon} size={18}/></div>
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

// Card 'Onde você quer ser avisado?' — agora salva no banco via /api/alerts?action=preferences
function AlertChannelsCard({ channels, isReal, userEmail }) {
  const [local, setLocal] = React.useState({
    emailEnabled: channels.email.enabled,
    emailFreq: channels.email.frequency,
    emailTo: channels.email.emailTo || userEmail || '',
    whatsappEnabled: channels.whatsapp.enabled,
    whatsappPhone: channels.whatsapp.phone || ''
  })
  const [saving, setSaving] = React.useState(false)
  const [notice, setNotice] = React.useState('')

  async function persist(next) {
    if (!isReal) return  // em demo, só state local (sem chamada de rede)
    setSaving(true); setNotice('')
    try {
      const body = {
        dashboard_enabled: true,
        email_enabled: next.emailEnabled,
        email_frequency: next.emailFreq,
        email_to: next.emailTo || userEmail || null,
        whatsapp_enabled: next.whatsappEnabled,
        whatsapp_phone: next.whatsappPhone || null
      }
      await apiCall('/api/alerts?action=preferences', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      setNotice('ok:Preferências salvas')
      setTimeout(() => setNotice(''), 2200)
    } catch (e) {
      setNotice('err:' + (e.message || 'Erro ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  function update(patch) {
    const next = { ...local, ...patch }
    setLocal(next)
    persist(next)
  }

  return (
    <Card padded={false} style={{ padding: 18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <span style={{ display:'inline-flex', color: T.primary }}><Bell size={18}/></span>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
            Onde você quer ser avisado?
          </h3>
        </div>
        {saving && <span style={{ fontSize: 11, color: T.textDim }}>Salvando…</span>}
      </div>
      <p style={{ fontSize: 12.5, color: T.textMid, margin:'0 0 6px', lineHeight: 1.45 }}>
        Escolha por onde receber os alertas. As mudanças são salvas automaticamente.
      </p>

      <ChannelRow
        icon="monitor"
        name="No painel"
        desc="Alertas ficam visíveis na aba Alertas do painel · sempre ligado"
        enabled={true}
        locked={true}
      />

      <ChannelRow
        icon="mail"
        name="Email"
        desc="Receba os alertas no seu email — funciona até com o painel fechado."
        enabled={local.emailEnabled}
        onToggle={() => update({ emailEnabled: !local.emailEnabled })}
      >
        {local.emailEnabled && (
          <>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap', marginBottom: 8 }}>
              {[
                { key:'realtime',       label:'Tempo real' },
                { key:'daily_digest',   label:'Resumo diário' },
                { key:'weekly_digest',  label:'Resumo semanal' }
              ].map(opt => {
                const isActive = local.emailFreq === opt.key
                return (
                  <button key={opt.key} onClick={() => update({ emailFreq: opt.key })}
                    style={{
                      fontSize: 11.5, fontWeight: 600, padding:'5px 10px', borderRadius: 6,
                      border:'1px solid', borderColor: isActive ? T.blue : T.border,
                      background: isActive ? T.blueSoft : '#fff',
                      color: isActive ? T.blueDk : T.textMid, cursor:'pointer'
                    }}>{opt.label}</button>
                )
              })}
            </div>
            <input
              type="email"
              value={local.emailTo}
              onChange={e => setLocal({ ...local, emailTo: e.target.value })}
              onBlur={() => persist(local)}
              placeholder={userEmail || 'seu@email.com'}
              style={{
                width:'100%', padding:'8px 10px', fontSize: 13,
                border:'1px solid '+T.border, borderRadius: 6, outline:'none', boxSizing:'border-box'
              }}
            />
          </>
        )}
      </ChannelRow>

      {/* WhatsApp: integração ainda não pronta — escondido da UI por enquanto.
          Quando ligar (Twilio/WAPI), basta reativar este bloco. Schema do banco mantém o campo. */}

      {notice && (
        <div style={{
          marginTop: 10, padding:'7px 10px', fontSize: 12, fontWeight: 600,
          background: notice.startsWith('ok:') ? T.greenSoft : '#FEF2F2',
          color: notice.startsWith('ok:') ? '#065F46' : T.red,
          borderRadius: 6, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap: 6
        }}>
          {notice.startsWith('ok:') ? <Check size={14} strokeWidth={2.4}/> : <AlertTriangle size={14} strokeWidth={2.4}/>}
          {notice.replace(/^(ok|err):/, '')}
        </div>
      )}

      {/* Botão de teste: envia 1 alerta exemplo agora pelos canais ativos */}
      {isReal && (local.emailEnabled || local.whatsappEnabled) && (
        <button
          onClick={async () => {
            setSaving(true); setNotice('')
            try {
              const r = await apiCall('/api/alerts?action=test', { method:'POST', body: '{}' })
              const sent = r.results?.email?.sent
              const skipped = r.results?.email?.skipped
              const errMsg = r.results?.email?.error
              if (sent) setNotice('ok:Alerta de teste enviado pra ' + (r.results.email.to))
              else if (errMsg) setNotice('err:' + errMsg)
              else if (skipped) setNotice('err:' + (r.results.email.reason || 'Envio pulado'))
              else setNotice('Tentei enviar — sem resposta clara do servidor.')
              setTimeout(() => setNotice(''), 6000)
            } catch (e) {
              setNotice('err:' + (e.message || 'Erro ao enviar teste'))
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          style={{
            marginTop: 12, width:'100%',
            background: '#fff', color: T.blue, border:`1.5px solid ${T.blue}`,
            borderRadius: 8, padding:'10px 14px',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}
        >Enviar alerta de teste agora</button>
      )}

      <div style={{
        marginTop: 14, padding: 12, background: T.blueSoft, borderRadius: 8,
        fontSize: 12.5, color: T.blueDk, lineHeight: 1.5
      }}>
        <b>Dica:</b> deixe email ligado pra não perder mudança importante no ranking — assim você sabe quando algo muda mesmo sem abrir o painel.
      </div>
    </Card>
  )
}

function AlertsScreen({ data, isMobile, isReal, userEmail }) {
  const [filter, setFilter] = React.useState('all')

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
          Alertas em tempo real
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
            // Estado honesto: o alerta de avaliação negativa JÁ está ativo (por email);
            // os de ranking/concorrente estão chegando. Sem alertas falsos no feed.
            <Card style={{ textAlign:'center', padding: 40 }}>
              <div style={{ marginBottom: 14, color: T.success, display:'flex', justifyContent:'center' }}><Bell size={48}/></div>
              <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
                Você está protegido
              </h2>
              <div style={{
                display:'inline-flex', alignItems:'center', gap: 6, flexWrap:'wrap', justifyContent:'center',
                fontSize: 12, fontWeight: 700, color: '#137333',
                background: T.greenSoft, padding:'6px 12px', borderRadius: 999, marginBottom: 14
              }}>Avaliação negativa · Resumo semanal do ranking</div>
              <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, margin:'0 auto 18px', maxWidth: 480 }}>
                Avaliação ruim nova? A gente te avisa <strong>por email</strong> em poucas horas, pra responder e recuperar o cliente.
                E toda segunda chega o <strong>resumo do seu ranking</strong> — quem te passou, se a nota mudou e o que fazer.
              </p>
              <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>
                Os alertas chegam no seu email. Confira no card ao lado se o email está ligado.
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
          <AlertChannelsCard channels={data.alertChannels} isReal={isReal} userEmail={userEmail}/>
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
    { key:'weekly',  label:'Semanal', icon:'calendar' },
    { key:'monthly', label:'Mensal',  icon:'calendarMonth' }
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
            <span style={{ display:'inline-flex', marginRight:2 }}><Ico name={t.icon} size={14}/></span>{t.label}
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
            {report.sentAt}
          </div>
        </div>
        <div style={{ display:'flex', gap: 8, flexShrink: 0 }}>
          <button style={{
            background:'#fff', color: T.blueDk, border:'none', borderRadius: 8,
            padding:'10px 16px', fontSize: 13, fontWeight: 600, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap: 6
          }}>Baixar PDF</button>
          <button style={{
            background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.3)',
            borderRadius: 8, padding:'10px 16px', fontSize: 13, fontWeight: 600, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap: 6
          }}>Enviar agora</button>
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
    { label:'Novas avaliações', value: summary.newReviews,      delta: summary.newReviewsDelta, suffix:' vs anterior', icon:'star' },
    { label:'Nota atual',       value: summary.currentRating.toFixed(1), delta: summary.ratingDelta, suffix:'',  isFloat: true, icon:'trendup' },
    { label:'Posição no rank',  value: `${summary.currentPosition}º`, delta: summary.positionDelta, suffix:' pos.', invert: false, icon:'trophy' },
    { label:'Próximo concorrente', value: `-${Math.abs(summary.competitorDelta)} ${Math.abs(summary.competitorDelta) === 1 ? 'avaliação' : 'avaliações'}`, delta: null, sub:'mais perto que antes', icon:'target' }
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12 }}>
      {items.map((it, i) => (
        <Card key={i} padded={false} style={{ padding: isMobile ? 14 : 18 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
            <span style={{ display:'inline-flex' }}><Ico name={it.icon} size={14}/></span>
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
      <ReportSectionTitle icon="trendup" title="Evolução da nota" sub={`Sua nota nos últimos ${mode === 'weekly' ? '7 dias' : '12 meses'}.`}/>
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
      <ReportSectionTitle icon="star" title="Avaliações em destaque" sub="As que mais movimentaram sua reputação no período."/>
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
      <ReportSectionTitle icon="trophy" title="Movimentação no ranking" sub="O que mudou na sua categoria no período."/>
      <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
        {moves.map((m, i) => {
          const c = colors[m.type] || colors.up
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap: 10, padding:'10px 12px',
              background: c.bg, border:'1px solid '+c.border, borderRadius: 8,
              fontWeight: m.highlight ? 700 : 500
            }}>
              <span style={{ color: c.dot, width: 18, display:'inline-flex', justifyContent:'center' }}><Ico name={m.icon} size={16}/></span>
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
      <ReportSectionTitle icon="search" title="Você vs concorrentes" sub="Comparativo direto com os 4 mais próximos."/>
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
      <ReportSectionTitle icon="lightbulb" title="Oportunidades pra essa semana" sub="O que fazer agora pra crescer mais rápido."/>
      <ul style={{ listStyle:'none', padding: 0, margin: 0, display:'flex', flexDirection:'column', gap: 10 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display:'flex', gap: 10, alignItems:'flex-start', fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, lineHeight: 1.4, display:'inline-flex' }}><Ico name={it.icon} size={16}/></span>
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
      <ReportSectionTitle icon="settings" title="Configurar envio" sub="Receba este relatório direto no seu email."/>
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
            Relatórios automáticos
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
            <div style={{ marginBottom: 14, color: T.primary, display:'flex', justifyContent:'center' }}><Inbox size={48}/></div>
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
            }}>BETA · relatórios em preparação</div>
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
  const imgs = (p.images && p.images.length) ? p.images : [p.img]
  const [active, setActive] = React.useState(imgs[0])
  return (
    <Card padded={false} style={{ padding: 0, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', opacity: p.soldOut ? 0.9 : 1 }}>
      {/* Foto principal */}
      <div style={{
        position:'relative', height: 190, background:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        borderBottom:'1px solid '+T.border, padding: 12
      }}>
        <img src={active} alt={p.name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', filter: p.soldOut ? 'grayscale(.3)' : 'none' }}/>
        {p.soldOut && (
          <span style={{ position:'absolute', top: 10, left: 10, background: T.text, color:'#fff', fontSize: 10, fontWeight: 800, letterSpacing:'.06em', padding:'4px 8px', borderRadius: 6 }}>ESGOTADO</span>
        )}
      </div>
      {/* Miniaturas */}
      {imgs.length > 1 && (
        <div style={{ display:'flex', gap: 6, padding:'10px 12px 0', flexWrap:'wrap' }}>
          {imgs.map((src, i) => (
            <button key={i} type="button" onClick={() => setActive(src)} aria-label={`Ver foto ${i + 1}`} style={{
              width: 44, height: 44, borderRadius: 8, overflow:'hidden', padding: 0, cursor:'pointer',
              border:`1.5px solid ${active === src ? T.blue : T.border}`, background:'#fff', transition:'border-color .15s'
            }}>
              <img src={src} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            </button>
          ))}
        </div>
      )}
      {/* Corpo */}
      <div style={{ padding: 16, display:'flex', flexDirection:'column', flex: 1 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: T.text, margin:'0 0 4px' }}>{p.name}</h3>
        {p.price && (
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text, margin:'0 0 8px', letterSpacing:'-0.01em' }}>
            {p.price}<span style={{ fontSize: 11, fontWeight: 500, color: T.textDim }}> / unidade</span>
          </div>
        )}
        <p style={{ fontSize: 12.5, color: T.textMid, margin:'0 0 12px', lineHeight: 1.5 }}>{p.desc}</p>
        {p.specs?.length > 0 && (
          <ul style={{ listStyle:'none', margin:'0 0 14px', padding: 0, display:'flex', flexDirection:'column', gap: 6 }}>
            {p.specs.map((s, i) => (
              <li key={i} style={{ fontSize: 12, color: T.textMid, display:'flex', gap: 7, alignItems:'flex-start', lineHeight: 1.4 }}>
                <span style={{ color: T.green, flexShrink: 0, display:'inline-flex' }}><Check size={14} strokeWidth={3}/></span><span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ flex: 1 }}/>
        {p.soldOut ? (
          <span style={{
            display:'block', background: T.bg, color: T.textDim, borderRadius: 9,
            padding:'10px 14px', fontSize: 13, fontWeight: 700, textAlign:'center', border:`1px solid ${T.border}`
          }}>Esgotado</span>
        ) : (
          <a href={p.buyUrl} style={{
            display:'block', background: T.blue, color:'#fff', textDecoration:'none',
            borderRadius: 9, padding:'10px 14px', fontSize: 13, fontWeight: 700, textAlign:'center'
          }}>Comprar →</a>
        )}
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
        }}><Ico name={k.icon} size={24}/></div>
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
          Loja StarTouch
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
            { icon:'truck', t:'Envio rápido', d:'Despacho em 24h pela Jadlog/Correios' },
            { icon:'shield', t:'Garantia 90 dias', d:'Defeito de fabricação trocamos sem custo' },
            { icon:'phone', t:'Suporte WhatsApp', d:SUPPORT_WA_DISPLAY+' — tira dúvidas direto com a gente' }
          ].map((it, i) => (
            <div key={i}>
              <div style={{ marginBottom: 4, color: T.primary }}><Ico name={it.icon} size={26}/></div>
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
          <span style={{ display:'inline-flex', color: T.primary }}><Ico name={icon} size={18}/></span>{title}
        </h2>
        {sub && <div style={{ fontSize: 13, color: T.textMid }}>{sub}</div>}
      </div>
      {children}
    </Card>
  )
}

function AccountSection({ user }) {
  return (
    <ConfigSectionCard anchor="conta" icon="user" title="Minha conta" sub="Seus dados pessoais e acesso.">
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

function BusinessSection({ biz, googleCategory, categoryOverride, showDebug }) {
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
      setSavedNotice('ok:Categoria salva no seu perfil · sincroniza em todos os dispositivos. Recarregando…')
      setTimeout(() => window.location.reload(), 1100)
    } catch (e) {
      setSavedNotice('err:Erro ao salvar: ' + (e.message || 'tente de novo'))
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
      setSavedNotice('ok:Voltando pra categoria automática do Google…')
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setSavedNotice('err:Erro: ' + (e.message || 'tente de novo'))
      setSaving(false)
    }
  }

  return (
    <ConfigSectionCard anchor="negocio" icon="building" title="Dados do negócio" sub="O que aparece nos seus dispositivos, relatórios e alertas.">

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
            marginTop: 8, padding:'8px 12px',
            background: savedNotice.startsWith('err:') ? '#FEF2F2' : T.greenSoft,
            border:'1px solid ' + (savedNotice.startsWith('err:') ? '#FECACA' : '#A7F3D0'),
            borderRadius: 8, fontSize: 12.5, color: savedNotice.startsWith('err:') ? T.red : '#065F46',
            fontWeight: 600, display:'flex', alignItems:'center', gap: 6
          }}>
            {savedNotice.startsWith('err:') ? <AlertTriangle size={14} strokeWidth={2.4}/> : <Check size={14} strokeWidth={2.4}/>}
            {savedNotice.replace(/^(ok|err):/, '')}
          </div>
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
        }}>Trocar negócio vinculado</a>
      </div>

      <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
        <a href={biz.gmapsUrl} target="_blank" rel="noreferrer" style={{
          background:'#fff', color: T.blue, border:'1px solid '+T.border, borderRadius: 8,
          padding:'10px 16px', fontSize: 13, fontWeight: 600, textDecoration:'none',
          display:'inline-flex', alignItems:'center'
        }}>Ver no Google Maps ↗</a>
      </div>

      {/* Debug discreto — só admins (pra não confundir usuário comum com dado técnico) */}
      {showDebug && <details style={{ marginTop: 18, fontSize: 11.5, color: T.textDim }}>
        <summary style={{ cursor:'pointer' }}>Diagnóstico (debug)</summary>
        <pre style={{
          background: T.bg, border:'1px solid '+T.border, borderRadius: 6,
          padding: 10, marginTop: 8, fontSize: 11, overflowX:'auto', lineHeight: 1.5
        }}>
{`place_id:                  ${JSON.stringify(biz?.placeId || null)}
biz.name:                  ${JSON.stringify(biz?.name || null)}
category_override (banco): ${JSON.stringify(savedCustom || null)}
googleCategory (auto):     ${JSON.stringify(googleCategory || null)}
activeCategory (em uso):   ${JSON.stringify(activeCategory)}
localStorage.rz_activity:  ${typeof window !== 'undefined' ? JSON.stringify(localStorage.getItem('rz_activity')) : '—'}
build:                     ${typeof window !== 'undefined' ? (document.querySelector('script[src*="v2-"]')?.src?.match(/v2-([^.]+)/)?.[1] || '?') : '—'}
hora local:                ${new Date().toISOString()}`}
        </pre>
      </details>}
    </ConfigSectionCard>
  )
}

function BillingSection({ billing, plan }) {
  return (
    <ConfigSectionCard anchor="plano" icon="card" title="Plano e cobrança" sub="Seu plano atual, próxima cobrança e histórico de pagamentos.">
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
            <span style={{
              background: T.greenSoft, color:'#137333', borderRadius: 9,
              padding:'10px 18px', fontSize: 13.5, fontWeight: 700
            }}>Todos os recursos liberados</span>
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

function ConfigScreen({ data, isMobile, plan, isReal, isAdmin }) {
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
          Configurações
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
          <span style={{ lineHeight: 1, flexShrink: 0, display:'inline-flex', color: T.accent }}><Construction size={18}/></span>
          <div style={{ fontSize: 12.5, color: T.blueDk, lineHeight: 1.45 }}>
            <b>Modo leitura.</b> Seus dados reais aparecem abaixo — a edição completa (alterar nome, endereço, método de pagamento) chega na próxima atualização.
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
        <AccountSection user={data.user}/>
        <BusinessSection biz={data.businessInfo} googleCategory={data.googleCategory} categoryOverride={data.categoryOverride} showDebug={isAdmin}/>
        <BillingSection billing={data.billing} plan={plan}/>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// Header — agora com dropdown do avatar
// ─────────────────────────────────────────────────────────────
function Header({ bizName, plan, isMobile, onNavigate, user, onLogout, demoMode, guest = false, signupUrl = null }) {
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
      padding: isMobile ? '10px 16px' : '12px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8,
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255,255,255,0.85)'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 10 : 14, minWidth: 0 }}>
        {/* Logo — dominante visualmente (era pequeno demais antes) */}
        <a href="/" style={{ display:'inline-flex', alignItems:'center', textDecoration:'none', flexShrink: 0 }}>
          <img src="/startouch-logo-dark.png" alt="StarTouch" style={{ height: isMobile ? 38 : 46, width:'auto' }}/>
        </a>
        {!isMobile && <div style={{ width: 1, height: 28, background: T.border }}/>}
        {/* Nome do negócio — secundário (com label sutil pra hierarquia clara) */}
        <div style={{ display:'flex', flexDirection:'column', minWidth: 0, gap: 1 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: T.textDim, letterSpacing:'.06em', textTransform:'uppercase' }}>Negócio</span>
          <span title={bizName} style={{ fontWeight: 600, fontSize: isMobile ? 12.5 : 13.5, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight: 1.2, maxWidth: isMobile ? 180 : 280 }}>{bizName}</span>
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

        {/* Botão de ajuda (desktop only — mobile usa o MoreSheet) */}
        {!isMobile && (
          <a href="/ajuda" target="_blank" rel="noopener"
            title="Abrir central de ajuda em nova aba"
            aria-label="Abrir central de ajuda"
            style={{
              display:'inline-flex', alignItems:'center', gap: 6,
              padding:'7px 12px 7px 10px', borderRadius: 8,
              background:'transparent', color: T.textMid,
              border:'1px solid '+T.border, textDecoration:'none',
              fontSize: 13, fontWeight: 600, transition:'all .15s',
              whiteSpace:'nowrap'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = T.blueSoft
              e.currentTarget.style.color = T.blue
              e.currentTarget.style.borderColor = T.blue
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = T.textMid
              e.currentTarget.style.borderColor = T.border
            }}
          >
            <span aria-hidden="true" style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width: 18, height: 18, borderRadius:'50%',
              background:'currentColor', color:'#fff', fontSize: 11, fontWeight: 800
            }}>?</span>
            <span>Ajuda</span>
          </a>
        )}

        {/* Avatar clicável — neutro quando convidado (sem conta ainda) */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={guest ? 'Menu do visitante' : 'Menu da conta'}
          style={{
            width: 32, height: 32, borderRadius:'50%', background: guest ? T.textDim : '#1A73E8', color:'#fff',
            fontWeight: 700, fontSize: guest ? 15 : 12, display:'flex', alignItems:'center', justifyContent:'center',
            border:'none', cursor:'pointer', padding: 0,
            boxShadow: open ? '0 0 0 3px '+T.blueSoft : 'none', transition:'box-shadow .15s'
          }}>{guest ? <User size={18}/> : initials}</button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', right: 0,
            background: T.surface, border:'1px solid '+T.border, borderRadius: 12,
            boxShadow:'0 8px 32px -4px rgba(15,23,42,.18)',
            minWidth: 240, padding: 6, zIndex: 60
          }}>
            {guest ? (
              <>
                <div style={{ padding:'8px 12px', borderBottom:'1px solid '+T.border, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Visitante</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>Você ainda não tem conta</div>
                </div>
                <a href={signupUrl || '/ativar?from=web'}
                  onClick={() => setOpen(false)}
                  style={{
                    display:'flex', alignItems:'center', width:'100%',
                    padding:'9px 12px', textDecoration:'none',
                    fontSize: 13, fontWeight: 600, color: T.blue, gap: 8, borderRadius: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Criar conta grátis</a>
                <a href="/app?login=1"
                  onClick={() => setOpen(false)}
                  style={{
                    display:'flex', alignItems:'center', width:'100%',
                    padding:'9px 12px', textDecoration:'none',
                    fontSize: 13, color: T.text, gap: 8, borderRadius: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Entrar</a>
                <div style={{ borderTop:'1px solid '+T.border, marginTop: 4, paddingTop: 4 }}>
                  <a href="/ajuda" target="_blank" rel="noopener"
                    onClick={() => setOpen(false)}
                    style={{
                      display:'flex', alignItems:'center', width:'100%',
                      padding:'9px 12px', textDecoration:'none',
                      fontSize: 13, color: T.text, gap: 8, borderRadius: 6
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >Central de ajuda <span style={{ marginLeft:'auto', color: T.textDim, fontSize: 11 }}>↗</span></a>
                </div>
              </>
            ) : (
              <>
            <div style={{ padding:'8px 12px', borderBottom:'1px solid '+T.border, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{displayName}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>{displayEmail}</div>
              {demoMode && (
                <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, marginTop: 4, letterSpacing:'.05em' }}>MODO DEMO</div>
              )}
            </div>

            {[
              { label:'Minha conta',       anchor:'conta'   },
              { label:'Dados do negócio',  anchor:'negocio' },
              { label:'Plano e cobrança',  anchor:'plano'   }
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
              <a href="/ajuda" target="_blank" rel="noopener"
                onClick={() => setOpen(false)}
                style={{
                  display:'flex', alignItems:'center', width:'100%',
                  padding:'9px 12px', textDecoration:'none',
                  fontSize: 13, color: T.text, gap: 8, borderRadius: 6
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Central de ajuda <span style={{ marginLeft:'auto', color: T.textDim, fontSize: 11 }}>↗</span></a>
              <a href="/" onClick={handleLogout} style={{
                display:'flex', alignItems:'center', width:'100%',
                padding:'9px 12px', textDecoration:'none',
                fontSize: 13, color: T.red, gap: 8, borderRadius: 6, cursor:'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Sair</a>
            </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// KPI Cards
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, onClick }) {
  return (
    <Card style={{ padding: 20 }} onClick={onClick}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 12 }}>
        <span style={{ display:'inline-flex', color: T.primary }}><Ico name={icon} size={18}/></span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: T.textMid }}>{label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginBottom: 5, flexWrap:'wrap' }}>
        <span style={{ fontFamily:"'Inter', sans-serif", fontSize: 32, fontWeight: 700, color: T.text, letterSpacing:'-0.025em', lineHeight: 1 }}>{value}</span>
        {trend != null && <Trend value={trend} />}
      </div>
      <p style={{ fontSize: 12, color: onClick ? T.blue : T.textDim, margin: 0, fontWeight: onClick ? 600 : 400 }}>{sub}</p>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Bloco 1 — HERO (placar de 5 segundos). Spec seção 3, Bloco 1.
// Anel de score SVG (cor por faixa) + posição no ranking + mini-cards.
// ─────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 128 }) {
  const stroke = 11
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const s = Math.max(0, Math.min(100, Math.round(score || 0)))
  const color = s >= 75 ? T.success : s >= 50 ? T.accent : T.danger
  return (
    <div style={{ position:'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - s/100)} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:'stroke-dashoffset .7s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize: size > 110 ? 44 : 36, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing:'-0.02em' }}>{s}</span>
      </div>
    </div>
  )
}

function HeroBlock({ d, position, gridPos, demoMode, isMobile, onScoreDetails, onSeeCompetitors }) {
  const score = calcStarTouchScore(d)
  // Coluna B consome a MESMA fonte do ranking (lente "Bem perto de você") — não o
  // d.kpis.rankingPos, que ficava null e mostrava placeholder mesmo com ranking cheio.
  const pos = position?.rank
  const total = position?.total
  const posDelta = demoMode ? 2 : null   // sem histórico real → oculta variação (spec 6.4)
  const showPos = !!(position && position.inResults && pos != null)
  const notClassified = !!(position && !position.inResults)   // tem lente, mas o Places não retorna o negócio
  const link = { display:'inline-flex', alignItems:'center', gap: 3, fontSize: 12.5, fontWeight: 600, color: T.primary, textDecoration:'none', cursor:'pointer', background:'none', border:'none', padding: 0, fontFamily:'inherit' }
  return (
    <Card>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: isMobile ? 10 : 20 }}>
        {/* Coluna A — Score StarTouch (a estrela do painel) */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap: 8, borderRight:`1px solid ${T.border}`, paddingRight: isMobile ? 8 : 16 }}>
          <ScoreRing score={score} size={isMobile ? 104 : 128}/>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>Score StarTouch</div>
          <button onClick={onScoreDetails} style={link}>Por que {score}? Ver o que falta <ChevronRight size={14}/></button>
        </div>
        {/* Coluna B — Posição no ranking. Fonte preferida: GRADE (posição média
            real de 5 pontos). Sem grade ainda, cai na lente antiga (fallback).

            Mostra a MÉDIA das 5 posições, não o ordinal da lista agregada. A
            grade é centrada na porta do negócio, então o dono é sempre o mais
            perto de todos os 5 pontos e o vizinho a 1km é sempre o mais longe:
            o ordinal favorece quem está no centro. Medido: Sankayo e Iroha
            (1,16km de distância) davam AMBOS "#1", cada um na própria grade —
            numa arena neutra o Iroha ganha por larga margem. A média (Sankayo
            3,2 · Iroha 1,4) é o número que não mente. */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap: 6, paddingLeft: isMobile ? 4 : 8 }}>
          {gridPos ? (
            gridPos.coverage > 0 && gridPos.score != null ? (
              <>
                {/* QUAL NÚMERO VAI GRANDE — histórico das tentativas, pra não
                    repetir nenhuma:
                      1ª (jul): posição média penalizada. A Michelli via "18,0" e
                         leu "sou o 18º" — 63 dos 90 pontos vinham de ausência.
                      2ª (jul): cobertura sempre. A bikeweb, a MELHOR do bairro,
                         via "5 de 5 pontos onde você aparece" — prêmio de
                         participação. Ricardo: "está espantando clientes".
                      3ª (27/jul): ordinal quando a cobertura era cheia ("1º de
                         9"). Caiu em 01/ago: o teste de calibragem mostrou que
                         o ordinal é 1 pra 17 de cada 20 negócios.
                      4ª (01/ago, atual): a POSIÇÃO média — o único número que
                         sobreviveu ao teste (bate com o Google real, erro de 1
                         lugar) — com a cobertura do TOP 3 como linha de apoio. */}
                {/* O "Xº de N" MORREU AQUI (01/ago). O teste de calibragem com 20
                    negócios reais mostrou que ele não media nada: 17 saíram "1º",
                    e 8 desses nem estavam no top 3 do Google. A causa é estrutural
                    — a grade é centrada na porta do dono, então ele é o único
                    perto dos 5 pontos e a punição por ausência cai só nos
                    concorrentes. Não tinha conserto de fórmula; tinha que sair.
                    Duas barbearias a 1,3 km recebiam as duas "1º lugar".

                    No lugar dele vai o número que sobreviveu ao teste: em que
                    lugar o Google de fato mostra o negócio. E, como manchete de
                    apoio, quantos dos pontos medidos o colocam no BLOCO DOS 3
                    PRIMEIROS — que é o que o Google exibe e o que o cliente vê
                    sem rolar a tela. Ser 4º é quase ser 20º. */}
                {(() => {
                  // `avg` (lugar onde APARECE), não `score` (que já embute a
                  // punição por ausência). O score punido no topo brigava com a
                  // lista logo abaixo: 8,4 aqui e a linha dele em 1º lá. A
                  // ausência não sumiu da tela — virou a linha de cobertura.
                  const media = gridPos.avg != null ? gridPos.avg : gridPos.score
                  const cor = media <= 3 ? T.success : media <= 10 ? T.accent : T.danger
                  return (
                    <>
                      <div style={{ fontSize: isMobile ? 40 : 48, fontWeight: 800, color: cor, lineHeight: 1, letterSpacing:'-0.02em' }}>
                        {media.toFixed(1).replace('.', ',')}
                        <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: T.textMuted }}>º lugar</span>
                      </div>
                      {/* UMA LINHA SÓ (03/ago, decisão do Ricardo). Eram três:
                          o que o número é, pra qual busca, e em quantos lugares
                          ele fica no top 3. Explicação demais pra uma manchete —
                          o dono só precisa saber que aquele número é a colocação
                          dele. O detalhe (a busca medida, os 5 lugares, quem
                          está na frente) continua logo abaixo, no bloco de
                          concorrentes, pra quem quiser ir fundo. */}
                      <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.45 }}>é a colocação média da sua empresa no Google Meu Negócio</div>
                    </>
                  )
                })()}
                <button onClick={onSeeCompetitors} style={link}>Ver concorrentes <ChevronRight size={14}/></button>
              </>
            ) : (
              <>
                <div style={{ display:'inline-flex', alignItems:'center', gap: 6, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: T.accent, lineHeight: 1.1, letterSpacing:'-0.01em' }}>
                  <AlertTriangle size={isMobile ? 20 : 22}/> Fora da lista
                </div>
                <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.4 }}>Testamos {gridPos.measured} lugares ao redor do seu endereço. Em nenhum deles você aparece pra quem busca "{gridPos.term}".</div>
                <button onClick={onSeeCompetitors} style={{ ...link, color: T.accent }}>Ver concorrentes <ChevronRight size={14}/></button>
              </>
            )
          ) : showPos ? (
            <>
              <div style={{ fontSize: isMobile ? 40 : 48, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing:'-0.02em' }}>#{pos}</div>
              <div style={{ fontSize: 13, color: T.textMuted }}>de {total} negócios {raioTxt((position?.radiusKm || 1) * 1000)}</div>
              {posDelta != null && (
                <div style={{ display:'inline-flex', alignItems:'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: posDelta >= 0 ? T.success : T.danger }}>
                  {posDelta >= 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}
                  {posDelta >= 0 ? '+' : ''}{posDelta} vs. semana passada
                </div>
              )}
              <button onClick={onSeeCompetitors} style={link}>Ver concorrentes <ChevronRight size={14}/></button>
            </>
          ) : notClassified ? (
            <>
              <div style={{ display:'inline-flex', alignItems:'center', gap: 6, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: T.accent, lineHeight: 1.1, letterSpacing:'-0.01em' }}>
                <AlertTriangle size={isMobile ? 20 : 22}/> Fora da lista
              </div>
              <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.4 }}>O Google não te classifica nessa categoria.</div>
              <button onClick={onSeeCompetitors} style={{ ...link, color: T.accent }}>Ver concorrentes <ChevronRight size={14}/></button>
            </>
          ) : (
            <div style={{ color: T.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>Sua posição aparece assim que houver concorrentes mapeados na sua categoria.</div>
          )}
        </div>
      </div>
      {/* Mini-cards coadjuvantes (nota + avaliações) — sem Display */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginTop: 16, borderTop:`1px solid ${T.border}`, paddingTop: 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <Star size={18} fill={T.accent} color={T.accent} strokeWidth={0}/>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{typeof d.kpis.rating === 'number' && d.kpis.rating ? d.kpis.rating.toFixed(1) : '—'}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>reputação atual</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <MessageSquare size={18} color={T.primary}/>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{d.kpis.reviewCount ?? 0}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>recebidas</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Bloco 2 — Widget Radar IA (RADAR-WIDGET-SPEC + Gatilho 1 do FUNIL-IMPACTO).
// Estado 0 (convite): nunca rodou o Radar → CTA pra /radar (com place_id pré-
// selecionado). Estado 1 (vendedor): já rodou → anel de score REAL + concorrentes
// borrados (nomes reais) + "Desbloquear" → /radar/plano?code. Dados vêm do último
// diagnóstico salvo (GET /api/radar?place_id — leitura barata, sem custo de IA).
// Honestidade (spec 4): score alto vira "mantenha sua posição", não pânico.
//
// DESLIGADO em 2026-07-09 a pedido do Ricardo: o Radar vai passar por melhorias
// e não queremos oferecê-lo no painel de quem já é cadastrado enquanto isso.
// Some o bloco inteiro (o componente devolve null), sem tocar em /radar,
// /radar/plano nem em api/radar.js — que seguem no ar pro funil do convidado.
// Pra religar: `true`. Nada mais precisa mudar.
// ─────────────────────────────────────────────────────────────
const RADAR_WIDGET_ENABLED = false
function RadarWidgetSlot({ d, isMobile }) {
  const placeId = d?.biz?.placeId || d?.businessInfo?.placeId || null
  const nome = d?.biz?.name || d?.businessInfo?.name || ''
  const categoria = d?.businessInfo?.category || ''

  const [state, setState] = React.useState('loading') // loading | invite | seller
  const [diag, setDiag] = React.useState(null)
  const [pend, setPend] = React.useState(null)        // nº de pendências (auditoria)

  // Busca o último diagnóstico do negócio (barato). Sem diagnóstico → convite.
  React.useEffect(() => {
    if (!RADAR_WIDGET_ENABLED || !placeId) return
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(`/api/radar?place_id=${encodeURIComponent(placeId)}`)
        if (!alive) return
        if (!r.ok) { setState('invite'); return }
        const j = await r.json()
        setDiag(j); setState('seller')
        // Sub-linha "{N} pendências" — opcional, só aparece se a auditoria vier.
        fetch(`/api/audit?place_id=${encodeURIComponent(placeId)}${j.site ? `&site=${encodeURIComponent(j.site)}` : ''}`)
          .then(a => a.ok ? a.json() : null)
          .then(a => { if (alive && a && typeof a.pendencias === 'number') setPend(a.pendencias) })
          .catch(() => {})
      } catch { if (alive) setState('invite') }
    })()
    return () => { alive = false }
  }, [placeId])

  // GA4 impression quando o estado resolve (0 = convite, 1 = vendedor).
  React.useEffect(() => {
    if (!RADAR_WIDGET_ENABLED || state === 'loading') return
    try { if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'radar_widget_impression', { state: state === 'seller' ? 1 : 0 }) } catch {}
  }, [state])

  const track = (evt, extra) => { try { if (window.gtag) window.gtag('event', evt, extra || {}) } catch {} }

  if (!RADAR_WIDGET_ENABLED || !placeId) return null
  if (state === 'loading') return null // sem flash: aparece já resolvido

  const Header = (
    <div style={{ display:'flex', alignItems:'center', gap: 9, marginBottom: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: T.primarySoft, display:'grid', placeItems:'center', flexShrink: 0 }}>
        <Radar size={19} color={T.primary}/>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, flex: 1 }}>Visibilidade em IAs</div>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing:'0.06em', color: T.primary, background: T.primarySoft, padding:'3px 8px', borderRadius: 999 }}>NOVO</span>
    </div>
  )

  // ── Estado 0 — convite (nunca rodou) ──
  if (state === 'invite') {
    const href = `/radar?place_id=${encodeURIComponent(placeId)}&nome=${encodeURIComponent(nome)}&origem=widget`
    return (
      <Section>
        <Card>
          {Header}
          <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, marginBottom: 16 }}>
            Descubra se o ChatGPT e o Gemini recomendam o seu negócio quando alguém pergunta pela sua categoria.
          </p>
          {/* Abre em nova aba: o painel do cliente logado NÃO é perdido. */}
          <a href={href} target="_blank" rel="noopener" onClick={() => track('radar_widget_click', { state: 0, destino: 'radar' })}
            style={{ display:'inline-flex', alignItems:'center', gap: 6, fontSize: 14, fontWeight: 700, color: T.primary, background: T.primarySoft, border:`1px solid ${T.primary}22`, borderRadius: 10, padding:'11px 16px', textDecoration:'none' }}>
            Fazer diagnóstico grátis <ChevronRight size={16}/>
          </a>
        </Card>
      </Section>
    )
  }

  // ── Estado 1 — vendedor (já rodou) ──
  const score = diag?.score || 0
  const comps = Array.isArray(diag?.concorrentes) ? diag.concorrentes.filter(Boolean).slice(0, 3) : []
  const strong = score >= 75 || comps.length === 0   // aparece bem → mantém, não pânico
  const planoHref = `/radar/plano?code=${encodeURIComponent(diag.code)}&origem=widget`
  const catTxt = categoria ? ` na categoria ${categoria}` : ''

  return (
    <Section>
      <Card>
        {Header}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: isMobile ? 14 : 18, alignItems:'center' }}>
          {/* Coluna A — anel de score real */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6, ...(isMobile ? {} : { borderRight:`1px solid ${T.border}`, paddingRight: 18 }) }}>
            <ScoreRing score={score} size={isMobile ? 92 : 100}/>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textAlign:'center' }}>Score de visibilidade em IA</div>
          </div>
          {/* Coluna B — revelação */}
          <div>
            {strong ? (
              <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55 }}>
                Boa notícia: as IAs já citam o seu negócio nas respostas{catTxt}. O trabalho agora é <strong style={{ color: T.text }}>manter a posição</strong> — seus concorrentes estão correndo.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13.5, color: T.textMid, lineHeight: 1.55, marginBottom: 10 }}>
                  O ChatGPT recomenda <strong style={{ color: T.text }}>{comps.length} concorrente{comps.length > 1 ? 's' : ''}</strong> seu{comps.length > 1 ? 's' : ''}{catTxt}:
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                  {comps.map((c, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <Lock size={13} color={T.textMuted} style={{ flexShrink: 0 }}/>
                      <span aria-hidden="true" style={{ fontSize: 13.5, fontWeight: 600, color: T.text, filter:'blur(6px)', userSelect:'none' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rodapé — CTA + sub-linha de pendências */}
        <div style={{ marginTop: 16 }}>
          <a href={planoHref} target="_blank" rel="noopener" onClick={() => track('radar_unlock_click', { state: 1, pendencias: pend })}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 7, width:'100%', fontSize: 14.5, fontWeight: 700, color:'#fff', background: T.primary, border:'none', borderRadius: 10, padding:'13px 16px', textDecoration:'none', boxSizing:'border-box' }}>
            {strong ? 'Ver diagnóstico completo' : 'Desbloquear diagnóstico completo'} <ChevronRight size={16}/>
          </a>
          {pend != null && pend > 0 && (
            <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, color: T.accent, textAlign:'center' }}>
              {pend} pendência{pend > 1 ? 's' : ''} encontrada{pend > 1 ? 's' : ''} no seu negócio
            </div>
          )}
          <div style={{ marginTop: 9, fontSize: 12, color: T.textMuted, textAlign:'center' }}>
            Diagnóstico completo + monitoramento mensal
          </div>
        </div>
      </Card>
    </Section>
  )
}

// Sugestões da semana (push de direção pro dono)
function WeekActions({ items, isMobile }) {
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14, gap: 8 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
          {items.length === 1 ? 'Sua ação de hoje' : 'Sugestões pra essa semana'}
        </h3>
        {items.length > 1 && <span style={{ fontSize: 11.5, color: T.textDim }}>{items.length} ações</span>}
      </div>
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile || items.length === 1 ? '1fr' : 'repeat(3, 1fr)',
        gap: 10
      }}>
        {items.map((a, i) => (
          <div key={i} style={{
            display:'flex', gap: 10, padding: '12px 14px',
            borderRadius: 12, background: '#F8FAFC',
            border: `1px solid ${T.border}`,
            alignItems:'flex-start'
          }}>
            <span style={{ lineHeight: 1.2, flexShrink: 0, display:'inline-flex' }}><Ico name={a.icon} size={18}/></span>
            <span style={{ fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{a.text}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Card AZUL = RESULTADO. Foco em crescimento. Sem CTA pra Pro.
// ─────────────────────────────────────────────────────────────
// Modal "Gerar mais avaliações" — 3 caminhos práticos pra coletar mais
// ─────────────────────────────────────────────────────────────
function ShareReviewsModal({ placeId, bizName, onClose, onActivatePlate }) {
  const [copied, setCopied] = React.useState(false)
  const reviewUrl = placeId
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://startouch.com.br'}/avaliar?place_id=${encodeURIComponent(placeId)}`
    : null
  const waText = encodeURIComponent(
    `Olá! Como foi sua experiência com a gente${bizName ? ' na ' + bizName : ''}? Deixa uma avaliação rapidinho: ${reviewUrl || ''}`
  )

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCopy() {
    if (!reviewUrl) return
    try {
      await navigator.clipboard.writeText(reviewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback: select + execCommand
      const ta = document.createElement('textarea')
      ta.value = reviewUrl; document.body.appendChild(ta)
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:'fixed', inset: 0, background:'rgba(15,23,42,.55)',
        display:'grid', placeItems:'center', zIndex: 100, padding: 16,
        animation:'fadeInGm .15s ease-out'
      }}>
      <style>{`@keyframes fadeInGm{from{opacity:0}to{opacity:1}}`}</style>
      <Card padded={false} style={{ padding: 24, maxWidth: 520, width:'100%', position:'relative' }}>
        <button onClick={onClose} aria-label="Fechar" style={{
          position:'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 8,
          border:'none', background:'transparent', color: T.textMid, fontSize: 22, cursor:'pointer'
        }}>×</button>

        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: T.text, margin:'0 0 6px', letterSpacing:'-0.02em' }}>
          Gerar mais avaliações
        </h2>
        <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.5 }}>
          Escolha o caminho mais prático pra coletar mais reviews dos seus clientes.
        </p>

        {/* 1. Compartilhar link direto */}
        {reviewUrl && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, letterSpacing:'.04em', textTransform:'uppercase', marginBottom: 8 }}>
              ① Compartilhar link direto
            </div>
            <div style={{
              padding: 12, background: T.bg, border:'1px solid '+T.border, borderRadius: 8,
              fontSize: 12.5, color: T.textMid, marginBottom: 8, wordBreak:'break-all', fontFamily:'monospace'
            }}>{reviewUrl}</div>
            <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
              <button onClick={handleCopy} style={{
                flex:'1 1 140px', background: copied ? T.green : T.blue, color:'#fff',
                border:'none', borderRadius: 8, padding:'10px 14px',
                fontSize: 13, fontWeight: 700, cursor:'pointer',
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6,
                transition:'background .15s'
              }}>{copied ? <><Check size={15}/> Copiado!</> : <><ClipboardList size={15}/> Copiar link</>}</button>
              <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" style={{
                flex:'1 1 140px', background:'#25D366', color:'#fff', textDecoration:'none',
                borderRadius: 8, padding:'10px 14px', fontSize: 13, fontWeight: 700,
                display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6
              }}>Enviar por WhatsApp</a>
            </div>
            <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 6, lineHeight: 1.45 }}>
              Coloca no rodapé do email, na descrição do Instagram, ou manda direto pros clientes que você atendeu.
            </div>
          </div>
        )}

        <div style={{ height: 1, background: T.border, margin:'18px 0' }}/>

        {/* 2. Ativar código de dispositivo que já tem */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, letterSpacing:'.04em', textTransform:'uppercase', marginBottom: 8 }}>
            ② Já tem placa/cartão NFC?
          </div>
          <button
            onClick={() => { onClose(); onActivatePlate && onActivatePlate() }}
            style={{
              width:'100%', background:'#fff', color: T.text,
              border:'1.5px solid '+T.border, borderRadius: 8, padding:'12px 14px',
              fontSize: 13.5, fontWeight: 600, cursor:'pointer',
              display:'flex', alignItems:'center', gap: 10, textAlign:'left'
            }}>
            <span style={{ display:'inline-flex' }}><Package size={20}/></span>
            <span style={{ flex: 1 }}>Ativar código (STAR-XXXXX)</span>
            <span style={{ color: T.textDim }}>›</span>
          </button>
        </div>

        {/* 3. Comprar novos dispositivos */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, letterSpacing:'.04em', textTransform:'uppercase', marginBottom: 8 }}>
            ③ Ampliar pontos de captação
          </div>
          <a href="/kit" style={{
            display:'flex', width:'100%', boxSizing:'border-box',
            background:'#fff', color: T.text,
            border:'1.5px solid '+T.border, borderRadius: 8, padding:'12px 14px',
            fontSize: 13.5, fontWeight: 600, textDecoration:'none',
            alignItems:'center', gap: 10
          }}>
            <span style={{ display:'inline-flex' }}><ShoppingCart size={20}/></span>
            <span style={{ flex: 1 }}>Comprar placa de balcão, cartão NFC ou pulseira</span>
            <span style={{ color: T.textDim }}>›</span>
          </a>
        </div>
      </Card>
    </div>
  )
}

function HeroPosition({ progressPct, currentPos, isMobile, placeId, bizName, onActivatePlate }) {
  const [open, setOpen] = React.useState(false)
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
          Você está entre as melhores empresas da sua categoria.
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

        <button onClick={() => setOpen(true)} style={{
          background:'#fff', color: T.blueDk, border:'none', borderRadius: 11,
          padding: isMobile ? '13px 20px' : '14px 24px',
          fontSize: isMobile ? 14 : 15, fontWeight: 700, cursor:'pointer',
          display:'inline-flex', alignItems:'center', gap: 8,
          boxShadow:'0 4px 14px rgba(0,0,0,0.18)', fontFamily:"'Inter', sans-serif",
          width: isMobile ? '100%' : 'auto', justifyContent:'center'
        }}>
          Gerar mais avaliações →
        </button>
      </div>
      {open && (
        <ShareReviewsModal
          placeId={placeId}
          bizName={bizName}
          onClose={() => setOpen(false)}
          onActivatePlate={onActivatePlate}
        />
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Ranking — com blur pra plano Free
// ─────────────────────────────────────────────────────────────
function RankingList({ items, isMobile, plan, category, onEditCategory }) {
  const locked = false   // tudo free: sem blur, sem selo PRO, sem upsell no ranking
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
                alterar
              </button>
            </span>
          )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 22, textAlign:'center', color: T.textMid, fontSize: 13 }}>
          Coletando dados dos concorrentes da sua região…
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
                {r.medal ? <Ico name={r.medal} size={16}/> : r.pos + 'º'}
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
              {/* Teaser de movimento — concorrente acelerando / ▲ seu crescimento */}
              {(typeof r.weekGrowth === 'number' && r.weekGrowth >= 1) && (
                r.you
                  ? <span style={{ flexShrink:0, fontSize:11, fontWeight:700, color:'#137333', background:T.greenSoft, borderRadius:6, padding:'3px 7px', whiteSpace:'nowrap' }}>▲ +{r.weekGrowth}</span>
                  : r.weekGrowth >= 2
                    ? <span style={{ flexShrink:0, fontSize:11, fontWeight:700, color:'#B45309', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:6, padding:'3px 7px', whiteSpace:'nowrap' }}>+{r.weekGrowth}/sem</span>
                    : <span style={{ flexShrink:0, fontSize:11, fontWeight:600, color:T.textMid, whiteSpace:'nowrap' }}>▲ +{r.weekGrowth}</span>
              )}
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
            <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.25 }}>Nunca seja pego de surpresa</div>
            <ul style={{ listStyle:'none', padding: 0, margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.6 }}>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0, display:'inline-flex' }}><Check size={15} strokeWidth={3}/></span><span style={{ opacity: 0.95 }}><strong>Aviso na hora</strong> quando um concorrente te ultrapassar</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0, display:'inline-flex' }}><Check size={15} strokeWidth={3}/></span><span style={{ opacity: 0.95 }}>Quem está crescendo mais rápido que você</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8, marginBottom: 4 }}><span style={{ color:'#FBBC04', flexShrink: 0, display:'inline-flex' }}><Check size={15} strokeWidth={3}/></span><span style={{ opacity: 0.95 }}>Os <strong>nomes</strong> de quem está na sua frente</span></li>
              <li style={{ display:'flex', alignItems:'flex-start', gap: 8 }}><span style={{ color:'#FBBC04', flexShrink: 0, display:'inline-flex' }}><Check size={15} strokeWidth={3}/></span><span style={{ opacity: 0.95 }}>Evolução do seu ranking, semana a semana</span></li>
            </ul>
            <a href="/plano-pro" style={{
              display:'inline-flex', alignItems:'center', gap: 8,
              background:'#FBBC04', color:'#78350F',
              padding: '11px 18px', borderRadius: 10,
              fontSize: 13.5, fontWeight: 800, textDecoration:'none',
              boxShadow: '0 4px 14px rgba(251,188,4,0.35)',
              width: '100%', justifyContent: 'center'
            }}>
              Ativar vigilância (Pro) →
            </a>
          </div>
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
        <span style={{ display:'inline-flex', color: T.success }}><TrendingUp size={18}/></span>
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
        <span style={{ lineHeight: 1, flexShrink: 0, display:'inline-flex', color: T.accent }}><AlertTriangle size={26}/></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color:'#78350F', margin:'0 0 8px', lineHeight: 1.3 }}>
            {count != null
              ? <>Você possui <span style={{ color: T.amber }}>{count} avaliações</span> aguardando resposta.</>
              : <>Responda suas avaliações no Google.</>}
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
        <span style={{ display:'inline-flex', color: T.success }}><TrendingUp size={16}/></span>
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
// Bloco 3 — Ação da semana (1 só). Regra de prioridade da spec seção 3:
//  1) avaliação sem resposta → responder no Google. Entre várias, escolhe a PIOR:
//     menor nota primeiro, mais recente como desempate. Uma nota 1-2 sem resposta
//     sempre vence qualquer outra ação.
//  2) sem dispositivo ativo → ativar código
//  3) fallback → maior lacuna do Score StarTouch
// Absorve o banner amarelo gigante: fundo surface, ícone accent, badge discreto.
// ─────────────────────────────────────────────────────────────
function WeeklyAction({ d, demoMode, isMobile, placeId, onActivate }) {
  const reviews = d.recentReviews || []
  // Avaliações SEM resposta (real: sem flag `replied` → todas contam).
  const unreplied = reviews.filter(r => !r.replied)
  // Pior avaliação sem resposta: menor nota; empate → mais recente (menor índice).
  const worst = unreplied.length
    ? [...unreplied].sort((a, b) => (a.rating - b.rating) || (reviews.indexOf(a) - reviews.indexOf(b)))[0]
    : null
  const noDevice = (d.activePlates || []).length === 0
  const googleUrl = placeId ? `https://search.google.com/local/reviews?placeid=${placeId}` : 'https://business.google.com/'

  let a
  if (worst) {
    const low = worst.rating <= 2
    a = {
      Icon: low ? AlertTriangle : MessageSquare, type: 'respond',
      title: low
        ? `Responda à avaliação de ${worst.rating} ${worst.rating === 1 ? 'estrela' : 'estrelas'} de ${worst.name}`
        : `Responda a avaliação de ${worst.name}`,
      context: low
        ? 'Uma nota baixa sem resposta pesa muito na sua reputação — responder com cuidado reduz o impacto.'
        : 'Responder transmite confiança e fortalece sua presença no Google.',
      badge: 'até 30% mais visitas', cta: 'Responder no Google', href: googleUrl
    }
  } else if (noDevice) {
    a = {
      Icon: Rocket, type: 'activate',
      title: 'Ative sua placa e capte avaliações no automático',
      context: 'Um dispositivo NFC coleta avaliações a cada atendimento, sem esforço.',
      badge: null, cta: 'Ativar código', onClick: onActivate
    }
  } else {
    const { factors } = scoreBreakdown(d)
    const gap = [...factors].sort((x, y) => (y.max - y.earned) - (x.max - x.earned))[0]
    a = {
      Icon: Target, type: 'tip',
      title: gap ? gap.hint : 'Continue coletando avaliações toda semana',
      context: gap ? `${gap.label}: ${Math.round(gap.earned)}/${gap.max} pts no seu Score StarTouch.` : '',
      badge: null, cta: null
    }
  }

  const ctaStyle = {
    marginTop: 14, width:'100%', minHeight: 48, background: T.primary, color:'#fff', border:'none',
    borderRadius: 12, padding:'12px 18px', fontSize: 14, fontWeight: 700, cursor:'pointer',
    textDecoration:'none', fontFamily:"'Inter', sans-serif",
    display:'flex', alignItems:'center', justifyContent:'center', gap: 6
  }
  const fireGA = () => { try { window.gtag && window.gtag('event', 'click_weekly_action', { action_type: a.type }) } catch {} }
  const A = a.Icon
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'flex-start', gap: 12 }}>
        <span style={{ flexShrink: 0, display:'inline-flex', color: T.accent, marginTop: 2 }}><A size={24}/></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing:'.05em', textTransform:'uppercase', marginBottom: 4 }}>Sua ação da semana</div>
          <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 15.5 : 17, fontWeight: 700, color: T.text, margin:'0 0 4px', lineHeight: 1.3 }}>{a.title}</h3>
          {a.context && <p style={{ fontSize: 13, color: T.textMuted, margin: 0, lineHeight: 1.5 }}>{a.context}</p>}
          {a.badge && (
            <span style={{ display:'inline-flex', alignItems:'center', gap: 5, marginTop: 8, fontSize: 11.5, fontWeight: 700, color:'#B45309', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius: 999, padding:'3px 10px' }}>
              <TrendingUp size={13}/> {a.badge}
            </span>
          )}
        </div>
      </div>
      {a.cta && (a.href
        ? <a href={a.href} target="_blank" rel="noopener noreferrer" onClick={fireGA} style={ctaStyle}>{a.cta} <ChevronRight size={16}/></a>
        : <button onClick={() => { fireGA(); a.onClick && a.onClick() }} style={ctaStyle}>{a.cta} <ChevronRight size={16}/></button>
      )}
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
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: T.textMid, margin: 0, lineHeight: 1.55 }}>
          Ainda não há avaliações recentes pra mostrar. Assim que chegarem avaliações no seu Google, elas aparecem aqui.
        </p>
      ) : (
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
                <div style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: T.textDim }}>{r.date}</span>
                  {!r.replied && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, fontWeight: 700, color:'#B45309', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius: 999, padding:'2px 9px' }}>
                      <MessageSquare size={12}/> Responder
                    </span>
                  )}
                </div>
              </div>
              {r.comment
                ? <p style={{ fontSize: 13, color: T.textMid, margin: 0, lineHeight: 1.55 }}>"{r.comment}"</p>
                : <p style={{ fontSize: 13, color: T.textDim, margin: 0, lineHeight: 1.55, fontStyle:'italic' }}>(sem comentário)</p>}
            </div>
          </li>
        ))}
      </ul>
      )}
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
          Ativar dispositivo
        </h2>
        <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.5 }}>
          Cole o código que veio na sua placa, cartão ou pulseira NFC. O código fica no verso, começa com <code style={{ background: T.bg, padding:'1px 5px', borderRadius: 4, fontSize: 12 }}>STAR-</code>.
        </p>

        {success ? (
          <div style={{
            padding: 18, background: T.greenSoft, border:'1px solid #A7F3D0', borderRadius: 10,
            display:'flex', alignItems:'center', gap: 10
          }}>
            <span style={{ display:'inline-flex', color: T.success }}><CheckCircle2 size={24}/></span>
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
              }}>{error}</div>
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
const PRODUCT_ICONS = {
  placa_balcao: 'tag',
  placa_mesa:   'food',
  placa_parede: 'image',
  pulseira_nfc: 'bell',
  cartao_nfc:   'card'
}

// Foto real do produto por tipo (mais "marketeiro" que o emoji na lista de
// pontos de captação). Fallback pra placa de balcão.
const PRODUCT_IMAGES = {
  placa_balcao: '/gadget-placa.png',
  placa_mesa:   '/placa-m-1.png',
  placa_parede: '/gadget-placa.png',
  pulseira_nfc: '/gadget-pulseira.png',
  cartao_nfc:   '/cartao-1.png'
}
// Tipos com foto vertical -> recorte quadrado (cover) no thumbnail de 48px
const COVER_TYPES = ['placa_mesa', 'cartao_nfc']

// Vitrine de produtos pro estado vazio — renders bonitas dos 3 itens vendidos.
const PRODUCT_SHOWCASE = [
  { img: '/gadget-placa.png',    name: 'Placa de balcão' },
  { img: '/gadget-cartao.png',   name: 'Cartão NFC' },
  { img: '/gadget-pulseira.png', name: 'Pulseira NFC' },
]

function CapturePoints({ items, plates, businessId, isAdmin, reviewCount = 0, isMobile }) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [showCode, setShowCode] = React.useState(false)
  // Renomear apelido (30/jul): o nome era escrito só na ativação e ficava preso.
  // `renamed` guarda o que já salvamos nesta sessão pra lista refletir na hora,
  // sem recarregar a página — a lista vem por prop de cima.
  const [editingId, setEditingId] = React.useState(null)
  const [draft, setDraft] = React.useState('')
  const [savingId, setSavingId] = React.useState(null)
  const [renameError, setRenameError] = React.useState('')
  const [renamed, setRenamed] = React.useState({})
  const platesList = (plates || []).slice().sort((a,b) => (b.total_taps || 0) - (a.total_taps || 0))

  function startEdit(p) {
    setRenameError('')
    setEditingId(p.id)
    setDraft(nickOf(p) || '')
  }
  // Apelido corrente: o que salvamos nesta sessão vence o que veio na prop.
  function nickOf(p) {
    return Object.prototype.hasOwnProperty.call(renamed, p.id) ? renamed[p.id] : p.channel_name
  }
  async function saveNick(p) {
    const nick = draft.trim()
    if (nick.length > 40) { setRenameError('O apelido pode ter no máximo 40 caracteres.'); return }
    if (nick === (nickOf(p) || '')) { setEditingId(null); return }  // nada mudou
    setSavingId(p.id); setRenameError('')
    try {
      const r = await apiCall('/api/plates?action=rename-plate', {
        method: 'POST',
        body: JSON.stringify({ plate_id: p.id, channel_name: nick || null })
      })
      setRenamed(prev => ({ ...prev, [p.id]: r?.plate?.channel_name ?? (nick || null) }))
      setEditingId(null)
    } catch (err) {
      setRenameError(err.message || 'Não deu pra salvar o nome. Tente de novo.')
    } finally {
      setSavingId(null)
    }
  }
  const total = platesList.reduce((s, p) => s + (p.total_taps || 0), 0)
  const isEmpty = platesList.length === 0
  const hasReviews = (reviewCount || 0) > 0  // tom de ACELERADOR (não "falta pré-requisito")
  // Detecta a placa mais usada — útil pra "estrela" visual
  const topPlate = platesList[0]
  const hasMultiple = platesList.length > 1

  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4, gap: 8, flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>
          {isEmpty && hasReviews ? 'Capte ainda mais avaliações no automático' : 'Onde seus clientes avaliam'}
        </h3>
      </div>

      {isEmpty ? (
        <>
          <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 16px', lineHeight: 1.5 }}>
            {hasReviews
              ? `Você já tem ${reviewCount} avaliações — ótimo! Um dispositivo NFC transforma cada cliente em avaliação, sem você precisar pedir.`
              : 'Coloque um dispositivo NFC no balcão e transforme cada atendimento em avaliação no Google, no automático.'}
          </p>

          {/* Vitrine dos 3 produtos — renders grandes com sombra.
              minmax(0,1fr) + minWidth:0 impedem a imagem de estourar as colunas;
              img com width/height 100% + objectFit contain fica sempre contida. */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
            {PRODUCT_SHOWCASE.map(prod => (
              <div key={prod.name} style={{
                minWidth: 0, overflow:'hidden',
                background:'#fff', border:`1px solid ${T.border}`, borderRadius: 14,
                padding: isMobile ? '10px 6px' : 14, textAlign:'center', boxShadow: T.shadow
              }}>
                <div style={{ height: isMobile ? 88 : 120, marginBottom: 8, overflow:'hidden' }}>
                  <img src={prod.img} alt={prod.name}
                    style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', filter:'drop-shadow(0 6px 14px rgba(15,23,42,0.14))' }}/>
                </div>
                <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: T.text, lineHeight: 1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{prod.name}</div>
              </div>
            ))}
          </div>

          {/* Como funciona — 1 linha com ícones */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 8, flexWrap:'wrap', fontSize: 12.5, color: T.textMuted, marginBottom: 16, textAlign:'center' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><Smartphone size={15} style={{ color: T.primary }}/> Toque</span>
            <span style={{ color: T.textDim }}>ou</span>
            <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}><QrCode size={15} style={{ color: T.primary }}/> QR Code</span>
            <span>→ avaliação no Google em segundos.</span>
          </div>

          {/* CTAs — 1 primário + 1 secundário (spec Bloco 6) */}
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
            <button onClick={() => setModalOpen(true)} style={{
              flex:'1 1 200px', minHeight: 46, background: T.primary, color:'#fff', border:'none', borderRadius: 11,
              padding:'11px 16px', fontSize: 13.5, fontWeight: 700, cursor:'pointer', fontFamily:"'Inter', sans-serif"
            }}>Ativar código de dispositivo →</button>
            <a href="/kit" style={{
              flex:'1 1 160px', minHeight: 46, background:'#fff', color: T.primary, border:`1.5px solid ${T.primary}`, borderRadius: 11,
              padding:'11px 16px', fontSize: 13.5, fontWeight: 700, textDecoration:'none', textAlign:'center',
              display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter', sans-serif"
            }}>Comprar dispositivos</a>
          </div>
        </>
      ) : (
        <>
          {/* HERO STAT — narrativa clara ("seus clientes tocaram X vezes") */}
          <div style={{
            background:'linear-gradient(135deg, '+T.blueSoft+' 0%, #fff 100%)',
            border:'1px solid '+T.border, borderRadius: 12,
            padding:'14px 16px', marginBottom: 14,
            display:'flex', alignItems:'center', gap: 14, flexWrap:'wrap'
          }}>
            <div style={{
              fontFamily:"'Inter', sans-serif", fontSize: 36, fontWeight: 800,
              color: T.blue, letterSpacing:'-0.03em', lineHeight: 1
            }}>{total}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                {total === 0
                  ? 'Aguardando o primeiro toque'
                  : total === 1
                  ? 'Cliente tocou no seu dispositivo 1 vez'
                  : `Seus clientes tocaram ${total} vezes`}
              </div>
              <div style={{ fontSize: 12.5, color: T.textMid, marginTop: 2 }}>
                {total === 0
                  ? `Posicione ${hasMultiple ? 'os dispositivos' : 'o dispositivo'} num lugar visível e peça pra avaliarem.`
                  : hasMultiple
                  ? `${platesList.length} dispositivos ativos · ${(topPlate && nickOf(topPlate)) || 'o dispositivo principal'} é o campeão`
                  : 'Continue assim! Cada toque pode virar uma avaliação no Google.'}
              </div>
            </div>
            {topPlate && (
              <div style={{
                width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                background:'#fff', border:'1px solid '+T.border,
                display:'grid', placeItems:'center', overflow:'hidden',
                padding: COVER_TYPES.includes(topPlate.product_type) ? 0 : 6
              }}>
                <img src={PRODUCT_IMAGES[topPlate.product_type] || '/gadget-placa.png'} alt=""
                  style={COVER_TYPES.includes(topPlate.product_type)
                    ? { width:'100%', height:'100%', objectFit:'cover', display:'block' }
                    : { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }}/>
              </div>
            )}
          </div>

          {/* LISTA SIMPLIFICADA — uma placa por linha, sem badges/códigos confusos */}
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {platesList.map((p, idx) => {
              const taps = p.total_taps || 0
              const isTop = hasMultiple && idx === 0 && taps > 0
              const displayName = nickOf(p) || (PRODUCT_LABELS[p.product_type] || 'Dispositivo')
              const isEditing = editingId === p.id
              const isSaving = savingId === p.id
              const productLabel = PRODUCT_LABELS[p.product_type] || p.product_type
              return (
                <div key={p.id} style={{
                  padding:'14px 16px', borderRadius: 12,
                  background: isTop ? T.blueSoft : '#fff',
                  border: isTop ? `1.5px solid #B9D6FB` : `1px solid ${T.border}`,
                  display:'flex', alignItems:'center', gap: 14
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background:'#fff', border:'1px solid '+T.border,
                    display:'grid', placeItems:'center', overflow:'hidden',
                    padding: COVER_TYPES.includes(p.product_type) ? 0 : 5  // foto vertical -> cover sem padding
                  }}>
                    <img src={PRODUCT_IMAGES[p.product_type] || '/gadget-placa.png'} alt={productLabel}
                      style={COVER_TYPES.includes(p.product_type)
                        ? { width:'100%', height:'100%', objectFit:'cover', display:'block' }
                        : { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <form onSubmit={(e) => { e.preventDefault(); saveNick(p) }}
                        style={{ display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap' }}>
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') { setEditingId(null); setRenameError('') } }}
                          maxLength={40}
                          disabled={isSaving}
                          placeholder={PRODUCT_LABELS[p.product_type] || 'Dispositivo'}
                          aria-label="Nome do dispositivo"
                          style={{
                            flex:'1 1 140px', minWidth: 0, fontSize: 15, fontWeight: 700, color: T.text,
                            fontFamily:"'Inter', sans-serif", padding:'5px 9px', borderRadius: 8,
                            border:`1.5px solid ${T.blue}`, outline:'none', background:'#fff'
                          }}/>
                        <button type="submit" disabled={isSaving} style={{
                          background: T.blue, color:'#fff', border:'none', borderRadius: 8,
                          padding:'6px 12px', fontSize: 12.5, fontWeight: 700,
                          cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.6 : 1,
                          fontFamily:"'Inter', sans-serif"
                        }}>{isSaving ? 'Salvando…' : 'Salvar'}</button>
                        <button type="button" disabled={isSaving}
                          onClick={() => { setEditingId(null); setRenameError('') }}
                          style={{
                            background:'transparent', color: T.textMid, border:'none', borderRadius: 8,
                            padding:'6px 8px', fontSize: 12.5, fontWeight: 500, cursor:'pointer'
                          }}>Cancelar</button>
                      </form>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                          {displayName}
                        </span>
                        <button type="button" onClick={() => startEdit(p)}
                          title="Mudar o nome deste dispositivo"
                          aria-label={`Mudar o nome de ${displayName}`}
                          style={{
                            background:'transparent', border:'none', padding: 4, margin: -4,
                            cursor:'pointer', color: T.textDim, display:'inline-flex', alignItems:'center',
                            lineHeight: 1, borderRadius: 6
                          }}>
                          <Pencil size={13}/>
                        </button>
                        {isTop && <span style={{ fontSize: 10.5, fontWeight: 800, color: T.blueDk, background:'#fff', padding:'1px 7px', borderRadius: 4 }}>MAIS USADA</span>}
                      </div>
                    )}
                    {isEditing && renameError && (
                      <div style={{ fontSize: 11.5, color: T.danger, marginTop: 4 }}>{renameError}</div>
                    )}
                    <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
                      {productLabel}{p.last_tapped_at && taps > 0 ? ' · último toque ' + relativeDate(p.last_tapped_at) : ''}
                    </div>
                    {showCode && (
                      <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 2, fontFamily:'monospace' }}>{p.code}</div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily:"'Inter', sans-serif",
                      fontSize: 24, fontWeight: 800,
                      color: taps > 0 ? T.text : T.textDim,
                      lineHeight: 1, letterSpacing:'-0.02em'
                    }}>{taps}</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 3, fontWeight: 500 }}>
                      {taps === 1 ? 'toque' : 'toques'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', gap: 8, marginTop: 14, flexWrap:'wrap' }}>
            <button onClick={() => setModalOpen(true)} style={{
              flex:'1 1 200px', background:'transparent', color: T.blue, border:`1.5px solid ${T.blue}`, borderRadius: 10,
              padding:'10px 18px', fontSize: 13, fontWeight: 600, cursor:'pointer',
              fontFamily:"'Inter', sans-serif", textAlign:'center'
            }}>
              + Ativar novo dispositivo
            </button>
            {isAdmin && (
              <button onClick={() => setShowCode(s => !s)} style={{
                background:'transparent', color: T.textMid, border:`1px solid ${T.border}`, borderRadius: 10,
                padding:'10px 14px', fontSize: 12, fontWeight: 500, cursor:'pointer'
              }}>
                {showCode ? 'Esconder' : 'Mostrar'} códigos
              </button>
            )}
          </div>
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
      <span style={{ lineHeight: 1, flexShrink: 0, display:'inline-flex', color: T.accent }}><FlaskConical size={20}/></span>
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
          Suas avaliações
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
                    <span style={{ color: T.textMid, fontWeight: 600, display:'inline-flex', alignItems:'center', gap: 1 }}>{s}<Star size={11} fill="currentColor" strokeWidth={0}/></span>
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
              }}><span style={{ display:'inline-flex', alignItems:'center', gap: 1 }}>{s}<Star size={11} fill="currentColor" strokeWidth={0}/> ({n})</span></button>
            )
          })}
        </div>
      </Section>

      {/* Lista */}
      {visible.length === 0 ? (
        <Card style={{ textAlign:'center', padding: 48 }}>
          <div style={{ marginBottom: 12, color: T.textDim, display:'flex', justifyContent:'center' }}><Inbox size={44}/></div>
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

// Porta única do modo convidado: busca o negócio (nome + cidade/CEP + termo)
// e leva pro painel guest (/app?place_id=&keyword=). Substitui o /diagnostico.
function GuestSearch({ isMobile }) {
  const [q, setQ] = React.useState('')
  const [loc, setLoc] = React.useState('')
  const [term, setTerm] = React.useState('')
  const [results, setResults] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  // Passo 2 (grade): após escolher o negócio, o dono seleciona os termos.
  const [selectedBiz, setSelectedBiz] = React.useState(null)
  const [suggestions, setSuggestions] = React.useState([])
  const [selectedTerms, setSelectedTerms] = React.useState([])
  const [addInput, setAddInput] = React.useState('')

  // Analytics: abriu a busca sem cadastro (topo do funil convidado)
  React.useEffect(() => {
    trackFunnel('guest_search_view')
    try { if (typeof window !== 'undefined' && window.fbq) window.fbq('trackCustom', 'GuestSearchView') } catch {}
  }, [])

  async function doSearch(e) {
    if (e) e.preventDefault()
    if (q.trim().length < 2) return
    setLoading(true); setError(''); setResults(null)
    try {
      // Prioridade do match (backend): NOME (1o) + TIPO (2o) na query; CEP (3o)
      // vai separado, so pra desempatar por proximidade entre nomes iguais (rede).
      const name = q.trim()
      const type = term.trim()
      const cepDigits = (loc || '').replace(/\D/g, '')   // CEP obrigatorio (validado em canSearch)
      const fullQ = [name, type].filter(Boolean).join(' ')
      const params = new URLSearchParams({ q: fullQ, name, cep: cepDigits })
      const r = await fetch(`/api/searchbiz?${params.toString()}`)
      const d = await r.json()
      setResults(d.results || [])
      // Buscou de verdade (fim do 1º ponto cego do funil).
      trackFunnel('guest_search_submit', { results: (d.results || []).length })
    } catch {
      setError('Erro ao buscar. Tente de novo.')
    } finally { setLoading(false) }
  }

  // Escolheu o negócio → carrega os termos sugeridos (não navega ainda).
  async function pick(biz) {
    setSelectedBiz(biz)
    let sugg = []
    try {
      const r = await fetch('/api/diagnostico?suggest=1&place_id=' + encodeURIComponent(biz.place_id))
      const d = await r.json(); sugg = d.suggestions || []
    } catch {}
    const typed = term.trim()
    const merged = [...new Set([typed, ...sugg].filter(Boolean))]
    setSuggestions(merged)
    setSelectedTerms(merged.slice(0, 1))   // 1 termo padrão (grátis)
  }
  function toggleTerm(t) {
    setSelectedTerms(prev => prev.includes(t) ? prev.filter(x => x !== t) : (prev.length >= 3 ? prev : [...prev, t]))
  }
  function addTerm() {
    // Minúsculo pra casar com as sugestões (que vêm minúsculas) — evita "Padaria"
    // duplicar a "padaria" automática. Busca no Google é case-insensitive.
    const t = addInput.trim().toLowerCase(); if (!t) return
    const exists = (arr) => arr.some(x => x.toLowerCase() === t)
    setSuggestions(prev => exists(prev) ? prev : [...prev, t])
    setSelectedTerms(prev => (exists(prev) || prev.length >= 3) ? prev : [...prev, t])
    setAddInput('')
  }
  function goToPanel() {
    const cepDigits = (loc || '').replace(/\D/g, '')
    let url = `/app?place_id=${encodeURIComponent(selectedBiz.place_id)}`
    if (selectedTerms.length) url += `&terms=${encodeURIComponent(selectedTerms.join(','))}`
    if (cepDigits.length === 8) url += `&cep=${cepDigits}`
    window.location.href = url
  }

  const inputStyle = {
    width:'100%', padding:'12px 14px', fontSize:15, color:T.text,
    border:`1.5px solid ${T.border}`, borderRadius:10, outline:'none', boxSizing:'border-box',
    fontFamily:"'Inter', sans-serif", background:'#fff'
  }
  const labelStyle = { display:'block', fontSize:13, fontWeight:600, color:T.textMid, margin:'0 0 6px' }
  // Mascara de CEP: so digitos, maximo 8, hifen automatico depois do 5o (00000-000).
  const maskCep = (v) => {
    const d = (v || '').replace(/\D/g, '').slice(0, 8)
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
  }
  const cepDigits = (loc || '').replace(/\D/g, '')
  // CEP agora e' OBRIGATORIO (8 digitos) — garante o desempate por proximidade.
  const canSearch = q.trim().length >= 2 && cepDigits.length === 8 && !loading

  return (
    <div style={{ background:T.bg, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 18px 80px' }}>
      <style>{`
        .gs-grid { width:100%; max-width:1040px; display:flex; flex-direction:column; align-items:center; gap:40px; }
        @media(min-width:880px){ .gs-grid{ display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; } }
        .gs-illustration { display:none; }
        @media(min-width:880px){ .gs-illustration{ display:flex; align-items:center; justify-content:center; } }
        .gs-phone { width:260px; height:480px; background:#fff; border:1.5px solid #e5e7eb; border-radius:36px; box-shadow:0 24px 60px -16px rgba(60,64,67,0.20); padding:18px 14px; display:flex; flex-direction:column; gap:14px; position:relative; }
        .gs-phone::before { content:""; position:absolute; top:6px; left:50%; transform:translateX(-50%); width:60px; height:5px; background:#e5e7eb; border-radius:999px; }
        .gs-glogo { font-family:'Inter',sans-serif; font-weight:700; font-size:20px; text-align:center; margin-top:14px; letter-spacing:-0.01em; }
        .gs-glogo .g1{color:#4285f4;} .gs-glogo .g2{color:#ea4335;} .gs-glogo .g3{color:#fbbc04;} .gs-glogo .g4{color:#4285f4;} .gs-glogo .g5{color:#34a853;} .gs-glogo .g6{color:#ea4335;}
        .gs-psearch { background:#f1f3f4; border-radius:999px; padding:10px 16px; font-size:11px; color:#9aa0a6; }
        .gs-presult { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; display:flex; gap:10px; box-shadow:0 4px 12px -2px rgba(60,64,67,0.10); margin-top:6px; }
        .gs-pimg { width:52px; height:52px; border-radius:8px; background:linear-gradient(135deg,#fbbc04,#ea4335); flex-shrink:0; }
        .gs-pinfo { flex:1; min-width:0; }
        .gs-pname { font-size:11px; font-weight:600; color:#202124; line-height:1.3; }
        .gs-pmeta { font-size:9px; color:#5f6368; margin-top:2px; }
        .gs-pstars { color:#fbbc04; font-size:11px; letter-spacing:1px; line-height:1; margin-top:4px; }
        .gs-pline { height:1px; background:#e5e7eb; margin:4px 0; }
        .gs-picons { display:flex; justify-content:space-around; padding:8px 0; }
        .gs-picon { width:32px; height:32px; border-radius:50%; background:#f1f3f4; display:flex; align-items:center; justify-content:center; color:#5f6368; font-size:12px; }
        .gs-pbar { height:6px; background:#e5e7eb; border-radius:3px; width:80%; }
        .gs-pbar.short { width:60%; }
        .gs-form { width:100%; max-width:460px; }
        @media(min-width:880px){ .gs-form{ max-width:none; } }
      `}</style>

      <img src="/startouch-logo-dark.png" alt="StarTouch" style={{ height: isMobile?40:48, width:'auto', marginBottom: 30 }}/>

      <div className="gs-grid">
        {/* Celular do Google ao lado (só desktop) */}
        <div className="gs-illustration" aria-hidden="true">
          <div className="gs-phone">
            <div className="gs-glogo"><span className="g1">G</span><span className="g2">o</span><span className="g3">o</span><span className="g4">g</span><span className="g5">l</span><span className="g6">e</span></div>
            <div className="gs-psearch">Seu negócio</div>
            <div className="gs-pline"></div>
            <div className="gs-presult">
              <div className="gs-pimg"></div>
              <div className="gs-pinfo">
                <div className="gs-pname">Café Bello Vista</div>
                <div className="gs-pmeta">Cafeteria · Aberto agora</div>
                <div className="gs-pstars" style={{ display:'flex', gap: 1 }}>{[1,2,3,4,5].map(i => <Star key={i} size={11} fill="#F59E0B" color="#F59E0B" strokeWidth={0}/>)}</div>
              </div>
            </div>
            <div className="gs-picons"><div className="gs-picon"></div><div className="gs-picon"></div><div className="gs-picon"></div><div className="gs-picon">↗</div></div>
            <div className="gs-pbar"></div>
            <div className="gs-pbar short"></div>
            <div className="gs-pbar"></div>
          </div>
        </div>

        {/* Form */}
        <div className="gs-form">
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile?24:30, fontWeight:800, color:T.text, letterSpacing:'-0.02em', margin:'0 0 8px', lineHeight:1.15 }}>
            Veja sua posição no Google <span style={{ color:T.blue }}>grátis</span>
          </h1>
          <p style={{ fontSize:14.5, color:T.textMid, lineHeight:1.55, margin:'0 0 16px' }}>
            Informe seu negócio e descubra na hora como você está vs. os concorrentes — sem cadastro.
          </p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#E6F4EA', border:'1px solid #CEEAD6', color:'#137333', borderRadius:999, padding:'7px 14px', fontSize:13, fontWeight:600, marginBottom:22, lineHeight:1.3 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
            Ver seu ranking é <span style={{ fontWeight:800, margin:'0 3px' }}>100% grátis</span> · sem cartão
          </div>
          <form onSubmit={doSearch}>
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Nome do negócio</label>
              <input style={inputStyle} value={q} onChange={e=>setQ(e.target.value)} placeholder="Ex: Padaria do João" autoFocus/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>CEP do seu negócio</label>
              <input style={inputStyle} value={loc} onChange={e=>setLoc(maskCep(e.target.value))} inputMode="numeric" maxLength={9} placeholder="Ex: 05086-010"/>
              <span style={{ display:'block', fontSize:12, color:T.textDim, marginTop:5, lineHeight:1.45 }}>
                Usamos o CEP pra achar exatamente <b>a sua unidade</b> (importante se houver lojas com nome parecido).
              </span>
            </div>
            {/* Botão de BUSCA: some quando o negócio já foi escolhido (aí o único
                CTA azul é o "Ver minha posição" do passo de termos). */}
            {!selectedBiz && (
              <button type="submit" disabled={!canSearch} style={{
                width:'100%', padding:'13px', background: canSearch?T.blue:T.textDim, color:'#fff',
                border:'none', borderRadius:11, fontSize:15, fontWeight:700, fontFamily:"'Inter', sans-serif",
                cursor: canSearch?'pointer':'not-allowed'
              }}>{loading ? 'Buscando…' : 'Buscar meu negócio'}</button>
            )}
          </form>

          {error && <p style={{ fontSize:13, color:T.red, marginTop:12 }}>{error}</p>}

          {/* Passo de TERMOS (após escolher o negócio) */}
          {selectedBiz && (
            <div style={{ marginTop:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:T.blueSoft, border:'1px solid #C6DAFC', borderRadius:11, padding:'11px 14px', marginBottom:16 }}>
                <span style={{ fontSize:14.5, fontWeight:700, color:T.text, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedBiz.name}</span>
                <button type="button" onClick={()=>{ setSelectedBiz(null); setSelectedTerms([]) }} style={{ background:'none', border:'none', color:T.blue, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Trocar</button>
              </div>
              <label style={labelStyle}>Em quais buscas você quer aparecer? <span style={{ fontWeight:400, color:T.textDim }}>(até 3)</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'8px 0 10px' }}>
                {suggestions.map(t => {
                  const on = selectedTerms.includes(t)
                  return <button key={t} type="button" onClick={()=>toggleTerm(t)} style={{
                    border:`1.5px solid ${on?T.blue:T.border}`, background:on?T.blue:'#fff', color:on?'#fff':T.textMid,
                    borderRadius:999, padding:'8px 14px', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
                  }}>{t}</button>
                })}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input style={{ ...inputStyle, flex:1 }} value={addInput} onChange={e=>setAddInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addTerm() } }} placeholder="Adicionar termo (ex: rodízio, delivery)"/>
                <button type="button" onClick={addTerm} style={{ background:'#fff', border:`1.5px solid ${T.border}`, borderRadius:10, padding:'0 16px', fontSize:20, fontWeight:700, color:T.blue, cursor:'pointer' }}>+</button>
              </div>
              <button type="button" onClick={goToPanel} disabled={!selectedTerms.length} style={{
                width:'100%', padding:'13px', background: selectedTerms.length?T.blue:T.textDim, color:'#fff',
                border:'none', borderRadius:11, fontSize:15, fontWeight:700, fontFamily:"'Inter', sans-serif",
                cursor: selectedTerms.length?'pointer':'not-allowed'
              }}>Ver minha posição no Google →</button>
            </div>
          )}

          {!selectedBiz && results && (
            <div style={{ marginTop:18 }}>
              {results.length === 0 ? (
                <div style={{ background:'#FEF7E0', border:'1.5px solid #FDE293', borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#B06000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="11.5"/><circle cx="11" cy="14.3" r="0.6" fill="#B06000" stroke="none"/>
                    </svg>
                    <span style={{ fontSize:16, fontWeight:800, color:'#B06000', letterSpacing:'-0.01em' }}>Não encontramos seu negócio</span>
                  </div>
                  <p style={{ fontSize:13.5, color:'#7A5200', lineHeight:1.55, margin:'0 0 4px' }}>
                    Isso costuma acontecer por um detalhe simples. Tente:
                  </p>
                  <ul style={{ fontSize:13.5, color:'#7A5200', lineHeight:1.6, margin:0, paddingLeft:18 }}>
                    <li>Escreva o <b>nome exato</b> como aparece no Google (ex: <i>Supermercado Mambo</i>, sem apelidos).</li>
                    <li>Confira a <b>cidade ou CEP</b> — um CEP errado joga a busca pra longe.</li>
                    <li>Se o negócio é novo, ele pode ainda <b>não estar no Google Maps</b>. Cadastre grátis em <a href="https://business.google.com" target="_blank" rel="noopener" style={{ color:'#B06000', fontWeight:700 }}>google.com/business</a> e volte aqui.</li>
                  </ul>
                </div>
              ) : (
                <>
                  <p style={{ fontSize:13, color:T.blue, fontWeight:600, margin:'0 0 8px' }}>Toque no seu negócio</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {results.map(b => (
                      <button key={b.place_id} type="button" onClick={()=>pick(b)} style={{
                        textAlign:'left', background:'#fff', border:`1.5px solid ${T.border}`, borderRadius:11,
                        padding:'12px 14px', cursor:'pointer', display:'flex', flexDirection:'column', gap:3
                      }}>
                        <span style={{ fontSize:14.5, fontWeight:700, color:T.text }}>{b.name}</span>
                        <span style={{ fontSize:12.5, color:T.textMid }}>{b.address || ''}</span>
                        <span style={{ fontSize:12, color:T.textDim }}>{b.rating || '—'} · {b.total || 0} avaliações</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <p style={{ fontSize:13, color:T.textMid, marginTop:18 }}>
            Já tem conta? <a href="/app?login=1" style={{ color:T.blue, fontWeight:600, textDecoration:'none' }}>Entrar</a>
          </p>
        </div>
      </div>
    </div>
  )
}

// Tarja fixa do modo convidado — CTA de cadastro (conversão).
// Personalizada com os números REAIS do negócio (gap pro topo) + urgência
// (diagnóstico temporário). Genérico converte menos que específico.
//
// Os números vêm de `guestPitch`, que sai da MESMA grade do Hero. Nunca voltar a
// alimentar isto de outra fonte: o dono lê a tarja e o Hero na mesma tela, e
// dois rankings discordando ali destroem a credibilidade dos dois.
function GuestBanner({ url, isMobile, bizName, term, spacingM, posicao, top3, medidos, gap }) {
  const name = bizName || 'seu negócio'
  const naBusca = term ? <> <b>{term}</b></> : null
  // "pontos" e "a até 1 km do seu endereço" saíram daqui (02/ago): a tarja tinha
  // quatro ideias empilhadas e duas delas em vocabulário nosso. Aqui fica UMA
  // frase de fato + UMA de convite. O detalhe da distância vive no bloco de
  // concorrentes, onde o conceito é explicado.
  let msg
  if (medidos && top3 === medidos) {
    // Forte de verdade: está entre os 3 em TODOS os lugares → medo de perder.
    msg = <><b>{bizName || 'Seu negócio'}</b> aparece <b>entre os 3 primeiros</b> pra quem busca{naBusca} por perto. Crie conta grátis pra <b>não perder esse lugar</b> e ser avisado quando um concorrente chegar perto.</>
  } else if (medidos && top3 === 0) {
    // A dor mais forte, e é verdade: ele não entra nos 3 em lugar nenhum.
    msg = <>Testamos {medidos} lugares ao redor da <b>{bizName || 'sua loja'}</b>. Em <b>nenhum</b> deles você aparece entre os 3 primeiros pra quem busca{naBusca}. Crie conta grátis e veja o que fazer.</>
  } else if (medidos) {
    // O caso do meio: aparece bem em parte da região e some no resto.
    msg = <><b>{bizName || 'Seu negócio'}</b> aparece entre os 3 primeiros em <b>{top3} dos {medidos} lugares</b> que testamos ao redor da sua loja. {medidos - top3 === 1 ? 'No lugar que falta' : `Nos outros ${medidos - top3}`}, quem busca{naBusca} não te encontra. Crie conta grátis e veja o que fazer.</>
  } else if (gap && gap > 0) {
    // Sem cobertura calculável, mas com diferença real de avaliações: diz o FATO,
    // não a promessa — a lista ordena por posição, não por volume.
    msg = <>Quem aparece na sua frente pra quem busca{naBusca} {raio} tem <b>{gap} {gap === 1 ? 'avaliação' : 'avaliações'} a mais</b> que você. Este diagnóstico é temporário — crie conta grátis e comece a virar isso hoje.</>
  } else {
    // Sem dado de ranking → foca em salvar/acompanhar (perecibilidade).
    msg = <>Prévia do painel de <b>{name}</b>. Este diagnóstico é temporário — crie conta grátis pra <b>salvar</b>, acompanhar sua evolução e receber alertas.</>
  }
  return (
    <div style={{
      background: T.primarySoft, color: T.text, borderLeft: `4px solid ${T.primary}`,
      display:'flex', alignItems:'center', justifyContent:'center', gap: isMobile?8:12, flexWrap:'wrap',
      padding: isMobile ? '10px 14px' : '11px 18px', fontSize: isMobile?12:13.5, fontWeight:600, textAlign:'center'
    }}>
      <span>{msg}</span>
      <a href={url} onClick={() => trackFunnel('guest_signup_click', { from: 'banner' })} style={{
        background: T.primary, color:'#fff', textDecoration:'none', fontWeight:700,
        padding:'7px 15px', borderRadius: 8, fontSize: isMobile?12.5:13, whiteSpace:'nowrap'
      }}>Salvar meu diagnóstico →</a>
    </div>
  )
}

// Tela de bloqueio pra recursos que exigem conta (settings, etc.) no modo convidado.
function GuestGate({ url, feature, isMobile }) {
  return (
    <main style={{ maxWidth: 520, margin: isMobile?'40px auto':'60px auto', padding:'0 24px', textAlign:'center' }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, boxShadow:T.shadow, padding: isMobile?24:32 }}>
        <div style={{ marginBottom:12, color: T.primary, display:'flex', justifyContent:'center' }}><Lock size={40}/></div>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:700, color:T.text, margin:'0 0 8px' }}>
          Crie sua conta pra acessar {feature}
        </h2>
        <p style={{ fontSize:14, color:T.textMid, lineHeight:1.55, margin:'0 0 20px' }}>
          Você está numa prévia gratuita. Crie sua conta (também grátis) pra salvar seu negócio, configurar e receber alertas.
        </p>
        <a href={url} onClick={() => trackFunnel('guest_signup_click', { from: 'gate' })} style={{ display:'inline-block', background:T.blue, color:'#fff', textDecoration:'none', fontWeight:700, padding:'12px 24px', borderRadius:11, fontSize:15 }}>
          Criar conta grátis →
        </a>
      </div>
    </main>
  )
}

// Modal de EXIT-INTENT (rede de segurança de conversão) — dispara quando o
// convidado leva o cursor pra fora pela borda de cima (indo fechar/trocar de
// aba). Só desktop (touch não tem "mouseleave" útil), 1x por sessão (não perturba).
// Mensagem personalizada com os números reais (mesma lógica da tarja).
function ExitIntentModal({ url, bizName, term, spacingM, posicao, top3, medidos, gap, isMobile }) {
  const [show, setShow] = React.useState(false)
  const firedRef = React.useRef(false)
  React.useEffect(() => {
    if (isMobile) return
    try { if (sessionStorage.getItem('rz_exit_shown') === '1') return } catch {}
    function onLeave(e) {
      if (firedRef.current) return
      // Saiu pela borda superior da janela (rumo à barra de abas / fechar).
      if (e.clientY <= 0 && !e.relatedTarget) {
        firedRef.current = true
        try { sessionStorage.setItem('rz_exit_shown', '1') } catch {}
        setShow(true)
      }
    }
    document.addEventListener('mouseout', onLeave)
    return () => document.removeEventListener('mouseout', onLeave)
  }, [isMobile])

  if (!show) return null

  // Mesma fonte, mesma lógica e MESMO VOCABULÁRIO da tarja — "lugares", não
  // "pontos", e sem repetir a distância (ver nota em GuestBanner).
  let headline, sub
  if (medidos && top3 === medidos) {
    headline = `${bizName || 'Seu negócio'} aparece entre os 3 primeiros por aqui`
    sub = `Crie conta grátis pra não perder esse lugar${term ? ` em "${term}"` : ''} e ser avisado quando um concorrente chegar perto.`
  } else if (medidos && top3 === 0) {
    headline = `Testamos ${medidos} lugares e você não aparece entre os 3 primeiros em nenhum`
    sub = 'Quem busca por perto não te encontra. Crie conta grátis e veja o que fazer.'
  } else if (medidos) {
    headline = `Você aparece entre os 3 primeiros em ${top3} dos ${medidos} lugares que testamos`
    sub = `${medidos - top3 === 1 ? 'No lugar que falta' : `Nos outros ${medidos - top3}`}, quem busca não te encontra. Crie conta grátis e veja o que fazer.`
  } else if (gap && gap > 0) {
    headline = `Quem aparece na sua frente tem ${gap} ${gap === 1 ? 'avaliação' : 'avaliações'} a mais que você`
    sub = 'Não perca esse diagnóstico. Crie conta grátis e comece a virar isso hoje.'
  } else {
    headline = 'Antes de sair…'
    sub = `Salve o diagnóstico de ${bizName || 'seu negócio'} e acompanhe sua evolução. É grátis.`
  }

  return (
    <div onClick={() => setShow(false)} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding: 20, zIndex: 300
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius: 18, padding: 32, maxWidth: 440, width:'100%',
        textAlign:'center', position:'relative', boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <button onClick={() => setShow(false)} aria-label="Fechar" style={{
          position:'absolute', top: 14, right: 16, background:'none', border:'none',
          fontSize: 20, color: T.textDim, cursor:'pointer', lineHeight: 1
        }}></button>
        <div style={{ marginBottom: 12, color: T.primary, display:'flex', justifyContent:'center' }}><Hand size={40}/></div>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 23, fontWeight: 800, color: T.text, margin:'0 0 10px', letterSpacing:'-0.02em', lineHeight:1.2 }}>{headline}</h2>
        <p style={{ fontSize: 14.5, color: T.textMid, lineHeight: 1.55, margin:'0 0 22px' }}>{sub}</p>
        <a href={url} style={{
          display:'inline-block', background: T.blue, color:'#fff', textDecoration:'none',
          fontWeight:700, padding:'13px 26px', borderRadius: 12, fontSize: 15,
          boxShadow:'0 4px 14px rgba(26,115,232,0.30)'
        }}>Salvar meu diagnóstico grátis →</a>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShow(false)} style={{ background:'none', border:'none', color: T.textDim, fontSize: 12.5, cursor:'pointer' }}>Agora não</button>
        </div>
      </div>
    </div>
  )
}

// Controle de CATEGORIA do ranking (funcionalidade StarTouch: "sua arena de
// concorrência"). Deixa explícito contra quem o cliente compete e permite trocar.
// Logado: salva category_override no banco e recalcula (reload garante que TODOS
// os números — lentes 1/3km, KPIs, ranking — batam com a nova categoria).
// Convidado: troca o keyword da sessão.
function TermBar({ term, spacingM, isGuest, placeId, isMobile }) {
  const [editing, setEditing] = React.useState(false)
  const [val, setVal] = React.useState(term || '')
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => { setVal(term || '') }, [term])

  async function apply() {
    const t = (val || '').trim()
    if (!t) return
    setSaving(true)
    if (isGuest) {
      // `terms` é o que a GRADE lê; `keyword` é o que as lentes (reserva) leem.
      // Só o keyword ia na URL — então o visitante trocava a busca, o rótulo
      // mudava e a medição continuava a mesma. Mesmo placebo do lado logado.
      window.location.href = `/app?place_id=${encodeURIComponent(placeId || '')}&keyword=${encodeURIComponent(t)}&terms=${encodeURIComponent(t)}`
      return
    }
    try {
      const token = localStorage.getItem('rz_token')
      const res = await fetch('/api/savebiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_override: t })
      })
      if (!res.ok) throw new Error('save failed')
      window.location.reload()
    } catch {
      setSaving(false)
      alert('Não consegui salvar a categoria. Tente de novo.')
    }
  }

  return (
    <div style={{
      background: T.blueSoft, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: isMobile ? '11px 14px' : '12px 18px', marginBottom: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      fontFamily: "'Inter', sans-serif", fontSize: isMobile ? 13 : 13.5, color: T.blueDk
    }}>
      {!editing ? (
        <>
          {/* "Categoria" era jargão do Meu Negócio e não é o que medimos: o que
              medimos é a BUSCA que a pessoa digita. Uma palavra só, em todo o
              bloco — busca. */}
          <span>Medindo quem busca <b>“{term || 'sua categoria'}”</b> {raioTxt(spacingM)}</span>
          <button onClick={() => setEditing(true)} style={{
            background: '#fff', color: T.blue, border: `1px solid ${T.blue}`, borderRadius: 7,
            padding: '5px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>Trocar busca</button>
        </>
      ) : (
        <>
          <input value={val} onChange={e => setVal(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') apply() }}
            placeholder="O que a pessoa digita: padaria, boteco, japonês…"
            style={{ flex: '1 1 200px', maxWidth: 340, padding: '7px 11px', fontSize: 14, color: T.text,
              border: `1.5px solid ${T.blue}`, borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif" }}/>
          <button onClick={apply} disabled={saving} style={{
            background: T.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px',
            fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', whiteSpace: 'nowrap'
          }}>{saving ? 'Medindo…' : 'Medir'}</button>
          <button onClick={() => { setEditing(false); setVal(term || '') }} disabled={saving} style={{
            background: 'transparent', color: T.textMid, border: 'none', fontSize: 12.5, cursor: saving ? 'default' : 'pointer'
          }}>Cancelar</button>
        </>
      )}
    </div>
  )
}

// Visibilidade multi-lente: a MESMA busca (ordem real do Google) em raios
// diferentes. Mostra que a posição varia conforme a distância de quem busca.
// Hook compartilhado: busca as lentes (1/3km) UMA vez, pra o Hero (Coluna B) e o
// bloco de concorrentes consumirem a MESMA fonte de dados. Com `mock`, usa
// dados estáticos (modo demo), sem fetch.
function useLensesData({ placeId, term, cep, mock, enabled = true }) {
  const [data, setData] = React.useState(mock || null)
  const [loading, setLoading] = React.useState(!mock)
  // FALHA TEM QUE SER VISÍVEL. Antes o erro era engolido (`.catch(() => {})`) e
  // data ficava null — o bloco de concorrentes desaparecia calado e o dono lia
  // "não tenho concorrente" quando a verdade era "não consegui carregar". Foi
  // exatamente o que aconteceu em 27/jul, quando o freio por IP devolveu 429.
  const [error, setError] = React.useState(null)
  const [nonce, setNonce] = React.useState(0)
  // "Medir agora" (Pro). Fica num ref, não no state, de propósito: se entrasse
  // nas dependências do efeito, apagá-lo depois do fetch dispararia uma segunda
  // busca. Aqui o pedido é CONSUMIDO na entrada do efeito e vale uma vez só —
  // um refetch comum (trocar de termo, tentar de novo) nunca remede sem querer.
  const remedirRef = React.useRef(false)
  React.useEffect(() => {
    if (mock) { setData(mock); setLoading(false); return }
    // RESERVA, NÃO ROTINA (01/ago). As lentes existiam pra alimentar o Hero
    // antes da grade e hoje só entram quando a grade falha — mas continuavam
    // sendo buscadas em TODA abertura de painel, e o resultado ia pro lixo.
    // Custava 1 ficha do Google (com a sobretaxa cara de nota/avaliações) + 2
    // buscas por medição: R$0,47 jogados fora, toda vez. Agora só disparam se
    // `enabled` — o painel liga isso apenas quando a grade não resolveu.
    if (!enabled) { setLoading(false); return }
    if (!placeId) { setLoading(false); return }
    const remedir = remedirRef.current
    remedirRef.current = false
    let cancelled = false
    setLoading(true)
    const url = `/api/diagnostico?lenses=1&place_id=${encodeURIComponent(placeId)}`
      + (term ? `&keyword=${encodeURIComponent(term)}` : '')
      + (cep ? `&cep=${encodeURIComponent(cep)}` : '')
      + (remedir ? '&remedir=1' : '')
    // Manda o token quando existe: é ele que diz ao backend a cadência da
    // medição (grátis = 1x por semana, Pro = quando quiser). Visitante segue
    // anônimo e recebe o mesmo diagnóstico de sempre.
    fetch(url, { headers: authHeader() })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (cancelled) return
        // 429/500 respondem JSON válido com `error` — sem esta checagem eles
        // passariam como "resposta ok sem lente nenhuma".
        if (!r.ok || !d || d.error) {
          setData(null)
          setError({ status: r.status, message: d?.error || 'falha ao carregar' })
          return
        }
        setError(null)
        setData(d)
      })
      .catch(() => { if (!cancelled) { setData(null); setError({ status: 0, message: 'sem conexão' }) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [placeId, term, cep, mock, nonce, enabled])
  return {
    data, loading, error,
    refetch: () => setNonce((n) => n + 1),
    remeasure: () => { remedirRef.current = true; setNonce((n) => n + 1) }
  }
}

// Info da lente "Bem perto de você" (1km) — fonte única pro Hero Coluna B.
// Retorna sempre que houver dados de lente (pra distinguir "não classificado" de
// "sem dados ainda"); `inResults` diz se o Places de fato retornou o negócio.
function pertoLensInfo(lensData) {
  const lens = lensData?.lenses?.find(l => l.key === 'perto') || lensData?.lenses?.[0]
  if (!lens) return null
  // radiusKm entra junto: os textos do fallback também precisam dizer "de onde".
  return { rank: lens.rank, total: lens.total, inResults: !!lens.inResults, radiusKm: lens.radiusKm ?? 1 }
}

// ─────────────────────────────────────────────────────────────
// Ranking por GRADE (Passo 2). Hook do painel: busca a grade UMA vez e alimenta
// o Hero (Coluna B, termo principal) e o card de termos EXTRAS. Fonte LAB:
// /api/diagnostico?grid=1 (público). Passo 4 troca pela fonte definitiva + flag.
// ─────────────────────────────────────────────────────────────
function useGridData({ placeId, terms }) {
  const [data, setData] = React.useState(null)
  // `loading` existe pra as LENTES saberem esperar: elas são a reserva da grade
  // e só devem gastar chamada depois que a grade der o veredito. Sem isso as
  // duas disparavam juntas e uma das duas era desperdício garantido.
  const [loading, setLoading] = React.useState(true)
  // Mesmo motivo do useLensesData: erro precisa chegar na tela, não virar
  // silêncio. Sem isso, um 429 aqui derruba o número do Hero sem explicação.
  const [error, setError] = React.useState(null)
  const [nonce, setNonce] = React.useState(0)
  // Mesmo mecanismo do useLensesData: o pedido de remedir é consumido uma vez.
  // A grade é a parte CARA (5 chamadas Places por termo), então ela nunca
  // remede sozinha — só quando o Pro pede.
  const remedirRef = React.useRef(false)
  const termsQ = (Array.isArray(terms) ? terms : []).filter(Boolean).slice(0, 3).join(',')
  React.useEffect(() => {
    // Sem place_id não há o que medir — e é um estado RESOLVIDO, não "carregando".
    // Se ficasse `loading: true` aqui, as lentes esperariam pra sempre e o
    // painel do modo demo (que não tem place_id) ficaria sem reserva nenhuma.
    if (!placeId) { setData(null); setLoading(false); return }
    const remedir = remedirRef.current
    remedirRef.current = false
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetch('/api/diagnostico?grid=1&place_id=' + encodeURIComponent(placeId) + (termsQ ? '&terms=' + encodeURIComponent(termsQ) : '') + (remedir ? '&remedir=1' : ''), { headers: authHeader() })
        if (!alive) return
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || d.error) {
          setData(null)
          setError({ status: r.status, message: d?.error || 'falha ao carregar' })
          return
        }
        setError(null)
        setData(d?.grid || null)
      } catch { if (alive) { setData(null); setError({ status: 0, message: 'sem conexão' }) } }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [placeId, termsQ, nonce])
  return {
    grid: data, error, loading,
    refetch: () => setNonce((n) => n + 1),
    remeasure: () => { remedirRef.current = true; setNonce((n) => n + 1) }
  }
}

// "Perto de onde?" — a pergunta que o dono fez ao ler "aqui perto" (01/ago) e
// que a tela não respondia. A grade mede em 5 pontos AO REDOR DO ENDEREÇO DELE,
// então a âncora é o endereço e a distância vem do backend (`spacingM` de cada
// termo), nunca hardcodada: se a grade mudar de 1 km, o texto muda junto.
// Fonte única — todo texto que fala de área usa este helper.
// Só a distância ("1 km"), pra frases que já dizem de onde é a distância.
function raioNum(spacingM) {
  const m = spacingM || 1000
  const km = m / 1000
  return km >= 1
    ? `${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`
    : `${Math.round(m)} m`
}
function raioTxt(spacingM) {
  return `a até ${raioNum(spacingM)} do seu endereço`
}

// Rótulo/cor por termo (forte / melhorar / subir / oportunidade).
function gridStatus(t) {
  if (!t || !t.coverage) return { label: 'oportunidade', color: '#A50E0E', bg: '#FCE8E6' }
  if (t.score <= 3)  return { label: 'forte',           color: '#137333', bg: '#E6F4EA' }
  if (t.score <= 10) return { label: 'dá pra melhorar', color: '#B45309', bg: '#FEF3C7' }
  return { label: 'precisa subir', color: '#A50E0E', bg: '#FCE8E6' }
}

// Card dos termos EXTRAS (o principal já aparece no Hero). Só renderiza quando o
// dono escolheu mais de 1 termo — a "camada de oportunidade". Sem bolinhas: só a
// classificação por termo (feedback do Ricardo).
function RankingGrid({ data }) {
  const extras = (data?.terms || []).slice(1)
  if (!extras.length) return null
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 12 }}>
        <Search size={18} style={{ color: T.primary }}/>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Outras buscas que você mede</h3>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
        {extras.map((t, i) => {
          const s = gridStatus(t)
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, borderTop: i > 0 ? `1px solid ${T.border}` : 'none', paddingTop: i > 0 ? 12 : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: T.text, fontWeight: 600 }}>quem busca “{t.term}”</div>
                <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 1 }}>
                  {/* Mesma hierarquia do Hero: cobertura primeiro, média depois.
                      Mesmo nome do número da tabela ("lugar no Google") — antes
                      isto dizia "posição média" e a tabela dizia outra coisa. */}
                  {/* Mesmo par de números da tabela: onde aparece + em quantos
                      pontos. Aqui era `score` (punido) e brigava com a lista. */}
                  {t.coverage > 0
                    ? <>aparece no <b style={{ color: T.text }}>{(t.avg != null ? t.avg : t.score).toFixed(1).replace('.', ',')}º lugar</b>, em {t.coverage} dos {t.measured} lugares testados</>
                    : `não aparece em nenhum dos ${t.measured} lugares testados`}
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform:'uppercase', letterSpacing:'.04em', color: s.color, background: s.bg, padding:'4px 9px', borderRadius: 999, flexShrink: 0 }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Lista de concorrentes da REGIÃO vinda da GRADE (posição média agregada dos 5
// pontos). Fonte ÚNICA com o Hero — a média do topo bate com a coluna daqui.
// Três números por linha (posição média, nota, avaliações) só se leem com
// cabeçalho: sem ele, "1,4 4,7 8442" é ruído.
//
// SEM COLUNA DE ORDINAL (30/jul). A tabela tinha "Ordem" (1º, 2º, 3º…) ao lado
// de "Posição média" (4,6) e os dois números se contradiziam na cara do dono —
// a legenda existia só pra desfazer a confusão que a própria coluna criava. O
// ordinal não carregava informação nenhuma: era o índice da linha numa lista já
// ordenada pela média. A ordem visual da lista diz a mesma coisa sem colidir, e
// o ordinal do dono ("1º de 9") continua no Hero, onde é manchete.
// Larguras somam ~164px + gaps: num card de 328px (celular de 360) sobram ~124px
// pro nome, que trunca com reticências. Apertar mais espreme o cabeçalho.
const COL = { avg: 58, rating: 46, reviews: 60 }
function GridRankingList({ data, isGuest, signupUrl }) {
  if (!data?.ranking?.length) return null
  const th = { fontSize: 10, fontWeight: 700, letterSpacing:'0.04em', textTransform:'uppercase', color: T.textDim, flexShrink: 0 }
  const num = { fontVariantNumeric:'tabular-nums', flexShrink: 0, textAlign:'right' }
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
        <Search size={18} style={{ color: T.primary }}/>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Concorrentes por perto</h3>
      </div>
      {/* UM NÚMERO NÃO PODE FAZER DOIS TRABALHOS (01/ago, achado do Ricardo).
          Até aqui a tabela mostrava e ordenava pelo `score` — a posição média JÁ
          com a punição de 21 por ausência embutida. Resultado: a Salve Man
          aparecia no TOPO da lista com 8,4 enquanto um concorrente que o Google
          mostra em 1º lugar ficava lá embaixo com 13,0. Os números estavam em
          ordem, mas a ordem mentia, porque a punição só cai em quem some — e
          quem some é sempre o concorrente, já que os 5 pontos são desenhados ao
          redor da porta do dono.
          Agora as duas coisas aparecem SEPARADAS: em que lugar ele aparece
          (`avg`, ordena a lista) e em quantos pontos ele aparece. Nada de
          fórmula escondida invertendo a ordem — o dono vê os dois fatos e
          conclui sozinho. O viés de fundo (grade centrada nele) só some com a
          malha compartilhada; isto para de escondê-lo. */}
      {/* AQUI a ideia é ensinada, UMA vez. Sem esta frase, todo o resto da tela
          ("4 de 5", "lugar no Google") vira código interno — o dono não tem por
          que saber que a resposta do Google muda conforme a localização de quem
          procura. É justamente essa variação que o produto vende. */}
      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
        O Google não mostra a mesma lista pra todo mundo: ela muda conforme o lugar de onde a pessoa procura.
        Testamos <b style={{ color: T.textMid }}>{data.term}</b> em {data.measured} lugares ao redor do seu endereço, até {raioNum(data.spacingM)} de distância.
      </div>

      <div style={{ display:'flex', alignItems:'flex-end', gap: 8, padding:'0 8px 6px', borderBottom:`1px solid ${T.border}`, marginBottom: 4 }}>
        <span style={{ ...th, flex: 1, minWidth: 0 }}>Negócio</span>
        <span style={{ ...th, ...num, width: COL.avg, lineHeight: 1.2 }}>Lugar no<br/>Google</span>
        <span style={{ ...th, ...num, width: COL.rating }}>Nota</span>
        <span style={{ ...th, ...num, width: COL.reviews }}>Avaliações</span>
      </div>

      {[...data.ranking]
        // Ordena pelo lugar REAL. Empate → quem aparece em mais pontos primeiro.
        .sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99) || (b.points ?? 0) - (a.points ?? 0))
        .map((r, i) => {
        const me = r.is_me
        const blurName = isGuest && !me
        const some = r.points != null && r.points < data.measured
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px', borderRadius: 8, marginBottom: 2, background: me ? T.primarySoft : 'transparent' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: me ? 700 : 500, color: me ? T.primaryDark : T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              ...(blurName && { filter:'blur(5px)', userSelect:'none', pointerEvents:'none' }) }}>
              {me ? `${r.name || 'Você'} (você)` : (r.name || 'Concorrente')}
            </span>
            <span style={{ ...num, width: COL.avg }}>
              <span style={{ display:'block', fontSize: 13, fontWeight: 700, color: me ? T.primaryDark : T.text }}>
                {r.avg != null ? `${r.avg.toFixed(1).replace('.', ',')}º` : '—'}
              </span>
              {/* A cobertura vem colada no número, e não numa coluna nova, pra
                  caber no celular sem espremer o nome do negócio. */}
              <span style={{ display:'block', fontSize: 10, lineHeight: 1.2, marginTop: 1, color: some ? T.accent : T.textDim, fontWeight: some ? 700 : 500 }}>
                em {r.points ?? 0} de {data.measured}
              </span>
            </span>
            <span style={{ ...num, width: COL.rating, fontSize: 12, color: T.textMuted, display:'inline-flex', alignItems:'center', justifyContent:'flex-end', gap: 2 }}>
              {r.rating != null ? r.rating.toFixed(1).replace('.', ',') : '—'}<Star size={11} fill={T.accent} color={T.accent} strokeWidth={0}/>
            </span>
            <span style={{ ...num, width: COL.reviews, fontSize: 12, color: T.textMuted }}>
              {(r.reviews ?? 0).toLocaleString('pt-BR')}
            </span>
          </div>
        )
      })}
      <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 10, lineHeight: 1.55 }}>
        <b style={{ color: T.textMuted }}>Lugar no Google</b> — a posição em que o negócio costuma aparecer.
        1,0 é o primeiro da lista; quanto menor, melhor.
        <div style={{ marginTop: 3 }}>
          <b style={{ color: T.textMuted }}>Em 4 de {data.measured}</b> — em quantos dos {data.measured} lugares
          testados o negócio apareceu. Aparecer bem em poucos lugares alcança menos gente
          do que aparecer razoável em todos.
        </div>
      </div>
      {isGuest && data.ranking.some(r => !r.is_me) && (
        <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap', background: T.primarySoft, border:`1px solid ${T.primary}22`, borderRadius: 12, padding:'12px 14px' }}>
          <Lock size={18} color={T.primary} style={{ flexShrink: 0 }}/>
          <div style={{ flex:'1 1 180px', minWidth: 0, fontSize: 13, color: T.textMid, lineHeight: 1.45 }}>
            <strong style={{ color: T.text }}>Quem são seus concorrentes?</strong> Crie sua conta grátis pra ver os nomes.
          </div>
          <a href={signupUrl || '/ativar?from=web'} onClick={() => trackFunnel('guest_signup_click', { from: 'ranking' })}
            style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6, flexShrink: 0, background: T.primary, color:'#fff', fontSize: 13.5, fontWeight: 700, textDecoration:'none', borderRadius: 10, padding:'10px 16px' }}>
            Criar conta grátis <ChevronRight size={16}/>
          </a>
        </div>
      )}
    </Card>
  )
}

// Ranking indisponível (falha de rede, 429 do freio por IP, erro do Places).
// Existe pra NUNCA mais uma falha virar "você não tem concorrente" — que é como
// o painel se comportava até 27/jul: sumia com o bloco e não dizia nada.
function RankingUnavailable({ status, onRetry }) {
  const barrado = status === 429
  return (
    <div style={{ display:'flex', gap: 10, alignItems:'flex-start', background: T.bg, border:`1px solid ${T.border}`, borderRadius: 10, padding:'14px 14px' }}>
      <span style={{ color: T.textMuted, flexShrink: 0, marginTop: 1, display:'inline-flex' }}><RefreshCw size={18}/></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 3 }}>
          Não conseguimos medir sua posição agora
        </div>
        <p style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.5, margin:'0 0 8px' }}>
          {barrado
            ? 'Você fez muitas consultas em pouco tempo e o sistema pausou a medição. Espere alguns minutos e tente de novo.'
            : 'A consulta ao Google não respondeu. Isso costuma ser momentâneo.'}
          {' '}<b>Isso não significa que você não tem concorrentes</b> — é uma falha nossa de leitura.
        </p>
        <button onClick={onRetry}
          style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: 8, padding:'7px 12px', cursor:'pointer', fontFamily:'inherit',
            display:'inline-flex', alignItems:'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: T.primary }}>
          <RefreshCw size={14}/> Tentar de novo
        </button>
      </div>
    </div>
  )
}

function VisibilityLenses({ data, loading, isMobile, googleUrl, category, isGuest, signupUrl, onRemeasure }) {
  const [tab, setTab] = React.useState(0)
  const [showInfo, setShowInfo] = React.useState(false)
  const lenses = (data && data.lenses) || []
  const active = lenses.length ? lenses[Math.min(tab, lenses.length - 1)] : null
  // Quantos concorrentes DE VERDADE (fora você) sobraram nesta lente. Desde o
  // corte por distância real (26/jul) a lente de 1km pode ficar com pouca gente
  // — ou só com o próprio negócio. Sem tratar, a tela fica vazia e parece
  // quebrada, quando na verdade está dando a melhor notícia possível.
  const rivais = (active?.top || []).filter(c => !c.isMe).length
  const outraLenteIdx = lenses.findIndex((L, i) => i !== tab)
  const outraLente = outraLenteIdx >= 0 ? lenses[outraLenteIdx] : null
  // GA4: ranking_not_classified_impression — 1x por (categoria, lente) não classificada.
  const firedRef = React.useRef(new Set())
  React.useEffect(() => {
    if (!active || active.inResults) return
    const key = (category || '') + '|' + active.key
    if (firedRef.current.has(key)) return
    firedRef.current.add(key)
    try { if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'ranking_not_classified_impression', { categoria: category || '' }) } catch {}
  }, [active, category])
  if (!loading && !lenses.length) return null

  return (
    <Card>
      {/* Header: título + Info colapsável (spec 6 — disclaimer de 5 linhas vira ícone) */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0, display:'inline-flex', alignItems:'center', gap: 8 }}>
          <Search size={18} style={{ color: T.primary }}/> Concorrentes por perto
        </h3>
        <button onClick={() => setShowInfo(v => !v)} aria-label="Sobre estes dados"
          style={{ background:'none', border:'none', cursor:'pointer', color: showInfo ? T.primary : T.textMuted, display:'inline-flex', padding: 4, flexShrink: 0 }}>
          <Info size={18}/>
        </button>
      </div>
      {showInfo && (
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 12, background: T.bg, border:`1px solid ${T.border}`, borderRadius: 10, padding:'10px 12px' }}>
          Amostra da concorrência via Google Places, filtrada pela sua categoria e medida a partir do endereço do seu negócio no Google. Não é o ranking exato do Google Maps — ele varia conforme quem busca e de onde. Estamos finalizando a medição exata.
        </div>
      )}

      {loading ? (
        <div className="st-skeleton" style={{ height: 220 }}/>
      ) : (
        <>
          {/* Segmented control: um raio por vez (spec 6 — corta a página pela metade) */}
          <div style={{ display:'flex', gap: 4, background: T.bg, border:`1px solid ${T.border}`, borderRadius: 10, padding: 4, marginBottom: 14 }}>
            {lenses.map((L, i) => (
              <button key={L.key}
                onClick={() => { setTab(i); try { window.gtag && window.gtag('event', 'click_competitors_tab', { radius_km: L.radiusKm }) } catch {} }}
                style={{ flex: 1, padding:'8px 10px', borderRadius: 7, border:'none', cursor:'pointer', fontSize: 12.5, fontWeight: 700, fontFamily:'inherit',
                  background: i === tab ? T.surface : 'transparent', color: i === tab ? T.primary : T.textMuted,
                  boxShadow: i === tab ? T.shadowSm : 'none', transition:'all .15s' }}>
                {L.label}
              </button>
            ))}
          </div>

          {active && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>raio ~{active.radiusKm} km · {active.total} {active.total === 1 ? 'negócio' : 'negócios'}</div>
                {active.inResults && (
                  <div style={{ textAlign:'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: active.rank <= 3 ? T.success : T.text, letterSpacing:'-0.02em' }}>#{active.rank}</span>
                    <span style={{ fontSize: 11, color: T.textDim }}> de {active.total}</span>
                  </div>
                )}
              </div>
              {/* NÃO classificado: o Places não retorna o negócio nesta busca. */}
              {!active.inResults && (
                <div style={{ display:'flex', gap: 10, alignItems:'flex-start', background: T.amberBg, border:'1px solid #FDE68A', borderRadius: 10, padding:'11px 12px', marginBottom: 12 }}>
                  <span style={{ color: T.accent, flexShrink: 0, marginTop: 1, display:'inline-flex' }}><AlertTriangle size={18}/></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color:'#92400E', marginBottom: 3 }}>Não classificado nesta busca</div>
                    <p style={{ fontSize: 12.5, color:'#78350F', lineHeight: 1.5, margin:'0 0 6px' }}>
                      O Google não classifica seu negócio como <b>{category || 'essa categoria'}</b>. Quem busca por esse termo na sua região não encontra você.
                    </p>
                    <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap: 3, fontSize: 12.5, fontWeight: 700, color:'#B45309', textDecoration:'none' }}>
                      Como corrigir a categoria no Google <ChevronRight size={14}/>
                    </a>
                  </div>
                </div>
              )}
              {/* SÓ VOCÊ nesse raio: não é tela vazia, é a melhor posição possível.
                  Nasceu do corte por distância real — a lente de 1km da Padaria
                  Michelli caiu de 20 para 3 negócios, e num bairro mais calmo
                  pode sobrar só o próprio dono. */}
              {active.inResults && rivais === 0 && (
                <div style={{ display:'flex', gap: 10, alignItems:'flex-start', background: T.greenSoft, border:'1px solid #A7F3D0', borderRadius: 10, padding:'11px 12px', marginBottom: 12 }}>
                  <span style={{ color: T.success, flexShrink: 0, marginTop: 1, display:'inline-flex' }}><Award size={18}/></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color:'#065F46', marginBottom: 3 }}>Só o seu negócio aparece nesse raio</div>
                    <p style={{ fontSize: 12.5, color:'#047857', lineHeight: 1.5, margin: 0 }}>
                      {/* Sem concordância de gênero: `category` é texto livre (vem do
                          termo de busca ou da categoria escolhida pelo dono), então
                          "outra/outro" sairia errado em metade dos casos. */}
                      Dentro de {active.radiusKm} km, o Google não mostra nenhum outro resultado para <b>{category || 'sua categoria'}</b>. Quem busca por aqui encontra você — ou não encontra ninguém.
                      {outraLente && <> Pra ver com quem você disputa de fato, olhe o raio de {outraLente.radiusKm} km.</>}
                    </p>
                    {outraLente && (
                      <button onClick={() => setTab(outraLenteIdx)}
                        style={{ marginTop: 6, background:'none', border:'none', padding: 0, cursor:'pointer', fontFamily:'inherit',
                          display:'inline-flex', alignItems:'center', gap: 3, fontSize: 12.5, fontWeight: 700, color:'#047857' }}>
                        Ver o raio de {outraLente.radiusKm} km <ChevronRight size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Nem você nem concorrente: o Google não devolveu nada nesse raio.
                  O aviso "não classificado" acima já explica o seu caso; aqui só
                  evita a área em branco logo abaixo dele. */}
              {!active.inResults && rivais === 0 && (
                <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5, margin:'0 0 4px' }}>
                  O Google também não devolveu nenhum concorrente dentro de {active.radiusKm} km{outraLente ? <> — tente o raio de {outraLente.radiusKm} km.</> : '.'}
                </p>
              )}
              {(active.top || []).map((c, i) => {
                const meFirst = c.isMe && c.pos === 1
                // Convidado (sem cadastro): nome do concorrente borrado — força o cadastro.
                const blurName = isGuest && !c.isMe
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px', borderRadius: 8, marginBottom: 2,
                    background: c.isMe ? T.primarySoft : 'transparent' }}>
                    <span style={{ width: 24, flexShrink: 0, textAlign:'center', fontSize: 12, fontWeight: 700,
                      ...(meFirst ? { background: T.success, color:'#fff', borderRadius: 6, padding:'2px 0' } : { color: T.textDim }) }}>{c.pos}º</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: c.isMe ? 700 : 500, color: c.isMe ? T.primaryDark : T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      ...(blurName && { filter:'blur(5px)', userSelect:'none', pointerEvents:'none' }) }}>
                      {c.isMe ? `${c.name || 'Você'} (você)` : (c.name || 'Concorrente')}
                    </span>
                    <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0, display:'inline-flex', alignItems:'center', gap: 2 }}>
                      {c.rating ?? '—'}<Star size={11} fill={T.accent} color={T.accent} strokeWidth={0}/> · {c.reviews}
                    </span>
                  </div>
                )
              })}

              {/* Aviso convidado: nomes borrados → cadastro pra revelar. */}
              {isGuest && (active.top || []).some(c => !c.isMe) && (
                <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap',
                  background: T.primarySoft, border:`1px solid ${T.primary}22`, borderRadius: 12, padding:'12px 14px' }}>
                  <Lock size={18} color={T.primary} style={{ flexShrink: 0 }}/>
                  <div style={{ flex:'1 1 180px', minWidth: 0, fontSize: 13, color: T.textMid, lineHeight: 1.45 }}>
                    <strong style={{ color: T.text }}>Quem são seus concorrentes?</strong> Crie sua conta grátis pra ver os nomes de quem aparece na sua frente.
                  </div>
                  <a href={signupUrl || '/ativar?from=web'}
                    onClick={() => trackFunnel('guest_signup_click', { from: 'ranking' })}
                    style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 6, flexShrink: 0,
                      background: T.primary, color:'#fff', fontSize: 13.5, fontWeight: 700, textDecoration:'none',
                      borderRadius: 10, padding:'10px 16px' }}>
                    Criar conta grátis <ChevronRight size={16}/>
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Rodapé de FRESCOR — quando essa medição foi feita e quando se renova.
          Sem isso o painel finge que o número é de agora: no grátis ele pode
          ter até uma semana, e o dono tomaria decisão com dado velho sem saber.
          É também onde o "medir quando quiser" do Pro fica óbvio, mostrando o
          que ele compra em vez de esconder a tela atrás de um cadeado. */}
      {!isGuest && data?.measuredAt && (
        <MedicaoFooter
          measuredAt={data.measuredAt}
          proximaMedicao={data.proximaMedicao}
          plano={data.plano}
          loading={loading}
          onRemeasure={onRemeasure}
        />
      )}
    </Card>
  )
}

// Linha de frescor da medição + ação de remedir (Pro) ou convite (grátis).
function MedicaoFooter({ measuredAt, proximaMedicao, plano, loading, onRemeasure }) {
  const agora = Date.now()
  const medidoMs = new Date(measuredAt).getTime()
  if (!Number.isFinite(medidoMs)) return null
  const proximaMs = proximaMedicao ? new Date(proximaMedicao).getTime() : null
  const liberada = proximaMs == null || agora >= proximaMs
  const isPro = plano === 'pro'

  const quando = (() => {
    const min = Math.floor((agora - medidoMs) / 60000)
    if (min < 2) return 'agora há pouco'
    if (min < 60) return `há ${min} minutos`
    const h = Math.floor(min / 60)
    if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
    const dias = Math.floor(h / 24)
    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  })()

  const faltam = (() => {
    if (proximaMs == null || liberada) return null
    const h = Math.ceil((proximaMs - agora) / 3600000)
    if (h < 24) return `${h} ${h === 1 ? 'hora' : 'horas'}`
    const dias = Math.ceil(h / 24)
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
  })()

  return (
    <div style={{
      marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      gap: 10, flexWrap:'wrap', fontSize: 12, color: T.textDim
    }}>
      <span>
        Medido {quando}
        {!isPro && faltam ? <> · próxima medição em {faltam}</> : null}
      </span>
      {isPro ? (
        <button onClick={onRemeasure} disabled={loading} style={{
          background:'transparent', color: T.blue, border:`1px solid ${T.blue}`,
          borderRadius: 8, padding:'5px 12px', fontSize: 12, fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer', fontFamily:"'Inter', sans-serif"
        }}>{loading ? 'Medindo…' : 'Medir agora'}</button>
      ) : faltam ? (
        <a href="/plano-pro" style={{
          color: T.blue, fontWeight: 700, textDecoration:'none', fontSize: 12
        }}>Medir quando quiser →</a>
      ) : null}
    </div>
  )
}

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
        <div style={{ marginBottom: 14, color: T.danger, display:'flex', justifyContent:'center' }}><AlertTriangle size={44}/></div>
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

// Mascara CEP: 12345-678
function maskCep(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 8)
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d
}

// Tela de onboarding OBRIGATÓRIO: busca + confirma + salva.
// Substitui a antiga NoBusinessScreen que tinha so um botao pra /comece.
// Bloqueia o /app ate o user cadastrar negocio — sem opcao de pular.
function NoBusinessScreen({ user }) {
  const [name, setName] = React.useState("")
  const [cep, setCep] = React.useState("")
  const [activity, setActivity] = React.useState("")
  const [cepFeedback, setCepFeedback] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [results, setResults] = React.useState(null)
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  // Lookup ViaCEP em background quando completar 8 digitos
  React.useEffect(() => {
    const raw = cep.replace(/\D/g, "")
    if (raw.length !== 8) {
      if (cep) setCepFeedback("Faltam dígitos…")
      else setCepFeedback("")
      return
    }
    let cancelled = false
    setCepFeedback("Buscando cidade…")
    fetch(`https://viacep.com.br/ws/${raw}/json/`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.erro) { setCepFeedback("CEP não encontrado"); return }
        setCepFeedback(`${j.localidade} / ${j.uf}${j.bairro ? " · " + j.bairro : ""}`)
      })
      .catch(() => { if (!cancelled) setCepFeedback("") })
    return () => { cancelled = true }
  }, [cep])

  async function handleSearch(e) {
    if (e) e.preventDefault()
    if (!name.trim()) { setError("Informe o nome do seu negócio"); return }
    if (cep.replace(/\D/g, "").length !== 8) { setError("Digite um CEP válido"); return }
    setError("")
    setSearching(true)
    setResults(null)
    try {
      // Query = NOME + TIPO (prioridade de match); `name` separado pro score de
      // nome no backend; CEP separado so pra desempate por proximidade.
      const q = [name, activity].filter(Boolean).join(" ")
      const r = await fetch(`/api/searchbiz?q=${encodeURIComponent(q)}&name=${encodeURIComponent(name)}&cep=${encodeURIComponent(cep)}`)
      const data = await r.json()
      if (!data.results?.length) {
        setError("Não encontramos seu negócio no Google. Tente outro nome ou cadastre primeiro em google.com/business.")
        setResults([])
      } else {
        setResults(data.results)
      }
    } catch {
      setError("Erro ao buscar. Tente novamente.")
    } finally {
      setSearching(false)
    }
  }

  async function handleSelect(biz) {
    setSaving(true)
    setError("")
    try {
      const token = localStorage.getItem("rz_token")
      const r = await fetch("/api/savebiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          place_id: biz.place_id,
          name: biz.name,
          address: biz.address || "",
          rating: biz.rating || 0,
          total: biz.total || 0,
          plan: "free"
        })
      })
      const data = await r.json()
      if (!r.ok || !data.ok) {
        setError(data.error || "Não conseguimos salvar. Tente de novo.")
        setSaving(false)
        return
      }
      // Sucesso: recarrega o app pra useRealData detectar o business novo
      window.location.reload()
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setSaving(false)
    }
  }

  const fmtDistance = (m) => {
    if (m == null) return ""
    if (m < 1000) return `${m} m`
    return `${(m / 1000).toFixed(1)} km`
  }

  return (
    <main style={{ maxWidth: 620, margin:'40px auto 80px', padding:'0 20px' }}>
      <Card style={{ padding: isCompact() ? 24 : 36 }}>
        <div style={{ textAlign:'center', marginBottom: 12, color: T.primary, display:'flex', justifyContent:'center' }}><Store size={40}/></div>
        <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: T.text, margin:'0 0 8px', letterSpacing:'-0.02em', textAlign:'center' }}>
          Falta 1 passo pra começar
        </h2>
        <p style={{ fontSize: 14, color: T.textMid, margin:'0 0 24px', lineHeight: 1.6, textAlign:'center' }}>
          Pra desbloquear seu painel, precisamos encontrar seu negócio no Google.
          <br/>
          <span style={{ fontSize: 12.5, color: T.textDim }}>Leva 1 minuto. Sem essa etapa, o sistema não tem como te ajudar.</span>
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>Nome do negócio</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Café Bella Vista"
              style={inpStyle()}
              disabled={saving}
            />
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>CEP do negócio</label>
            <input
              value={cep}
              onChange={e => setCep(maskCep(e.target.value))}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              autoComplete="postal-code"
              style={inpStyle()}
              disabled={saving}
            />
            {cepFeedback && (
              <p style={{ margin:'6px 0 0', fontSize: 11.5, color: T.textMid }}>{cepFeedback}</p>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: T.textMid, display:'block', marginBottom: 5 }}>Ramo de atuação</label>
            <input
              value={activity}
              onChange={e => setActivity(e.target.value)}
              placeholder="Ex.: Pizzaria, Clínica, Salão de Beleza…"
              style={inpStyle()}
              disabled={saving}
            />
          </div>

          {error && (
            <div style={{
              background:'#fef2f2', border:'1px solid #fecaca', borderRadius: 9,
              padding:'10px 12px', fontSize: 12.5, color:'#dc2626'
            }}>{error}</div>
          )}

          <button
            onClick={handleSearch}
            disabled={searching || saving}
            style={{
              width:'100%', background: searching ? T.textDim : T.blue, color:'#fff',
              border:'none', borderRadius: 10, padding:'12px',
              fontSize: 14, fontWeight: 700, cursor: searching ? 'wait' : 'pointer',
              marginTop: 4
            }}
          >
            {searching ? 'Buscando…' : 'Buscar no Google'}
          </button>
        </div>

        {/* Resultados da busca */}
        {results && results.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>
              Toque no seu negócio pra confirmar:
            </p>
            {results.map((r, i) => (
              <div
                key={r.place_id || i}
                onClick={() => !saving && handleSelect(r)}
                style={{
                  border:'1px solid '+T.border, borderRadius: 10, padding: 14,
                  marginBottom: 8, cursor: saving ? 'wait' : 'pointer', background: '#fff',
                  transition: 'all .15s', opacity: saving ? 0.6 : 1
                }}
                onMouseEnter={e => !saving && (e.currentTarget.style.borderColor = T.blue)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                  {r.name}
                  {i === 0 && r.distance_meters != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, background:'#E6F4EA', color:'#137333',
                      padding:'2px 7px', borderRadius: 5, marginLeft: 6, letterSpacing:'.04em'
                    }}>MAIS PRÓXIMA</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.textMid }}>
                  {r.rating || "?"} · {r.total || 0} avaliações
                  {r.distance_meters != null && ` · ${fmtDistance(r.distance_meters)} do CEP`}
                </div>
                <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 3 }}>{r.address}</div>
              </div>
            ))}
            <div style={{
              marginTop: 10, padding:'10px 12px', background:'#fefce8', border:'1px solid #fef08a',
              borderRadius: 8, fontSize: 11.5, color:'#854d0e', lineHeight: 1.5
            }}>
              <strong>Nome ou endereço diferente?</strong> Os dados vêm do Google Meu Negócio. Selecione mesmo assim e atualize no Google depois — propaga em 1-2 dias.
            </div>
          </div>
        )}

        {/* Saída de emergência: logout */}
        <div style={{ marginTop: 28, textAlign:'center', paddingTop: 16, borderTop:'1px solid '+T.border }}>
          <p style={{ fontSize: 11.5, color: T.textDim, marginBottom: 6 }}>
            Não é seu negócio? <br/>
            <a href="/" style={{ color: T.textMid, fontSize: 12, fontWeight: 600 }}
               onClick={(e) => {
                 e.preventDefault()
                 localStorage.removeItem("rz_token")
                 localStorage.removeItem("rz_user")
                 window.location.href = "/"
               }}
            >Sair da conta</a>
          </p>
        </div>
      </Card>
    </main>
  )
}

// Helpers do OnboardingMandatory (compactness + input style)
function isCompact() { return typeof window !== 'undefined' && window.innerWidth < 640 }
function inpStyle() {
  return {
    width:'100%', padding:'10px 12px', border:'1px solid '+T.border, borderRadius: 9,
    fontSize: 14, fontFamily:'inherit', outline:'none', background:'#fff', color: T.text,
    transition:'border-color .15s'
  }
}

// ─────────────────────────────────────────────────────────────
// Score StarTouch — índice 0-100 da presença local
// Composição: nota Google (50pts) + volume de avaliações (30pts) + posição relativa (20pts)
// Mostra o esforço total — quem só tem nota 5 com 3 reviews não vence quem tem 4.7 com 500.
// ─────────────────────────────────────────────────────────────
// Score StarTouch — fórmula 35/30/20/15 (definida com o dono em 2026-06-21).
// Só usa dado que temos de verdade (nada de taxa de resposta, que o Google não
// expõe). Retorna {score, factors} pra o card abrir o detalhamento "o que falta
// pros 100?". Cada fator traz earned/max + uma ação acionável pra fechar o gap.
//   • Nota Google       — 35 pts  (nota/5 × 35)
//   • Volume avaliações — 30 pts  (satura em 100 avaliações)
//   • Lugar no Google   — 20 pts  (posição média da GRADE: 1,0 = 20, 21 = 0)
//   • Perfil completo   — 15 pts  (5 cada: foto · telefone · categoria no Google)
function scoreBreakdown(d) {
  const rating  = d.kpis?.rating || 0
  const reviews = d.kpis?.reviewCount || 0
  const bi = d.businessInfo || {}

  // A CONTA NÃO MORA MAIS AQUI (02/ago). Ela está em `api/_lib/score-core.js`,
  // importada também pelo email semanal. Antes eram duas cópias com um aviso
  // pedindo pra manter em sincronia — e não estavam: o mesmo negócio aparecia
  // com 74 no painel e 59 no email, no mesmo dia. Aqui sobra só a MONTAGEM dos
  // cards de detalhe; o número é o mesmo dos dois lados, por construção.
  const g = d.gridPos
  const gridAvg = (g && g.coverage > 0 && g.score != null) ? g.score : null
  // Medido em pelo menos 1 ponto e não apareceu em NENHUM: sabemos que está
  // fora, não é falta de dado. O Hero já diz "Fora da lista" na cara dele.
  const gridForaDeTudo = !!(g && g.measured > 0 && g.coverage === 0)
  // Reserva (grade falhou/429): a lente de 1 km, que é o que o Hero mostra nesse
  // estado. `d.kpis.rankingPos` NÃO entra — é a arena que a tela contradizia.
  const lp = d.lensPos
  const lens = (!g && lp && lp.inResults && lp.rank != null && lp.total > 0) ? lp : null

  const hasPhoto = !!bi.photoUrl
  const hasPhone = !!(bi.phone && String(bi.phone).trim())
  const hasCat   = !!(bi.category && String(bi.category).trim())

  const calc = calcularScore({
    rating, reviews,
    gridAvg, gridSemCobertura: gridForaDeTudo,
    lensRank: lens ? lens.rank : null,
    lensTotal: lens ? lens.total : null,
    photo: hasPhoto, phone: hasPhone, category: hasCat,
  })
  const { score, notaPts, volPts, posPts, perfilPts, faltando } = calc

  const factors = [
    {
      key: 'nota', icon: 'star', label: 'Nota no Google',
      earned: Math.round(notaPts), max: 35,
      detail: rating ? `Sua nota é ${rating.toFixed(1).replace('.', ',')}.` : 'Você ainda não tem nota.',
      hint: rating >= 4.8
        ? 'Quase no teto — mantenha o atendimento nota 5.'
        : 'Capriche no atendimento: cada estrela a mais vale pontos aqui.'
    },
    {
      key: 'volume', icon: 'chat', label: 'Volume de avaliações',
      earned: Math.round(volPts), max: 30,
      detail: `${reviews} ${reviews === 1 ? 'avaliação' : 'avaliações'}${reviews < 100 ? ' (pontuação cheia em 100)' : ''}.`,
      hint: reviews >= 100
        ? 'Volume no topo — continue coletando pra não perder posição.'
        : `Colete mais avaliações com as placas e cartões NFC${reviews < 100 ? ` (faltam ~${100 - reviews} pra a pontuação cheia)` : ''}.`
    },
    {
      // Mesmo nome e mesmo número da tabela de concorrentes ("Lugar no Google").
      key: 'posicao', icon: 'mappin', label: 'Seu lugar no Google',
      earned: Math.round(posPts), max: 20,
      // O TEXTO usa os dois fatos separados (lugar onde aparece + em quantos
      // pontos), igual ao Hero e à tabela. A CONTA acima continua usando o valor
      // punido, porque sumir tem que custar pontos — mas dizer "posição 8,4"
      // aqui brigaria com o "5,3º" do topo. Explicar os dois resolve os dois.
      detail: gridAvg != null
        ? `Você aparece no ${(g.avg != null ? g.avg : gridAvg).toFixed(1).replace('.', ',')}º lugar pra quem busca ${g.term} por perto`
          + (g.coverage < g.measured ? `, mas só em ${g.coverage} dos ${g.measured} lugares testados.` : `, nos ${g.measured} lugares testados.`)
        : gridForaDeTudo
          ? `Testamos ${g.measured} lugares ao redor do seu endereço e você não aparece em nenhum pra quem busca ${g.term}.`
          : lens ? `${lens.rank}º de ${lens.total} negócios ${raioTxt((lens.radiusKm || 1) * 1000)}.`
          : 'Ainda não conseguimos medir sua posição.',
      hint: gridAvg != null
        ? (gridAvg <= 3
            ? 'Você já aparece no topo — continue coletando avaliações pra não perder o lugar.'
            : 'O que mais move essa posição: perfil completo no Google e avaliações novas toda semana.')
        : gridForaDeTudo
          ? 'Confira se a categoria do seu Google é a que as pessoas de fato buscam e complete o perfil — sem aparecer, o resto rende pouco.'
          : lens
            ? 'O que mais move essa posição: perfil completo no Google e avaliações novas toda semana.'
            : 'Assim que a medição rodar, sua posição entra na conta.'
    },
    {
      key: 'perfil', icon: 'id', label: 'Perfil completo no Google',
      earned: perfilPts, max: 15,
      detail: faltando.length ? `Falta: ${faltando.join(', ')}.` : 'Foto, telefone e categoria preenchidos. ',
      hint: faltando.length
        ? 'Complete seu perfil no Google Meu Negócio — leva minutos e fecha esses pontos hoje.'
        : 'Perfil completo — nada a fazer aqui.'
    },
  ]
  return { score, factors }
}

function calcStarTouchScore(d) {
  return scoreBreakdown(d).score
}

// Detalhamento do Score — modal "Por que {score}? O que falta pros 100?".
// Mostra cada fator (ganho/máximo + barra) e a ação acionável pra fechar o gap.
// Honestidade: explicita o que NÃO entra na conta hoje (taxa de resposta e
// recência — não temos esse dado do Google ainda).
function ScoreModal({ d, onClose, isGuest, signupUrl }) {
  const { score, factors } = scoreBreakdown(d)
  const faltam = 100 - score

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // GA4: impressão da trava (só no modo prévia/convidado) — pra medir conversão.
  React.useEffect(() => {
    if (!isGuest) return
    try { if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'score_breakdown_gate_view') } catch {}
  }, [isGuest])

  const scoreColor = score >= 80 ? T.green : score >= 55 ? T.amber : T.red

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:'fixed', inset: 0, background:'rgba(15,23,42,.55)',
        display:'grid', placeItems:'center', zIndex: 100, padding: 16,
        animation:'fadeIn .15s ease-out', overflowY:'auto'
      }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <Card padded={false} style={{ padding: 24, maxWidth: 480, width:'100%', position:'relative', margin:'auto' }}>
        <button onClick={onClose} aria-label="Fechar" style={{
          position:'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 8,
          border:'none', background:'transparent', color: T.textMid, fontSize: 20, cursor:'pointer'
        }}>×</button>

        {/* Cabeçalho — score grande + leitura */}
        <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 6 }}>
          <span style={{ display:'inline-flex', color: T.accent }}><Award size={24}/></span>
          <div style={{ display:'flex', alignItems:'baseline', gap: 6 }}>
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize: 40, fontWeight: 700, color: scoreColor, lineHeight: 1, letterSpacing:'-0.03em' }}>{score}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: T.textDim }}>/ 100</span>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.5 }}>
          {faltam > 0
            ? <>Seu Score StarTouch é <b>{score}</b>. Veja de onde vêm os pontos e o que falta pros <b>{faltam}</b> que sobram.</>
            : <>Score máximo. Seu negócio tá com a presença local completa pela nossa fórmula.</>}
        </p>

        {/* Fatores. Convidado: só o 1º fator revelado; os demais com blur (só a
            pontuação legível) + trava. Logado: todos abertos (nada muda). */}
        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
          {factors.map((f, idx) => {
            const pct = f.max > 0 ? Math.round((f.earned / f.max) * 100) : 0
            const full = f.earned >= f.max
            const barColor = full ? T.green : pct >= 50 ? T.blue : T.amber
            const locked = isGuest && idx > 0

            if (locked) {
              return (
                <div key={f.key} style={{ position:'relative', padding: 14, background: T.bg, borderRadius: 12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                  <div style={{ filter:'blur(6px)', userSelect:'none', pointerEvents:'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 7, marginBottom: 8 }}>
                      <Ico name={f.icon} size={15}/><span style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{f.label}</span>
                    </div>
                    <div style={{ height: 6, background: T.border, borderRadius: 99, overflow:'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${pct}%`, height:'100%', background: barColor, borderRadius: 99 }} />
                    </div>
                    <p style={{ fontSize: 12.5, color: T.textMid, margin: 0, lineHeight: 1.45 }}>{f.detail}</p>
                  </div>
                  {/* Overlay: trava + pontuação legível */}
                  <div style={{ position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center', gap: 8, background:'rgba(248,250,252,0.35)' }}>
                    <Lock size={16} color={T.textMid}/>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>+{Math.round(f.earned)} pts</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={f.key} style={{ padding: 14, background: T.bg, borderRadius: 12, border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text, display:'flex', alignItems:'center', gap: 7 }}>
                    <span style={{ display:'inline-flex', marginRight:2 }}><Ico name={f.icon} size={15}/></span>{f.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: full ? T.green : T.textMid, whiteSpace:'nowrap' }}>
                    {f.earned}<span style={{ color: T.textDim, fontWeight: 500 }}> / {f.max} pts</span>
                  </span>
                </div>
                <div style={{ height: 6, background: T.border, borderRadius: 99, overflow:'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${pct}%`, height:'100%', background: barColor, borderRadius: 99, transition:'width .3s' }} />
                </div>
                <p style={{ fontSize: 12.5, color: T.textMid, margin:'0 0 2px', lineHeight: 1.45 }}>{f.detail}</p>
                {!full && <p style={{ fontSize: 12.5, color: T.blueDk, margin: 0, lineHeight: 1.45, fontWeight: 500 }}>→ {f.hint}</p>}
              </div>
            )
          })}
        </div>

        {isGuest ? (
          /* CTA primário do gate — mesmo destino do fluxo de criar conta */
          <a href={signupUrl || '/ativar?from=web'}
            onClick={() => { try { window.gtag && window.gtag('event', 'score_breakdown_gate_click') } catch {} }}
            style={{
              marginTop: 16, width:'100%', minHeight: 48, background: T.primary, color:'#fff', textDecoration:'none',
              borderRadius: 12, padding:'12px 18px', fontSize: 14, fontWeight: 700, fontFamily:"'Inter', sans-serif",
              display:'flex', alignItems:'center', justifyContent:'center', gap: 6
            }}>
            Criar conta grátis e ver tudo <ChevronRight size={16}/>
          </a>
        ) : (
          /* Rodapé honesto — o que ainda não entra na conta (só logado) */
          <p style={{ fontSize: 11.5, color: T.textDim, margin:'16px 0 0', lineHeight: 1.5, borderTop:`1px solid ${T.border}`, paddingTop: 12 }}>
            Ainda não contamos <b>taxa de resposta às avaliações</b> nem <b>recência</b> — o Google não expõe esses dados de forma confiável hoje. Quando der, entram na fórmula.
          </p>
        )}
      </Card>
    </div>
  )
}

// Subtítulo HONESTO da saudação — só afirma o que tem base (sem "está
// crescendo" no vazio). Prioridade alta (subiu posição / ganhou avaliações
// na semana) depende de histórico — pausado por ora, então fica de fora.
//
// A média da região sai da GRADE (03/ago), a mesma lista que o dono lê logo
// abaixo. Vinha do /api/competitors: outros vizinhos, outro raio — a frase
// dizia "acima da média" enquanto a tabela na tela mostrava concorrentes com
// nota maior. Sem grade, não afirma nada.
function greetingSubtitle(d, grid) {
  const comps = (grid?.ranking || []).filter(c => !c.is_me && typeof c.rating === 'number')
  if (comps.length) {
    const avg = comps.reduce((s, c) => s + c.rating, 0) / comps.length
    if ((d.kpis.rating || 0) > avg + 0.05) return 'Sua nota está acima da média dos concorrentes por perto · atualizado agora'
  }
  return 'Veja como está sua presença local · atualizado agora'
}

// ─────────────────────────────────────────────────────────────
// Main layout
// ─────────────────────────────────────────────────────────────
export default function AppV2({ user = null, onLogout, demoMode = false, guestMode = false, guestContext = null } = {}) {
  const isMobile = useIsMobile(768)
  // Deep-link inicial: ?tab=X (vence) OU hash #conta|#negocio|#plano (vai pra config) OU painel
  // Abas Pro escondidas temporariamente — bloqueadas também por acesso direto
  // (?tab=concorrentes etc cai no painel). Reexibir: esvaziar HIDDEN_TABS.
  const HIDDEN_TABS = ['concorrentes', 'alertas', 'relatorios']
  const initialTab = (() => {
    if (typeof window === 'undefined') return 'painel'
    const qsTab = new URLSearchParams(window.location.search).get('tab')
    if (qsTab && !HIDDEN_TABS.includes(qsTab)) return qsTab
    if (qsTab && HIDDEN_TABS.includes(qsTab)) return 'painel'
    const hash = window.location.hash.replace('#', '')
    if (['conta', 'negocio', 'plano'].includes(hash)) return 'config'
    return 'painel'
  })()
  const [tab, setTab] = React.useState(initialTab)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [activatePlateOpen, setActivatePlateOpen] = React.useState(false)
  const [scoreOpen, setScoreOpen] = React.useState(false)  // detalhamento do Score StarTouch

  // Hashes válidos por aba (preservados ao trocar de aba — outros são limpos)
  const VALID_HASHES_BY_TAB = {
    config: ['conta', 'negocio', 'plano'],
    painel: ['pontos-de-captacao']
  }

  // Sincroniza URL com state — copiar/colar e F5 mantêm aba correta
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (tab === 'painel') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }
    // Limpa hash se não for válido pra aba atual
    const currentHash = url.hash.replace('#', '')
    const validHashes = VALID_HASHES_BY_TAB[tab] || []
    if (currentHash && !validHashes.includes(currentHash)) {
      url.hash = ''
    }
    window.history.replaceState({}, '', url.toString())
  }, [tab])

  // Helper pra navegar de bottom sheet "Mais" → tab + anchor opcional
  const navigateFromMore = React.useCallback((newTab, hash) => {
    // A Loja é uma página única (/kit): vitrine + carrinho + checkout.
    // Clicar em "Loja" em qualquer nav abre o /kit direto (sem aba interna).
    if (newTab === 'loja') {
      if (typeof window !== 'undefined') window.location.href = '/kit'
      return
    }
    if (typeof window !== 'undefined' && hash) {
      window.location.hash = hash
    }
    setTab(newTab)
  }, [])

  // Deep-link ?tab=loja (ou estado herdado): redireciona pro /kit.
  React.useEffect(() => {
    if (tab === 'loja' && typeof window !== 'undefined') window.location.href = '/kit'
  }, [tab])

  // Carrega dados reais via API (skipa em demoMode ou sem user/convidado)
  const real = useRealData(user, demoMode, guestMode, guestContext)

  // Analytics: dispara 1x quando o painel é visto em modo CONVIDADO (sem cadastro).
  // Identifica esse fluxo no GA4 (evento "guest_panel_view") e Meta Pixel.
  const guestPanelViewed = guestMode && !!guestContext?.placeId && real.hasBusiness && !real.loading
  React.useEffect(() => {
    if (!guestPanelViewed) return
    // Persiste o negócio do convidado — o /ativar lê isto pra NÃO pedir a
    // empresa de novo, independente do caminho até o cadastro (banner/Login/Pro).
    try {
      localStorage.setItem('rz_guest_biz', JSON.stringify({
        placeId: guestContext?.placeId || '',
        keyword: guestContext?.keyword || ''
      }))
    } catch {}
    trackFunnel('guest_panel_view', {
      place_id: guestContext?.placeId || '',
      keyword: guestContext?.keyword || ''
    })
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('trackCustom', 'GuestPanelView', { place_id: guestContext?.placeId || '' })
      }
    } catch {}
  }, [guestPanelViewed])

  // Analytics: view_panel (spec 7) — 1x por montagem do painel, com o modo (preview|logged).
  const panelReady = !real.loading && (real.hasBusiness || demoMode)
  const viewFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (!panelReady || viewFiredRef.current) return
    viewFiredRef.current = true
    const mode = (guestMode && !!guestContext?.placeId) ? 'preview' : 'logged'
    try { if (typeof window !== 'undefined' && window.gtag) window.gtag('event', 'view_panel', { mode }) } catch {}
  }, [panelReady])

  // Scroll automático pro elemento do hash quando muda de aba ou termina o loading
  // (DEPOIS do `real` ser declarado pra evitar temporal dead zone)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const validHashes = VALID_HASHES_BY_TAB[tab] || []
    if (!validHashes.includes(hash)) return
    // Atraso pra DOM montar
    setTimeout(() => {
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
    }, 120)
  }, [tab, real.loading])

  // Plano real vence sobre URL em modo logado. URL override só rola em demo.
  // Admin (email hardcoded) tbm vê tudo como Pro automaticamente.
  const plan = getPlan(demoMode ? null : real.biz, demoMode, user)

  // Compõe dados: real sobrescreve mock; mock preenche lacunas
  const d = buildData(real, user, demoMode)

  // Lentes MOCK pro modo demo — o VisibilityLenses real busca via API; no demo,
  // alimenta o mesmo componente (abas 1/3km) com os dados de exemplo do MOCK.
  const demoLenses = React.useMemo(() => {
    if (!demoMode) return undefined
    const me = (d.ranking || []).find(r => r.you)
    const top = (d.ranking || []).map(r => ({ pos: r.pos, name: r.name, rating: r.rating, reviews: r.reviews, isMe: !!r.you }))
    const lens = (key, label, radiusKm, total) => ({ key, label, radiusKm, total, rank: me ? me.pos : null, inResults: !!me, top })
    return { lenses: [lens('perto', 'Bem perto de você', 1, 8), lens('regiao', 'Na sua região', 3, 12)], anchoredAt: 'negocio' }
  }, [demoMode, d])

  // A GRADE VEM PRIMEIRO (01/ago). Ela é a fonte oficial do Hero e da lista; as
  // lentes viraram só a reserva de quando ela falha. A ordem aqui não é estética:
  // é ela que permite as lentes esperarem o veredito da grade em vez de gastarem
  // chamada em paralelo. Antes as duas disparavam juntas em TODA abertura de
  // painel e o resultado das lentes ia direto pro lixo — R$0,47 por medição.
  const { grid: gridData, error: gridError, loading: gridLoading, refetch: refetchGrid, remeasure: remeasureGrid } = useGridData({ placeId: guestContext?.placeId || d.biz?.placeId, terms: guestContext?.terms })
  const gpRaw = gridData?.terms?.[0]
  const gradeResolveu = !gridLoading && !!(gpRaw && gpRaw.measured > 0)

  // Lentes 1/3km — RESERVA. Só busca quando a grade já respondeu e não serviu.
  // No demo continua usando o mock (sem rede), como antes.
  const lensState = useLensesData({
    placeId: guestContext?.placeId || d.biz?.placeId,
    // Mesma busca do resto da tela: a que o dono salvou (`category_override`,
    // dentro de activeCategory) ou a categoria do Google. Antes vinha do
    // /api/competitors, terceira fonte de termo no mesmo painel.
    term: d.activeCategory || '',
    cep: guestContext?.cep || '',
    mock: demoLenses,
    enabled: !gridLoading && !gradeResolveu
  })
  const heroPos = pertoLensInfo(lensState.data)
  // measured === 0 → o Places falhou em TODOS os pontos. Não sabemos nada; cair
  // no fallback das lentes é melhor que anunciar "Fora da lista" (que seria
  // inventar uma má notícia a partir de uma falha de infraestrutura).
  const gridPrimary = gradeResolveu ? gpRaw : null
  // Pendura a grade no `d` pra o Score StarTouch enxergar a MESMA posição do Hero
  // (ver a nota longa em scoreBreakdown). Feito por injeção, e não trocando a
  // assinatura de scoreBreakdown, porque ela é chamada de 3 lugares (Hero, modal
  // do score, ação da semana) e todos recebem `d`: mudar 3 assinaturas é convite
  // pra um deles ficar lendo a fonte velha e o painel voltar a se contradizer.
  // Seguro: buildData() devolve um objeto novo a cada render, não um compartilhado.
  d.gridPos = gridPrimary
  d.lensPos = heroPos      // fallback do score quando a grade falha (mesmo do Hero)
  // ARGUMENTO DO CONVIDADO (tarja + exit-intent) — FONTE ÚNICA COM O HERO.
  // Bug de 30/jul: a tarja vinha de `d.kpis` (ranking do /api/competitors, que é
  // outra arena: um raio só, ordem crua do Google) enquanto o Hero vinha da
  // GRADE. As duas discordavam na mesma tela — a Blue Bike lia "1º de 13" no
  // topo e "faltam 293 avaliações pro 2º lugar" na tarja. Quem é 1º não tem
  // ninguém na frente; o número mais alarmante ganhava e destruía a credibilidade
  // dos dois. Agora o pitch sai da MESMA lista que o dono vê logo abaixo.
  const guestPitch = React.useMemo(() => {
    const g = gridPrimary
    const rows = Array.isArray(g?.ranking) ? g.ranking : null
    if (g && g.coverage > 0 && rows && rows.length) {
      // NADA DE ORDINAL AQUI TAMBÉM (01/ago). A tarja dizia "na frente dos
      // outros 23" quando o ordinal era 1 — e o ordinal sai 1 pra 17 de cada 20
      // negócios, por construção da grade. Era a mesma mentira do Hero, servida
      // pro visitante que ainda nem é cliente. O argumento agora é o BLOCO DOS
      // 3 PRIMEIROS: verificável, e é a dor de verdade — quem não está nos 3
      // não é visto, e é isso que a StarTouch conserta.
      const pts = (g.points || []).filter(p => p.ok)
      const top3 = pts.filter(p => p.rank != null && p.rank <= 3).length
      const i = rows.findIndex(r => r.is_me)
      // Quantas avaliações a mais tem quem aparece melhor que ele? Se não tiver
      // mais, não inventa causa — o gap some e a tarja usa só a cobertura.
      const gap = i > 0 ? (Math.max(0, (rows[i - 1].reviews || 0) - (rows[i].reviews || 0)) || null) : null
      return { posicao: g.score, top3, medidos: pts.length, gap }
    }
    // SEM GRADE → tarja GENÉRICA, de propósito. A tentação é cair no
    // /api/competitors pra não perder a personalização, mas ali o negócio pode
    // parecer líder numa arena que a tela não mostra — a tarja gritaria contra
    // o próprio painel. Argumento específico só com a medição que está na tela.
    return { posicao: null, top3: null, medidos: null, gap: null }
  }, [gridPrimary])

  // Categoria mostrada e URL do perfil do Google (p/ "corrigir categoria" / "Responder").
  const lensCategory = lensState.data?.term || d.activeCategory || 'sua categoria'
  const googleProfileUrl = (guestContext?.placeId || d.biz?.placeId)
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(guestContext?.placeId || d.biz?.placeId)}`
    : 'https://business.google.com/'

  // Header usa nome do negócio real
  const headerBizName = d.biz.name

  // Modo convidado SEM negócio escolhido → tela de busca (porta única, sem login)
  if (guestMode && !guestContext?.placeId) {
    return <GuestSearch isMobile={isMobile} />
  }

  // Estados especiais — early return mantém Header pra usuário não ficar perdido
  if (real.loading) {
    return (
      <div style={{ background: T.bg, minHeight:'100vh' }}>
        <Header bizName={user?.email || 'Carregando…'} plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <LoadingScreen/>
      </div>
    )
  }
  // Token expirado/inválido — limpa storage e força re-login (sem tela de erro confusa)
  if (real.authExpired) {
    return (
      <div style={{ background: T.bg, minHeight:'100vh' }}>
        <Header bizName="StarTouch" plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <main style={{ maxWidth: 480, margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
          <Card style={{ padding: 32 }}>
            <div style={{ marginBottom: 14, color: T.primary, display:'flex', justifyContent:'center' }}><Lock size={44}/></div>
            <h2 style={{ fontFamily:"'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: T.text, margin:'0 0 8px' }}>
              Sua sessão expirou
            </h2>
            <p style={{ fontSize: 13.5, color: T.textMid, margin:'0 0 18px', lineHeight: 1.55 }}>
              Pra continuar protegendo seus dados, a gente desconecta automaticamente depois de um tempo. Faça login de novo pra retomar.
            </p>
            <button onClick={() => {
              // Limpa a sessão e força a tela de Login (?login=1). NÃO usar
              // onLogout puro: ele só zera o user e o /app recai em modo
              // convidado (porta única) em vez de mostrar o login.
              try { localStorage.removeItem('rz_token'); localStorage.removeItem('rz_user') } catch {}
              window.location.href = '/app?login=1'
            }} style={{
              background: T.blue, color:'#fff', border:'none', borderRadius: 9,
              padding:'11px 22px', fontSize: 14, fontWeight: 700, cursor:'pointer'
            }}>Fazer login de novo</button>
          </Card>
        </main>
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
        <Header bizName="Configure seu negócio" plan="free" isMobile={isMobile} user={user} onLogout={onLogout} demoMode={demoMode} />
        <NoBusinessScreen user={user}/>
      </div>
    )
  }

  // Convidado vendo o painel (place_id presente) — tarja + gating de ações.
  const isGuest = guestMode && !!guestContext?.placeId
  const guestSignupUrl = isGuest
    ? `/ativar?from=web&place_id=${encodeURIComponent(guestContext.placeId)}` +
      (guestContext.keyword ? `&keyword=${encodeURIComponent(guestContext.keyword)}` : '')
    : null

  return (
    <div style={{
      background: T.bg, minHeight:'100vh',
      // Espaço pro bottom tab bar não cobrir o conteúdo final (só mobile)
      paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0))' : 0
    }}>
      {isGuest && <GuestBanner
        url={guestSignupUrl}
        isMobile={isMobile}
        bizName={d.businessInfo?.name || d.biz?.name || ''}
        term={gridPrimary?.term || null}
        spacingM={gridPrimary?.spacingM}
        {...guestPitch}
      />}
      {isGuest && <ExitIntentModal
        url={guestSignupUrl}
        isMobile={isMobile}
        bizName={d.businessInfo?.name || d.biz?.name || ''}
        term={gridPrimary?.term || null}
        spacingM={gridPrimary?.spacingM}
        {...guestPitch}
      />}
      <Header bizName={headerBizName} plan={plan} isMobile={isMobile} onNavigate={setTab} user={user} onLogout={isGuest ? () => { window.location.href = '/app' } : onLogout} demoMode={demoMode} guest={isGuest} signupUrl={guestSignupUrl} />
      {!isMobile && <TopTabs active={tab} onChange={navigateFromMore} plan={plan} isMobile={false} />}

      {/* A aba CONCORRENTES foi REMOVIDA em 03/ago. Ela era uma tela inteira
          (mapa, simulador, oportunidades) construída sobre o /api/competitors —
          a arena velha. Estava escondida do menu havia meses, então ninguém a
          via; o risco era religá-la um dia e o painel voltar a se contradizer
          sozinho, que é exatamente como o bug de 30/jul nasceu. Quando o Pro
          existir, essa tela nasce de novo lendo a GRADE. A lista de
          concorrentes que o cliente vê hoje é a do Painel (GridRankingList). */}

      {/* Aba: ALERTAS — free pra logado; convidado precisa de conta (email) */}
      {tab === 'alertas' && (isGuest
        ? <GuestGate url={guestSignupUrl} feature="os alertas do seu ranking" isMobile={isMobile}/>
        : <AlertsScreen data={d} isMobile={isMobile} isReal={!demoMode && real.hasBusiness} userEmail={user?.email}/>
      )}

      {/* Aba: RELATÓRIOS — free pra logado; convidado precisa de conta */}
      {tab === 'relatorios' && (isGuest
        ? <GuestGate url={guestSignupUrl} feature="os relatórios semanais" isMobile={isMobile}/>
        : <ReportsScreen data={d} isMobile={isMobile} isReal={!demoMode && real.hasBusiness}/>
      )}

      {/* Aba LOJA virou página única (/kit) — clicar em "Loja" abre o /kit
          (vitrine + carrinho + checkout). Sem render interno; ver navigateFromMore. */}

      {/* Aba: AVALIAÇÕES — lista todas as reviews do Google (free + pro) */}
      {tab === 'avaliacoes' && (
        <ReviewsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Tela: CONFIGURAÇÕES — acessível via dropdown do avatar (convidado vê gate) */}
      {tab === 'config' && (
        isGuest
          ? <GuestGate url={guestSignupUrl} feature="as configurações" isMobile={isMobile}/>
          : <ConfigScreen data={d} isMobile={isMobile} plan={plan} isReal={!demoMode && real.hasBusiness} isAdmin={isAdminUser(user)}/>
      )}

      {/* Fallback p/ abas desconhecidas (as Pro já são tratadas acima com preview).
          'concorrentes' voltou pra cá quando a tela saiu (03/ago): sem tela E sem
          fallback, um link velho renderizaria uma página em branco. */}
      {tab !== 'painel' && tab !== 'alertas' && tab !== 'relatorios' && tab !== 'loja' && tab !== 'avaliacoes' && tab !== 'config' && (
        <ComingSoon
          icon={tab === 'concorrentes' ? 'trophy' : tab === 'alertas' ? 'bell' : tab === 'relatorios' ? 'trendup' : 'star'}
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
      <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 96px' : '32px 32px 96px' }}>

        {/* TITLE */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Olá, {d.biz.name}.
          </h1>
          <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
            {demoMode ? 'Veja como seu negócio está crescendo · atualizado agora' : greetingSubtitle(d, gridPrimary)}
          </p>
        </div>

        {/* BLOCO 1 — HERO: placar de 5 segundos (score + posição + mini-cards). Spec 3. */}
        <Section>
          <HeroBlock
            gridPos={gridPrimary}
            d={d}
            position={heroPos}
            demoMode={demoMode}
            isMobile={isMobile}
            onScoreDetails={() => { try { window.gtag && window.gtag('event', 'click_score_details') } catch {} ; setScoreOpen(true) }}
            onSeeCompetitors={() => { const el = document.getElementById('bloco-concorrentes'); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }) }}
          />
        </Section>

        {/* BLOCO 2 — Widget Radar IA. Só pra CONTAS COM CADASTRO: exige negócio
            real salvo (d.biz.id). Convidado (biz.id null) e demo (sem id) não veem. */}
        {!guestMode && !demoMode && d?.biz?.id && <RadarWidgetSlot d={d} isMobile={isMobile} />}

        {/* O GATILHO PRO (FOMO) saiu junto (03/ago): estava desligado por
            `false &&` desde que decidimos não vender Pro ainda, e o texto dele
            ("N concorrentes acelerando") vinha do crescimento semanal do
            /api/competitors — dado que o painel não busca mais. Quando o Pro
            voltar, o gatilho se apoia no histórico da grade. */}

        {/* BLOCO 3 — Ação da semana (1 só).
            Convidado: portão suave — teaser do "acompanhar" (evolução/alertas/ação).
            Logado — Demo: itens MOCK. Real: calculadas do estado competitivo. */}
        <Section>
          <WeeklyAction d={d} demoMode={demoMode} isMobile={isMobile} placeId={d.biz.placeId}
            onActivate={() => { if (isGuest) { window.location.href = guestSignupUrl; return } setActivatePlateOpen(true) }} />
        </Section>

        {/* BLOCO 4 — Concorrentes por perto: lentes 1km/3km + categoria. Spec 3.
            TermBar em cima: deixa EXPLÍCITA a categoria de comparação e permite trocá-la. */}
        {(demoMode || (real.hasBusiness && (guestContext?.placeId || d.biz?.placeId))) && (
        <Section>
          <div id="bloco-concorrentes" style={{ scrollMarginTop: 72 }} />
          {/* Ranking por GRADE. Aberto pra qualquer place_id, inclusive convidado
              sem login — decisão de 09/07: o ranking é tudo free. Entregamos o
              diagnóstico inteiro e vendemos o conserto (pacote de IA, placas),
              não a informação. O custo é contido por cache + freio por IP no
              endpoint, não por paywall. */}
          {/* ORDEM DE LEITURA (30/jul): primeiro QUAL busca está sendo medida,
              depois QUEM ganha essa busca, e só no fim as outras buscas. Antes
              era o inverso — a lista de concorrentes vinha antes de o dono saber
              de que busca se tratava, e o controle de trocar a busca aparecia
              depois de tudo, parecendo enfeite. */}
          {!demoMode && (
            /* A BUSCA MOSTRADA É A BUSCA MEDIDA (03/ago). O rótulo vinha do
               /api/competitors — a arena velha, com o tipo cru do Google
               ("bakery") — enquanto a grade logo abaixo media outro termo
               ("padaria"). Duas buscas na mesma tela, e o botão "Trocar busca"
               mudava só o rótulo: a grade ignorava a escolha do dono. Agora o
               rótulo é `gridPrimary.term`, o termo que de fato foi medido, e o
               backend obedece o que ele salvou. Enquanto a grade carrega (ou
               quando ela falha e as lentes assumem), cai na categoria ativa —
               que é a mesma fonte que as lentes usam. */
            <TermBar
              term={gridPrimary?.term || d.activeCategory || ''}
              spacingM={gridPrimary?.spacingM}
              isGuest={isGuest}
              placeId={guestContext?.placeId || d.biz?.placeId}
              isMobile={isMobile}
            />
          )}
          {/* Com a grade disponível, a LISTA vem dela (fonte única com o Hero).
              Sem grade (fallback), usa as lentes 1/3km antigas. */}
          {gridPrimary ? (
            <GridRankingList data={gridPrimary} isGuest={isGuest} signupUrl={guestSignupUrl} />
          ) : (gridError || lensState.error) && !lensState.loading && !(lensState.data?.lenses?.length) ? (
            /* As DUAS medições falharam (ou foram barradas): mostra a falha em
               vez de esconder o bloco e deixar parecer "sem concorrente". */
            <RankingUnavailable
              status={lensState.error?.status || gridError?.status}
              onRetry={() => { refetchGrid(); lensState.refetch() }}
            />
          ) : (
            <VisibilityLenses
              data={lensState.data}
              loading={lensState.loading}
              isMobile={isMobile}
              googleUrl={googleProfileUrl}
              category={lensCategory}
              isGuest={isGuest}
              signupUrl={guestSignupUrl}
              // Uma medição só: lentes e grade envelhecem juntas, então remedir
              // renova as DUAS — senão o botão atualiza os concorrentes e deixa
              // o número grande do Hero para trás.
              onRemeasure={() => { lensState.remeasure(); remeasureGrid() }}
            />
          )}
          {gridData?.terms?.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <RankingGrid data={gridData} />
            </div>
          )}
        </Section>
        )}


        {/* BLOCO 5 — Avaliações recentes (mesmo layout em demo e real; o ranking
            já está nas lentes 1/3km acima). */}
        <Section>
          <RecentReviews items={d.recentReviews} trend={demoMode ? d.trend : null} isMobile={isMobile} onSeeAll={() => setTab('avaliacoes')} />
        </Section>

        {/* CAPTURE POINTS — id pra scroll automático de /app#pontos-de-captacao */}
        <Section id="pontos-de-captacao">
          <CapturePoints items={d.capturePoints} plates={d.activePlates} businessId={d.biz.id} isAdmin={isAdminUser(user)} reviewCount={d.kpis.reviewCount} isMobile={isMobile} />
        </Section>

        {/* O card "Acompanhe sua evolução — crie conta grátis" SAIU (03/ago).
            Ele prometia três coisas de graça por criar conta (evolução semanal,
            alerta de ultrapassagem, ação da semana) — e essas passam a ser da
            mensalidade. Prometer no rodapé o que vai ser pago é começar a
            relação devendo. */}

      </main>
      )}

      {/* Bottom Tab Bar — só mobile, 4 itens + "Mais" abre sheet */}
      {isMobile && (
        <>
          <BottomTabBar
            active={tab}
            onChange={navigateFromMore}
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

      {/* Modal global de ativação de dispositivo — disparado pelo HeroPosition (Gerar mais avaliações) */}
      {activatePlateOpen && (
        <ActivatePlateModal
          businessId={d.biz.id}
          onClose={() => setActivatePlateOpen(false)}
        />
      )}

      {/* Detalhamento do Score StarTouch — "Por que {score}? O que falta?" */}
      {scoreOpen && (
        <ScoreModal d={d} onClose={() => setScoreOpen(false)} isGuest={isGuest} signupUrl={guestSignupUrl} />
      )}

      {/* WhatsApp de suporte — flutuante em todas as telas do /app */}
      <SupportFAB isMobile={isMobile} />
    </div>
  )
}
