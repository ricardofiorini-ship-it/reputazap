import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, ExternalLink } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu, { CHAVE_MENU_PAGANDO } from './EditorMenu.jsx'
import { TIPOS } from '../../../api/_lib/menu.js'

// Desenhos e rótulos seguem os contratos compartilhados do menu público.
import { ICONES, CHEIOS } from '../../../api/_lib/menu-icones.js'
import './experiencia.css'
import PhoneFrame from '../PhoneFrame.jsx'

// ÍCONES DA DEMONSTRAÇÃO, EM COR DE MARCA — e só aqui.
//
// A distinção que torna isto seguro: esta tela é VITRINE, a prévia do editor é
// ESPELHO. A demo já usa rótulos próprios ("Produtos e serviços" no lugar de
// "Site") e não promete ser o menu de ninguém — ela existe para mostrar do que
// o Menu é capaz. A prévia do editor, essa sim, tem que ser idêntica ao que o
// cliente do lojista vai ver, e continua desenhando com `menu-icones.js`.
//
// Por isso as cores vivem AQUI e não no módulo compartilhado: colori-las lá
// mudaria o menu público real, onde o verde do WhatsApp e o gradiente do
// Instagram passariam a gritar mais alto que o "Avaliar no Google".
const MARCA = {
  google: null,                 // desenho próprio abaixo: o G oficial
  whatsapp: '#25D366',
  website: '#1A73E8',
  booking: '#6C3FD1',
  instagram: 'url(#ig-grad)'
}

// O G do Google são quatro caminhos de cores diferentes — não dá para pintar
// com um `fill` só, então ele é o único que vem desenhado por extenso.
const G_GOOGLE = (
  <>
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.55-5.17 3.55-8.88z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z"/>
    <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
  </>
)

