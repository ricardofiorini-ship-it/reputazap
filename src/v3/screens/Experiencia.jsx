import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, CheckCircle2, ExternalLink, GitBranch, Smartphone } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'
import { TIPOS } from '../../../api/_lib/menu.js'

// Desenhos e rótulos seguem os contratos compartilhados do menu público.
import { ICONES, CHEIOS } from '../../../api/_lib/menu-icones.js'
import './experiencia.css'
import restauranteImg from '../assets/experiencia-placa.png'
import cartaoImg from '../assets/experiencia-cartao.png'

function IconeMenu({ tipo }) {
  const cheio = CHEIOS.has(tipo)
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
    fill={cheio ? 'currentColor' : 'none'} stroke={cheio ? 'none' : 'currentColor'}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
}

// Exemplos de conteúdo, não catálogo de tipos. Rótulos e ícones vêm do contrato.
const CENAS = {
  mesa: { nome: 'Na mesa do restaurante', titulo: 'O próximo pedido começa aqui.',
    descricao: 'Da escolha do prato à conversa no WhatsApp. Reúna os caminhos que fazem sentido durante a visita.',
    subtitulo: 'Bom ter você à mesa.', tipos: ['food_menu', 'whatsapp', 'google'],
    detalhes: { food_menu: 'Seu cardápio abre pelo link que você escolher.', whatsapp: 'O cliente continua a conversa no WhatsApp do restaurante.', google: 'O cliente segue para avaliar seu negócio no Google.' } },
  equipe: { nome: 'No cartão da equipe', titulo: 'Uma apresentação que continua.',
    descricao: 'Depois do primeiro contato, facilite o acesso aos seus produtos, a um orçamento ou à próxima conversa.',
    subtitulo: 'Vamos continuar a conversa?', tipos: ['website', 'custom_url', 'whatsapp', 'instagram'],
    detalhes: { website: 'Leve o cliente ao seu site de produtos e serviços.', custom_url: 'Use seu link para receber pedidos de orçamento.', whatsapp: 'Abra uma conversa com sua equipe no WhatsApp.', instagram: 'Convide o cliente a conhecer seu negócio no Instagram.' } }
}

function Demonstracao({ nome }) {
  const [cena, setCena] = React.useState('mesa')
  const [acao, setAcao] = React.useState(null)
  const exemplo = CENAS[cena]
  return <section className="exp-descoberta" aria-label="Explore as experiências">
    <div className="exp-seletor" role="group" aria-label="Escolha um ponto de contato">
      {Object.entries(CENAS).map(([id, item]) => <button key={id} type="button" aria-pressed={cena === id}
        onClick={() => { setCena(id); setAcao(null) }}><Smartphone size={16}/>{item.nome}</button>)}
      <span>Um toque. Possibilidades diferentes.</span>
    </div>
    <div className={'exp-cena ' + (cena === 'mesa' ? 'exp-cena-mesa' : 'exp-cena-equipe')}>
      <div className="exp-dispositivo-apoio"><span className="exp-apoio-kicker">COMEÇA NA SUA STARTOUCH</span>
      <img className="exp-cena-imagem" src={cena === 'mesa' ? restauranteImg : cartaoImg}
        alt={cena === 'mesa' ? 'Foto original da placa STARTOUCH para avaliação no Google' : 'Cartão STARTOUCH original com instruções de toque e avaliação'}
        width={cena === 'mesa' ? 225 : 1122} height={cena === 'mesa' ? 225 : 1402}/>
      <div className="exp-cena-legenda">Dispositivo atual · avaliação Google</div>
        <p>O toque conecta.<br/><strong>Você escolhe a experiência digital.</strong></p>
      </div>
      <div className="exp-fone-area">
        <div className="exp-fone" aria-label="Demonstração do Menu Inteligente">
          <div className="exp-fone-topo" aria-hidden="true"><span>9:41</span><i/><span>●</span></div>
          <div className="exp-fone-tela">
            <div className="exp-avatar">{(nome || 'S').trim().charAt(0).toUpperCase()}</div>
            <strong>{nome || 'Seu negócio'}</strong><p>{exemplo.subtitulo}</p>
            <div className="exp-fone-acoes">{exemplo.tipos.filter(tipo => TIPOS[tipo]).map(tipo => <button key={tipo}
              type="button" aria-pressed={acao === tipo} onClick={() => setAcao(tipo)}>
              <IconeMenu tipo={tipo}/><span>{TIPOS[tipo].label}</span><ChevronRight size={13}/></button>)}</div>
            <div className="exp-fone-feedback" role="status">{acao ? exemplo.detalhes[acao] : 'Toque em um botão para explorar o exemplo.'}</div>
            <img src="/startouch-logo-dark.png" alt="StarTouch" width="82" height="27" style={{ display: 'block', objectFit: 'contain', margin: '18px auto 0' }}/>
          </div>
          <div className="exp-fone-base"/>
        </div>
        <span className="exp-demo-nota">Demonstração · você escolhe os botões</span>
      </div>
    </div>
    <div className="exp-cena-texto" aria-live="polite"><span>{cena === 'mesa' ? '01 / À MESA' : '02 / COM SUA EQUIPE'}</span>
      <h3>{exemplo.titulo}</h3><p>{exemplo.descricao}</p></div>
  </section>
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

  return (
    <>
      <Head titulo="Experiência do Cliente" sub="Um novo jeito de receber quem chega até seu negócio."/>
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

        <header className="exp-intro">
          <div className="exp-eyebrow">MENU INTELIGENTE <Chip>PRO</Chip></div>
          <h2>Decida o que acontece<br/>depois de cada toque.</h2>
          <p>Sua placa ou cartão já conecta o cliente ao seu negócio.<br/>Com o Menu Inteligente, essa conexão ganha novos caminhos.</p>
        </header>
        <Demonstracao nome={negocioExibido?.name}/>
        <section className="exp-convite">
          <div><GitBranch size={24}/><h2>Cada ponto de contato.<br/>Uma experiência do seu jeito.</h2>
            <p>Um menu na mesa, outro no cartão da equipe. Escolha os botões, organize os links e decida onde usar cada experiência.</p></div>
          <div className="exp-convite-acao"><button className="v3-btn solid" onClick={dados.previewToques ? () => abrir('preview-menu') : criar} disabled={criando}>
            <Plus size={16}/>{criando ? 'Criando…' : 'Criar meu Menu Inteligente'}<ChevronRight size={16}/></button>
            <p>Monte e visualize no editor antes de publicar.</p></div>
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
