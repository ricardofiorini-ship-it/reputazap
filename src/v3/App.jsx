// ============================================================
// StarTouch V3 — casca (barra lateral + roteamento)
// ============================================================
// Roteamento de verdade, por caminho: /painel/<area>. O painel atual navega
// por `?tab=` num arquivo único; aqui cada área tem endereço próprio, dá pra
// dar F5 e voltar no mesmo lugar, e o botão voltar do navegador funciona.
//
// A barra lateral é o MAPA DO PRODUTO durante o desenvolvimento privado: ela
// mostra as treze áreas e o estágio de cada uma. Esses marcadores são
// revisados antes de qualquer abertura ao público.
// ============================================================
import React from 'react'
import { Menu, X, ArrowLeft } from 'lucide-react'
import { gruposVisiveis, AREAS, STATUS_TXT } from './lib/areas.js'
import { api, currentUser, logout, token } from './lib/api.js'
import { limparSessao } from '../lib/sessao.js'
import { modoSolo, CHAVE_SOLO, CONVIDADO, AREAS_DE_CLIENTE, urlCadastro } from './lib/acesso.js'
import { useDados } from './lib/dados.js'
import { Carregando, Erro } from './ui.jsx'
import Inicio from './screens/Inicio.jsx'
import Experiencia from './screens/Experiencia.jsx'
import Dispositivos from './screens/Dispositivos.jsx'
import Reputacao from './screens/Reputacao.jsx'
import Resultados from './screens/Resultados.jsx'
import Clientes from './screens/Clientes.jsx'
import Unidades from './screens/Unidades.jsx'
import Campanhas from './screens/Campanhas.jsx'
import Guias from './screens/Guias.jsx'
import Configuracoes from './screens/Configuracoes.jsx'
import Mapa from './screens/Mapa.jsx'

// Rota não adivinhável, de propósito (29/08/2026). Enquanto o V3 é privado, o
// portão de admin é JAVASCRIPT — decide quem VÊ a tela, não quem alcança dado
// (todo endpoint continua autenticado e escopado ao próprio usuário). O que
// vaza sem esta troca não é dado de cliente: é o BUNDLE, e dentro dele o mapa
// do produto com "Em definição" e "Não definido" — roadmap interno que a gente
// já decidiu que não deve aparecer publicamente.
//
// `/painel` deixou de existir: sem rewrite, a Vercel devolve 404. Não há
// redirect do antigo pro novo — redirecionar entregaria o endereço novo a quem
// chutasse o velho, que é exatamente o que isto evita.
//
// Isto é obscuridade, não segurança: quem tiver o link, entra na tela (e vê os
// próprios dados). O portão de verdade — servidor recusando servir a página —
// entra mais perto da Fase 2, quando o V3 passa a ter comportamento de produto
// e não só telas. Ao trocar esta constante, trocar junto os dois rewrites no
// vercel.json: são o mesmo endereço em dois lugares.
const BASE = '/painel-f7dsaz3c'
const PADRAO = 'inicio'

