// ============================================================
// StarTouch V3 — Editor do Menu Inteligente
// ============================================================
// Montar é fácil; publicar é seguro. As duas coisas puxam para lados opostos,
// e é aqui que o desenho decide.
//
// O EDITOR NÃO TEM REGRA PRÓPRIA. Toda validação vem do servidor
// (`save-draft` e `publish` devolvem `validacao`). Se a tela tivesse a própria
// cópia das regras, um dia ela diria "pode publicar" sobre algo que a
// publicação recusa — e o lojista ficaria preso sem entender.
//
// Rascunho salva sozinho, com atraso. Publicar é sempre gesto explícito: é a
// separação entre "mexer à vontade" e "ir ao ar" que o briefing pediu.
// ============================================================
import React from 'react'
import './editor-menu.css'
import PhoneFrame from '../PhoneFrame.jsx'
import {
  ArrowLeft, ChevronUp, ChevronDown, GripVertical, Trash2, Plus, Lock,
  AlertTriangle, Check, ExternalLink, Info, Sparkles, X
} from 'lucide-react'
import { api } from '../lib/api.js'
import { Chip } from '../ui.jsx'
import { nomeProduto } from '../lib/dados.js'
import { ICONES, CORES, FUNDOS, CHEIOS } from '../../../api/_lib/menu-icones.js'

// Ícone, cor e fundo vêm de `api/_lib/menu-icones.js` — O MESMO módulo que o
// menu público usa. Aqui antes havia uma tabela própria que desenhava com
// CARACTERES DE TEXTO (★ ✆ ◎ ▤): o lojista montava o menu vendo um símbolo e o
// cliente dele via outro desenho. E o pior lugar onde isso aparecia era a
// prévia do celular logo ao lado, que existe justamente pra mostrar o que vai
// ao ar. Agora é um desenho só, por construção.
const visual = (t) => ({ cor: CORES[t] || CORES.custom_url, bg: FUNDOS[t] || FUNDOS.custom_url })

// O SVG do módulo é uma string de conteúdo de <svg>. `dangerouslySetInnerHTML`
// aqui é seguro e é o único caminho: o conteúdo é CONSTANTE nossa, escrita no
// código, nunca dado de usuário.
function IconeTipo({ tipo, tamanho = 22 }) {
  const cor = CORES[tipo] || CORES.custom_url
  const cheio = CHEIOS.has(tipo)
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24"
      fill={cheio ? cor : 'none'} stroke={cheio ? 'none' : cor}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flex: 'none' }}
      dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
  )
}

// Campos por tipo. Rótulos escritos pro lojista, não pro banco.
const CAMPOS = {
  whatsapp:   [['telefone', 'WhatsApp com DDD', 'tel'], ['mensagem', 'Mensagem que já vai escrita', 'text']],
  // `manager` nao entra aqui: os campos dele dependem do canal escolhido pelo
  // dono do negocio, e quem monta essa lista e `camposDaGerencia()`.
  phone:      [['telefone', 'Telefone com DDD', 'tel']],
  instagram:  [['url', 'Seu Instagram (@usuário ou endereço)', 'text']],
  food_menu:  [['url', 'Endereço do cardápio', 'url']],
  website:    [['url', 'Endereço do site', 'url']],
  booking:    [['url', 'Endereço da sua agenda (Calendly, Doctoralia, sistema próprio…)', 'url']],
  custom_url: [['url', 'Endereço de destino', 'url']],
  contact:    [['nome', 'Nome', 'text'], ['cargo', 'Cargo (opcional)', 'text'],
               ['telefone', 'Telefone com DDD', 'tel'], ['email', 'E-mail (opcional)', 'email']]
}

// O botão da gerência tem DOIS destinos possíveis e o dono escolhe qual: o
// cliente dele vai falar por WhatsApp ou por e-mail. Os campos seguem a
// escolha — não faz sentido pedir telefone a quem vai atender por e-mail.
//
// O campo `mensagem` serve aos dois: vira o texto já escrito no WhatsApp ou o
// corpo do e-mail. Um campo, dois usos.
function camposDaGerencia(b) {
  return (b.value?.canal === 'email')
    ? [['email', 'E-mail da gerência', 'email'], ['mensagem', 'Mensagem que já vai escrita', 'text']]
    : [['telefone', 'WhatsApp da gerência, com DDD', 'tel'], ['mensagem', 'Mensagem que já vai escrita', 'text']]
}

function novoBotaoLocal(type, tipos) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]
  return { id: 'b_' + s, type, label: tipos?.[type]?.label || type, enabled: true, value: {} }
}

// ── Prévia ──────────────────────────────────────────────────
function Previa({ draft, foto, onSelecionar, selecionado }) {
  const ligados = (draft.buttons || []).filter(b => b.enabled)
  return (
    <PhoneFrame className="v3-fone">
      <div className="tela">
        {/* Sem foto o topo não vira quadrado cinza: fica só texto, com mais
            respiro. Ausência tem que parecer escolha, não falha. */}
        {draft.brand?.logo === 'google' && foto
          ? <img className="logo" src={foto} alt=""/>
          : <div style={{ height: 6 }}/>}
        <div className="nome">{draft.brand?.titulo || 'Seu negócio'}</div>
        {draft.brand?.subtitulo && <div className="sb">{draft.brand.subtitulo}</div>}
        {ligados.length === 0 && <div className="vazio">Nenhum botão ligado ainda.</div>}
        {ligados.map(b => (
          <button type="button" className="bt" key={b.id} aria-label={`Editar ${b.label} na prévia`} aria-pressed={selecionado === b.id} onClick={() => onSelecionar(b.id)}>
            <IconeTipo tipo={b.type} tamanho={20}/>
            <span>{b.label}</span>
          </button>
        ))}
        <img src="/startouch-logo-dark.png" alt="StarTouch" width="82" height="27" style={{ display: 'block', objectFit: 'contain', margin: '18px auto 0' }}/>
      </div>
    </PhoneFrame>
  )
}

