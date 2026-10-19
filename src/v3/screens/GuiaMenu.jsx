// ============================================================
// StarTouch V3 — Guia do editor do Menu Inteligente (19/10/2026)
// ============================================================
// O Ricardo montou e publicou o próprio menu e se perdeu na tela. Se quem
// desenhou o produto se perde, o lojista se perde mais — e são exatamente os
// 19 que montaram e pararam. O editor tem tudo; faltava dizer POR ONDE
// começar.
//
// Escurece a página e acende UMA parte por vez, na ordem que a pessoa faz de
// verdade: a cara do menu → os botões → a prévia → onde ele abre → publicar.
// É a mesma ordem do "Crie → Vincule → Publique" lá em cima.
//
// TRÊS DECISÕES QUE NÃO SÃO ÓBVIAS:
//   1. A parte acesa FUNCIONA. A pessoa pode digitar o título ou ligar o
//      dispositivo com o guia aberto — guia que só mostra e não deixa fazer
//      vira slide, e a pessoa esquece tudo até fechar. O escuro, esse sim,
//      não recebe clique: é o que mantém o olho no lugar certo.
//   2. Os alvos são marcados com `data-guia` no editor. O guia não sabe nada
//      do desenho da tela: se um bloco mudar de lugar, ele acompanha.
//   3. Qualquer janela que abra por cima (assinatura, sem dispositivo,
//      ativação) fecha o guia — escuro por cima de janela é tela travada.
// ============================================================
import React from 'react'
import { X } from 'lucide-react'

export const CHAVE_GUIA_MENU = 'st_guia_menu_v1'

export function guiaJaVisto() {
  try { return localStorage.getItem(CHAVE_GUIA_MENU) === '1' } catch { return false }
}
function marcarVisto() {
  try { localStorage.setItem(CHAVE_GUIA_MENU, '1') } catch {}
}

function passos({ temDispositivo, comTeste }) {
  return [
    {
      alvo: 'identidade',
      titulo: 'A cara do seu menu',
      texto: 'Confira o nome do seu negócio e escreva uma frase curta de boas-vindas. É a primeira coisa que o seu cliente lê.'
    },
    {
      alvo: 'botoes',
      // No celular a lista é mais alta que a tela e o "Adicionar botão" — a
      // ação desta etapa — ficava escondido embaixo do cartão.
      foco: '#me-adicionar',
      titulo: 'Os botões',
      texto: 'O “Avaliar no Google” já vem pronto e fica sempre no topo. Clique em “Adicionar botão” para incluir WhatsApp, Instagram, cardápio, agenda… Preencha e clique em “Inserir”.'
    },
    {
      alvo: 'previa',
      titulo: 'Veja como fica',
      texto: 'Este celular mostra, na hora, o que o seu cliente vai ver. Clique num botão dele para editar.'
    },
    {
      alvo: 'dispositivos',
      titulo: 'Escolha onde ele abre',
      texto: temDispositivo
        ? 'Ligue o interruptor do cartão, placa ou pulseira em que este menu deve aparecer. Quem encostar o celular ali abre o menu.'
        : 'O menu abre quando o cliente encosta o celular num dispositivo StarTouch. Se você já tem um na mão, ative aqui; se não, veja na loja.'
    },
    {
      alvo: 'publicar',
      titulo: 'Publique',
      texto: comTeste
        ? 'Tudo certo? Clique em “Publicar menu”. Começa o seu teste grátis de 7 dias, sem cartão. Antes disso, nada muda para o cliente.'
        : 'Tudo certo? Clique em “Publicar menu”. Antes disso, nada muda para o cliente: o dispositivo continua levando direto ao Google.'
    }
  ]
}

const FOLGA = 8          // respiro entre a parte acesa e o conteúdo dela
const MARGEM = 12        // distância mínima das bordas da tela

function medir(el) {
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth, vh = window.innerHeight
  // Recorta na tela: um bloco mais alto que ela (os botões, no celular) não
  // pode empurrar o buraco pra fora, senão o escuro some de um dos lados.
  const top = Math.max(r.top - FOLGA, 0)
  const left = Math.max(r.left - FOLGA, 0)
  const bottom = Math.min(r.bottom + FOLGA, vh)
  const right = Math.min(r.right + FOLGA, vw)
  return {
    top: Math.round(top), left: Math.round(left),
    width: Math.round(Math.max(right - left, 0)), height: Math.round(Math.max(bottom - top, 0)),
    vw, vh
  }
}