// Preview estritamente local para revisar a interface sem depender das
// Serverless Functions da Vercel. `import.meta.env.DEV` garante que estes
// dados nunca possam ser ativados no bundle de produção.
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
// `?preview&vazio` finge uma conta SEM dispositivo, que e a unica forma de
// rever a tela de primeiros passos: quem ja ativou algum nunca mais a ve, e
// isso inclui todas as nossas contas. Continua preso a `import.meta.env.DEV`,
// entao nao existe no bundle de producao.
const agora = Date.now()
const PREVIEW_DADOS = {
  carregando: false, erro: null, semNegocio: false, sessaoExpirou: false,
  biz: { name: 'Café da Praça', plan: 'free', place_id: 'preview' },
  info: { rating: 4.8, total: 127 },
  avaliacoes: {
    rating: 4.8, total: 127,
    reviews: [
      { id: Math.floor((agora - 86400000) / 1000) },
      { id: Math.floor((agora - 3 * 86400000) / 1000) },
      { id: Math.floor((agora - 9 * 86400000) / 1000) }
    ]
  },
  // `avg`, `score` e `points` no mesmo formato que a grade devolve de verdade —
  // sem os três, o preview mostra um estado que não existe em produção e a
  // revisão visual aprova uma tela que ninguém vai ver. Aqui: 5 pontos medidos,
  // aparece em 4 (rank nulo no quinto), 2 deles no top 3.
  posicao: {
    avg: 5, score: 8.2, coverage: 4, measured: 5, term: 'cafeteria',
    measuredAt: new Date(agora - 86400000).toISOString(),
    points: [
      { dir: 'centro', ok: true, rank: 2,    total: 20 },
      { dir: 'norte',  ok: true, rank: 3,    total: 20 },
      { dir: 'sul',    ok: true, rank: 6,    total: 20 },
      { dir: 'leste',  ok: true, rank: 9,    total: 20 },
      { dir: 'oeste',  ok: true, rank: null, total: 20 }
    ]
  },
  dispositivos: [
    { id: 'preview-1', code: 'STAR-C4K9T2', status: 'active', product_type: 'cartao_nfc', channel_name: 'Cartão do caixa', total_taps: 128, activated_at: new Date(agora - 30 * 86400000).toISOString(), last_tapped_at: new Date(agora - 2 * 3600000).toISOString() },
    { id: 'preview-2', code: 'STAR-B7M3P8', status: 'active', product_type: 'placa_balcao', channel_name: 'Placa da entrada', total_taps: 46, activated_at: new Date(agora - 30 * 86400000).toISOString(), last_tapped_at: new Date(agora - 9 * 86400000).toISOString() }
  ],
  previewToques: { available: true, total: 43, prev_total: 51, by_plate: { 'preview-1': 35, 'preview-2': 8 } },
  previewToquesPorPeriodo: {
    7: { available: true, total: 43, prev_total: 51, by_plate: { 'preview-1': 35, 'preview-2': 8 } },
    30: { available: true, total: 86, prev_total: 74, by_plate: { 'preview-1': 65, 'preview-2': 21 } },
    90: { available: true, total: 144, prev_total: null, by_plate: { 'preview-1': 109, 'preview-2': 35 } }
  },
  recarregar: () => {}
}
if (PREVIEW && new URLSearchParams(window.location.search).has('vazio')) {
  PREVIEW_DADOS.dispositivos = []
  PREVIEW_DADOS.previewToques = { available: false }
  PREVIEW_DADOS.info = { ...PREVIEW_DADOS.info, phone: null, photoUrl: null, category: 'cafeteria' }
}

// `?preview&perfil=fraca|media|boa` troca o negocio de exemplo. Existe pra
// revisar as FRASES: o texto do Score e o da colocacao sao montados a partir
// do que cada negocio tem, entao um perfil so nao mostra se eles funcionam —
// mostra se funcionam naquele caso. Continua preso a `import.meta.env.DEV`.
const PERFIS = {
  fraca: {
    biz: { name: 'Mercearia do Zé', plan: 'free', place_id: 'preview' },
    rating: 3.6, total: 8,
    info: { rating: 3.6, total: 8, photoUrl: null, phone: null, category: 'mercearia' },
    // Medida e ausente em TODOS os pontos: sabemos que esta fora, nao e falta de dado.
    posicao: { avg: null, score: null, coverage: 0, measured: 5, term: 'mercearia',
      measuredAt: new Date(agora - 2 * 86400000).toISOString(),
      points: Array.from({ length: 5 }, (_, i) => ({ dir: String(i), ok: true, rank: null, total: 20 })) }
  },
  media: {
    biz: { name: 'Pizzaria Bella', plan: 'free', place_id: 'preview' },
    rating: 4.4, total: 45,
    // categoria GENERICA de proposito: pizzaria classificada como "food" e o
    // caso real que o alerta de categoria existe pra pegar (a SAIF esta como
    // "store"). O perfil `fraca` fica com categoria especifica, pro contraste.
    info: { rating: 4.4, total: 45, photoUrl: 'x', phone: '(11) 3456-7890', category: 'food' },
    // Aparece em 3 dos 5, e so em 1 deles esta no top 3.
    posicao: { avg: 5.7, score: 12.4, coverage: 3, measured: 5, term: 'pizzaria',
      measuredAt: new Date(agora - 86400000).toISOString(),
      points: [
        { dir: 'centro', ok: true, rank: 3,    total: 20 },
        { dir: 'norte',  ok: true, rank: 7,    total: 20 },
        { dir: 'sul',    ok: true, rank: 9,    total: 20 },
        { dir: 'leste',  ok: true, rank: null, total: 20 },
        { dir: 'oeste',  ok: true, rank: null, total: 20 }
      ] }
  },
  boa: {
    biz: { name: 'Padaria Aurora', plan: 'free', place_id: 'preview' },
    rating: 4.9, total: 320,
    info: { rating: 4.9, total: 320, photoUrl: 'x', phone: '(11) 3456-7890', category: 'padaria' },
    posicao: { avg: 1.6, score: 1.6, coverage: 5, measured: 5, term: 'padaria',
      measuredAt: new Date(agora - 86400000).toISOString(),
      points: [
        { dir: 'centro', ok: true, rank: 1, total: 20 },
        { dir: 'norte',  ok: true, rank: 1, total: 20 },
        { dir: 'sul',    ok: true, rank: 2, total: 20 },
        { dir: 'leste',  ok: true, rank: 2, total: 20 },
        { dir: 'oeste',  ok: true, rank: 2, total: 20 }
      ] }
  }
}
const PERFIL = PREVIEW && PERFIS[new URLSearchParams(window.location.search).get('perfil')]
if (PERFIL) {
  PREVIEW_DADOS.biz = PERFIL.biz
  PREVIEW_DADOS.info = PERFIL.info
  PREVIEW_DADOS.avaliacoes = { rating: PERFIL.rating, total: PERFIL.total, reviews: [] }
  PREVIEW_DADOS.posicao = PERFIL.posicao
}

