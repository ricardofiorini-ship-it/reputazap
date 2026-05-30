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
  ]
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
  const [tab, setTab] = React.useState('painel')
  const d = MOCK

  return (
    <div style={{ background: T.bg, minHeight:'100vh' }}>
      <Header bizName={d.biz.name} plan={plan} isMobile={isMobile} />
      <TopTabs active={tab} onChange={setTab} plan={plan} isMobile={isMobile} />

      {/* Aba: CONCORRENTES (Pro) — Inteligência Competitiva FUNCIONAL */}
      {tab === 'concorrentes' && plan === 'pro' && (
        <CompetitorsScreen data={d} isMobile={isMobile}/>
      )}

      {/* Outras abas ainda em construção */}
      {tab !== 'painel' && !(tab === 'concorrentes' && plan === 'pro') && (
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
