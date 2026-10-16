import React from 'react'
import { Plus, Archive, Pencil, Trash2, ChevronRight, ExternalLink, X, Zap, Smartphone, BarChart3, Heart } from 'lucide-react'
import { Head, Panel, Chip, Carregando, Erro, dataBr, desde } from '../ui.jsx'
import { api } from '../lib/api.js'
import EditorMenu, { CHAVE_MENU_PAGANDO, perguntaExtra } from './EditorMenu.jsx'
import { TIPOS } from '../../../api/_lib/menu.js'

// Desenhos e rótulos seguem os contratos compartilhados do menu público.
// O G do Google e as cores de marca saíram daqui em 08/09/2026: o banner do
// painel atual passou a precisar dos mesmos desenhos, e duas cópias do G um dia
// divergem — a marca do Google apareceria de dois jeitos no mesmo produto.
import { IconeMenu } from '../../marcas.jsx'
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

function Demonstracao({ nome, foto, acao, setAcao, onVazio }) {
  const escolhida = EXEMPLO.acoes.find(a => a.tipo === acao)
  const [fotoFalhou, setFotoFalhou] = React.useState(false)
  React.useEffect(() => setFotoFalhou(false), [foto])
  return <section className="exp-descoberta" aria-label="Demonstração do Menu Inteligente">
    <div className="exp-cena">
      <div className="exp-fone-area">
        <PhoneFrame className="exp-fone" aria-label="Demonstração do Menu Inteligente">
          {/* Desenho de 13/10/2026 (imagem de referência do Ricardo): faixa de
              capa no topo e o avatar redondo sobre ela. A capa é só cor — o
              menu público não tem foto de capa, e a vitrine não promete o que
              a loja não tem. A foto, quando existe, é a mesma que o menu real
              mostra no lugar do logo. */}
          <div className="exp-fone-tela exp-fone-v2">
            <div className="exp-fone-capa" aria-hidden="true"/>
            <div className="exp-avatar">
              {foto && !fotoFalhou
                ? <img src={foto} alt="" onError={() => setFotoFalhou(true)}/>
                : (nome || 'S').trim().charAt(0).toUpperCase()}
            </div>
            <strong>{nome || 'Seu negócio'}</strong><p>{EXEMPLO.subtitulo}</p>
            {/* 12/10/2026, mesma estratégia da Trybo: só o Google preenchido —
                é o que o dispositivo dele já faz hoje — e o resto VAZIO,
                tracejado, esperando ser preenchido. Telefone cheio parecia
                pronto e alheio; vazio é convite. Mesmo desenho no banner do
                /app (PROMO_BOTOES) e no e-mail semanal (menuBanner). */}
            <div className="exp-fone-acoes">
              {EXEMPLO.acoes.filter(a => a.tipo === 'google' && TIPOS[a.tipo]).map(a => (
                <button key={a.tipo} type="button" aria-pressed={acao === a.tipo} onClick={() => setAcao(a.tipo)}>
                  <IconeMenu tipo={a.tipo}/><span>{TIPOS[a.tipo].label}</span><ChevronRight size={13}/>
                </button>
              ))}
              {[0, 1, 2].map(i => (
                <button key={'vazio' + i} type="button" className="exp-fone-vazio" aria-label="Espaço livre para um botão seu"
                  onClick={onVazio}>
                  <Plus size={14} strokeWidth={2.4}/><span>Adicionar botão</span>
                </button>
              ))}
            </div>
            <div className="exp-fone-feedback" role="status">
              {escolhida ? escolhida.detalhe : 'Toque num espaço vazio (+) para montar o seu: WhatsApp, cardápio, agenda, Instagram, site.'}
            </div>
            <img src="/startouch-logo-dark.png" alt="StarTouch" width="82" height="27" style={{ display: 'block', objectFit: 'contain', margin: '18px auto 0' }}/>
          </div>
        </PhoneFrame>
        <span className="exp-demo-nota">Demonstração — você escolhe os botões</span>
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
      // `colher` usa a pré-busca disparada no App na PRIMEIRA vez; nas
      // seguintes (recarregar após publicar) vai ao servidor de novo.
      const r = await api.experiencias.colher()
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
        let pub
        try {
          pub = await api.experiencias.publicar(id)
        } catch (e) {
          // Menu ligado em mais de 5 dispositivos: pergunta antes de cobrar o
          // adicional, também aqui na volta do pagamento.
          if (!e.corpo?.precisaConfirmarExtra) throw e
          if (!confirm(perguntaExtra(e.corpo))) throw new Error('Publicação cancelada: você não confirmou os dispositivos extras. Desligue o Menu de alguns dispositivos ou publique de novo.')
          pub = await api.experiencias.publicar(id, { aceitaExtra: true })
        }
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

  // ── O "+" DO TELEFONE (12/10/2026) ──
  // Do banner do /app (chega com `?add=1`) ou da demonstração aqui embaixo: o
  // cliente tocou num espaço vazio querendo pôr um botão. Leva direto pro
  // editor com a escolha do tipo já aberta — no menu que ele já tem, ou num
  // menu novo, criado na hora, se ainda não tiver nenhum.
  const [adicionarNoEditor, setAdicionarNoEditor] = React.useState(false)
  const pedidoAdicionar = React.useRef((() => {
    try { return new URLSearchParams(window.location.search).get('add') === '1' } catch { return false }
  })())
  const comecarAdicionar = (d) => {
    if (dados.previewToques) { setAdicionarNoEditor(true); abrir('preview-menu'); return }
    const ativa = (d?.experiences || []).find(e => !e.archived_at)
    if (ativa) { setAdicionarNoEditor(true); abrir(ativa.id) }
    else if (criarSeTiverDispositivo(d)) setAdicionarNoEditor(true)
  }

  // ── SEM DISPOSITIVO, SEM MENU NOVO (12/10/2026) ──
  // O menu só existe pra abrir quando o cliente encosta o celular num
  // dispositivo. Quem não tem nenhum ativado pode navegar à vontade (a
  // demonstração está aí pra isso), mas na hora de CRIAR é avisado que
  // precisa de um dispositivo antes — com o caminho pra loja e pra ativar.
  // Quem já tem menu criado continua podendo editar.
  const [pedeDispositivo, setPedeDispositivo] = React.useState(false)
  function criarSeTiverDispositivo(d = estado.dados) {
    if (!dados.previewToques && !((d?.devices) || []).length) { setPedeDispositivo(true); return false }
    criar()
    return true
  }
  const avisoDispositivo = pedeDispositivo && (
    <div className="me-paywall-fundo" onClick={() => setPedeDispositivo(false)} role="presentation">
      <div className="me-paywall" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pede-disp-titulo">
        <button className="me-paywall-x" onClick={() => setPedeDispositivo(false)} aria-label="Fechar"><X size={16}/></button>
        <div className="me-paywall-selo">MENU INTELIGENTE</div>
        <h2 id="pede-disp-titulo" style={{ fontSize: 20, margin: '10px 0 8px', letterSpacing: '-0.02em' }}>Primeiro, um dispositivo StarTouch</h2>
        <p className="me-paywall-sub">
          O Menu Inteligente abre quando o cliente encosta o celular no seu cartão, placa ou pulseira StarTouch.
          Você ainda não tem nenhum dispositivo ativado — adquira um para criar o seu menu.
        </p>
        <a className="v3-btn solid" href="/kit" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
          Ver dispositivos na loja <ChevronRight size={15}/>
        </a>
        <a className="v3-btn" href="/ativar-codigo" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={e => {
          // Dentro do /app, o modal de ativação atende aqui mesmo (AppV2,
          // 'st:ativar-dispositivo'); o /ativar-codigo é pra quem não tem conta.
          const ev = new CustomEvent('st:ativar-dispositivo', { cancelable: true })
          window.dispatchEvent(ev)
          if (ev.defaultPrevented) { e.preventDefault(); setPedeDispositivo(false) }
        }}>
          Já tenho um — ativar
        </a>
        <button type="button" className="v3-btn ghost" onClick={() => setPedeDispositivo(false)} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Agora não
        </button>
      </div>
    </div>
  )
  // `?criar=1` (16/10/2026): o "Criar meu menu" do /app já é o pedido de
  // criar. Antes ele só trocava de aba, e o cliente caía numa tela com outro
  // botão "Criar meu Menu Inteligente" — dois cliques pra mesma coisa. Agora
  // vai direto: abre o menu que já existe ou cria o primeiro.
  const pedidoCriar = React.useRef((() => {
    try { return new URLSearchParams(window.location.search).get('criar') === '1' } catch { return false }
  })())
  React.useEffect(() => {
    if ((!pedidoAdicionar.current && !pedidoCriar.current) || estado.carregando || estado.erro) return
    const adicionar = pedidoAdicionar.current
    pedidoAdicionar.current = false
    pedidoCriar.current = false
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('add')
      url.searchParams.delete('criar')
      window.history.replaceState({}, '', url)
    } catch {}
    if (adicionar) { comecarAdicionar(estado.dados); return }
    if (dados.previewToques) { abrir('preview-menu'); return }
    const ativa = (estado.dados?.experiences || []).find(e => !e.archived_at)
    if (ativa) abrir(ativa.id)
    else criarSeTiverDispositivo(estado.dados)
  }, [estado]) // eslint-disable-line react-hooks/exhaustive-deps

  if (estado.carregando) return <Carregando o="suas experiências"/>
  if (estado.erro) return <Erro mensagem={estado.erro} onTentar={carregar}/>

  const { experiences: experiencesDaApi = [], devices: devicesDaApi = [], tipos, limites, negocio } = estado.dados || {}
  // `slug` + `published` na previa: e o unico jeito de revisar o bloco do link
  // mágico, que so aparece com o menu no ar (link de rascunho nao abre). O
  // `pendente: true` fica: e o estado real de um menu publicado com alteracoes
  // ainda nao publicadas, que e onde a pessoa mais tempo passa.
  const experienciaPreview = {
    id: 'preview-menu', name: 'Menu principal', pendente: true,
    slug: 'menu-exemplo', published: { mode: 'menu' }, published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
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
      {avisoDispositivo}
      <EditorMenu
        // `key`: o editor guarda o rascunho em estado próprio. Sem a chave, o
        // "Criar outro menu" (que pula de um menu direto pro outro, sem passar
        // pela lista) abriria o menu novo mostrando o conteúdo do anterior.
        key={aberta.id}
        onCriarOutro={dados.previewToques ? undefined : () => criarSeTiverDispositivo()}
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
        abrirAdicionar={adicionarNoEditor}
        onAdicionarAberto={() => setAdicionarNoEditor(false)}
        onVoltar={() => abrir(null)}
        onAtualizar={(_exp, opts) => { if (!opts?.silencioso) carregar() }}
      />
      </>
    )
  }

  return (
    <>
      {faixaPagamento}
      {avisoDispositivo}
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
          <h2>Vá além das avaliações no Google<span className="exp-ponto">.</span></h2>
          <p>Transforme cada toque em uma nova oportunidade de conexão. Com o Menu Inteligente, seu
            cliente pode avaliar sua empresa no Google e também acessar seu WhatsApp, produtos,
            agendamentos, redes sociais e muito mais — tudo em um só lugar.</p>
          <div className="exp-hero-acao">
            <button className="v3-btn solid" onClick={dados.previewToques ? () => abrir('preview-menu') : () => criarSeTiverDispositivo()} disabled={criando}>
              <Plus size={16}/>{criando ? 'Criando…' : 'Criar meu Menu Inteligente'}<ChevronRight size={16}/>
            </button>
            <span>Monte, personalize e visualize seu menu antes de publicar.</span>
          </div>
          {/* Preço à vista desde 06/10/2026 — escondido, ninguém entendia que
              era uma assinatura. Mesmos números da caixa do "Publicar". */}
          {!estado.dados?.plano?.proAtivo && (
            <div className="exp-hero-preco">
              <div className="exp-preco-linha"><strong>R$ 19,90/mês · 7 dias grátis · sem cartão de crédito</strong></div>
              <div className="exp-preco-detalhe">até 5 dispositivos (R$ 1,90 por extra) · sem fidelidade</div>
              <p>Você monta de graça, publica e testa por 7 dias. Só paga se decidir continuar e cadastrar um cartão após o período gratuito.</p>
            </div>
          )}
          <ul className="exp-beneficios">
            <li><span><Zap size={17}/></span>Rápido de configurar</li>
            <li><span><Smartphone size={17}/></span>Abre sem instalar aplicativo</li>
            <li><span><BarChart3 size={17}/></span>Mais conexão com seus clientes</li>
            <li><span><Heart size={17}/></span>Fortalece sua marca</li>
          </ul>
        </header>
        <Demonstracao nome={negocioExibido?.name} foto={dados.info?.photoUrl || null} acao={acao} setAcao={setAcao} onVazio={() => comecarAdicionar(estado.dados)}/>
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
