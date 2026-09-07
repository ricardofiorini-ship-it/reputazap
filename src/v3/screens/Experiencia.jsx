import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, CheckCircle2, ExternalLink, GitBranch, Smartphone } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'
import { TIPOS } from '../../../api/_lib/menu.js'

// Desenhos e rótulos seguem os contratos compartilhados do menu público.
import { ICONES, CHEIOS } from '../../../api/_lib/menu-icones.js'
import './experiencia.css'

function IconeMenu({ tipo }) {
  const cheio = CHEIOS.has(tipo)
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
    fill={cheio ? 'currentColor' : 'none'} stroke={cheio ? 'none' : 'currentColor'}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
}

function FoneMenu({ titulo, subtitulo, acoes }) {
  const reais = (acoes || []).slice(0, 5)
  const usados = new Set(reais.map(a => a.type))
  const sugestoes = Object.entries(TIPOS).map(([type, info]) => ({ type, label: info.label })).filter(s => !usados.has(s.type)).slice(0, 5 - reais.length)

  return (
    <div className="v3-mini menu-phone" aria-label="Prévia do Menu Inteligente">
      <div className="phone-bar"><span>9:41</span><i/><span>● ◒</span></div>
      <div className="tela">
        <div className="mavatar">{(titulo || 'S').trim().charAt(0).toUpperCase()}</div>
        <div className="mtopo">{titulo || 'Seu negócio'}</div>
        <div className="msub">{subtitulo || 'Como podemos ajudar?'}</div>

        {reais.map((a, i) => (
          <div className="mbt" key={a.id || i}><span className={`mac ${a.type || 'link'}`}><IconeMenu tipo={a.type}/></span>
            <b>{a.label || TIPOS[a.type]?.label || 'Ação'}</b><span className="seta">›</span></div>
        ))}

        {sugestoes.map(s => (
          <div className="mbt sugestao" key={`s-${s.type}`}>
            <span className="mac"><IconeMenu tipo={s.type}/></span>
            <b>{s.label}</b><span className="seta">›</span>
          </div>
        ))}

        {sugestoes.length > 0 && (
          <div className="mlegenda">
            {reais.length ? 'Sugestões: dá pra adicionar estes também' : 'Exemplos do que você pode colocar aqui'}
          </div>
        )}

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
      brand: { titulo: dados.biz?.name || 'Seu negócio', subtitulo: 'Como podemos ajudar?' },
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
  // Catálogo de reserva do modo prévia. IMPORTADO do contrato, não copiado:
  // até 07/09/2026 havia uma cópia manual dos tipos aqui, e ela já tinha ficado
  // para trás — nasceram "Canal direto com a Gerência" e "Agendar" e a prévia
  // seguiu mostrando nove, sem avisar ninguém. O próprio comentário anterior
  // previa esse desfecho, o que não impediu que acontecesse: aviso não é
  // proteção. `_lib/menu.js` é módulo puro, então o front carrega o mesmo
  // arquivo que o servidor valida.
  //
  // Para o cliente real isto nunca entra em ação — `api/experiences.js` devolve
  // TIPOS e LIMITES em TODA resposta.
  const tiposExibidos = tipos || TIPOS
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
      <Head titulo="Experiência do Cliente" sub="Decida o que acontece depois de cada toque."/>
      <div className="exp-evolucao">
        <section className="exp-atual" aria-label="Experiência atual">
          <CheckCircle2 size={19}/>
          <div><strong>{devices.length === 0 ? 'Seu primeiro ponto de contato começa aqui' : noMenu.length === 0
            ? `Hoje, ${devices.length === 1 ? 'seu dispositivo leva' : `seus ${devices.length} dispositivos levam`} à avaliação no Google`
            : `Hoje, ${noMenu.length} ${noMenu.length === 1 ? 'dispositivo abre' : 'dispositivos abrem'} seu Menu Inteligente`}</strong>
            <p>{devices.length === 0 ? 'Você já pode montar seu menu. Ao ativar um dispositivo, escolha a experiência dele.' : noMenu.length > 0
              ? `${noGoogle.length ? `Outros ${noGoogle.length} seguem direto ao Google. ` : ''}Você decide o destino de cada ponto de contato.`
              : 'Avaliação no Google é a experiência padrão e continua gratuita.'}</p>
          </div>
        </section>

        <section className="exp-pro" aria-labelledby="exp-pro-titulo">
          <div className="exp-pro-copy">
            <div className="exp-eyebrow">MAIS POSSIBILIDADES EM CADA TOQUE <Chip>PRO</Chip></div>
            <h2 id="exp-pro-titulo">Menu Inteligente</h2>
            <p className="exp-promessa">O mesmo toque.<br/><strong>Vários caminhos para o seu negócio.</strong></p>
            <p className="exp-descricao">Transforme sua placa ou cartão STARTOUCH em um ponto de contato que ajuda o cliente a dar o próximo passo.</p>
            <div className="exp-caminhos" aria-label="Possibilidades do menu">
              {Object.entries(TIPOS).map(([type, info]) => <span key={type}><IconeMenu tipo={type}/>{info.label}</span>)}
            </div>
            <p className="exp-descricao">Mostre produtos e serviços, receba pedidos de orçamento ou adicione qualquer link que faça sentido para você.</p>
            <button className="v3-btn solid grande" onClick={dados.previewToques ? () => abrir('preview-menu') : criar} disabled={criando}>
              <Plus size={16}/>{criando ? 'Criando…' : 'Criar meu Menu Inteligente'}<ChevronRight size={16}/>
            </button>
            <p className="exp-nota">Monte e visualize no editor antes de publicar.</p>
          </div>
          <figure className="exp-demonstracao">
            <span className="exp-toque"><Smartphone size={15}/> Seu cliente toca na STARTOUCH</span>
            <span className="exp-conector" aria-hidden="true">↓</span>
            <FoneMenu titulo={conteudoExemplo?.brand?.titulo || negocioExibido?.name}
              subtitulo={conteudoExemplo?.brand?.subtitulo}
              acoes={conteudoExemplo?.buttons?.filter(b => b.enabled !== false)}/>
            <figcaption>{exemplo ? 'Prévia do seu menu' : 'Imagine seu negócio aqui'}<span>Você escolhe os botões e a ordem.</span></figcaption>
          </figure>
        </section>

        <section className="exp-pontos" aria-labelledby="exp-pontos-titulo">
          <div className="exp-pontos-titulo"><GitBranch size={21}/><div><h2 id="exp-pontos-titulo">Cada ponto de contato pode ter uma experiência diferente</h2><p>Personalize o próximo passo de acordo com o momento do cliente.</p></div></div>
          <div className="exp-exemplos">
            <article><span>NA MESA</span><h3>Facilite o pedido</h3><p>Cardápio, WhatsApp e avaliação no Google no mesmo menu.</p></article>
            <article><span>NO CARTÃO DA EQUIPE</span><h3>Continue a conversa</h3><p>Produtos, serviços e orçamento ao alcance de um toque.</p></article>
            <article><span>NO BALCÃO</span><h3>Crie o próximo contato</h3><p>Instagram e links úteis, ou mantenha a avaliação direta no Google.</p></article>
          </div>
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
                      <span className="tag" key={b.id || i}>{TIPOS[b.type]?.label || 'Ação'}</span>
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
