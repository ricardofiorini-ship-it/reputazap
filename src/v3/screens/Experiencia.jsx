import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, CheckCircle2, ExternalLink } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'
import { TIPOS } from '../../../api/_lib/menu.js'

// Desenhos e rótulos seguem os contratos compartilhados do menu público.
import { ICONES, CHEIOS } from '../../../api/_lib/menu-icones.js'
import './experiencia.css'
import PhoneFrame from '../PhoneFrame.jsx'

function IconeMenu({ tipo }) {
  const cheio = CHEIOS.has(tipo)
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
    fill={cheio ? 'currentColor' : 'none'} stroke={cheio ? 'none' : 'currentColor'}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
}

// Exemplos de conteúdo, não catálogo de tipos. Rótulos e ícones vêm do contrato.
// O EXEMPLO DA DEMONSTRAÇÃO — um só, e de propósito.
//
// Havia cinco cenas com um seletor de segmento embaixo do celular. O Ricardo
// matou o seletor em 07/09/2026 pelo motivo certo: controle que fica FORA do
// campo de visão do que ele controla é controle que ninguém vê agir. A pessoa
// clicava em "Clínicas" e a mudança acontecia acima, fora dos olhos dela.
//
// Sem o seletor, cinco cenas viram quatro cenas mortas. Ficou uma, genérica e
// legível para qualquer negócio — os rótulos aqui são de VITRINE, não os
// padrões do contrato: "Produtos e serviços" e "Agendar horário" dizem mais a
// quem está conhecendo do que "Site" e "Agendar".
const EXEMPLO = {
  subtitulo: 'Como podemos ajudar?',
  acoes: [
    { tipo: 'google',    label: 'Avaliar no Google',    detalhe: 'O cliente segue direto para avaliar seu negócio no Google.' },
    { tipo: 'whatsapp',  label: 'WhatsApp',             detalhe: 'Abre a conversa já com o seu número e a mensagem que você escreveu.' },
    { tipo: 'website',   label: 'Produtos e serviços',  detalhe: 'Leva ao seu site, catálogo ou loja — o endereço que você escolher.' },
    { tipo: 'booking',   label: 'Agendar horário',      detalhe: 'Abre sua agenda: Calendly, Doctoralia ou o sistema que você já usa.' },
    { tipo: 'instagram', label: 'Instagram',            detalhe: 'Leva ao seu perfil, para o cliente continuar acompanhando.' }
  ]
}

function Demonstracao({ nome, acao, setAcao }) {
  const escolhida = EXEMPLO.acoes.find(a => a.tipo === acao)
  return <section className="exp-descoberta" aria-label="Demonstração do Menu Inteligente">
    <div className="exp-cena">
      <div className="exp-fone-area">
        <PhoneFrame className="exp-fone" aria-label="Demonstração do Menu Inteligente">
          <div className="exp-fone-tela">
            <div className="exp-avatar">{(nome || 'S').trim().charAt(0).toUpperCase()}</div>
            <strong>{nome || 'Seu negócio'}</strong><p>{EXEMPLO.subtitulo}</p>
            <div className="exp-fone-acoes">
              {EXEMPLO.acoes.filter(a => TIPOS[a.tipo]).map(a => (
                <button key={a.tipo} type="button" aria-pressed={acao === a.tipo} onClick={() => setAcao(a.tipo)}>
                  <IconeMenu tipo={a.tipo}/><span>{a.label}</span><ChevronRight size={13}/>
                </button>
              ))}
            </div>
            <div className="exp-fone-feedback" role="status">
              {escolhida ? escolhida.detalhe : 'Toque em um botão para ver o que acontece.'}
            </div>
            <img src="/startouch-logo-dark.png" alt="StarTouch" width="82" height="27" style={{ display: 'block', objectFit: 'contain', margin: '18px auto 0' }}/>
          </div>
        </PhoneFrame>
        <span className="exp-demo-nota">Demonstração · você escolhe os botões</span>
      </div>
    </div>
  </section>
}


