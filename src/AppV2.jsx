import React from 'react'

// ─────────────────────────────────────────────────────────────
// Dashboard StarTouch — V2 (mockup funcional)
// Foco: reputação · crescimento · ranking · resultado
// Sem foco em NFC/QR/dispositivos como métrica técnica
// ─────────────────────────────────────────────────────────────

// Mock data — substituir por chamadas reais depois de aprovado o visual
const MOCK = {
  biz: { name: 'Café Bella Vista' },
  kpis: {
    rating: 5.0,
    reviewCount: 12,
    rankingPos: 3,
    totalCompetitors: 12,
    newLast30Days: 7
  },
  hero: {
    reviewsToNext: 2,
    progressPct: 83 // 10 de 12
  },
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
    // 12 pontos representando últimos 90 dias (1 ponto/semana)
    reviews:   [5, 5, 6, 6, 7, 7, 8, 9, 10, 11, 11, 12],
    rating:    [4.6, 4.7, 4.7, 4.8, 4.8, 4.8, 4.9, 4.9, 4.9, 5.0, 5.0, 5.0],
    rankings:  [9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3]
  }
}

// ─────────────────────────────────────────────────────────────
// Theme tokens — visual premium estilo Stripe/Linear/Notion
// ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#F7F8FA',
  surface: '#FFFFFF',
  border:  '#EAEDF1',
  text:    '#0F172A',
  textMid: '#475569',
  textDim: '#94A3B8',
  blue:    '#1A73E8',
  blueDk:  '#0F4DAE',
  blueSoft:'#EAF2FE',
  green:   '#10B981',
  greenSoft:'#ECFDF5',
  amber:   '#F59E0B',
  amberSoft:'#FEF7E6',
  amberBg: '#FFFBEB',
  red:     '#EF4444',
  shadow:  '0 1px 2px rgba(15,23,42,0.04), 0 6px 24px -8px rgba(15,23,42,0.08)',
  shadowSm:'0 1px 2px rgba(15,23,42,0.06)'
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
    }}>
      {children}
    </div>
  )
}
function Section({ title, action, children, style }) {
  return (
    <div style={{ marginBottom: 32, ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {title && <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textDim, margin: 0 }}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: '#FBBC04', fontSize: size, lineHeight: 1 }}>
      {[1,2,3,4,5].map(i => <span key={i}>{i <= Math.round(rating) ? '★' : '☆'}</span>)}
    </span>
  )
}
function Trend({ value, suffix = '' }) {
  const positive = value >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 600,
      color: positive ? T.green : T.red,
      background: positive ? T.greenSoft : '#FEE2E2',
      borderRadius: 999,
      padding: '2px 8px'
    }}>
      {positive ? '▲' : '▼'} {Math.abs(value)}{suffix}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header({ bizName }) {
  return (
    <header style={{
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255,255,255,0.85)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/startouch-logo-dark.png" alt="StarTouch" style={{ height: 32, width: 'auto' }}/>
        </a>
        <div style={{ width: 1, height: 22, background: T.border }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#FBBC04,#EA4335,#4285F4)', flexShrink: 0 }}/>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{bizName}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ background: 'none', border: 'none', color: T.textMid, fontSize: 18, cursor: 'pointer', padding: 6 }} aria-label="Notificações">🔔</button>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1A73E8', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>RF</div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────
// KPI Cards
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend }) {
  return (
    <Card style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.textMid }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 40, fontWeight: 700, color: T.text, letterSpacing: '-0.025em', lineHeight: 1 }}>
          {value}
        </span>
        {trend != null && <Trend value={trend} />}
      </div>
      <p style={{ fontSize: 12.5, color: T.textDim, margin: 0 }}>{sub}</p>
    </Card>
  )
}

