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
import { Plus, Archive, Pencil, Trash2, ChevronRight, CheckCircle2, ExternalLink, Lightbulb, GitBranch, Smartphone, Link2 } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'

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
    <div className="v3-mini google-phone" aria-label="Prévia da página de avaliação no Google">
      <div className="phone-bar"><span>9:41</span><i/><span>● ◒</span></div>
      <div className="tela google">
        <div className="gcab"><span className="g">G</span><span>Avaliações</span><b>×</b></div>
        <div className="gavatar">{(nome || 'S').trim().charAt(0).toUpperCase()}</div>
        <div className="gnome">{nome || 'Seu negócio'}</div>
        <div className="gpergunta">Como foi sua experiência?</div>
        <div className="gestrelas" aria-label="Escolher de uma a cinco estrelas">☆ ☆ ☆ ☆ ☆</div>
        <div className="gcaixa">Conte um pouco sobre sua visita</div>
        <div className="gacoes"><span>Cancelar</span><strong>Publicar</strong></div>
      </div>
      <div className="phone-home"/>
    </div>
  )
}

// O que o menu mostra. Usa o menu real do lojista quando já existe: melhor ele
// se ver na tela do que ver o exemplo de outro negócio.
function FoneMenu({ titulo, subtitulo, acoes }) {
  const lista = acoes?.length ? acoes : [
    { id: 1, type: 'whatsapp', label: 'Falar no WhatsApp' },
    { id: 2, type: 'website', label: 'Ver produtos/serviços' },
    { id: 3, type: 'custom_url', label: 'Pedir orçamento' },
    { id: 4, type: 'instagram', label: 'Seguir no Instagram' },
    { id: 5, type: 'google', label: 'Avaliar no Google' }
  ]
  return (
    <div className="v3-mini menu-phone" aria-label="Prévia do Menu Inteligente">
      <div className="phone-bar"><span>9:41</span><i/><span>● ◒</span></div>
      <div className="tela">
        <div className="mavatar">{(titulo || 'S').trim().charAt(0).toUpperCase()}</div>
        <div className="mtopo">{titulo || 'Seu negócio'}</div>
        <div className="msub">{subtitulo || 'Como podemos ajudar?'}</div>
        {lista.slice(0, 5).map((a, i) => (
          <div className="mbt" key={a.id || i}><span className={`mac ${a.type || 'link'}`}>{i + 1}</span>
            <b>{a.label || ROTULO_ACAO[a.type] || 'Ação'}</b><span className="seta">›</span></div>
        ))}
        <div className="mcustom"><Plus size={9}/> Adicione qualquer link</div>
        <div className="mrodape">Criado com <strong>STARTOUCH</strong></div>
      </div>
      <div className="phone-home"/>
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

  const { experiences: experiencesDaApi = [], devices: devicesDaApi = [], tipos, limites, negocio } = estado.dados || {}
  const experienciaPreview = {
    id: 'preview-menu', name: 'Menu principal', pendente: true,
    draft: {
      brand: { titulo: 'Café da Praça', subtitulo: 'Como podemos ajudar?' },
      buttons: [
        { id: 'pw', type: 'whatsapp', label: 'Falar no WhatsApp', enabled: true, value: { telefone: '(11) 99999-9999', mensagem: 'Olá!' } },
        { id: 'ps', type: 'website', label: 'Ver produtos/serviços', enabled: true, value: { url: 'https://exemplo.com.br' } },
        { id: 'po', type: 'custom_url', label: 'Pedir orçamento', enabled: true, value: { url: 'https://exemplo.com.br/orcamento' } },
        { id: 'pi', type: 'instagram', label: 'Seguir no Instagram', enabled: true, value: { url: '@cafedapraca' } },
        { id: 'pg', type: 'google', label: 'Avaliar no Google', enabled: true, value: {} }
      ]
    }
  }
  const experiences = dados.previewToques ? [experienciaPreview] : experiencesDaApi
  // Catálogo de reserva, só para o modo prévia conseguir abrir o editor sem
  // backend. Para o cliente real, `tipos` e `limites` sempre vêm da API
  // (api/experiences.js devolve TIPOS e LIMITES em TODA resposta), então estas
  // duas linhas nunca entram em ação — e o EditorMenu ainda se defende sozinho
  // (`tipos || {}`, `limites?.botoes || 12`, com o mesmo 12 daqui).
  //
  // ⚠️ É uma CÓPIA de `TIPOS`, que mora em api/_lib/menu.js. Conferido em
  // 04/09/2026: os 9 tipos batem. Tipo novo lá não aparece aqui, e a prévia
  // passa a mostrar um menu desatualizado sem avisar ninguém — quem estiver
  // desenhando em cima dela desenha para um produto que já mudou.
  const tiposExibidos = tipos || {
    whatsapp: { label: 'WhatsApp' }, website: { label: 'Site ou produtos' }, custom_url: { label: 'Link personalizado' },
    instagram: { label: 'Instagram' }, google: { label: 'Avaliar no Google' }, food_menu: { label: 'Cardápio' },
    phone: { label: 'Telefone' }, location: { label: 'Como chegar' }, contact: { label: 'Salvar contato' }
  }
  const limitesExibidos = limites || { botoes: 12 }
  // A prévia local não chama o backend de produção. Nela, reaproveita os
  // mesmos dispositivos fictícios da Home para que as telas não se
  // contradigam durante a revisão visual.
  const devices = dados.previewToques
    ? dados.dispositivos.map(d => ({ ...d, served_mode: 'google', experience_id: null, experience_enabled: false }))
    : devicesDaApi
  const negocioExibido = negocio || dados.biz
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
        exp={aberta} tipos={tiposExibidos} limites={limitesExibidos} experiencias={experiences}
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
        sub="Escolha o que seu cliente encontra depois de interagir com um dispositivo"/>

      {/* Começa pelo FATO, não pelo conceito: o que os aparelhos dele estão
          fazendo agora. Só depois a tela usa os nossos nomes. */}
      <div className="v3-exp-status">
        <CheckCircle2 size={17}/>
        <div>
          <div className="t">
            {devices.length === 0
              ? 'Você ainda não tem dispositivos ativos'
              : noMenu.length === 0
                ? `${devices.length === 1 ? 'Seu dispositivo está configurado' : `Seus ${devices.length} dispositivos estão configurados`} para Avaliação no Google`
                : `${noMenu.length} ${noMenu.length === 1 ? 'dispositivo abre um menu seu' : 'dispositivos abrem um menu seu'}${noGoogle.length ? ` e ${noGoogle.length} ${noGoogle.length === 1 ? 'vai' : 'vão'} direto ao Google` : ''}`}
          </div>
          <div className="s">Esta é a experiência entregue atualmente após cada interação.</div>
        </div>
      </div>

      {/* ── A escolha, lado a lado e com o mesmo peso ── */}
      <div className="v3-escolha">
        <section className="v3-opcao atual">
          <header>
            <h2>Avaliação no Google {noGoogle.length > 0 && <Chip tipo="g">Em uso</Chip>}</h2>
            <p>Após a interação, o cliente é direcionado à página de avaliação do seu negócio.</p>
          </header>
          <FoneGoogle nome={negocioExibido?.name}/>
          <footer>
            {noGoogle.length > 0
              ? <div className="uso ativo">Em uso em {noGoogle.length} {noGoogle.length === 1 ? 'dispositivo' : 'dispositivos'}</div>
              : <div className="uso">Nenhum dispositivo usando no momento</div>}
            <div className="nota">Configuração gratuita e padrão dos novos dispositivos.</div>
          </footer>
        </section>

        <section className="v3-opcao destaque">
          <header>
            <h2>Menu Inteligente <Chip>PRO</Chip></h2>
            <p>Crie uma experiência personalizada com os caminhos mais importantes do seu negócio.</p>
          </header>
          <div className="corpo">
            <FoneMenu
              titulo={conteudoExemplo?.brand?.titulo || negocioExibido?.name}
              subtitulo={conteudoExemplo?.brand?.subtitulo}
              acoes={conteudoExemplo?.buttons?.filter(b => b.enabled !== false)}/>
            <ul className="v3-beneficios">
              <li><span className="ico"><GitBranch size={16}/></span><div><b>Mais caminhos para o cliente</b><span>Reúna atendimento, produtos, orçamento, Instagram e avaliação em um só lugar.</span></div></li>
              <li><span className="ico"><Smartphone size={16}/></span><div><b>A experiência certa em cada ponto</b><span>Use um menu na mesa e outro no cartão da equipe, de acordo com cada momento.</span></div></li>
              <li><span className="ico"><Link2 size={16}/></span><div><b>Qualquer link que fizer sentido</b><span>Adicione delivery, reservas, promoções, pagamentos ou o endereço que você quiser.</span></div></li>
            </ul>
          </div>
          <footer>
            <button className="v3-btn solid grande" onClick={dados.previewToques ? () => abrir('preview-menu') : criar} disabled={criando}>
              <Plus size={15}/> {criando ? 'Criando…' : dados.previewToques ? 'Conhecer o Menu Inteligente' : ativas.length ? 'Criar outro menu' : 'Criar meu primeiro menu'}
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
            const naoPublicado = e.pendente !== false   // o servidor decide; ver estaPendente()
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
    </>
  )
}