export default function Experiencia({ dados }) {
  const [estado, setEstado] = React.useState({ carregando: true, erro: null, dados: null })
  const [abertaId, setAbertaId] = React.useState(() => {
    try { return new URLSearchParams(window.location.search).get('exp') } catch { return null }
  })
  const [criando, setCriando] = React.useState(false)
  const [acao, setAcao] = React.useState(null)
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
        { id: 'pg', type: 'google', label: 'Avaliar no Google', enabled: true, value: {} },
        { id: 'pw', type: 'whatsapp', label: 'Falar no WhatsApp', enabled: true, value: { telefone: '(11) 99999-9999', mensagem: 'Olá!' } },
        { id: 'ps', type: 'website', label: 'Ver produtos/serviços', enabled: true, value: { url: 'https://exemplo.com.br' } },
        { id: 'po', type: 'custom_url', label: 'Pedir orçamento', enabled: true, value: { url: 'https://exemplo.com.br/orcamento' } },
        { id: 'pi', type: 'instagram', label: 'Seguir no Instagram', enabled: true, value: { url: '@cafedapraca' } },
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
      {/* TOPO COMPACTO (Ricardo, 07/09/2026). "Experiência do Cliente" virou
          título pequeno da página: o espaço nobre é da experiência, não do
          nome da área — o menu lateral já diz onde a pessoa está. O aviso dos
          dispositivos desceu para perto de "Seus menus", que é onde ele vira
          ação; aqui em cima ele empurrava o celular para fora da primeira
          dobra. */}
      <div className="exp-titulo-pagina">Experiência do Cliente</div>

      <div className="exp-hero">
        <header className="exp-intro">
          <div className="exp-eyebrow">MENU INTELIGENTE <Chip>PRO</Chip></div>
          {/* Sem quebra forçada: a frase tem tamanho variável e um <br/> fixo
              quebraria feio em telas estreitas. */}
          <h2>Vá além das avaliações no Google.</h2>
          <p>Com o Menu Inteligente, o mesmo toque também conecta seu cliente ao WhatsApp,
            aos seus produtos, agendamentos e muito mais.</p>
          <div className="exp-hero-acao">
            <button className="v3-btn solid" onClick={dados.previewToques ? () => abrir('preview-menu') : criar} disabled={criando}>
              <Plus size={16}/>{criando ? 'Criando…' : 'Criar meu Menu Inteligente'}<ChevronRight size={16}/>
            </button>
            <span>Monte e visualize antes de publicar.</span>
          </div>
        </header>
        <Demonstracao nome={negocioExibido?.name} acao={acao} setAcao={setAcao}/>
      </div>

      {/* A faixa que fecha o bloco de descoberta: a promessa que sustenta tudo
          o que vem antes. Ela precisa estar perto da oferta, senao o lojista le
          a tela inteira achando que vai perder o que ja tem. */}
      <div className="exp-gratuito">
        <CheckCircle2 size={17}/> A avaliação no Google continua gratuita.
      </div>

      {/* O estado atual dos dispositivos: desceu do topo pra cá, onde ele
          conversa com a lista de menus e com a decisão de ligar cada um. */}
      <section className="exp-atual" aria-label="Experiência atual">
        <CheckCircle2 size={19}/>
        <div><strong>{devices.length === 0 ? 'Seu primeiro ponto de contato começa aqui' : noMenu.length === 0
          ? `Hoje, ${devices.length === 1 ? 'seu dispositivo leva' : `seus ${devices.length} dispositivos levam`} à avaliação no Google`
          : `Hoje, ${noMenu.length} ${noMenu.length === 1 ? 'dispositivo abre' : 'dispositivos abrem'} seu Menu Inteligente`}</strong>
          <p>{devices.length === 0 ? 'Você já pode montar seu menu. Ao ativar um dispositivo, escolha a experiência dele.' : noMenu.length > 0
            ? `${noGoogle.length ? `Outros ${noGoogle.length} seguem direto ao Google. ` : ''}Você decide o destino de cada ponto de contato.`
            : 'Você decide o destino de cada ponto de contato — um por um, quando quiser.'}</p>
        </div>
      </section>

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
