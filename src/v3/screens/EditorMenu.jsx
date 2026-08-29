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
import {
  ArrowLeft, ChevronUp, ChevronDown, GripVertical, Trash2, Plus,
  AlertTriangle, Check, ExternalLink, Info
} from 'lucide-react'
import { api } from '../lib/api.js'
import { Chip } from '../ui.jsx'
import { nomeProduto } from '../lib/dados.js'

// Só aparência: o que cada tipo faz e como valida mora no servidor.
const VISUAL = {
  google:     { cor: '#F5A623', bg: '#FEF6E7', gl: '★' },
  whatsapp:   { cor: '#1E8E3E', bg: '#E6F4EA', gl: '✆' },
  instagram:  { cor: '#7B4BC4', bg: '#F2ECFB', gl: '◎' },
  food_menu:  { cor: '#B06000', bg: '#FEF3E0', gl: '▤' },
  phone:      { cor: '#1557B0', bg: '#E8F0FE', gl: '☎' },
  location:   { cor: '#4A5666', bg: '#EDF1F6', gl: '⌖' },
  website:    { cor: '#1557B0', bg: '#E8F0FE', gl: '⬡' },
  contact:    { cor: '#B3261E', bg: '#FCE8E6', gl: '⊕' },
  custom_url: { cor: '#4A5666', bg: '#EDF1F6', gl: '↗' }
}
const visual = (t) => VISUAL[t] || VISUAL.custom_url

// Campos por tipo. Rótulos escritos pro lojista, não pro banco.
const CAMPOS = {
  whatsapp:   [['telefone', 'WhatsApp com DDD', 'tel'], ['mensagem', 'Mensagem que já vai escrita', 'text']],
  phone:      [['telefone', 'Telefone com DDD', 'tel']],
  instagram:  [['url', 'Seu Instagram (@usuário ou endereço)', 'text']],
  food_menu:  [['url', 'Endereço do cardápio', 'url']],
  website:    [['url', 'Endereço do site', 'url']],
  custom_url: [['url', 'Endereço de destino', 'url']],
  contact:    [['nome', 'Nome', 'text'], ['cargo', 'Cargo (opcional)', 'text'],
               ['telefone', 'Telefone com DDD', 'tel'], ['email', 'E-mail (opcional)', 'email']]
}

function novoBotaoLocal(type, tipos) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]
  return { id: 'b_' + s, type, label: tipos?.[type]?.label || type, enabled: true, value: {} }
}