function HeroPosition({ rating, reviewsToNext, progressPct, currentPos, total }) {
  return (
    <Card padded={false} style={{ background: `linear-gradient(135deg, ${T.blue} 0%, ${T.blueDk} 100%)`, border: 'none', color: '#fff', overflow: 'hidden', position: 'relative' }}>
      {/* glow overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 60% at 110% 0%, rgba(255,255,255,0.12), transparent 60%)', pointerEvents: 'none' }}/>
      <div style={{ padding: '34px 36px', position: 'relative' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.75, margin: 0 }}>Sua posição no ranking local</p>
        <h1 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 42, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.025em',
          margin: '8px 0 16px', textWrap: 'balance'
        }}>
          Você está em <span style={{ color: '#FBBC04' }}>{currentPos}º lugar</span> entre {total} empresas da sua categoria.
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9, lineHeight: 1.55, margin: '0 0 24px', maxWidth: 580 }}>
          Faltam apenas <strong>{reviewsToNext} avaliações</strong> para alcançar o {currentPos - 1}º lugar.
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, maxWidth: 580 }}>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.18)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: progressPct + '%', background: '#FBBC04', borderRadius: 999, transition: 'width .5s' }}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{progressPct}%</span>
        </div>

        <button style={{
          background: '#fff', color: T.blueDk,
          border: 'none', borderRadius: 12,
          padding: '14px 24px',
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          fontFamily: "'Inter', sans-serif"
        }}>
          Aumentar minhas avaliações →
        </button>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Ranking card
// ─────────────────────────────────────────────────────────────
function RankingList({ items }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Ranking da sua região</h3>
        <span style={{ fontSize: 12, color: T.textDim }}>Cafeterias · 3km</span>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(r => (
          <li key={r.pos} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 12px',
            borderRadius: 12,
            background: r.you ? T.blueSoft : 'transparent',
            border: r.you ? `1px solid #B9D6FB` : '1px solid transparent',
            marginBottom: 6,
            position: 'relative'
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: r.you ? T.blue : '#F1F5F9',
              color: r.you ? '#fff' : T.textMid,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>
              {r.medal || r.pos + 'º'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                {r.name} {r.you && <span style={{ fontSize: 11, fontWeight: 700, color: T.blue, background: '#fff', border: `1px solid ${T.blue}`, borderRadius: 6, padding: '1px 7px', marginLeft: 8 }}>VOCÊ</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textMid }}>
                <Stars rating={r.rating} size={12} />
                <span>{r.rating.toFixed(1)}</span>
                <span style={{ color: T.textDim }}>·</span>
                <span>{r.reviews} avaliações</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 10, background: T.greenSoft, fontSize: 13.5, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🎯</span>
        <span><strong>Você está a apenas 2 avaliações</strong> do segundo colocado.</span>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Evolution chart (Stripe-style)
// ─────────────────────────────────────────────────────────────
function EvolutionChart({ data }) {
  const W = 600, H = 220, pad = { l: 0, r: 12, t: 10, b: 32 }
  const points = data.reviews
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = (max - min) || 1
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const xs = points.map((_, i) => pad.l + (i / (points.length - 1)) * cw)
  const ys = points.map(v => pad.t + ch - ((v - min) / range) * ch)
  // Smooth curve via cubic bezier
  const path = xs.map((x, i) => {
    if (i === 0) return `M ${x},${ys[i]}`
    const x0 = xs[i - 1], y0 = ys[i - 1], y1 = ys[i]
    const cx1 = x0 + (x - x0) / 2, cx2 = x0 + (x - x0) / 2
    return `C ${cx1},${y0} ${cx2},${y1} ${x},${y1}`
  }).join(' ')
  const area = `${path} L ${xs[xs.length-1]},${pad.t + ch} L ${xs[0]},${pad.t + ch} Z`
  const labels = ['12 sem', '10 sem', '8 sem', '6 sem', '4 sem', '2 sem', 'agora']
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Sua evolução</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMid }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: T.blue }}/>Avaliações
          </span>
        </div>
      </div>
      {/* Big metric */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 700, color: T.text, letterSpacing: '-0.025em', lineHeight: 1 }}>{points[points.length - 1]}</span>
        <Trend value={points[points.length - 1] - points[0]} />
        <span style={{ fontSize: 13, color: T.textDim }}>nos últimos 90 dias</span>
      </div>
      <p style={{ fontSize: 13, color: T.textMid, margin: '0 0 6px' }}>
        Crescimento de avaliações · Nota subiu de <strong>{data.rating[0].toFixed(1)}</strong> pra <strong>{data.rating[data.rating.length-1].toFixed(1)}</strong> · Posição saiu de <strong>{data.rankings[0]}º</strong> pra <strong>{data.rankings[data.rankings.length-1]}º</strong>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220 }}>
        <defs>
          <linearGradient id="evoGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={T.blue} stopOpacity="0.20"/>
            <stop offset="100%" stopColor={T.blue} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* horizontal gridlines */}
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + ch * t} y2={pad.t + ch * t} stroke={T.border} strokeDasharray="4 4"/>
        ))}
        {/* area */}
        <path d={area} fill="url(#evoGrad)" />
        {/* line */}
        <path d={path} fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* end dot */}
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5" fill="#fff" stroke={T.blue} strokeWidth="3"/>
        {/* X labels */}
        {labels.map((lbl, i) => {
          const x = pad.l + (i / (labels.length - 1)) * cw
          return (
            <text key={lbl} x={x} y={H - 8} textAnchor="middle" fontSize="11" fill={T.textDim} fontFamily="Inter">{lbl}</text>
          )
        })}
      </svg>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Opportunities (yellow)