// ── Um item da lista ────────────────────────────────────────
function Item({ b, tipos, erro, aberto, novo, onAbrir, onMudar, onMover, onRemover, primeiro, ultimo, arrastando, onPegar }) {
  // Tirar do menu em DOIS CLIQUES. Até 07/09/2026 o único caminho pra remover
  // era abrir o botão em "Editar" — o que escondia a ação mais óbvia da lista
  // atrás de outra. Na linha ela precisa existir, e precisa de trava: a lixeira
  // fica ao lado do interruptor e do "mover", e clique errado num item já
  // configurado apagaria o trabalho.
  //
  // Confirmação INLINE, e não janela do navegador: um `confirm()` por remoção
  // vira ruído em quem monta um menu de seis botões.
  const [confirmando, setConfirmando] = React.useState(false)
  React.useEffect(() => {
    if (!confirmando) return
    // Some sozinha: lixeira armada esquecida na tela é uma remoção esperando
    // o próximo clique distraído.
    const t = setTimeout(() => setConfirmando(false), 4000)
    return () => clearTimeout(t)
  }, [confirmando])

  // O botão do Google não sai do menu nem muda de lugar (Ricardo, 07/09/2026).
  // A garantia de verdade está na normalização do contrato; aqui a tela só
  // deixa de oferecer o que não vai acontecer.
  const fixo = b.type === 'google'
  const vis = visual(b.type)
  const campos = b.type === 'manager' ? camposDaGerencia(b) : (CAMPOS[b.type] || [])
  const resumo = (() => {
    if (b.type === 'google') return 'Avaliação no perfil do seu negócio'
    if (b.type === 'location') return 'Localização do seu negócio no Google'
    if (b.type === 'contact') return [b.value?.nome, b.value?.cargo].filter(Boolean).join(' · ') || 'sem dados ainda'
    if (b.type === 'whatsapp' || b.type === 'manager' || b.type === 'phone') return b.value?.telefone || 'sem telefone ainda'
    return b.value?.url || 'sem endereço ainda'
  })()

  return (
    <>
      <div id={`editor-botao-${b.id}`} className={'v3-item' + (aberto ? ' aberto' : '') + (erro ? ' ruim' : '') + (b.enabled ? '' : ' off') + (arrastando ? ' arrastando' : '')}>
        {/* O "Avaliar no Google" e FIXO: sem alca, sem setas, sem lixeira e sem
            interruptor. Meia trava e pior que nenhuma — a pessoa descobre o
            limite errando, e no caminho acha que quebrou alguma coisa. */}
        {fixo ? (
          <span className="pega fixa" title="Este botão fica sempre no topo" aria-hidden="true">
            <Lock size={13}/>
          </span>
        ) : (
          <button className="pega" onPointerDown={onPegar} aria-label="Arrastar para reordenar" title="Arrastar para reordenar">
            <GripVertical size={14}/>
          </button>
        )}
        <span className="ico" style={{ background: vis.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IconeTipo tipo={b.type} tamanho={18}/></span>
        <span className="txt">
          <span className="t">{b.label}</span>
          <span className="d">{erro ? erro.msg : resumo}</span>
        </span>
        <span className="acs">
          {erro && <span className="v3-tag err">corrigir</span>}
          {!b.enabled && !fixo && <span className="v3-tag off">desligado</span>}
          {fixo && <span className="v3-tag">sempre no topo</span>}
          {/* Mover por botão é o caminho de quem usa teclado e o socorro de
              quem não consegue arrastar no celular. */}
          {!fixo && <button className="mini" onClick={() => onMover(-1)} disabled={primeiro} aria-label="Mover para cima"><ChevronUp size={14}/></button>}
          {!fixo && <button className="mini" onClick={() => onMover(1)} disabled={ultimo} aria-label="Mover para baixo"><ChevronDown size={14}/></button>}
          <button className="v3-btn ghost" onClick={onAbrir}>{aberto ? 'Fechar' : 'Editar'}</button>
          {!fixo && (
            <button className={'v3-switch' + (b.enabled ? '' : ' off')} onClick={() => onMudar({ enabled: !b.enabled })}
              aria-label={b.enabled ? 'Desligar botão' : 'Ligar botão'} aria-pressed={b.enabled}><i/></button>
          )}
          {fixo ? null : confirmando ? (
            <button className="v3-btn" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={() => { setConfirmando(false); onRemover() }}
              aria-label="Confirmar remoção deste botão">Remover?</button>
          ) : (
            <button className="mini" onClick={() => setConfirmando(true)}
              aria-label="Tirar este botão do menu" title="Tirar do menu"><Trash2 size={14}/></button>
          )}
        </span>
      </div>

      {aberto && (
        <div className="v3-editbox">
          <label className="v3-campo">
            <span className="lb">Texto do botão</span>
            <input value={b.label} maxLength={40} onChange={e => onMudar({ label: e.target.value })}/>
          </label>
          {b.type === 'manager' && (
            <div className="v3-campo">
              <span className="lb">Como a gerência recebe o contato</span>
              <div className="me-canal" role="group" aria-label="Canal de contato da gerência">
                {[['whatsapp', 'WhatsApp'], ['email', 'E-mail']].map(([id, rotulo]) => (
                  <button key={id} type="button"
                    aria-pressed={(b.value?.canal || 'whatsapp') === id}
                    onClick={() => onMudar({ value: { ...(b.value || {}), canal: id } })}>
                    {rotulo}
                  </button>
                ))}
              </div>
              {/* O outro campo continua guardado: trocar de canal e voltar não
                  apaga o que já estava preenchido. */}
              <span className="v3-dica" style={{ marginTop: 6, display: 'block' }}>
                {(b.value?.canal || 'whatsapp') === 'email'
                  ? 'O botão abre o aplicativo de e-mail do cliente, já endereçado para você.'
                  : 'O botão abre a conversa no WhatsApp, já com o seu número.'}
              </span>
            </div>
          )}
          {campos.map(([campo, rotulo, tipo]) => (
            <label className={'v3-campo' + (erro?.campo === campo ? ' erro' : '')} key={campo}>
              <span className="lb">{rotulo}</span>
              <input type={tipo === 'url' ? 'text' : tipo} value={b.value?.[campo] || ''}
                onChange={e => onMudar({ value: { ...(b.value || {}), [campo]: e.target.value } })}/>
              {erro?.campo === campo && <span className="msg">{erro.msg}</span>}
            </label>
          ))}
          {!campos.length && (
            <p className="v3-dica">Este botão não precisa de configuração: o endereço é montado na hora a partir do seu cadastro no Google.</p>
          )}
          {b.type === 'contact' && (
            <p className="v3-dica">
              Este é o contato que será entregue em <b>todos os dispositivos que usam esta experiência</b>.
              Para o cartão de uma pessoa específica, crie uma experiência para ela.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 10 }}>
            <button className="v3-btn ghost" onClick={onRemover}><Trash2 size={13}/> Remover botão</button>
            <button className="v3-btn solid" onClick={onAbrir} disabled={!!erro}>
              {erro ? (novo ? 'Corrija para inserir' : 'Corrija para concluir') : (novo ? 'Inserir' : 'Concluir')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================
// ── A CAIXA DA ASSINATURA ──
// Abre por cima do editor em vez de levar pra outra página: a pessoa está no
// meio do trabalho dela, e tirá-la daqui faria parecer que o menu ficou pra
// trás. A primeira linha é justamente essa: seu menu está salvo.
//
// Sair é fácil de propósito. Caixa sem saída clara é armadilha, e o cliente
// que se sente preso não volta.
function CaixaAssinatura({ ligados, onFechar }) {
  const [indo, setIndo] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  async function assinar() {
    setIndo(true); setErro(null)
    try {
      const r = await api.assinatura.checkout('menu')
      if (!r?.url) throw new Error('Não recebemos o endereço do pagamento.')
      window.location.href = r.url
    } catch (e) {
      setErro(e.message || 'Não foi possível abrir o pagamento.')
      setIndo(false)
    }
  }

  // Esc fecha. Teclado é a saída de quem não usa mouse — e a que a gente
  // esquece de dar.
  React.useEffect(() => {
    const fechar = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [onFechar])

  return (
    <div className="me-paywall-fundo" onClick={onFechar} role="presentation">
      <div className="me-paywall" onClick={e => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-labelledby="paywall-titulo">
        <button className="me-paywall-x" onClick={onFechar} aria-label="Fechar"><X size={16}/></button>

        <div className="me-paywall-selo"><Sparkles size={13}/> MENU INTELIGENTE</div>
        <h2 id="paywall-titulo">Seu menu está salvo.</h2>
        <p className="me-paywall-sub">
          Para ele chegar aos seus dispositivos, é preciso ter o StarTouch Pro.
        </p>

        <ul className="me-paywall-lista">
          <li><Check size={14}/> {ligados === 1 ? 'Seu botão' : `Seus ${ligados} botões`} no lugar da avaliação avulsa</li>
          <li><Check size={14}/> Troque o menu quando quiser, sem trocar o dispositivo</li>
          <li><Check size={14}/> Relatórios de uso por dispositivo</li>
          <li><Check size={14}/> A avaliação no Google continua no topo, sempre</li>
        </ul>

        <div className="me-paywall-preco">
          <strong>7 dias grátis</strong>
          <span>depois R$ 19,90 por mês · sem fidelidade, cancele quando quiser</span>
        </div>

        {erro && <div className="me-paywall-erro"><AlertTriangle size={13}/> {erro}</div>}

        <button className="v3-btn solid me-paywall-cta" onClick={assinar} disabled={indo}>
          {indo ? 'Abrindo…' : 'Começar os 7 dias grátis'}
        </button>
        <button className="v3-btn ghost me-paywall-voltar" onClick={onFechar} disabled={indo}>
          Continuar editando
        </button>
        <p className="me-paywall-fim">
          Enquanto isso, seus dispositivos seguem levando direto à avaliação no Google.
        </p>
      </div>
    </div>
  )
}

export default function EditorMenu({ exp, dados, tipos, limites, foto, experiencias, plano, onVoltar, onAtualizar }) {
  const [draft, setDraft] = React.useState(() => exp.draft || { brand: {}, buttons: [] })
  const [validacao, setValidacao] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [sujo, setSujo] = React.useState(false)
  const [aberto, setAberto] = React.useState(null)
  const [addOpen, setAddOpen] = React.useState(false)
  // Qual botão acabou de ser adicionado — só ele mostra "Inserir".
  const [recem, setRecem] = React.useState(null)
  // A caixa da assinatura. Abre no "Publicar" de quem ainda não tem Pro.
  const [paywall, setPaywall] = React.useState(false)

  // MODO PRÉVIA: a experiência é fictícia e não existe no banco. Sem esta
  // guarda, cada tecla digitada aqui vira um POST que responde 404 e pinta
  // "Falha ao salvar" numa tela que está só sendo revisada — ruído que faz
  // duvidar de um editor que está inteiro.
  const ehPrevia = exp.id === 'preview-menu'
  const [publicando, setPublicando] = React.useState(false)
  const [erroGeral, setErroGeral] = React.useState(null)
  const [publicou, setPublicou] = React.useState(null)   // confirmação do que acabou de acontecer
  const [arrasto, setArrasto] = React.useState(null)
  const [nome, setNome] = React.useState(exp.name)
  const [fotoFalhou, setFotoFalhou] = React.useState(false)
  React.useEffect(() => setFotoFalhou(false), [foto])
  const fotoDisponivel = foto && !fotoFalhou ? foto : null
  const listaRef = React.useRef(null)

  // O nome interno vive em `experiences.name`, fora do JSON: ele não é
  // conteúdo do menu, é etiqueta de organização. Grava ao sair do campo —
  // salvar a cada tecla num campo de nome é pedido de rede à toa.
  async function salvarNome() {
    const limpo = nome.trim()
    if (!limpo || limpo === exp.name) { setNome(exp.name); return }
    try {
      const r = await api.experiencias.renomear(exp.id, limpo)
      onAtualizar?.(r.experience, { silencioso: true })
    } catch (e) { setErroGeral(e.message); setNome(exp.name) }
  }

  const publicado = exp.published || null
  // Quem sabe se há pendência é o SERVIDOR: o publicado é uma versão filtrada
  // e normalizada do rascunho (sem os botões desligados, com URLs arrumadas),
  // então comparar os dois aqui dava "sempre diferente" — e a barra continuava
  // dizendo "alterações não publicadas" logo depois de publicar, fazendo o
  // botão parecer que não funcionou. `sujo` cobre o intervalo entre digitar e
  // o servidor responder.
  // `publicou` manda enquanto a tela recarrega: publicar responde na hora, mas
  // a lista só volta do servidor um instante depois. Sem isto, a barra ficava
  // vermelha nesse intervalo e a pessoa via "não publicado" logo após publicar
  // — o mesmo susto de antes, por outro caminho.
  const naoPublicado = sujo || (publicou ? false : exp.pendente !== false)

  // ── Salvamento automático, com atraso ──
  // O veredito volta do servidor: é ele que decide, aqui só exibe.
  const timer = React.useRef(null)
  const gravar = React.useCallback((d) => {
    clearTimeout(timer.current)
    setSujo(true)
    if (exp.id === 'preview-menu') { setSujo(false); return }
    timer.current = setTimeout(async () => {
      setSalvando(true); setErroGeral(null)
      try {
        const r = await api.experiencias.salvar(exp.id, d)
        setValidacao(r.validacao || null)
        setSujo(false)
        onAtualizar?.(r.experience, { silencioso: true })
      } catch (e) {
        setErroGeral(e.message || 'Não foi possível salvar.')
      } finally {
        setSalvando(false)
      }
    }, 700)
  }, [exp.id, onAtualizar])

  React.useEffect(() => () => clearTimeout(timer.current), [])

  // A confirmação some sozinha: aviso que fica pra sempre vira paisagem.
  React.useEffect(() => {
    if (!publicou) return
    const t = setTimeout(() => setPublicou(null), 8000)
    return () => clearTimeout(t)
  }, [publicou])

  // Salvar na hora, sem esperar o temporizador. O salvamento automatico
  // continua existindo como rede de seguranca (ninguem perde trabalho por
  // fechar a aba); este botao existe pra a pessoa TER CERTEZA.
  async function salvarAgora() {
    clearTimeout(timer.current)
    setSalvando(true); setErroGeral(null)
    try {
      const r = await api.experiencias.salvar(exp.id, draft)
      setValidacao(r.validacao || null)
      setSujo(false)
      onAtualizar?.(r.experience, { silencioso: true })
    } catch (e) {
      setErroGeral(e.message || 'Não foi possível salvar.')
    } finally { setSalvando(false) }
  }

  function mudar(novo) {
    setDraft(novo)
    gravar(novo)
  }
  const mudarBotao = (id, patch) =>
    mudar({ ...draft, buttons: draft.buttons.map(b => b.id === id ? { ...b, ...patch } : b) })
  const removerBotao = (id) => {
    setAberto(null)
    mudar({ ...draft, buttons: draft.buttons.filter(b => b.id !== id) })
  }
  function moverBotao(id, dir) {
    const i = draft.buttons.findIndex(b => b.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= draft.buttons.length) return
    const arr = [...draft.buttons]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    mudar({ ...draft, buttons: arr })
  }
  function adicionar(type) {
    setAddOpen(false)
    if (draft.buttons.length >= (limites?.botoes || 12)) return
    const b = novoBotaoLocal(type, tipos)
    // Site já nasce com o endereço que o Google conhece: um campo a menos
    // pra preencher, e sai de graça (a consulta que já fazemos traz o dado).
    if (type === 'website' && dados?.info?.website) b.value = { url: dados.info.website }
    mudar({ ...draft, buttons: [...draft.buttons, b] })
    setAberto(b.id)
    setRecem(b.id)
  }

  // ── Arrastar (pointer events: mouse e dedo no mesmo código) ──
  // A API de arrastar do HTML é notoriamente ruim em celular. Altura de linha
  // fixa no CSS torna a conta exata, sem medir item por item.
  // Mede as linhas: no celular os controles podem ocupar mais de uma linha.
  function pegar(id, ev) {
    if (ev.button != null && ev.button !== 0) return
    ev.preventDefault()
    const de = draft.buttons.findIndex(b => b.id === id)
    const centros = Array.from(listaRef.current?.querySelectorAll('.v3-item') || []).map(el => {
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
    setArrasto({ id, de, para: de, y0: ev.clientY, centros })
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
  }
  React.useEffect(() => {
    if (!arrasto) return
    const mover = (ev) => {
      const alvo = arrasto.centros[arrasto.de] + ev.clientY - arrasto.y0
      const para = arrasto.centros.reduce((melhor, centro, i) =>
        Math.abs(centro - alvo) < Math.abs(arrasto.centros[melhor] - alvo) ? i : melhor, arrasto.de)
      if (para !== arrasto.para) setArrasto(a => ({ ...a, para }))
    }
    const soltar = () => {
      // A posicao 0 e do "Avaliar no Google". Sem esta linha, arrastar outro
      // botao pro topo funcionaria na tela e a normalizacao do servidor
      // desfaria depois — a pessoa veria a ordem "voltar sozinha", que e o
      // pior jeito de descobrir uma regra.
      const destino = Math.max(1, arrasto.para)
      if (destino !== arrasto.de) {
        const arr = [...draft.buttons]
        const [item] = arr.splice(arrasto.de, 1)
        arr.splice(destino, 0, item)
        mudar({ ...draft, buttons: arr })
      }
      setArrasto(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [arrasto, draft])

  // Ordem visual durante o arrasto (sem gravar nada até soltar).
  const ordem = React.useMemo(() => {
    if (!arrasto) return draft.buttons
    const arr = [...draft.buttons]
    const [item] = arr.splice(arrasto.de, 1)
    arr.splice(arrasto.para, 0, item)
    return arr
  }, [draft.buttons, arrasto])

  async function publicar() {
    setPublicando(true); setErroGeral(null)
    try {
      // Salva ANTES de qualquer coisa, inclusive antes de abrir a caixa da
      // assinatura. Quem vai pro checkout sai desta tela; voltar e não achar o
      // que montou seria a pior hora possível pra perder trabalho.
      //
      // A ordem importa nos dois sentidos: se o salvamento falhar, a pessoa vê
      // "falha ao salvar" e NÃO é mandada pro pagamento. Ninguém deve pagar por
      // um menu que não foi guardado.
      clearTimeout(timer.current)
      if (!ehPrevia) {
        await api.experiencias.salvar(exp.id, draft)
        setSujo(false)
      }

      // O servidor recusa de qualquer jeito (402). Perguntar aqui antes só
      // evita a viagem de ida e volta — a trava não é esta linha, é a de lá.
      if (plano && !plano.proAtivo) { setPaywall(true); return }
      if (ehPrevia) { setPublicou({ em: 0, quando: Date.now() }); return }

      const r = await api.experiencias.publicar(exp.id)
      setValidacao(r.validacao || null)
      setSujo(false)
      // Ação que dá certo em silêncio é indistinguível de ação que não
      // aconteceu — foi exatamente assim que este botão pareceu quebrado.
      setPublicou({ em: r.dispositivos_com_este_menu || 0, quando: Date.now() })
      onAtualizar?.(r.experience)
    } catch (e) {
      // 402 = falta assinar. Vem do servidor, e é ele quem manda: se a tela
      // achasse que tem Pro e o servidor discordasse, quem vale é o servidor.
      if (e.status === 402 || e.corpo?.precisaPro) { setPaywall(true); return }
      // O servidor devolve a lista do que corrigir junto com a recusa — o
      // ApiError carrega o corpo justamente pra isso.
      setValidacao(e.validacao || null)
      setErroGeral(e.message || 'Não foi possível publicar.')
    } finally {
      setPublicando(false)
    }
  }

  async function descartar() {
    if (!confirm('Descartar as alterações e voltar à versão publicada?')) return
    try {
      const r = await api.experiencias.descartar(exp.id)
      setDraft(r.experience.draft)
      setValidacao(null)
      onAtualizar?.(r.experience)
    } catch (e) { setErroGeral(e.message) }
  }

  const erros = validacao?.erros || []
  const avisos = validacao?.avisos || []
  const erroDe = (id) => erros.find(e => e.id === id) || null
  const ligados = (draft.buttons || []).filter(b => b.enabled).length
  const cheio = draft.buttons.length >= (limites?.botoes || 12)

  // Tipo já usado some da lista — EXCETO `custom_url`, que é a válvula de
  // escape: ninguém tem só um destino externo. Quem quiser um segundo WhatsApp
  // ou telefone usa um link personalizado apontando pra ele.
  const usados = new Set(draft.buttons.map(b => b.type))
  const disponiveis = Object.entries(tipos || {})
    .filter(([k]) => k === 'custom_url' || !usados.has(k))

  const vinculados = (dados.dispositivosDaExp || []).length

  return (
    <div className="menu-editor">
      {paywall && <CaixaAssinatura ligados={ligados} onFechar={() => setPaywall(false)}/>}
      <div className="v3-head v3-editor-head">
        <div>
          <button className="v3-btn ghost" onClick={onVoltar} style={{ marginBottom: 8 }}>
            <ArrowLeft size={13}/> Experiências
          </button>
          <div className="me-eyebrow">MENU INTELIGENTE</div>
          <h1>Dê forma ao seu menu.</h1>
          <p className="me-intro">Personalize o que o cliente encontra. Acompanhe cada mudança na prévia.</p>
          <div className="sub">
            {publicado
              ? `Publicado${exp.published_at ? ' em ' + new Date(exp.published_at).toLocaleDateString('pt-BR') : ''}`
              : 'Ainda não publicado'}
            {vinculados > 0 && ` · em ${vinculados} ${vinculados === 1 ? 'dispositivo' : 'dispositivos'}`}
          </div>
        </div>
        <div className="v3-pickers">
          <a className="v3-btn me-preview-link" href="#menu-previa">Ver prévia</a>
          {/* O rascunho salva sozinho, mas salvamento invisivel nao passa
              confianca: a pessoa procura o botao, nao acha, e fica na duvida
              se perdeu o trabalho. O botao É o indicador -- diz o estado e
              deixa salvar na hora quem nao quiser esperar. */}
          <button className={'v3-btn' + (sujo || salvando ? ' solid' : ' ghost')}
            onClick={salvarAgora} disabled={salvando || !sujo}>
            {salvando ? 'Salvando…' : sujo ? 'Salvar rascunho' : <><Check size={13}/> Rascunho salvo</>}
          </button>
        </div>
      </div>

      {erroGeral && !erros.length && <div className="v3-callout"><div><div className="t">{erroGeral}</div></div></div>}

      <div className="v3-editor-steps" aria-label="Etapas para colocar o menu no ar">
        {/* ORDEM CORRIGIDA (Ricardo, 07/09/2026): crie, vincule, publique.
            Publicar vinha antes de escolher onde usar, o que invertia o que a
            pessoa faz de verdade — e sugeria que era preciso publicar duas
            vezes, uma pro menu e outra depois de vincular.

            O modelo suporta esta ordem: vincular grava a INTENÇÃO do dono
            (`experience_enabled`), e o dispositivo só passa a servir o menu
            quando ele está publicado (`served_mode`). Quem vincula antes não
            quebra nada — o dispositivo segue no Google até a publicação. */}
        <div className="ativo"><span>1</span><div><b>Crie</b><small>Conteúdo e botões</small></div></div>
        <i>→</i>
        <div><span>2</span><div><b>Vincule</b><small>Escolha onde usar</small></div></div>
        <i>→</i>
        <div><span>3</span><div><b>Publique</b><small>Coloque no ar</small></div></div>
      </div>

      {/* Barra de estado: recusa com a lista, ou convite a publicar. */}
      {erros.length > 0 ? (
        <div className="v3-barra bloqueio">
          <div>
            <b>Falta corrigir {erros.length} {erros.length === 1 ? 'coisa' : 'coisas'} antes de publicar.</b>
            <ul className="lista">
              {erros.map((e, i) => (
                <li key={i}>{e.label ? <b>{e.label}: </b> : null}{e.msg}</li>
              ))}
            </ul>
            <div className="saidas">Duas saídas: corrigir, ou desligar o botão e publicar sem ele.</div>
          </div>
          <button className="v3-btn" disabled>Publicar</button>
        </div>
      ) : naoPublicado ? (
        <div className="v3-barra rascunho">
          <span>
            <b>Pronto para revisar.</b>{' '}
            {publicado ? 'Seus clientes continuam vendo a versão publicada.' : 'Este menu ainda não está no ar.'}
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            {publicado && <button className="v3-btn ghost" onClick={descartar}>Descartar</button>}
            <button className="v3-btn solid" onClick={publicar} disabled={publicando}>
              {publicando ? 'Publicando…' : 'Publicar menu'}
            </button>
          </span>
        </div>
      ) : (
        <div className="v3-barra ok">
          <span>
            <Check size={14}/>{' '}
            {publicou
              ? <><b>Menu publicado.</b>{' '}
                  {publicou.em > 0
                    ? `${publicou.em} ${publicou.em === 1 ? 'dispositivo já está abrindo' : 'dispositivos já estão abrindo'} esta versão.`
                    : 'Ligue em um dispositivo abaixo para ele começar a abrir o menu.'}</>
              : <><b>Publicado.</b> O que você vê aqui é o que aparece para o cliente.</>}
          </span>
        </div>
      )}

      {avisos.map((a, i) => (
        <div className="v3-callout" key={i}>
          <Info size={16} color="var(--amber)" style={{ flex: 'none', marginTop: 1 }}/>
          <div><div className="s" style={{ marginTop: 0 }}>{a}</div></div>
        </div>
      ))}

      <div className="v3-edcols">
        <div>
          <details className="v3-panel me-organizacao">
            <summary>Identificação interna <strong>{nome || exp.name}</strong><span>Alterar</span></summary>
            <div className="body">
              <label className="v3-campo" style={{ marginBottom: 0 }}>
                <input value={nome} maxLength={60}
                  onChange={e => setNome(e.target.value)}
                  onBlur={salvarNome}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  placeholder="Ex: Menu da mesa, Cartão da Mariana"/>
                <span className="lb" style={{ marginTop: 5, marginBottom: 0 }}>
                  O cliente nunca vê este nome — ele lê o <b>título</b>, logo abaixo.
                </span>
              </label>
            </div>
          </details>

          <section className="v3-panel">
            <header>
              {/* Par simetrico do "Botoes do Menu" logo abaixo: as duas secoes
                  passam a nomear a PARTE do menu que a pessoa esta editando, em
                  vez de descreve-la por fora. O subtitulo saiu junto — o titulo
                  ja diz onde e, e a previa do celular ao lado mostra o efeito
                  melhor que qualquer frase. */}
              <h2>A identidade do seu negócio</h2>
              <div className="psub">O título e a mensagem que recebem seu cliente.</div>
            </header>
            <div className="body">
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 'none', textAlign: 'center', width: 70 }}>
                  {fotoDisponivel
                    ? <img src={fotoDisponivel} onError={() => setFotoFalhou(true)} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }}/>
                    : <div className="me-photo-fallback">{(draft.brand?.titulo || 'S').trim().charAt(0).toUpperCase()}</div>}
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 5, lineHeight: 1.3 }}>
                    {fotoDisponivel ? 'Foto do Google' : 'Menu sem foto'}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="v3-campo">
                    <span className="lb">Título — normalmente o nome do seu negócio</span>
                    <input value={draft.brand?.titulo || ''} maxLength={60}
                      onChange={e => mudar({ ...draft, brand: { ...draft.brand, titulo: e.target.value } })}/>
                  </label>
                  <label className="v3-campo" style={{ marginBottom: 0 }}>
                    <span className="lb">Subtítulo — uma frase curta de boas-vindas</span>
                    <input value={draft.brand?.subtitulo || ''} maxLength={90}
                      onChange={e => mudar({ ...draft, brand: { ...draft.brand, subtitulo: e.target.value } })}/>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="v3-panel">
            <header>
              <div>
                <h2>Os caminhos do seu menu</h2>
                {/* "Ações" virou "Botões do Menu" (Ricardo, 07/09/2026), e a
                    troca foi na TELA INTEIRA: título, contador, estado vazio,
                    rótulos de acessibilidade, "Remover botão", o passo
                    "Conteúdo e botões" e a mensagem de erro. Trocar só o título
                    deixaria a tela falando duas línguas sobre a mesma coisa, e
                    quem lê não tem como saber que é a mesma.

                    O CONTADOR ANCORA NA RECOMENDAÇÃO, NÃO NO TETO. Antes dizia
                    "1 de 12" — e 12 é só o limite técnico: a régua do produto é
                    até 6, acima disso o editor avisa e publica assim mesmo. Um
                    contador que mostra 12 convida o lojista a preencher doze, e
                    a tela passa a empurrar exatamente o que ela desaconselha. O
                    teto só aparece quando ele chega perto, que é quando vira
                    informação útil em vez de convite.

                    "Arraste pela alça" também saiu: ninguém chama aquilo de alça
                    fora de quem desenha interface. */}
                <div className="psub">
                  Escolha o que o cliente pode fazer.
                  Arraste para reordenar.
                  {' · '}{draft.buttons.length} {draft.buttons.length === 1 ? 'botão' : 'botões'}
                  {ligados > (limites?.recomendado || 6)
                    ? ' · acima de ' + (limites?.recomendado || 6) + ' a escolha fica mais difícil pro cliente'
                    : draft.buttons.length >= (limites?.botoes || 12) - 2
                      ? ' · máximo de ' + (limites?.botoes || 12)
                      : ''}
                </div>
              </div>
            </header>
            <div className="body" ref={listaRef}>
              {/* `primeiro={i <= 1}`: quem esta logo abaixo do Google tambem nao
                  sobe, senao passaria por cima dele — a posicao 0 e fixa. */}
              {ordem.map((b, i) => (
                <Item key={b.id} b={b} tipos={tipos} erro={erroDe(b.id)}
                  aberto={aberto === b.id}
                  arrastando={arrasto?.id === b.id}
                  primeiro={i <= 1} ultimo={i === ordem.length - 1}
                  onPegar={(ev) => pegar(b.id, ev)}
                  novo={recem === b.id}
                  onAbrir={() => {
                    const fechando = aberto === b.id
                    setAberto(fechando ? null : b.id)
                    if (fechando) setRecem(null)   // inserida; da próxima vez é edição
                  }}
                  onMudar={(patch) => mudarBotao(b.id, patch)}
                  onMover={(d) => moverBotao(b.id, d)}
                  onRemover={() => removerBotao(b.id)}/>
              ))}
              {!draft.buttons.length && (
                <p className="v3-dica" style={{ padding: '10px 0' }}>Nenhum botão ainda. Adicione o primeiro abaixo.</p>
              )}

              <div style={{ marginTop: 12 }}>
                {!addOpen ? (
                  <button className="v3-btn me-add-button" onClick={() => setAddOpen(true)} disabled={cheio}>
                    <Plus size={13}/> {cheio ? `Limite de ${limites?.botoes || 12} botões` : 'Adicionar botão'}
                  </button>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 7 }}>Escolha o tipo de botão</div>
                    <div className="v3-addgrid">
                      {disponiveis.map(([k, v]) => (
                        <button className="v3-add" key={k} onClick={() => adicionar(k)}>
                          <IconeTipo tipo={k} tamanho={17}/> {v.label}
                        </button>
                      ))}
                    </div>
                    {!disponiveis.length && (
                      <p className="v3-dica">Você já usou todos os tipos de botão. Para outro destino, use “Link personalizado”.</p>
                    )}
                    <button className="v3-btn ghost" style={{ marginTop: 8 }} onClick={() => setAddOpen(false)}>Cancelar</button>
                  </>
                )}
              </div>
            </div>
          </section>

          <OndeEstaNoAr exp={exp} dados={dados} experiencias={experiencias} onAtualizar={onAtualizar}/>
        </div>

        <aside className="v3-previa" id="menu-previa" aria-label="Prévia do seu menu">
          <div className="cab"><span className="t">Seu menu, na prática</span><Chip tipo={naoPublicado ? 'n' : 'g'}>{naoPublicado ? 'Rascunho' : 'Publicado'}</Chip></div>
          <p className="me-preview-tip">Clique em um botão abaixo para editar.</p>
          <Previa draft={draft} foto={fotoDisponivel} selecionado={aberto} onSelecionar={id => {
            setAberto(id)
            setRecem(null)
            requestAnimationFrame(() => document.getElementById(`editor-botao-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
          }}/>
          <div className="me-preview-resumo"><strong>{ligados} {ligados === 1 ? 'botão visível' : 'botões visíveis'}</strong><span>As alterações só chegam ao cliente depois de publicar.</span></div>
          {exp.published && (
            <a className="v3-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              href={`/m/${exp.slug}`} target="_blank" rel="noopener noreferrer">
              Ver como o cliente vê <ExternalLink size={12}/>
            </a>
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Onde este menu está no ar ───────────────────────────────
// O interruptor mora aqui porque é aqui que a pergunta nasce ("esse menu está
// valendo onde?"), e também em Dispositivos, que é onde a pessoa vai procurar.
function OndeEstaNoAr({ exp, dados, experiencias, onAtualizar }) {
  const [ocupado, setOcupado] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // Resposta imediata ao toque: o interruptor não pode esperar o servidor
  // inteiro (que ainda reimprime todos os dispositivos) pra mudar de cor.
  const [otimista, setOtimista] = React.useState({})
  const devices = (dados.devices || []).map(d => ({ ...d, ...(otimista[d.id] || {}) }))
  const achaExp = (id) => (experiencias || []).find(e => e.id === id) || null
  const nomeDaExp = (id) => achaExp(id)?.name || 'outra experiência'
  // Dispositivo vinculado a um menu EXCLUÍDO conta como livre: o vínculo é
  // guardado de propósito (pra "Recuperar" devolver tudo), mas avisar "está
  // usando MENU 1" sobre um menu que sumiu da lista confundiria quem não tem
  // como ver esse menu em lugar nenhum.
  const ocupadoPorOutro = (d) =>
    !!d.experience_id && d.experience_id !== exp.id && !achaExp(d.experience_id)?.archived_at

  // O menu precisa estar PUBLICADO pra valer no dispositivo. Ligar antes disso
  // é intenção legítima — só não vira efeito ainda.
  const publicado = !!exp.published

  async function alternar(d) {
    const ligadoAqui = d.experience_id === exp.id && d.experience_enabled
    const ligar = !ligadoAqui

    // Um dispositivo serve UMA experiência — é um ponto físico com um destino
    // só. Mover é permitido, nunca em silêncio.
    let mover = false
    if (ligar && ocupadoPorOutro(d)) {
      if (!confirm(`“${d.channel_name || 'Este dispositivo'}” está usando o menu “${nomeDaExp(d.experience_id)}”.\n\nTrocar para “${exp.name}”? O outro menu deixa de estar ativo neste dispositivo.`)) return
      mover = true
    }

    setOcupado(d.id); setErro(null)
    // Guarda só a INTENÇÃO. `served_mode` é consequência e quem decide é o
    // servidor — supor "vai servir menu" seria mentir quando o menu ainda não
    // está publicado, que é exatamente o caso em que o botão parecia voltar
    // sozinho.
    setOtimista(o => ({ ...o, [d.id]: ligar
      ? { experience_id: exp.id, experience_enabled: true }
      : { experience_enabled: false } }))
    try {
      await api.experiencias.dispositivo({
        plate_id: d.id,
        experience_id: ligar ? exp.id : undefined,
        enabled: ligar,
        // O servidor recusa trocar de experiência sem gesto explícito. Com o
        // menu antigo excluído, o gesto já é este clique.
        mover: mover || (ligar && !!d.experience_id && d.experience_id !== exp.id)
      })
      onAtualizar?.(null)
      setOtimista(o => { const c = { ...o }; delete c[d.id]; return c })
    } catch (e) {
      setOtimista(o => { const c = { ...o }; delete c[d.id]; return c })   // desfaz
      setErro(e.message || 'Não foi possível alterar.')
    } finally { setOcupado(null) }
  }

  const ligados = devices.filter(d => d.experience_id === exp.id && d.experience_enabled)
  const servindo = ligados.filter(d => d.served_mode === 'menu')
  const esperandoPublicacao = ligados.length - servindo.length

  return (
    <section className="v3-panel">
      <header>
        <h2>Em quais dispositivos este menu deve aparecer?</h2>
        <div className="psub">
          {!ligados.length
            ? 'Enquanto você não ligar em nenhum, este menu não chega a ninguém.'
            : servindo.length
              ? `Este menu está ativo em ${servindo.length} ${servindo.length === 1 ? 'dispositivo' : 'dispositivos'}.`
              : `${ligados.length === 1 ? 'Um dispositivo ligado' : `${ligados.length} dispositivos ligados`}, esperando você publicar.`}
        </div>
      </header>
      <div className="body">
        {!devices.length && <p className="v3-dica" style={{ padding: '8px 0' }}>Você ainda não tem dispositivos ativos.</p>}

        {/* O aviso que faltava. Ligar um dispositivo antes de publicar é uma
            ação legítima que simplesmente não produz efeito ainda — e sem
            dizer isso, o interruptor parecia "voltar sozinho". */}
        {!publicado && ligados.length > 0 && (
          <div className="v3-callout" style={{ marginTop: 0, marginBottom: 10 }}>
            <div>
              <div className="t">Falta publicar</div>
              <div className="s">
                {ligados.length === 1 ? 'Este dispositivo está ligado' : `${ligados.length} dispositivos estão ligados`} neste
                menu, mas ele ainda não foi publicado — então continuam levando direto ao Google. Publique
                lá em cima e eles passam a abrir o menu.
              </div>
            </div>
          </div>
        )}

        {devices.map(d => {
          const ligadoAqui = d.experience_id === exp.id && d.experience_enabled
          const servindoEste = ligadoAqui && d.served_mode === 'menu'
          const deOutro = d.experience_id && d.experience_id !== exp.id
          return (
            <div className="v3-onde" key={d.id}>
              <span className="txt">
                <span className="t">{d.channel_name || nomeProduto(d.product_type)}</span>
                <span className="d">
                  {nomeProduto(d.product_type)}
                  {deOutro && (achaExp(d.experience_id)?.archived_at
                    ? ' · o menu que usava foi excluído'
                    : ` · usando o menu “${nomeDaExp(d.experience_id)}”`)}
                </span>
              </span>
              {/* A etiqueta fala do DESTINO; o interruptor, da sua ESCOLHA.
                  Quando as duas discordam — ligado mas ainda não publicado —
                  a etiqueta diz por quê, em vez de o botão voltar calado. */}
              {servindoEste
                ? <Chip tipo="g">servindo este menu</Chip>
                : ligadoAqui
                  ? <Chip tipo="a">falta publicar</Chip>
                  : d.served_mode === 'menu'
                    ? <Chip tipo="a">servindo outro menu</Chip>
                    : <Chip tipo="n">Google Direto</Chip>}
              {/* O interruptor reflete a INTENÇÃO (experience_enabled), não o
                  resultado. Antes ele era desenhado a partir do served_mode e,
                  com o menu não publicado, voltava sozinho depois do clique. */}
              <button className={'v3-switch' + (ligadoAqui ? '' : ' off') + (ocupado === d.id ? ' pendente' : '')}
                onClick={() => alternar(d)} aria-pressed={ligadoAqui}
                aria-label={ligadoAqui ? 'Desligar neste dispositivo' : 'Ligar neste dispositivo'}><i/></button>
            </div>
          )
        })}
        {erro && <p className="v3-dica" style={{ color: 'var(--red)' }}>{erro}</p>}
        <p className="v3-dica" style={{ marginTop: 10 }}>
          Ligado e publicado, o cliente que encostar naquele dispositivo abre este menu. Desligado, ele volta
          a ir direto ao Google — e seu menu continua guardado aqui, pronto pra religar. Cada dispositivo
          serve um menu de cada vez.
        </p>
      </div>
    </section>
  )
}
