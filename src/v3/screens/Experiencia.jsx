// ============================================================
// StarTouch V3 — Experiência do Cliente
// ============================================================
// Esta tela precisa VENDER, não só informar. E vender aqui é uma coisa só:
// fazer a pessoa ENXERGAR a diferença entre os dois caminhos em um segundo.
// Por isso os dois aparecem lado a lado, com o mesmo peso, cada um mostrando
// o celular do cliente dela.
//
// UMA COISA QUE NÃO ILUSTRAMOS: uma tela de avaliação com a nossa marca. O
// Google Direto cai na página do PRÓPRIO GOOGLE — desenhar uma tela nossa ali
// seria vender o que não entregamos, e o cliente descobriria no primeiro
// toque.
//
// Área MISTA: Google Direto é Free e continua sendo (o cliente já comprou
// isso), o Menu Inteligente é o Pro. As duas são experiências IRMÃS, não
// etapas de uma escada — "Avaliar no Google" NÃO é obrigatório no menu, e a
// ordem é livre. Quem quer só avaliação usa o Google Direto, que é gratuito.
//
// GOOGLE DIRETO NÃO É LINHA NO BANCO. É o estado-base do dispositivo (sem
// experiência vinculada). Aparece como cartão porque é assim que o lojista
// pensa; criar uma linha por negócio só pra igualar banco e tela seria
// maquinário sem retorno.
//
// E não confundir com a peneira desmontada em 2026-05: peneira era
// INTERCEPTAR quem ia avaliar e desviar o insatisfeito. Um menu sem botão do
// Google não intercepta ninguém — só não oferece aquele caminho ali.
// ============================================================
import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, Info, ExternalLink, Lightbulb } from 'lucide-react'
import { Head, Panel, Chip, Recursos, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'

const RECURSOS = [
  { n: 'Google Direto', d: 'o toque leva direto à sua página de avaliação', p: 'free', s: 'pronto' },
  { n: 'Menu Inteligente', d: 'o toque abre uma página sua, com os seus botões', p: 'pro', s: 'constr' },
  { n: 'Experiência diferente por dispositivo', p: 'pro', s: 'constr' },
  { n: 'Link próprio da experiência', d: 'compartilhar fora do NFC', p: 'pro', s: 'constr' }
]

const ROTULO_ACAO = {
  google: 'Avaliar', whatsapp: 'WhatsApp', instagram: 'Instagram', food_menu: 'Cardápio',
  phone: 'Telefone', location: 'Como chegar', website: 'Site', contact: 'Salvar contato',
  custom_url: 'Link'
}

// ── Os dois celulares ───────────────────────────────────────
// Desenhados em CSS, sem imagem: mesma informação, nenhum pedido de rede.

// O que o Google mostra. Aproximação honesta da página DELE — sem marca nossa,
// porque a marca ali é a do Google mesmo.
function FoneGoogle({ nome }) {
  return (
    <div className="v3-mini">
      <div className="tela google">
        <div className="gcab"><span className="g">G</span> Google</div>
        <div className="gnome">{nome || 'Seu negócio'}</div>
        <div className="gestrelas">★★★★★</div>
        <div className="gcaixa">Compartilhe sua experiência…</div>
        <div className="gbotao">Publicar</div>
      </div>
    </div>
  )
}

// O que o menu mostra. Usa o menu real do lojista quando já existe: melhor ele
// se ver na tela do que ver o exemplo de outro negócio.
function FoneMenu({ titulo, subtitulo, acoes }) {
  const lista = acoes?.length ? acoes : [
    { id: 1, type: 'google', label: 'Avaliar no Google' },
    { id: 2, type: 'whatsapp', label: 'Falar no WhatsApp' },
    { id: 3, type: 'food_menu', label: 'Ver cardápio' },
    { id: 4, type: 'instagram', label: 'Instagram' },
    { id: 5, type: 'contact', label: 'Salvar contato' }
  ]
  return (
    <div className="v3-mini">
      <div className="tela">
        <div className="mtopo">{titulo || 'Seu negócio'}</div>
        <div className="msub">{subtitulo || 'Como podemos ajudar?'}</div>
        {lista.slice(0, 5).map((a, i) => (
          <div className="mbt" key={a.id || i}>{a.label || ROTULO_ACAO[a.type] || 'Ação'}</div>
        ))}
      </div>
    </div>
  )
}

export default function Experiencia({ dados }) {
  const [estado, setEstado] = React.useState({ carregando: true, erro: null, dados: null })
  const [abertaId, setAbertaId] = React.useState(() => {
    try { return new URLSearchParams(window.location.search).get('exp') } catch { return null }
  })
  const [criando, setCriando] = React.useState(false)
  const [verExcluidos, setVerExcluidos] = React.useState(false)

  const carregar = React.useCallback(async () => {
    try {
      const r = await api.experiencias.listar()
      setEstado({ carregando: false, erro: null, dados: r })
    } catch (e) {
      setEstado({ carregando: false, erro: e.message || 'Não foi possível carregar.', dados: null })
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])

  // A experiência aberta vira `?exp=` na URL: dá pra atualizar a página e
  // continuar onde estava, e o botão voltar do navegador funciona.
  const abrir = React.useCallback((id) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('exp', id); else url.searchParams.delete('exp')
    window.history.pushState({}, '', url)
    setAbertaId(id)
    window.scrollTo(0, 0)
  }, [])

  React.useEffect(() => {
    const onPop = () => {
      try { setAbertaId(new URLSearchParams(window.location.search).get('exp')) } catch {}
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  async function criar() {
    setCriando(true)
    try {
      const r = await api.experiencias.criar()   // o servidor numera: Menu 1, Menu 2...
      await carregar()
      abrir(r.experience.id)
    } catch (e) {
      setEstado(s => ({ ...s, erro: e.message }))
    } finally { setCriando(false) }
  }

  // "Excluir" na linguagem de quem usa; ARQUIVAR no banco. Nada é apagado:
  // dispositivos apontam pra esta experiência e o histórico de Resultados vai
  // referenciar os botões dela.
  async function excluir(e, emUso) {
    const aviso = emUso
      ? `Excluir “${e.name}”?\n\n${emUso === 1 ? 'O dispositivo que usa este menu volta' : `Os ${emUso} dispositivos que usam este menu voltam`} a levar direto ao Google.\n\nNada é apagado: você recupera em “Menus excluídos”.`
      : `Excluir “${e.name}”?\n\nNada é apagado: você recupera em “Menus excluídos”.`
    if (!confirm(aviso)) return
    try {
      await api.experiencias.arquivar(e.id)
      await carregar()
    } catch (err) {
      setEstado(st => ({ ...st, erro: err.message }))
    }
  }

  if (estado.carregando) return <Carregando o="suas experiências"/>
  if (estado.erro) return <Erro mensagem={estado.erro} onTentar={carregar}/>

  const { experiences = [], devices = [], tipos, limites, negocio } = estado.dados || {}
  const ativas = experiences.filter(e => !e.archived_at)
  const arquivadas = experiences.filter(e => e.archived_at)
  const aberta = abertaId ? experiences.find(e => e.id === abertaId) : null

  // Conta pelo que o dispositivo SERVE, não por ter vínculo: dispositivo preso
  // a um menu excluído tem vínculo preenchido e mesmo assim vai pro Google.
  const noGoogle = devices.filter(d => d.served_mode !== 'menu')
  const noMenu = devices.filter(d => d.served_mode === 'menu')

  if (aberta) {
    return (
      <EditorMenu
        exp={aberta} tipos={tipos} limites={limites} experiencias={experiences}
        foto={dados.info?.photoUrl || null}
        dados={{
          info: dados.info, devices,
          dispositivosDaExp: devices.filter(d => d.experience_id === aberta.id && d.experience_enabled)
        }}
        onVoltar={() => abrir(null)}
        onAtualizar={(_exp, opts) => { if (!opts?.silencioso) carregar() }}
      />
    )
  }

  // O menu mais recente alimenta a ilustração: melhor o lojista se ver na tela
  // do que ver um exemplo genérico.
  const exemplo = ativas.find(e => e.published) || ativas[0] || null
  const conteudoExemplo = exemplo?.published || exemplo?.draft || null

  return (
    <>
      <Head titulo="Experiência do Cliente"
        sub="Escolha o que acontece quando alguém encosta o celular na sua placa ou cartão"/>

      {/* Começa pelo FATO, não pelo conceito: o que os aparelhos dele estão
          fazendo agora. Só depois a tela usa os nossos nomes. */}
      <div className="v3-callout info" style={{ marginTop: 0, marginBottom: 16 }}>
        <Info size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
        <div>
          <div className="t">
            {devices.length === 0
              ? 'Você ainda não tem dispositivos ativos'
              : noMenu.length === 0
                ? `Hoje ${devices.length === 1 ? 'seu dispositivo leva' : `seus ${devices.length} dispositivos levam`} direto para sua página de avaliação no Google`
                : `${noMenu.length} ${noMenu.length === 1 ? 'dispositivo abre um menu seu' : 'dispositivos abrem um menu seu'}${noGoogle.length ? ` e ${noGoogle.length} ${noGoogle.length === 1 ? 'vai' : 'vão'} direto ao Google` : ''}`}
          </div>
          <div className="s">
            Cada placa, cartão ou pulseira sua leva o cliente a algum lugar quando ele encosta o celular.
            Você escolhe qual dos dois caminhos abaixo usar em cada dispositivo.
          </div>
        </div>
      </div>

      {/* ── A escolha, lado a lado e com o mesmo peso ── */}
      <div className="v3-escolha">
        <section className="v3-opcao">
          <header>
            <h2>Ir direto para o Google <Chip tipo="g">Grátis</Chip></h2>
            <p>O cliente toca e cai direto na página de avaliação do seu negócio no Google, sem nenhuma
              tela no meio.</p>
          </header>
          <FoneGoogle nome={negocio?.name}/>
          <footer>
            {noGoogle.length > 0
              ? <div className="uso ativo">Em uso em {noGoogle.length} {noGoogle.length === 1 ? 'dispositivo' : 'dispositivos'}</div>
              : <div className="uso">Nenhum dispositivo usando no momento</div>}
            <div className="nota">É assim que todo dispositivo novo já vem. Nós chamamos de “Google Direto”.</div>
          </footer>
        </section>

        <section className="v3-opcao destaque">
          <header>
            <h2>Abrir um Menu Inteligente <Chip>PRO</Chip></h2>
            <p>O cliente toca e escolhe o que quer fazer. Mais caminhos para ele se conectar com você.</p>
          </header>
          <div className="corpo">
            <FoneMenu
              titulo={conteudoExemplo?.brand?.titulo || negocio?.name}
              subtitulo={conteudoExemplo?.brand?.subtitulo}
              acoes={conteudoExemplo?.buttons?.filter(b => b.enabled !== false)}/>
            <ul className="v3-beneficios">
              <li><b>Mais de um caminho</b><span>Avaliar, cardápio, WhatsApp, Instagram, salvar contato — você escolhe quais.</span></li>
              <li><b>Um menu por dispositivo</b><span>A placa da mesa e o cartão do vendedor podem fazer coisas diferentes.</span></li>
              <li><b>Vive fora do NFC</b><span>O mesmo menu vira link para a bio, o WhatsApp ou um QR Code.</span></li>
            </ul>
          </div>
          <footer>
            <button className="v3-btn solid grande" onClick={criar} disabled={criando}>
              <Plus size={15}/> {criando ? 'Criando…' : ativas.length ? 'Criar outro menu' : 'Criar meu primeiro menu'}
            </button>
            {noMenu.length > 0 && (
              <div className="uso ativo">Em uso em {noMenu.length} {noMenu.length === 1 ? 'dispositivo' : 'dispositivos'}</div>
            )}
          </footer>
        </section>
      </div>

      {/* ── Seus menus ── */}
      {ativas.length > 0 && (
        <Panel titulo="Seus menus" sub="Gerencie os menus que você criou e veja onde estão sendo usados">
          {ativas.map(e => {
            const usando = devices.filter(d => d.experience_id === e.id && d.served_mode === 'menu')
            const naoPublicado = JSON.stringify(e.draft) !== JSON.stringify(e.published)
            const acoes = (e.published?.buttons || e.draft?.buttons || []).filter(b => b.enabled !== false)
            return (
              <div className="v3-menucard" key={e.id}>
                <div className="corpo" onClick={() => abrir(e.id)} role="button" tabIndex={0}
                  onKeyDown={ev => { if (ev.key === 'Enter') abrir(e.id) }}>
                  <div className="nome">{e.name}</div>
                  <div className="meta">
                    {acoes.length} {acoes.length === 1 ? 'ação' : 'ações'}
                    {' · '}
                    {usando.length
                      ? `usado em ${usando.length} ${usando.length === 1 ? 'dispositivo' : 'dispositivos'}`
                      : 'ainda não ligado em nenhum dispositivo'}
                    {e.published_at && ` · atualizado ${desde(e.published_at)}`}
                  </div>
                  <div className="tags">
                    {acoes.slice(0, 5).map((b, i) => (
                      <span className="tag" key={b.id || i}>{ROTULO_ACAO[b.type] || 'Ação'}</span>
                    ))}
                    {acoes.length > 5 && <span className="tag">+{acoes.length - 5}</span>}
                  </div>
                </div>
                <div className="lado">
                  {e.published
                    ? naoPublicado
                      ? <Chip tipo="a">alterações não publicadas</Chip>
                      : <Chip tipo="g">publicado</Chip>
                    : <Chip tipo="n">rascunho</Chip>}
                  <div className="acoes">
                    {e.published && (
                      <a className="v3-btn ghost" href={`/m/${e.slug}`} target="_blank" rel="noopener noreferrer">
                        Ver menu <ExternalLink size={11}/>
                      </a>
                    )}
                    <button className="v3-btn" onClick={() => abrir(e.id)}><Pencil size={13}/> Editar</button>
                    <button className="v3-btn ghost" title="Excluir menu" onClick={() => excluir(e, usando.length)}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {/* Ensina o conceito de vários menus com um EXEMPLO, não em abstrato. Só
          aparece depois do primeiro menu — antes disso seria adiantar uma
          etapa que a pessoa nem começou. */}
      {ativas.length > 0 && (
        <div className="v3-callout info">
          <Lightbulb size={16} color="var(--blue-dk)" style={{ flex: 'none', marginTop: 1 }}/>
          <div>
            <div className="t">Você pode ter um menu diferente para cada situação</div>
            <div className="s">
              Por exemplo: um menu com cardápio nas placas de mesa, e outro com “salvar contato” e WhatsApp
              no cartão dos seus vendedores.
            </div>
          </div>
        </div>
      )}

      {arquivadas.length > 0 && (
        <section className="v3-panel">
          <button className="v3-sanfona" onClick={() => setVerExcluidos(v => !v)} aria-expanded={verExcluidos}>
            <ChevronRight size={15} className={'seta' + (verExcluidos ? ' aberta' : '')}/>
            <span className="t">Menus excluídos</span>
            <span className="n">{arquivadas.length}</span>
          </button>
          {verExcluidos && (
            <div className="body">
              <p className="v3-dica" style={{ marginBottom: 8 }}>
                Nada foi apagado de verdade — dá para recuperar a qualquer momento.
              </p>
              {arquivadas.map(e => (
                <div className="v3-onde" key={e.id}>
                  <span className="txt"><span className="t">{e.name}</span>
                    <span className="d">excluído em {dataBr(e.archived_at)}</span></span>
                  <button className="v3-btn" onClick={async () => { await api.experiencias.arquivar(e.id, true); carregar() }}>
                    <Archive size={13}/> Recuperar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Recursos itens={RECURSOS}/>
    </>
  )
}