// ─────────────────────────────────────────────────────────────
function Opportunities({ count }) {
  return (
    <Card style={{ background: T.amberBg, border: `1px solid #FCD34D` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>💡</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: '#78350F', margin: '0 0 6px' }}>
            Você possui <span style={{ color: T.amber }}>{count} avaliações</span> sem resposta
          </h3>
          <p style={{ fontSize: 13.5, color: '#92400E', margin: 0, lineHeight: 1.55 }}>
            Responder avaliações melhora sua reputação e posicionamento no Google.
          </p>
        </div>
      </div>
      <button style={{
        marginTop: 18,
        background: T.amber, color: '#fff', border: 'none', borderRadius: 10,
        padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(245,158,11,0.30)',
        fontFamily: "'Inter', sans-serif"
      }}>
        Responder agora →
      </button>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Recent reviews
// ─────────────────────────────────────────────────────────────
function RecentReviews({ items }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Avaliações recentes</h3>
        <a href="#" style={{ fontSize: 13, color: T.blue, fontWeight: 600, textDecoration: 'none' }}>Ver todas →</a>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((r, i) => (
          <li key={i} style={{
            display: 'flex', gap: 14, padding: '14px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${T.border}`
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: r.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0
            }}>
              {r.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{r.name}</span>
                <Stars rating={r.rating} size={12} />
                <span style={{ fontSize: 12, color: T.textDim, marginLeft: 'auto' }}>{r.date}</span>
              </div>
              <p style={{ fontSize: 13.5, color: T.textMid, margin: 0, lineHeight: 1.55 }}>"{r.comment}"</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Capture points (no NFC technical metrics — só resultado)
// ─────────────────────────────────────────────────────────────
function CapturePoints({ items }) {
  const total = items.reduce((s, i) => s + i.reviewsGenerated, 0)
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Pontos de captação</h3>
        <span style={{ fontSize: 12, color: T.textDim }}>{total} avaliações geradas</span>
      </div>
      <p style={{ fontSize: 13, color: T.textMid, margin: '0 0 20px' }}>Onde suas avaliações estão sendo coletadas.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: 18, borderRadius: 14, background: '#F8FAFC', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13, color: T.textMid, fontWeight: 500, marginBottom: 6 }}>{it.name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4 }}>{it.reviewsGenerated}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>avaliações geradas</div>
          </div>
        ))}
      </div>
      <button style={{
        marginTop: 22,
        background: 'transparent', color: T.blue, border: `1.5px solid ${T.blue}`, borderRadius: 10,
        padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: "'Inter', sans-serif"
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
  const d = MOCK
  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <Header bizName={d.biz.name} />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* TITLE */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: T.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Olá, {d.biz.name}. Veja como seu negócio está crescendo.
          </h1>
          <p style={{ fontSize: 15, color: T.textMid, margin: 0 }}>
            Painel de reputação · atualizado agora
          </p>
        </div>

        {/* KPI ROW */}
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <KpiCard icon="⭐" label="Nota Google"     value={d.kpis.rating.toFixed(1)} sub="Sua reputação atual"            trend={+0.4} />
            <KpiCard icon="📝" label="Avaliações"      value={d.kpis.reviewCount}      sub="Total de avaliações recebidas" trend={+d.kpis.newLast30Days} />
            <KpiCard icon="🏆" label="Ranking local"   value={`#${d.kpis.rankingPos}`}  sub={`Entre ${d.kpis.totalCompetitors} empresas`} trend={+2} />
            <KpiCard icon="📈" label="Últimos 30 dias" value={`+${d.kpis.newLast30Days}`} sub="Novas avaliações"             trend={+3} />
          </div>
        </Section>

        {/* HERO POSITION */}
        <Section>
          <HeroPosition
            rating={d.kpis.rating}
            reviewsToNext={d.hero.reviewsToNext}
            progressPct={d.hero.progressPct}
            currentPos={d.kpis.rankingPos}
            total={d.kpis.totalCompetitors}
          />
        </Section>

        {/* RANKING + EVOLUTION */}
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 420px) 1fr', gap: 24 }}>
            <RankingList items={d.ranking} />
            <EvolutionChart data={d.evolution} />
          </div>
        </Section>

        {/* OPPORTUNITY + RECENT REVIEWS */}
        <Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 380px) 1fr', gap: 24 }}>
            <Opportunities count={d.unrepliedReviews} />
            <RecentReviews items={d.recentReviews} />
          </div>
        </Section>

        {/* CAPTURE POINTS */}
        <Section>
          <CapturePoints items={d.capturePoints} />
        </Section>

      </main>
    </div>
  )
}