// ── Prévia ──────────────────────────────────────────────────
function Previa({ draft, foto }) {
  const ligados = (draft.buttons || []).filter(b => b.enabled)
  return (
    <div className="v3-fone">
      <div className="tela">
        {/* Sem foto o topo não vira quadrado cinza: fica só texto, com mais
            respiro. Ausência tem que parecer escolha, não falha. */}
        {draft.brand?.logo === 'google' && foto
          ? <img className="logo" src={foto} alt=""/>
          : <div style={{ height: 6 }}/>}
        <div className="nome">{draft.brand?.titulo || 'Seu negócio'}</div>
        {draft.brand?.subtitulo && <div className="sb">{draft.brand.subtitulo}</div>}
        {ligados.length === 0 && <div className="vazio">Nenhuma ação ligada ainda.</div>}
        {ligados.map(b => (
          <div className="bt" key={b.id}>
            <span style={{ color: visual(b.type).cor }}>{visual(b.type).gl}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Um item da lista ────────────────────────────────────────
function Item({ b, tipos, erro, aberto, novo, onAbrir, onMudar, onMover, onRemover, primeiro, ultimo, arrastando, onPegar }) {
  const vis = visual(b.type)
  const campos = CAMPOS[b.type] || []
  const resumo = (() => {
    if (b.type === 'google') return 'seu perfil no Google · endereço resolvido na hora'
    if (b.type === 'location') return 'endereço do seu Google · resolvido na hora'
    if (b.type === 'contact') return [b.value?.nome, b.value?.cargo].filter(Boolean).join(' · ') || 'sem dados ainda'
    if (b.type === 'whatsapp' || b.type === 'phone') return b.value?.telefone || 'sem telefone ainda'
    return b.value?.url || 'sem endereço ainda'
  })()

  return (
    <>
      <div className={'v3-item' + (aberto ? ' aberto' : '') + (erro ? ' ruim' : '') + (b.enabled ? '' : ' off') + (arrastando ? ' arrastando' : '')}>
        <button className="pega" onPointerDown={onPegar} aria-label="Arrastar para reordenar" title="Arrastar para reordenar">
          <GripVertical size={14}/>
        </button>
        <span className="ico" style={{ background: vis.bg, color: vis.cor }}>{vis.gl}</span>
        <span className="txt">
          <span className="t">{b.label}</span>
          <span className="d">{erro ? erro.msg : resumo}</span>
        </span>
        <span className="acs">
          {erro && <span className="v3-tag err">corrigir</span>}
          {!b.enabled && <span className="v3-tag off">desligado</span>}
          {/* Mover por botão é o caminho de quem usa teclado e o socorro de
              quem não consegue arrastar no celular. */}
          <button className="mini" onClick={() => onMover(-1)} disabled={primeiro} aria-label="Mover para cima"><ChevronUp size={14}/></button>
          <button className="mini" onClick={() => onMover(1)} disabled={ultimo} aria-label="Mover para baixo"><ChevronDown size={14}/></button>
          <button className="v3-btn ghost" onClick={onAbrir}>{aberto ? 'Fechar' : 'Editar'}</button>
          <button className={'v3-switch' + (b.enabled ? '' : ' off')} onClick={() => onMudar({ enabled: !b.enabled })}
            aria-label={b.enabled ? 'Desligar ação' : 'Ligar ação'} aria-pressed={b.enabled}><i/></button>
        </span>
      </div>

      {aberto && (
        <div className="v3-editbox">
          <label className="v3-campo">
            <span className="lb">Texto do botão</span>
            <input value={b.label} maxLength={40} onChange={e => onMudar({ label: e.target.value })}/>
          </label>
          {campos.map(([campo, rotulo, tipo]) => (
            <label className={'v3-campo' + (erro?.campo === campo ? ' erro' : '')} key={campo}>
              <span className="lb">{rotulo}</span>
              <input type={tipo === 'url' ? 'text' : tipo} value={b.value?.[campo] || ''}
                onChange={e => onMudar({ value: { ...(b.value || {}), [campo]: e.target.value } })}/>
              {erro?.campo === campo && <span className="msg">{erro.msg}</span>}
            </label>
          ))}
          {!campos.length && (
            <p className="v3-dica">Esta ação não precisa de configuração: o endereço é montado na hora a partir do seu cadastro no Google.</p>
          )}
          {b.type === 'contact' && (
            <p className="v3-dica">
              Este é o contato que será entregue em <b>todos os dispositivos que usam esta experiência</b>.
              Para o cartão de uma pessoa específica, crie uma experiência para ela.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 10 }}>
            <button className="v3-btn ghost" onClick={onRemover}><Trash2 size={13}/> Remover ação</button>
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
export default function EditorMenu({ exp, dados, tipos, limites, foto, experiencias, onVoltar, onAtualizar }) {
  const [draft, setDraft] = React.useState(() => exp.draft || { brand: {}, buttons: [] })
  const [validacao, setValidacao] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [sujo, setSujo] = React.useState(false)
  const [aberto, setAberto] = React.useState(null)
  const [addOpen, setAddOpen] = React.useState(false)
  // Qual ação acabou de ser adicionada — só ela mostra "Inserir".
  const [recem, setRecem] = React.useState(null)
  const [publicando, setPublicando] = React.useState(false)
  const [erroGeral, setErroGeral] = React.useState(null)
  const [arrasto, setArrasto] = React.useState(null)
  const [nome, setNome] = React.useState(exp.name)
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
  const naoPublicado = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(publicado),
    [draft, publicado]
  )

  // ── Salvamento automático, com atraso ──
  // O veredito volta do servidor: é ele que decide, aqui só exibe.
  const timer = React.useRef(null)
  const gravar = React.useCallback((d) => {
    clearTimeout(timer.current)
    setSujo(true)
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
  const ALTURA = 58
  function pegar(id, ev) {
    if (ev.button != null && ev.button !== 0) return
    ev.preventDefault()
    const de = draft.buttons.findIndex(b => b.id === id)
    setArrasto({ id, de, para: de, y0: ev.clientY })
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
  }
  React.useEffect(() => {
    if (!arrasto) return
    const mover = (ev) => {
      const delta = Math.round((ev.clientY - arrasto.y0) / ALTURA)
      const para = Math.max(0, Math.min(draft.buttons.length - 1, arrasto.de + delta))
      if (para !== arrasto.para) setArrasto(a => ({ ...a, para }))
    }
    const soltar = () => {
      if (arrasto.para !== arrasto.de) {
        const arr = [...draft.buttons]
        const [item] = arr.splice(arrasto.de, 1)
        arr.splice(arrasto.para, 0, item)
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
      clearTimeout(timer.current)
      await api.experiencias.salvar(exp.id, draft)
      const r = await api.experiencias.publicar(exp.id)
      setValidacao(r.validacao || null)
      setSujo(false)
      onAtualizar?.(r.experience)
    } catch (e) {
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
    <>
      <div className="v3-head">
        <div>
          <button className="v3-btn ghost" onClick={onVoltar} style={{ marginBottom: 8 }}>
            <ArrowLeft size={13}/> Experiências
          </button>
          <h1>{nome || exp.name}</h1>
          <div className="sub">
            {publicado
              ? `Publicado${exp.published_at ? ' em ' + new Date(exp.published_at).toLocaleDateString('pt-BR') : ''}`
              : 'Ainda não publicado'}
            {vinculados > 0 && ` · em ${vinculados} ${vinculados === 1 ? 'dispositivo' : 'dispositivos'}`}
          </div>
        </div>
        <div className="v3-pickers">
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

      {/* Quem nunca viu isto não tem por que adivinhar as duas etapas. Uma
          frase no topo poupa a descoberta por tentativa. */}
      <div className="v3-callout info">
        <Info size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
        <div>
          <div className="t">Como funciona</div>
          <div className="s">
            <b>1.</b> Monte as ações e veja a prévia à direita — o rascunho salva sozinho, e o botão
            <b> Salvar rascunho</b> lá em cima confirma. <b>2.</b> Clique em <b>Publicar</b> — só então o
            que você montou entra no ar. <b>3.</b> Ligue o menu nos dispositivos, lá embaixo.
            Enquanto você não fizer os três, seus dispositivos continuam levando direto ao Google.
          </div>
        </div>
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
            <div className="saidas">Duas saídas: corrigir, ou desligar a ação e publicar sem ela.</div>
          </div>
          <button className="v3-btn" disabled>Publicar</button>
        </div>
      ) : naoPublicado ? (
        <div className="v3-barra rascunho">
          <span>
            <b>Você tem alterações não publicadas.</b>{' '}
            {publicado ? 'Seus clientes continuam vendo a versão publicada.' : 'Este menu ainda não está no ar.'}
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            {publicado && <button className="v3-btn ghost" onClick={descartar}>Descartar</button>}
            <button className="v3-btn solid" onClick={publicar} disabled={publicando}>
              {publicando ? 'Publicando…' : 'Publicar'}
            </button>
          </span>
        </div>
      ) : (
        <div className="v3-barra ok"><span><Check size={14}/> <b>Publicado.</b> O que você vê aqui é o que o cliente encontra.</span></div>
      )}

      {avisos.map((a, i) => (
        <div className="v3-callout" key={i}>
          <Info size={16} color="var(--amber)" style={{ flex: 'none', marginTop: 1 }}/>
          <div><div className="s" style={{ marginTop: 0 }}>{a}</div></div>
        </div>
      ))}

      <div className="v3-edcols">
        <div>
          <section className="v3-panel">
            <header>
              <h2>Nome do menu</h2>
              <div className="psub">Só você vê. Serve pra diferenciar seus menus aqui no painel.</div>
            </header>
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
          </section>

          <section className="v3-panel">
            <header>
              <h2>O que o cliente vê no topo</h2>
              <div className="psub">A primeira coisa que aparece quando ele encosta o celular</div>
            </header>
            <div className="body">
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 'none', textAlign: 'center', width: 70 }}>
                  {foto
                    ? <img src={foto} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }}/>
                    : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--line2)' }}/>}
                  <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 5, lineHeight: 1.3 }}>
                    {foto ? 'foto do seu Google' : 'sem foto no Google'}
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
                <h2>Ações</h2>
                <div className="psub">
                  Os botões que o cliente vê, nesta ordem. Arraste pela alça, ou use as setas.
                  {' · '}{draft.buttons.length} de {limites?.botoes || 12}
                  {ligados > (limites?.recomendado || 6) && ' · muitas opções dificultam a escolha do cliente'}
                </div>
              </div>
            </header>
            <div className="body" ref={listaRef}>
              {ordem.map((b, i) => (
                <Item key={b.id} b={b} tipos={tipos} erro={erroDe(b.id)}
                  aberto={aberto === b.id}
                  arrastando={arrasto?.id === b.id}
                  primeiro={i === 0} ultimo={i === ordem.length - 1}
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
                <p className="v3-dica" style={{ padding: '10px 0' }}>Nenhuma ação ainda. Adicione a primeira abaixo.</p>
              )}

              <div style={{ marginTop: 12 }}>
                {!addOpen ? (
                  <button className="v3-btn" onClick={() => setAddOpen(true)} disabled={cheio}>
                    <Plus size={13}/> {cheio ? `Limite de ${limites?.botoes || 12} ações` : 'Adicionar ação'}
                  </button>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 7 }}>Escolha o tipo de ação</div>
                    <div className="v3-addgrid">
                      {disponiveis.map(([k, v]) => (
                        <button className="v3-add" key={k} onClick={() => adicionar(k)}>
                          <span style={{ color: visual(k).cor }}>{visual(k).gl}</span> {v.label}
                        </button>
                      ))}
                    </div>
                    {!disponiveis.length && (
                      <p className="v3-dica">Você já usou todos os tipos de ação. Para outro destino, use “Link personalizado”.</p>
                    )}
                    <button className="v3-btn ghost" style={{ marginTop: 8 }} onClick={() => setAddOpen(false)}>Cancelar</button>
                  </>
                )}
              </div>
            </div>
          </section>

          <OndeEstaNoAr exp={exp} dados={dados} experiencias={experiencias} onAtualizar={onAtualizar}/>
        </div>

        <div className="v3-previa">
          <div className="cab"><span className="t">Prévia</span><span className="e">{naoPublicado ? 'rascunho' : 'no ar'}</span></div>
          <Previa draft={draft} foto={foto}/>
          {exp.published && (
            <a className="v3-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              href={`/m/${exp.slug}`} target="_blank" rel="noopener noreferrer">
              Ver como o cliente vê <ExternalLink size={12}/>
            </a>
          )}
        </div>
      </div>
    </>
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
        <h2>Ligar em quais dispositivos</h2>
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
