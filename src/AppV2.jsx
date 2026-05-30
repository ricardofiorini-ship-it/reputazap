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
  competitors: [
    { id: 1,  pos: 1,  medal:'🥇', name:'Empresa A',        rating: 5.0, reviews: 25, weekGrowth: +3, history:[18,19,20,21,21,22,23,24,24,24,25,25], color:'#F59E0B', initials:'EA' },
    { id: 2,  pos: 2,  medal:'🥈', name:'Empresa B',        rating: 5.0, reviews: 14, weekGrowth: +1, history:[10,10,11,11,11,12,12,13,13,13,14,14], color:'#10B981', initials:'EB' },
    { id: 3,  pos: 3,  medal:'🥉', name:'Café Bella Vista', rating: 5.0, reviews: 12, weekGrowth: +2, history:[5,5,6,6,7,7,8,9,10,11,11,12],         color:'#1A73E8', initials:'CB', isYou: true },
    { id: 4,  pos: 4,            name:'Empresa C',        rating: 4.9, reviews: 11, weekGrowth:  0, history:[10,10,10,11,11,11,11,11,11,11,11,11], color:'#8B5CF6', initials:'EC' },
    { id: 5,  pos: 5,            name:'Empresa D',        rating: 4.8, reviews: 9,  weekGrowth: +1, history:[5,5,6,6,6,7,7,7,8,8,8,9],             color:'#EC4899', initials:'ED' },
    { id: 6,  pos: 6,            name:'Empresa E',        rating: 4.8, reviews: 9,  weekGrowth:  0, history:[8,8,8,8,8,8,9,9,9,9,9,9],              color:'#06B6D4', initials:'EE' },
    { id: 7,  pos: 7,            name:'Empresa F',        rating: 4.7, reviews: 8,  weekGrowth: +2, history:[4,4,5,5,5,6,6,6,7,7,8,8],              color:'#84CC16', initials:'EF' },
    { id: 8,  pos: 8,            name:'Empresa G',        rating: 4.7, reviews: 7,  weekGrowth:  0, history:[6,6,7,7,7,7,7,7,7,7,7,7],              color:'#F97316', initials:'EG' },
    { id: 9,  pos: 9,            name:'Empresa H',        rating: 4.6, reviews: 6,  weekGrowth: +1, history:[3,3,4,4,4,4,5,5,5,5,6,6],              color:'#06B6D4', initials:'EH' },
    { id: 10, pos: 10,           name:'Empresa I',        rating: 4.5, reviews: 5,  weekGrowth:  0, history:[5,5,5,5,5,5,5,5,5,5,5,5],              color:'#A855F7', initials:'EI' },
    { id: 11, pos: 11,           name:'Empresa J',        rating: 4.4, reviews: 4,  weekGrowth:  0, history:[3,3,3,3,4,4,4,4,4,4,4,4],              color:'#14B8A6', initials:'EJ' },
    { id: 12, pos: 12,           name:'Empresa K',        rating: 4.2, reviews: 3,  weekGrowth: -1, history:[5,5,5,5,4,4,4,4,4,3,3,3],              color:'#EF4444', initials:'EK' }
  ],
  // Minhas metas (gamificação)
  goals: [
    { label:'Top 5', achieved: true,  reviewsToNext: 0, progressPct: 100 },
    { label:'Top 3', achieved: true,  reviewsToNext: 0, progressPct: 100, current: true },
    { label:'Top 2', achieved: false, reviewsToNext: 2, progressPct: 86,  target:'Empresa B (14 av.)' },
    { label:'Top 1', achieved: false, reviewsToNext: 14, progressPct: 48, target:'Empresa A (25 av.)' }
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
        { type:'risk', icon:'⚠️', text:'Empresa F está crescendo rápido (+2 av.)' }
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
        { type:'risk', icon:'⚠️', text:'Empresa A continua crescendo forte (+8 av. no mês)' }
      ],
      competitorComparison: [
        { name:'Empresa A',         pos: 1, reviews: 25, weekChange: +8 },
        { name:'Empresa B',         pos: 2, reviews: 14, weekChange: +4 },
        { name:'Café Bella Vista',  pos: 3, reviews: 12, weekChange: +7, isYou: true },
        { name:'Empresa C',         pos: 4, reviews: 11, weekChange: +1 }
      ],
      opportunities: [
        { icon:'📈', text:'Sua nota subiu de 4.8 pra 5.0 no mês — capitalize isso com posts e flyers.' },
        { icon:'🎯', text:'Mantendo o ritmo de 7 av./mês, em 60 dias você ultrapassa a Empresa A.' },
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

function getPlan() {
  if (typeof window === 'undefined') return 'pro'
  const p = new URLSearchParams(window.location.search).get('plan')
  return p === 'free' ? 'free' : 'pro'
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
  { id: 'relatorios',   icon: '📈', label: 'Relatórios',   pro: true }
]

function TopTabs({ active, onChange, plan, isMobile }) {
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
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: isMobile ? '0 8px' : '0 24px',
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        {TABS.map(tab => {
          const isActive = active === tab.id
          const isLocked = tab.pro && plan === 'free'
          return (
            <a
              key={tab.id}
              href={isLocked ? '/plano-pro' : '#'}
              onClick={(e) => {
                if (isLocked) return // deixa o href levar
                e.preventDefault()
                onChange(tab.id)
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '14px 14px 12px',
                fontSize: 13.5, fontWeight: isActive ? 700 : 500,
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
              <span style={{ fontSize: 15, lineHeight: 1 }}>{tab.icon}</span>
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
  const max = Math.max(...data), min = Math.min(...data)
  const range = (max - min) || 1
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
      <Item label="Falta pra subir" value={`${reviewsToNext} av.`} sub={`pra alcançar a #${youPos - 1}`} accent={T.amber}/>
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
  const closeTarget = aheadOfYou && diff <= 3 // alvo próximo

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
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{comp.name}</span>
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

function CompetitorsScreen({ data, isMobile }) {
  const [filter, setFilter] = React.useState('all')
  const youReviews = data.kpis.reviewCount
  const youPos = data.kpis.rankingPos

  const ahead  = data.competitors.filter(c => !c.isYou && c.reviews >  youReviews)
  const behind = data.competitors.filter(c => !c.isYou && c.reviews <= youReviews)
  const rising = data.competitors.filter(c => !c.isYou && c.weekGrowth >= 2)

  const visible = filter === 'ahead'  ? [data.competitors.find(c => c.isYou), ...ahead].filter(Boolean)
               : filter === 'behind'  ? [data.competitors.find(c => c.isYou), ...behind].filter(Boolean)
               : filter === 'rising'  ? [data.competitors.find(c => c.isYou), ...rising].filter(Boolean)
               : data.competitors

  const counts = {
    all: data.competitors.length,
    ahead: ahead.length,
    behind: behind.length,
    rising: rising.length
  }

  return (
    <main style={{ maxWidth: 1280, margin:'0 auto', padding: isMobile ? '20px 16px 60px' : '32px 32px 64px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
          🏆 Inteligência Competitiva
        </h1>
        <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
          Conheça quem está disputando o ranking com você · Cafeterias num raio de 3km
        </p>
      </div>

      {/* Stats no topo */}
      <Section>
        <CompetitorStats
          youPos={youPos}
          total={data.competitors.length}
          reviewsToNext={data.hero.reviewsToNext}
          risingCount={rising.length}
          isMobile={isMobile}
        />
      </Section>

      {/* Layout: lista (left, maior) + metas (right) */}
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 360px',
        gap: isMobile ? 16 : 24
      }}>
        {/* COLUNA ESQUERDA: filtros + lista */}
        <div>
          <FilterChips active={filter} onChange={setFilter} counts={counts}/>
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            {visible.map(c => (
              <CompetitorCard key={c.id} comp={c} youReviews={youReviews}/>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: metas */}
        <div>
          <MyGoalsCard goals={data.goals}/>
        </div>
      </div>
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
        desc="Receba as ameaças críticas no seu WhatsApp na hora — quando um concorrente passar você ou ganhar 10 av. de uma vez."
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

function AlertsScreen({ data, isMobile }) {
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

      {/* Stats no topo */}
      <Section>
        <AlertStats stats={data.alertStats} isMobile={isMobile}/>
      </Section>

      {/* Layout: feed (left, maior) + canais (right) */}
      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 360px',
        gap: isMobile ? 16 : 24
      }}>
        {/* COLUNA ESQUERDA: filtros + feed */}
        <div>
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
    { label:'Próximo concorrente', value: `-${Math.abs(summary.competitorDelta)} av.`, delta: null, sub:'mais perto que antes', icon:'🎯' }
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

function ReportsScreen({ data, isMobile }) {
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
    </main>
  )
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header({ bizName, plan, isMobile }) {
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
      <div style={{ display:'flex', alignItems:'center', gap: 10, flexShrink: 0 }}>
        {plan === 'pro' && (
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
            background: 'linear-gradient(135deg,#1A73E8,#0F4DAE)',
            color: '#fff', padding: '4px 9px', borderRadius: 6
          }}>PRO</span>
        )}
        <div style={{ width: 32, height: 32, borderRadius:'50%', background:'#1A73E8', color:'#fff', fontWeight: 700, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>RF</div>
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
function RankingList({ items, isMobile, plan }) {
  const locked = plan === 'free'
  return (
    <Card style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16, gap: 8 }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>Ranking da sua região</h3>
        {locked
          ? <span style={{ fontSize: 11, fontWeight: 700, background: T.blueSoft, color: T.blue, padding:'4px 8px', borderRadius:6 }}>PRO</span>
          : <span style={{ fontSize: 12, color: T.textDim }}>Cafeterias · 3km</span>}
      </div>

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
function RecentReviews({ items, trend, isMobile }) {
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
        <a href="#" style={{ fontSize: 12.5, color: T.blue, fontWeight: 600, textDecoration:'none' }}>Ver todas →</a>
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
// Capture points
// ─────────────────────────────────────────────────────────────
function CapturePoints({ items }) {
  const total = items.reduce((s, i) => s + i.reviewsGenerated, 0)
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4, gap: 8, flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:"'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: T.text, margin: 0 }}>📍 Onde seus clientes avaliam</h3>
        <span style={{ fontSize: 12, color: T.textDim }}>{total} avaliações geradas</span>
      </div>
      <p style={{ fontSize: 13, color: T.textMid, margin:'0 0 18px' }}>Onde suas avaliações estão sendo coletadas.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, background:'#F8FAFC', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize: 12.5, color: T.textMid, fontWeight: 500, marginBottom: 4 }}>{it.name}</div>
            <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 26, fontWeight: 700, color: T.text, letterSpacing:'-0.025em', lineHeight: 1, marginBottom: 2 }}>{it.reviewsGenerated}</div>
            <div style={{ fontSize: 11.5, color: T.textDim }}>avaliações geradas</div>
          </div>
        ))}
      </div>
      <button style={{
        marginTop: 18, background:'transparent', color: T.blue, border:`1.5px solid ${T.blue}`, borderRadius: 10,
        padding:'10px 18px', fontSize: 13, fontWeight: 600, cursor:'pointer',
        fontFamily:"'Inter', sans-serif", width:'100%'
      }}>
        + Adicionar novo dispositivo
      </button>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Main layout
// ─────────────────────────────────────────────────────────────
export default function AppV2() {
  const isMobile = useIsMobile(768)
  const plan = getPlan()
  // Permite deep-link via ?tab=alertas|concorrentes|relatorios|avaliacoes
  const initialTab = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('tab') || 'painel')
    : 'painel'
  const [tab, setTab] = React.useState(initialTab)
  const d = MOCK

  return (
    <div style={{ background: T.bg, minHeight:'100vh' }}>
      <Header bizName={d.biz.name} plan={plan} isMobile={isMobile} />
      <TopTabs active={tab} onChange={setTab} plan={plan} isMobile={isMobile} />

      {/* Aba: CONCORRENTES (Pro) — Inteligência Competitiva FUNCIONAL */}
      {tab === 'concorrentes' && plan === 'pro' && (
        <CompetitorsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Aba: ALERTAS (Pro) — feed + canais FUNCIONAL */}
      {tab === 'alertas' && plan === 'pro' && (
        <AlertsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Aba: RELATÓRIOS (Pro) — newsletter semanal/mensal FUNCIONAL */}
      {tab === 'relatorios' && plan === 'pro' && (
        <ReportsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Outras abas ainda em construção */}
      {tab !== 'painel' && !(tab === 'concorrentes' && plan === 'pro') && !(tab === 'alertas' && plan === 'pro') && !(tab === 'relatorios' && plan === 'pro') && (
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

        {/* Switch plano (apenas pra mockup) */}
        <div style={{ display:'flex', gap: 8, marginBottom: 20, fontSize: 12 }}>
          <a href="?plan=free" style={{
            padding:'6px 12px', borderRadius:8, textDecoration:'none',
            background: plan === 'free' ? T.blue : '#fff',
            color: plan === 'free' ? '#fff' : T.textMid,
            border:`1px solid ${plan === 'free' ? T.blue : T.border}`,
            fontWeight: 600
          }}>Ver como FREE</a>
          <a href="?plan=pro" style={{
            padding:'6px 12px', borderRadius:8, textDecoration:'none',
            background: plan === 'pro' ? T.blue : '#fff',
            color: plan === 'pro' ? '#fff' : T.textMid,
            border:`1px solid ${plan === 'pro' ? T.blue : T.border}`,
            fontWeight: 600
          }}>Ver como PRO</a>
        </div>

        {/* TITLE */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily:"'Inter', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: T.text, margin:'0 0 4px', letterSpacing:'-0.02em' }}>
            Olá, {d.biz.name}.
          </h1>
          <p style={{ fontSize: isMobile ? 13.5 : 15, color: T.textMid, margin: 0 }}>
            Veja como seu negócio está crescendo · atualizado agora
          </p>
        </div>

        {/* KPI ROW — 5 cards (Próxima Meta inclusa) */}
        <Section>
          <div style={{
            display:'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: isMobile ? 10 : 14
          }}>
            <KpiCard icon="⭐" label="Nota Google"     value={d.kpis.rating.toFixed(1)} sub="Sua reputação atual"            trend={+0.4} />
            <KpiCard icon="📝" label="Avaliações"      value={d.kpis.reviewCount}      sub="Total recebidas"                trend={+d.kpis.newLast30Days} />
            <KpiCard icon="🏆" label="Ranking local"   value={`#${d.kpis.rankingPos}`}  sub={`Entre ${d.kpis.totalCompetitors} empresas`} trend={+2} />
            <KpiCard icon="📈" label="Últimos 30 dias" value={`+${d.kpis.newLast30Days}`} sub="Novas avaliações"             trend={+3} />
            <KpiCard icon="🎯" label="Próxima Meta"    value={`${d.kpis.nextGoal.reviewsToNext} avaliações`} sub={`Para alcançar o Top ${d.kpis.nextGoal.targetPosition}`} />
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
            <RankingList items={d.ranking} isMobile={isMobile} plan={plan} />
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
            <RecentReviews items={d.recentReviews} trend={d.trend} isMobile={isMobile} />
          </div>
        </Section>

        {/* CAPTURE POINTS */}
        <Section>
          <CapturePoints items={d.capturePoints} />
        </Section>

      </main>
      )}
    </div>
  )
}