function IconeMenu({ tipo }) {
  if (tipo === 'google') {
    return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">{G_GOOGLE}</svg>
  }
  const cor = MARCA[tipo]
  const cheio = CHEIOS.has(tipo)
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"
      fill={cheio ? (cor || 'currentColor') : 'none'}
      stroke={cheio ? 'none' : (cor || 'currentColor')}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {tipo === 'instagram' && (
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDCB52"/>
            <stop offset="45%" stopColor="#E1306C"/>
            <stop offset="100%" stopColor="#833AB4"/>
          </linearGradient>
        </defs>
      )}
      <g dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
    </svg>
  )
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
// Os RÓTULOS SAEM DO CONTRATO, não são escritos aqui (Ricardo, 07/09/2026).
// A demo dizia "Produtos e serviços" e "Agendar horário" — nomes que soam bem
// e que o editor NÃO oferece. Quem visse a demonstração e fosse montar o menu
// procuraria botões que não existem. É a mesma regra da prévia do editor,
// valendo um passo antes: a vitrine não pode prometer o que a loja não tem.
//
// Se algum nome do contrato ficar fraco pra vender, o conserto é mudar o
// `label` em `_lib/menu.js` — aí ele melhora na demo, no editor e no menu que
// o cliente abre, todos de uma vez.
const EXEMPLO = {
  subtitulo: 'Como podemos ajudar?',
  acoes: [
    { tipo: 'google',    detalhe: 'O cliente segue direto para avaliar seu negócio no Google.' },
    { tipo: 'whatsapp',  detalhe: 'Abre a conversa já com o seu número e a mensagem que você escreveu.' },
    { tipo: 'website',   detalhe: 'Leva ao seu site, catálogo ou loja — o endereço que você escolher.' },
    { tipo: 'booking',   detalhe: 'Abre sua agenda: Calendly, Doctoralia ou o sistema que você já usa.' },
    { tipo: 'instagram', detalhe: 'Leva ao seu perfil, para o cliente continuar acompanhando.' }
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
                  <IconeMenu tipo={a.tipo}/><span>{TIPOS[a.tipo].label}</span><ChevronRight size={13}/>
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
      return r
    } catch (e) {
      setEstado({ carregando: false, erro: e.message || 'Não foi possível carregar.', dados: null })
      return null
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


  // ── A VOLTA DO PAGAMENTO ──
  // Quem libera o Pro é o aviso que o Stripe manda pro nosso servidor, e ele
  // chega SEGUNDOS depois de o cliente voltar. Sem esperar, a pessoa paga,
  // cai aqui e lê "Free" — a conclusão dela é que o pagamento falhou.
  //
  // Então: pergunta de novo, algumas vezes, dizendo que está confirmando. Se
  // o aviso não chegar nesse tempo, o texto muda para algo honesto em vez de
  // ficar girando pra sempre — e o dinheiro está seguro de qualquer jeito,
  // porque quem manda no plano é o webhook, não esta tela.
  const [confirmando, setConfirmando] = React.useState(
    () => { try { return new URLSearchParams(window.location.search).get('upgrade') === 'success' } catch { return false } }
  )
  const [demorou, setDemorou] = React.useState(false)
  // Resultado da publicação automática pós-pagamento: {ok, em} ou {erro}.
  const [publicadoAposPagar, setPublicadoAposPagar] = React.useState(null)

  // Ref e não estado na dependência do efeito: se `abertaId` entrasse na lista,
  // qualquer mudança reiniciaria a espera do pagamento do zero.
  const abertaIdRef = React.useRef(abertaId)
  React.useEffect(() => { abertaIdRef.current = abertaId }, [abertaId])

  React.useEffect(() => {
    if (!confirmando) return
    let vivo = true
    let tentativas = 0
    const limpar = () => {
      const url = new URL(window.location.href)
      url.searchParams.delete('upgrade')
      window.history.replaceState({}, '', url)
    }
    const tentar = async () => {
      if (!vivo) return
      tentativas++
      const r = await carregar()
      if (!vivo) return
      if (r?.plano?.proAtivo) {
        setConfirmando(false)
        limpar()
        await publicarAgora(r)
        return
      }
      if (tentativas >= 8) { setDemorou(true); return }
      setTimeout(tentar, 2500)
    }
    // ── PUBLICAR SOZINHO NA VOLTA DO PAGAMENTO (Ricardo, 07/09/2026) ──
    // A pessoa clicou em "Publicar", foi barrada pelo plano, pagou e voltou.
    // A intenção não tem ambiguidade nenhuma: fazer procurar o botão de novo
    // dá a impressão de que o pagamento não valeu.
    //
    // Publica SÓ o menu que estava aberto quando ela saiu — nunca outro. E se
    // a publicação for recusada (algum botão inválido), diz isso em vez de
    // fingir que subiu: sucesso silencioso e fracasso silencioso são o mesmo
    // problema visto de dois lados.
    // Qual menu publicar: o que estiver aberto agora ou — no caso normal, em
    // que a pessoa volta do Stripe numa URL sem `?exp=` — o que ela guardou
    // ao sair. A marca é consumida de qualquer jeito, mesmo se não servir:
    // intenção de pagamento é de uma vez só, e deixá-la ali publicaria um menu
    // sozinho na próxima visita.
    const menuGuardado = () => {
      try {
        const cru = localStorage.getItem(CHAVE_MENU_PAGANDO)
        localStorage.removeItem(CHAVE_MENU_PAGANDO)
        if (!cru) return null
        const { id, em } = JSON.parse(cru)
        if (!id || !em) return null
        if (Date.now() - em > 2 * 60 * 60 * 1000) return null  // intenção velha, ignora
        return id
      } catch { return null }
    }

    const publicarAgora = async (r) => {
      const id = abertaIdRef.current || menuGuardado()
      if (!id) return
      const exp = (r?.experiences || []).find(e => e.id === id)
      if (!exp || exp.archived_at) return
      if (exp.pendente === false) return   // já estava no ar; nada a fazer
      try {
        const pub = await api.experiencias.publicar(id)
        if (!vivo) return
        setPublicadoAposPagar({ ok: true, em: pub.dispositivos_com_este_menu || 0 })
        // Reabre o menu recém-publicado: a pessoa saiu de dentro dele e deve
        // voltar pra dentro dele, vendo o resultado — não pra lista.
        if (!abertaIdRef.current) abrir(id)
        await carregar()
      } catch (e) {
        if (!vivo) return
        setPublicadoAposPagar({ ok: false, erro: e.message || 'Não foi possível publicar.' })
      }
    }

    tentar()
    return () => { vivo = false }
  }, [confirmando, carregar, abrir])

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

  const faixaPagamento = (confirmando || publicadoAposPagar) && (
    <div className={'v3-aviso-pagamento' + (publicadoAposPagar?.ok ? ' ok' : '') + (publicadoAposPagar?.ok === false ? ' erro' : '')}>
      {publicadoAposPagar?.ok ? (
        <>
          <b>Pronto. Seu menu está no ar.</b>{' '}
          {publicadoAposPagar.em > 0
            ? `Já vale em ${publicadoAposPagar.em} ${publicadoAposPagar.em === 1 ? 'dispositivo' : 'dispositivos'}.`
            : 'Agora escolha em quais dispositivos ele deve aparecer.'}
        </>
      ) : publicadoAposPagar?.ok === false ? (
        <>
          <b>Assinatura confirmada</b>, mas o menu não subiu: {publicadoAposPagar.erro}{' '}
          Corrija e clique em Publicar — sua assinatura já está ativa.
        </>
      ) : demorou ? (
        <>
          <b>Recebemos seu pagamento.</b> A liberação está demorando mais que o normal.
          Atualize a página em um minuto — se continuar assim, fale com a gente que resolvemos na hora.
        </>
      ) : (
        <><b>Confirmando seu pagamento…</b> Isso leva alguns segundos. Não feche a página.</>
      )}
    </div>
  )

  if (aberta) {
    return (
      <>
      {faixaPagamento}
      <EditorMenu
        exp={aberta} tipos={tiposExibidos} limites={limitesExibidos} experiencias={experiences}
        // Na prévia o plano vem do `?preview&plano=`, senão a caixa da
        // assinatura só daria pra revisar com conta real e cartão na mão.
        plano={estado.dados?.plano || (dados.previewToques
          ? { plano: dados.biz?.plan || 'free', proAtivo: dados.biz?.plan === 'pro' }
          : null)}
        foto={dados.info?.photoUrl || null}
        dados={{
          info: dados.info, devices,
          dispositivosDaExp: devices.filter(d => d.experience_id === aberta.id && d.experience_enabled)
        }}
        onVoltar={() => abrir(null)}
        onAtualizar={(_exp, opts) => { if (!opts?.silencioso) carregar() }}
      />
      </>
    )
  }

  return (
    <>
      {faixaPagamento}
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
