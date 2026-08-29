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
import { Menu, X } from 'lucide-react'
import { GRUPOS, AREAS, STATUS_TXT } from './lib/areas.js'
import { currentUser, logout } from './lib/api.js'
import { useDados } from './lib/dados.js'
import { Carregando, Erro } from './ui.jsx'
import Inicio from './screens/Inicio.jsx'
import Experiencia from './screens/Experiencia.jsx'
import Dispositivos from './screens/Dispositivos.jsx'
import Reputacao from './screens/Reputacao.jsx'
import Resultados from './screens/Resultados.jsx'
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

function areaDaUrl() {
  const p = window.location.pathname.replace(BASE, '').replace(/^\/+|\/+$/g, '')
  return AREAS[p] ? p : PADRAO
}

function Legenda() {
  return (
    <div className="v3-legend">
      <div className="ttl">Mapa de construção</div>
      {['pronto', 'constr', 'defin', 'nao'].map(s => (
        <div className="row" key={s}><span className={`v3-mk ${s}`}/> {STATUS_TXT[s]}</div>
      ))}
      <div className="note">Visível só no desenvolvimento privado. Sai quando o painel abrir para clientes.</div>
    </div>
  )
}

export default function App() {
  const [id, setId] = React.useState(areaDaUrl)
  // No celular a barra lateral é uma gaveta. Começa fechada; no computador
  // este estado é ignorado (a coluna está sempre visível pelo CSS).
  const [gaveta, setGaveta] = React.useState(false)
  const dados = useDados()
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
          onTentar={() => { window.location.href = '/app?login=1&next=' + encodeURIComponent(`${BASE}/${id}`) }}/>
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
      case 'resultados':   return <Resultados/>
      default:             return <Mapa area={area}/>
    }
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

        {GRUPOS.map((g, gi) => (
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
                  <span className={`v3-mk ${a.status}`} title={STATUS_TXT[a.status]}/>
                </button>
              )
            })}
          </React.Fragment>
        ))}

        <div className="v3-sidefoot">
          <Legenda/>
          <div className="v3-plate">
            <div className="pl">STARTOUCH {dados.biz?.plan === 'pro' ? 'PRO' : 'FREE'}</div>
            <div className="sub">{dados.biz?.name || user?.email || '—'}</div>
            <button className="out" onClick={logout}>Sair</button>
          </div>
        </div>
      </nav>

      <main className="v3-main">{conteudo()}</main>
    </div>
  )
}