// `?preview&plano=pro|teste|cancelado` — os tres estados de assinatura que
// nenhum perfil acima produz, e que so aparecem depois de alguem pagar de
// verdade. Sem isto, a unica forma de revisar essas telas seria assinar,
// esperar, cancelar — e tela que so da pra ver em producao acaba indo ao ar
// sem revisao. Os status sao os do Stripe (`active`, `trialing`), que e quem
// escreve neste campo desde 07/09/2026. Preso a `import.meta.env.DEV`.
const PLANO_PREVIEW = PREVIEW && new URLSearchParams(window.location.search).get('plano')
if (['pro', 'teste', 'cancelado'].includes(PLANO_PREVIEW)) {
  const dias = PLANO_PREVIEW === 'teste' ? 5 : 18
  PREVIEW_DADOS.biz = {
    ...PREVIEW_DADOS.biz,
    plan: 'pro',
    stripe_subscription_status:
      PLANO_PREVIEW === 'cancelado' ? 'canceled'
      : PLANO_PREVIEW === 'teste' ? 'trialing'
      : 'active',
    stripe_cancel_at_period_end: PLANO_PREVIEW === 'cancelado',
    stripe_current_period_end: new Date(agora + dias * 86400000).toISOString()
  }
}

function areaDaUrl() {
  const p = window.location.pathname.replace(BASE, '').replace(/^\/+|\/+$/g, '')
  // Convidado que digitar uma área de cliente na URL cai no Início em vez de
  // numa tela que ia falhar: sem conta não há dispositivo, menu nem ajuste.
  if (CONVIDADO && AREAS_DE_CLIENTE.includes(p)) return PADRAO
  return AREAS[p] ? p : PADRAO
}

// A barra lateral tinha quatro bolinhas coloridas e uma legenda de quatro
// linhas para decifrá-las. Custava atenção em todo item do menu para informar
// o que, na prática, interessa saber de um só: "isto aqui ainda está sendo
// feito". Ficou uma marca só, nos que ainda não estão prontos — quem não tem
// marca está pronto, e isso não precisa de legenda.
//
// Os quatro estados continuam existindo em areas.js e continuam aparecendo,
// com nome e tudo, DENTRO da tela de cada área que ainda não foi construída.
// O que saiu foi a decodificação por cor no menu, não a informação.
function Legenda() {
  return (
    <div className="v3-legend">
      <div className="row"><span className="v3-mk"/> Em desenvolvimento</div>
      <div className="note">Visível só no desenvolvimento privado. Sai quando o painel abrir para clientes.</div>
    </div>
  )
}

