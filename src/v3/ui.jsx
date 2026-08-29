// ============================================================
// StarTouch V3 — peças compartilhadas de tela
// ============================================================
// Pequenas de propósito: cada uma faz uma coisa e as telas compõem. É o
// oposto do arquivo único de 6.664 linhas que o painel atual virou.
// ============================================================
import React from 'react'
import { Star } from 'lucide-react'
import { STATUS_TXT, STATUS_CHIP } from './lib/areas.js'

export function Head({ oi, titulo, sub, children }) {
  return (
    <div className="v3-head">
      <div>
        {oi && <div className="hi">{oi}</div>}
        <h1>{titulo}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children && <div className="v3-pickers">{children}</div>}
    </div>
  )
}

// `valor` null significa "não sabemos", que é diferente de zero. Mostrar 0
// onde não há medição é a mentira mais fácil de cometer num painel — e a
// tela do cliente já tem um caso desses documentado (toques sem log).
export function Kpi({ rotulo, valor, sub, indisponivel }) {
  return (
    <div className="v3-kpi">
      <div className="k">{rotulo}</div>
      {valor == null
        ? <div className="v na">{indisponivel || 'sem medição'}</div>
        : <div className="v">{valor}</div>}
      {sub && <div className="d">{sub}</div>}
    </div>
  )
}

export function Delta({ atual, anterior, sufixo = '' }) {
  if (atual == null || anterior == null) return null
  if (anterior === 0) {
    return atual > 0 ? <span className="up">novo no período</span> : null
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return <span>igual ao período anterior</span>
  return (
    <>
      <span className={pct > 0 ? 'up' : 'down'}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%{sufixo}</span>
      {' '}vs. período anterior
    </>
  )
}

export function Panel({ titulo, sub, children, rodape, extra }) {
  return (
    <section className="v3-panel">
      {(titulo || sub) && (
        <header>
          <h2>{titulo}{extra}</h2>
          {sub && <div className="psub">{sub}</div>}
        </header>
      )}
      <div className="body">{children}</div>
      {rodape && <footer>{rodape}</footer>}
    </section>
  )
}

export function Chip({ tipo = '', children }) {
  return <span className={`chip ${tipo}`}>{children}</span>
}

export function ChipStatus({ s }) {
  return <span className={STATUS_CHIP[s]}>{STATUS_TXT[s]}</span>
}

export function ChipPlano({ p }) {
  return p === 'free' ? <span className="chip g">Free</span> : <span className="chip">PRO</span>
}

// A tabela que materializa a regra: o plano pertence ao RECURSO, não à área.
export function Recursos({ itens }) {
  if (!itens?.length) return null
  return (
    <Panel titulo="Recursos desta área" sub="O plano pertence ao recurso, não à área">
      <div className="v3-table-wrap">
        <table className="v3-t">
          <thead><tr><th>Recurso</th><th>Plano</th><th>Estágio</th></tr></thead>
          <tbody>
            {itens.map((f, i) => (
              <tr key={i}>
                <td>
                  <div className="nm">{f.n}</div>
                  {f.d && <div className="sm">{f.d}</div>}
                </td>
                <td><ChipPlano p={f.p}/></td>
                <td><ChipStatus s={f.s}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function DefBox({ decidido, falta }) {
  if (!decidido?.length && !falta?.length) return null
  return (
    <div className="v3-defbox">
      {!!decidido?.length && (
        <div>
          <div className="h">Já decidido</div>
          <ul>{decidido.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {!!falta?.length && (
        <div>
          <div className="h">Falta fechar</div>
          <ul>{falta.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

export function Estrelas({ nota, tamanho = 13 }) {
  const n = Math.round(nota || 0)
  return (
    <span className="v3-stars" aria-label={`${nota} de 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={tamanho} strokeWidth={2}
          fill={i <= n ? '#F5A623' : 'none'} color={i <= n ? '#F5A623' : '#CBD5E1'}/>
      ))}
    </span>
  )
}

// Barras por dia. Sem biblioteca: são N retângulos, e uma dependência de
// gráfico pra isso seria peso sem retorno.
export function Barras({ serie, rotuloA, rotuloB }) {
  const max = Math.max(1, ...serie.map(d => d.taps))
  return (
    <>
      <div className="v3-bars">
        {serie.map((d, i) => (
          <div key={i}
            className={'b' + (d.taps === max && max > 0 ? ' hi' : '')}
            style={{ height: `${Math.max(2, (d.taps / max) * 100)}%` }}
            title={`${d.day}: ${d.taps} ${d.taps === 1 ? 'toque' : 'toques'}`}/>
        ))}
      </div>
      <div className="v3-barlabels"><span>{rotuloA}</span><span>{rotuloB}</span></div>
    </>
  )
}

export function Carregando({ o = 'dados' }) {
  return <div className="v3-state">Carregando {o}…</div>
}

export function Erro({ mensagem, onTentar }) {
  return (
    <div className="v3-state">
      <div style={{ marginBottom: 12 }}>{mensagem}</div>
      {onTentar && <button className="v3-btn" onClick={onTentar}>Tentar de novo</button>}
    </div>
  )
}

export const dataBr = (iso) => {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
  catch { return null }
}

export function desde(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'há minutos'
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d} dias`
  return dataBr(iso)
}

export const diasDesde = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null