export default function GuiaMenu({ inicio = 0, temDispositivo, comTeste, onFechar }) {
  const lista = passos({ temDispositivo, comTeste })
  const [i, setI] = React.useState(Math.min(inicio, lista.length - 1))
  const [caixa, setCaixa] = React.useState(null)
  const cartaoRef = React.useRef(null)
  const [alturaCartao, setAlturaCartao] = React.useState(190)
  const passo = lista[i]
  const ultimo = i === lista.length - 1

  const fechar = React.useCallback((acao) => {
    marcarVisto()
    if (window.gtag) window.gtag('event', 'menu_guia', { acao, passo: i + 1 })
    onFechar?.()
  }, [i, onFechar])

  // Leva a tela até a parte da vez, encostada no topo (com o recuo do
  // `scroll-margin-top`): o espaço que sobra fica embaixo, onde o cartão
  // cabe sem cobrir nada. Centralizar dividia a sobra em duas e, no celular,
  // nenhuma das metades comportava o cartão.
  React.useEffect(() => {
    const el = document.querySelector(`[data-guia="${passo.alvo}"]`)
    if (!el) return
    const alto = el.getBoundingClientRect().height > window.innerHeight * 0.55
    const foco = passo.foco && window.innerWidth < 700 && document.querySelector(passo.foco)
    if (alto && foco) foco.scrollIntoView({ block: 'center', behavior: 'smooth' })
    else el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [passo.alvo, passo.foco])

  // Acompanha o alvo enquanto a página rola, a janela muda ou o próprio bloco
  // cresce (botão novo inserido, campo aberto). Medir a cada quadro custa
  // quase nada e não depende de lembrar de cada evento que mexe no desenho.
  React.useEffect(() => {
    let vivo = true, quadro
    const tique = () => {
      if (!vivo) return
      const el = document.querySelector(`[data-guia="${passo.alvo}"]`)
      const m = el ? medir(el) : null
      setCaixa(c => (c && m && c.top === m.top && c.left === m.left && c.width === m.width
        && c.height === m.height && c.vw === m.vw && c.vh === m.vh) ? c : m)
      if (cartaoRef.current) {
        const h = cartaoRef.current.offsetHeight
        setAlturaCartao(a => a === h ? a : h)
      }
      quadro = requestAnimationFrame(tique)
    }
    tique()
    return () => { vivo = false; cancelAnimationFrame(quadro) }
  }, [passo.alvo])

  // O "Já tenho um — ativar" abre a janela de ativação do /app por cima.
  React.useEffect(() => {
    const sair = () => fechar('ativar')
    window.addEventListener('st:ativar-dispositivo', sair)
    return () => window.removeEventListener('st:ativar-dispositivo', sair)
  }, [fechar])

  React.useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') fechar('pulou')
      // Setas só fora de campo de texto: ali elas movem o cursor.
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')
      if (digitando) return
      if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, lista.length - 1))
      if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fechar, lista.length])

  if (!caixa) return null

  const { top, left, width, height, vw, vh } = caixa
  // O cartão vai onde couber sem cobrir o bloco: embaixo, em cima, ao lado
  // (bloco alto no computador, como a lista de botões) ou — no celular, com o
  // bloco ocupando a tela inteira — preso ao pé da tela, por cima dele.
  const larguraCartao = Math.min(360, vw - MARGEM * 2)
  const folgaV = alturaCartao + MARGEM * 2, folgaH = larguraCartao + MARGEM * 2
  const naAltura = Math.min(Math.max(top, MARGEM), vh - alturaCartao - MARGEM)
  const posCartao = { width: larguraCartao }
  if (vh - (top + height) >= folgaV) {
    posCartao.top = top + height + MARGEM
    posCartao.left = Math.min(Math.max(left, MARGEM), vw - larguraCartao - MARGEM)
  } else if (top >= folgaV) {
    posCartao.top = top - alturaCartao - MARGEM
    posCartao.left = Math.min(Math.max(left, MARGEM), vw - larguraCartao - MARGEM)
  } else if (vw - (left + width) >= folgaH) {
    posCartao.top = naAltura; posCartao.left = left + width + MARGEM
  } else if (left >= folgaH) {
    posCartao.top = naAltura; posCartao.left = left - larguraCartao - MARGEM
  } else {
    posCartao.top = vh - alturaCartao - MARGEM
    posCartao.left = Math.min(Math.max(left, MARGEM), vw - larguraCartao - MARGEM)
  }
  // Quatro faixas escuras em volta do buraco: o escuro bloqueia o clique, o
  // buraco não tem nada por cima e a parte acesa responde normalmente.
  const parar = (e) => { e.preventDefault(); e.stopPropagation() }

  return (
    <div className="me-guia" aria-hidden="false">
      <div className="me-guia-escuro" style={{ top: 0, left: 0, width: vw, height: top }} onClick={parar}/>
      <div className="me-guia-escuro" style={{ top: top + height, left: 0, width: vw, height: Math.max(vh - top - height, 0) }} onClick={parar}/>
      <div className="me-guia-escuro" style={{ top, left: 0, width: left, height }} onClick={parar}/>
      <div className="me-guia-escuro" style={{ top, left: left + width, width: Math.max(vw - left - width, 0), height }} onClick={parar}/>
      <div className="me-guia-anel" style={{ top, left, width, height }}/>

      <div className="me-guia-cartao" ref={cartaoRef} style={posCartao}
        role="dialog" aria-modal="false" aria-labelledby="me-guia-titulo" aria-live="polite">
        <button className="me-guia-x" onClick={() => fechar('pulou')} aria-label="Fechar o passo a passo"><X size={15}/></button>
        <div className="me-guia-conta">
          {lista.map((_, n) => <i key={n} className={n === i ? 'atual' : n < i ? 'feito' : ''}/>)}
          <span>{i + 1} / {lista.length}</span>
        </div>
        <h3 id="me-guia-titulo">{passo.titulo}</h3>
        <p>{passo.texto}</p>
        <div className="me-guia-acoes">
          {i > 0
            ? <button className="v3-btn ghost" onClick={() => setI(i - 1)}>Voltar</button>
            : <button className="v3-btn ghost" onClick={() => fechar('pulou')}>Pular</button>}
          <button className="v3-btn solid" onClick={() => ultimo ? fechar('concluiu') : setI(i + 1)}>
            {ultimo ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
