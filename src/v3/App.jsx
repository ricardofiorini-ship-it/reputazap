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
import { GRUPOS, AREAS, STATUS_TXT } from './lib/areas.js'
import { currentUser, logout } from './lib/api.js'
import { useDados } from './lib/dados.js'
import { Carregando, Erro } from './ui.jsx'
import Inicio from './screens/Inicio.jsx'
import Experiencia from './screens/Experiencia.jsx'
import Dispositivos from './screens/Dispositivos.jsx'
import Reputacao from './screens/Reputacao.jsx'
import Mapa from './screens/Mapa.jsx'

const BASE = '/painel'
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
  const dados = useDados()
  const user = currentUser()

  // Botão voltar/avançar do navegador.
  React.useEffect(() => {
    const onPop = () => setId(areaDaUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const ir = React.useCallback((novo) => {
    if (!AREAS[novo]) return
    window.history.pushState({}, '', `${BASE}/${novo}`)
    setId(novo)
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
      default:             return <Mapa area={area}/>
    }
  }

  return (
    <div className="v3">
      <nav className="v3-side" aria-label="Áreas do painel">
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