// Sobrou alguma área em obra no menu VISÍVEL? Se não, a legenda não tem o que
// explicar — e legenda sem referente é ruído que o cliente tenta decifrar.
const temMarcaNoMenu = gruposVisiveis()
  .some(g => g.ids.some(id => AREAS[id].status !== 'pronto'))

// Dispara a busca das experiências no PRIMEIRO instante, antes do React
// montar qualquer coisa. Ela não depende do negócio (o servidor descobre pelo
// token), então esperar era desperdício: o painel carregava, a tela montava, e
// só então ela pedia os dados dela. Duas esperas em fila viram uma.
if (typeof window !== 'undefined' && areaDaUrl() === 'experiencia' && token()) {
  try { api.experiencias.preBuscar() } catch {}
}

export default function App() {
  const [id, setId] = React.useState(areaDaUrl)
  // No celular a barra lateral é uma gaveta. Começa fechada; no computador
  // este estado é ignorado (a coluna está sempre visível pelo CSS).
  const [gaveta, setGaveta] = React.useState(false)
  const dadosReais = useDados({ area: id })
  const dados = PREVIEW ? PREVIEW_DADOS : dadosReais
  const user = currentUser()

  // Botão voltar/avançar do navegador.
  React.useEffect(() => {
    const onPop = () => setId(areaDaUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Esc fecha a gaveta — quem abre um menu sobreposto espera poder sair dele
  // sem mirar no X.
  React.useEffect(() => {
    if (!gaveta) return
    const onKey = (e) => { if (e.key === 'Escape') setGaveta(false) }
    window.addEventListener('keydown', onKey)
    // Trava a rolagem do fundo: sem isso, arrastar dentro da gaveta rola a
    // página atrás dela e a pessoa perde o lugar onde estava.
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = antes
    }
  }, [gaveta])

  const ir = React.useCallback((novo) => {
    if (!AREAS[novo]) return
    window.history.pushState({}, '', `${BASE}/${novo}`)
    setId(novo)
    setGaveta(false)          // navegou, fecha a gaveta
    window.scrollTo(0, 0)
  }, [])

  const area = AREAS[id]

  function conteudo() {
    if (dados.carregando) return <Carregando o="seu negócio"/>

    if (dados.sessaoExpirou) {
      return (
        <Erro mensagem="Sua sessão expirou. Entre de novo para continuar."
          onTentar={() => {
            // Sessao vencida: limpa e recarrega — a porta do V3 mostra o proprio
            // login. Antes isto ia pro `/app?login=1`, de quando o V3 nao tinha um.
            try { limparSessao(); localStorage.removeItem('rz_user') } catch {}
            window.location.reload()
          }}/>
      )
    }
    if (dados.erro) return <Erro mensagem={dados.erro} onTentar={dados.recarregar}/>
    if (dados.semNegocio) {
      return (
        <div className="v3-empty">
          <h3>Nenhum negócio cadastrado nesta conta</h3>
          <p>O painel precisa de um negócio vinculado para mostrar qualquer coisa. O cadastro acontece no painel atual.</p>
          <a className="v3-btn solid" href="/app">Ir para o painel atual</a>
        </div>
      )
    }

    // As três telas com dado real da Fase 1, mais Experiência (estado real,
    // sem editor). As demais abrem o mapa.
    switch (area.tela) {
      case 'inicio':       return <Inicio dados={dados} ir={ir}/>
      case 'experiencia':  return <Experiencia dados={dados}/>
      case 'dispositivos': return <Dispositivos dados={dados}/>
      case 'reputacao':    return <Reputacao dados={dados}/>
      case 'resultados':   return <Resultados preview={PREVIEW}/>
      case 'clientes':     return <Clientes/>
      case 'unidades':     return <Unidades/>
      case 'campanhas':    return <Campanhas/>
      case 'guias':        return <Guias/>
      case 'config':       return <Configuracoes dados={dados}/>
      default:             return <Mapa area={area}/>
    }
  }

  // ── MODO SOLO (?solo=1) ──
  // Abre UMA tela, sem a navegação do painel novo. Existe porque hoje o Menu
  // Inteligente é o único motivo de um cliente do painel ATUAL vir até aqui:
  // trazer junto a coluna de áreas faria parecer que o painel dele mudou, e
  // ele nem pediu isso. Assim é só uma tela que abriu, com volta pro lugar de
  // onde veio.
  //
  // Morre sozinho quando o V3 substituir o /app: sem dois painéis, não há de
  // onde vir nem pra onde voltar.
  if (modoSolo(currentUser())) {
    return (
      <div className="v3 v3-solo">
        <div className="v3-solobar">
          <a className="v3-btn" href="/app"
            onClick={() => { try { sessionStorage.removeItem(CHAVE_SOLO) } catch {} }}>
            <ArrowLeft size={14}/> Voltar ao painel
          </a>
        </div>
        <main className="v3-main">{conteudo()}</main>
      </div>
    )
  }

  return (
    <div className="v3">
      {/* Barra superior — só aparece no celular (CSS). No computador a
          navegação é a coluna da esquerda e isto não é renderizado. */}
      <div className="v3-topbar">
        <button className="abrir" onClick={() => setGaveta(true)}
          aria-label="Abrir menu" aria-expanded={gaveta}>
          <Menu size={22}/>
        </button>
        {/* O símbolo é o caminho de volta pro Início. No computador esse
            atalho é o item da barra lateral; no celular, com a gaveta
            fechada, sem ele não há como voltar sem abrir o menu inteiro.
            Só o símbolo: o logotipo escrito ocuparia ~90px e espremeria o
            nome da área até virar reticências. */}
        <button className="marca" onClick={() => ir('inicio')}
          aria-label="Ir para o Início" aria-current={id === 'inicio'}>
          <span className="v3-mark"/>
        </button>
        {/* O nome da área fica: a barra é fixa e o título da tela rola pra
            fora, então descendo a página isto é a única coisa que ainda
            responde "onde eu estou". */}
        <div className="titulo">{area.nome}</div>
      </div>

      {gaveta && <button className="v3-veu" aria-label="Fechar menu" onClick={() => setGaveta(false)}/>}

      <nav className={'v3-side' + (gaveta ? ' aberta' : '')} aria-label="Áreas do painel">
        <button className="fechar" onClick={() => setGaveta(false)} aria-label="Fechar menu">
          <X size={20}/>
        </button>
        <div className="v3-brand">
          <div className="v3-mark"/>
          <div className="v3-brandname">STARTOUCH</div>
        </div>

        {gruposVisiveis({ convidado: !!CONVIDADO }).map((g, gi) => (
          <React.Fragment key={gi}>
            {g.titulo && <div className="v3-grp">{g.titulo}</div>}
            {g.ids.map(aid => {
              const a = AREAS[aid]
              const Ico = a.icon
              return (
                <button key={aid} className="v3-nav" aria-current={id === aid}
                  onClick={() => ir(aid)}>
                  <Ico size={15} strokeWidth={1.8}/>
                  <span className="lbl">{a.nome}</span>
                  {a.pro && <span className="pro">PRO</span>}
                  {a.status !== 'pronto' && <span className="v3-mk" title={`Em desenvolvimento — ${STATUS_TXT[a.status]}`}/>}
                </button>
              )
            })}
          </React.Fragment>
        ))}

        <div className="v3-sidefoot">
          {temMarcaNoMenu && !CONVIDADO && <Legenda/>}
          {CONVIDADO ? (
            // O convidado está vendo os dados dele sem ter conta. O rodapé
            // deixa de ser "quem você é" e passa a ser "guarde isto" — que é a
            // única coisa que ele ainda precisa decidir aqui.
            <div className="v3-plate v3-plate-convidado">
              <div className="pl">VOCÊ ESTÁ VISITANDO</div>
              <div className="sub">{dados.biz?.name || 'Seu negócio'}</div>
              <a className="v3-btn solid" href={urlCadastro()}>Criar conta grátis</a>
              <a className="entrar" href="/app?login=1">Já tenho conta</a>
            </div>
          ) : (
            <div className="v3-plate">
              <div className="pl">STARTOUCH {dados.biz?.plan === 'pro' ? 'PRO' : 'FREE'}</div>
              <div className="sub">{dados.biz?.name || user?.email || '—'}</div>
              <button className="out" onClick={logout}>Sair</button>
            </div>
          )}
        </div>
      </nav>

      <main className="v3-main">{conteudo()}</main>
    </div>
  )
}
