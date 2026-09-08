// ============================================================
// StarTouch V3 — Configurações
// ============================================================
// Primeira das três pendências que prendiam o V3 ao painel atual (levantadas
// em 04/09/2026). Até aqui esta área era um link para fora: o cliente clicava
// em Configurações no painel novo e caía no velho.
//
// Ela pôde ser nativa porque o BACKEND nasceu antes, em 06/09: `api/conta.js`
// lê e grava os dados da pessoa (nome, telefone, senha), coisa que não existia
// em endpoint nenhum do projeto — no painel atual esses campos eram vitrine,
// com botão sem ação. Aqui não há nada de novo no servidor: esta tela é fio
// ligado no que já existe.
//
// A DIVISÃO QUE ORGANIZA A TELA, e que o painel atual embaralhava:
//   • o que é da PESSOA  → editável aqui           (api/conta)
//   • o que é do NEGÓCIO → vem do Google, leitura  (mybiz + bizinfo)
//   • o que é da BUSCA   → editável aqui           (savebiz, category_override)
// O nome, endereço e telefone do negócio NÃO são editáveis, e isso não é
// limitação a ser consertada depois: quem manda neles é o Google Meu Negócio.
// Campo editável que não altera nada é a mentira mais fácil de cometer.
// ============================================================
import React from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { Head, Panel, Chip } from '../ui.jsx'
import { api, post } from '../lib/api.js'

// Verde pra confirmação, vermelho pra falha. As duas cores existem no tema;
// nenhuma classe nova foi criada pra isto.
function Aviso({ texto }) {
  if (!texto) return null
  const erro = texto.startsWith('err:')
  return (
    <div style={{
      marginTop: 10, padding: '8px 11px', borderRadius: 8, fontSize: 12.2, fontWeight: 500,
      background: erro ? 'var(--red-soft)' : 'var(--green-soft)',
      color: erro ? 'var(--red)' : 'var(--green)',
      border: '1px solid ' + (erro ? 'var(--red)' : 'var(--green)')
    }}>
      {texto.replace(/^(ok|err):/, '')}
    </div>
  )
}

function Campo({ rotulo, valor, onChange, tipo = 'text', dica, placeholder, leitura, desabilitado }) {
  return (
    <label className="v3-campo">
      <span className="lb">{rotulo}</span>
      <input
        type={tipo}
        value={valor ?? ''}
        placeholder={placeholder || ''}
        readOnly={leitura}
        disabled={desabilitado}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={leitura ? { background: 'var(--bg)', color: 'var(--mid)' } : undefined}/>
      {dica && <span className="v3-dica" style={{ marginTop: 4, display: 'block' }}>{dica}</span>}
    </label>
  )
}

// ── Sua conta ───────────────────────────────────────────────
function Conta() {
  const [nome, setNome] = React.useState('')
  const [fone, setFone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [carregando, setCarregando] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState('')

  const [abrir, setAbrir] = React.useState(false)
  const [atual, setAtual] = React.useState('')
  const [nova, setNova] = React.useState('')
  const [confirma, setConfirma] = React.useState('')
  const [trocando, setTrocando] = React.useState(false)
  const [avisoSenha, setAvisoSenha] = React.useState('')

  // Os dados vêm do servidor, não do localStorage: o que está guardado no
  // navegador é do instante do login e envelhece.
  React.useEffect(() => {
    let vivo = true
    api.conta.ler()
      .then(r => {
        if (!vivo) return
        setNome(r.user?.name || ''); setFone(r.user?.phone || ''); setEmail(r.user?.email || '')
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  async function salvar() {
    setSalvando(true); setAviso('')
    try {
      await api.conta.salvar({ name: nome, phone: fone })
      // A barra lateral e o cabeçalho leem o nome do localStorage do login.
      // Sem esta linha o cliente salva, vê "salvo", e o nome no canto continua
      // o antigo até o próximo login — parece que não salvou.
      try {
        const raw = localStorage.getItem('rz_user')
        if (raw) { const u = JSON.parse(raw); u.name = nome; localStorage.setItem('rz_user', JSON.stringify(u)) }
      } catch {}
      setAviso('ok:Dados salvos.')
    } catch (e) {
      setAviso('err:' + (e.message || 'Não foi possível salvar'))
    }
    setSalvando(false)
  }

  async function trocarSenha() {
    setAvisoSenha('')
    if (nova !== confirma) { setAvisoSenha('err:A confirmação não bate com a nova senha'); return }
    setTrocando(true)
    try {
      await api.conta.senha({ senha_atual: atual, senha_nova: nova })
      setAtual(''); setNova(''); setConfirma(''); setAbrir(false)
      setAviso('ok:Senha alterada.')
    } catch (e) {
      setAvisoSenha('err:' + (e.message || 'Não foi possível trocar a senha'))
    }
    setTrocando(false)
  }

  return (
    <Panel titulo="Sua conta" sub="Seus dados pessoais e seu acesso ao painel">
      <Campo rotulo="Nome completo" valor={nome} onChange={setNome}
        placeholder={carregando ? 'Carregando…' : 'Seu nome'} desabilitado={carregando}/>
      <Campo rotulo="E-mail" valor={email} leitura
        dica="É também seu login. Para trocar o e-mail, fale com a gente na central de ajuda."/>
      <Campo rotulo="Telefone" valor={fone} onChange={setFone} tipo="tel"
        placeholder={carregando ? 'Carregando…' : '(11) 99999-9999'} desabilitado={carregando}
        dica="Usado só pra falar com você. Não aparece pros seus clientes."/>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <button className="v3-btn solid" onClick={salvar} disabled={salvando || carregando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button className="v3-btn" onClick={() => { setAbrir(v => !v); setAvisoSenha('') }}>
          {abrir ? 'Cancelar' : 'Alterar senha'}
        </button>
      </div>
      <Aviso texto={aviso}/>

      {abrir && (
        <div style={{
          marginTop: 14, padding: 14, background: 'var(--bg)',
          border: '1px solid var(--line)', borderRadius: 9
        }}>
          <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 10 }}>Trocar senha</div>
          <Campo rotulo="Senha atual" valor={atual} onChange={setAtual} tipo="password"/>
          <Campo rotulo="Nova senha" valor={nova} onChange={setNova} tipo="password" dica="Ao menos 6 caracteres."/>
          <Campo rotulo="Repita a nova senha" valor={confirma} onChange={setConfirma} tipo="password"/>
          <button className="v3-btn solid" onClick={trocarSenha}
            disabled={trocando || !atual || !nova || !confirma}>
            {trocando ? 'Trocando…' : 'Confirmar troca'}
          </button>
          <Aviso texto={avisoSenha}/>
          <p className="v3-dica" style={{ marginTop: 10 }}>
            Pedimos a senha atual de propósito: sem isso, qualquer pessoa com seu celular
            destravado na mão trocaria sua senha e você perderia a conta. Esqueceu a atual?
            Saia e use “Esqueci minha senha” na tela de entrada.
          </p>
        </div>
      )}
    </Panel>
  )
}

// ── Seu negócio ─────────────────────────────────────────────
// A busca medida é o único campo desta seção que o lojista controla — e é o
// mais consequente do painel inteiro: ela decide contra quem a posição na
// região é medida. Por isso vem primeiro, antes dos dados de leitura.
function Negocio({ dados }) {
  const { biz, info, recarregar } = dados
  const doGoogle = info?.category || null
  const salvo = (biz?.category_override || '').trim() || null
  const emUso = salvo || doGoogle

  const [termo, setTermo] = React.useState(salvo || doGoogle || '')
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState('')

  async function gravar(valor) {
    setSalvando(true); setAviso('')
    try {
      await post('/api/savebiz', { category_override: valor })
      setAviso(valor
        ? 'ok:Busca salva. Sua posição vai ser medida por esse termo na próxima medição.'
        : 'ok:Voltando pra categoria automática do Google.')
      // A posição na região é medida a partir deste termo — recarrega pra
      // tela não continuar mostrando a medição do termo antigo.
      setTimeout(() => recarregar && recarregar(), 900)
    } catch (e) {
      setAviso('err:' + (e.message || 'Não foi possível salvar'))
    }
    setSalvando(false)
  }

  return (
    <Panel titulo="Seu negócio" sub="O que o Google sabe sobre você, e como a gente mede sua posição">
      <div style={{
        padding: 13, borderRadius: 9, marginBottom: 14,
        background: salvo ? 'var(--amber-soft)' : 'var(--bg)',
        border: '1px solid ' + (salvo ? '#F2DCB8' : 'var(--line)')
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 3 }}>
          Busca usada pra medir sua posição
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{emUso || '— não definida'}</span>
          {salvo && <Chip>escolhida por você</Chip>}
        </div>
        {salvo && doGoogle && (
          <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5 }}>
            O Google classifica seu negócio como <strong>{doGoogle}</strong>.
          </div>
        )}
        {salvo && (
          <button className="v3-btn ghost" style={{ marginTop: 9 }} disabled={salvando}
            onClick={() => { setTermo(doGoogle || ''); gravar(null) }}>
            ↺ Voltar pra categoria automática do Google
          </button>
        )}
      </div>

      <Campo rotulo="Trocar a busca medida" valor={termo} onChange={setTermo}
        placeholder={doGoogle ? `Ex: ${doGoogle}` : 'Ex: padaria, salão de beleza, clínica…'}
        dica="É o termo que a gente digita no Google pra ver em que posição você aparece na sua região. Se o Google te classificou diferente do que você é — “loja” em vez de “padaria” —, corrija aqui."/>
      <button className="v3-btn solid" onClick={() => gravar(termo)} disabled={salvando || !termo.trim()}>
        {salvando ? 'Salvando…' : 'Salvar busca'}
      </button>
      <Aviso texto={aviso}/>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12.5, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.55 }}>
          Os dados abaixo vêm do seu perfil no Google e <strong>mudam por lá</strong>, não aqui —
          é o Google Meu Negócio que manda neles.
        </div>
        <Campo rotulo="Nome do negócio" valor={biz?.name} leitura/>
        <Campo rotulo="Endereço" valor={info?.address || '— não informado'} leitura/>
        <Campo rotulo="Telefone do negócio" valor={info?.phone || '— não informado'} leitura/>
        <Campo rotulo="Identificador no Google" valor={biz?.place_id} leitura
          dica="Identificador único do seu perfil. Não muda."/>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {info?.gmapsUrl && (
            <a className="v3-btn" href={info.gmapsUrl} target="_blank" rel="noopener noreferrer">
              Ver no Google Maps <ExternalLink size={12} style={{ verticalAlign: -1 }}/>
            </a>
          )}
          <a className="v3-btn" href="/comece">Vincular outro negócio</a>
        </div>
        <p className="v3-dica" style={{ marginTop: 8 }}>
          Vinculou o negócio errado, ou mudou de loja? Trocar aqui refaz a medição de posição
          na região certa.
        </p>
      </div>
    </Panel>
  )
}

// ── Plano ───────────────────────────────────────────────────
// Sem preço, sem data de cobrança e sem histórico: esses números vivem no
// Mercado Pago e o painel não os lê. O painel atual exibia todos eles vindos
// de dado fictício até 06/09/2026 — não repetir aqui.
function Plano({ dados }) {
  const ehPro = dados.biz?.plan === 'pro'

  // CANCELAMENTO AGENDADO (07/09/2026). Cancelar para a próxima cobrança na
  // hora, mas o acesso vai até o fim do período já pago — então existe um
  // estado "Pro, cancelado, ainda válido" que não é nem Pro comum nem Free.
  const cancelaEm = dados.biz?.stripe_cancel_at_period_end === true
    ? (dados.biz?.stripe_current_period_end || null) : null
  const agendado = ehPro && !!cancelaEm && new Date(cancelaEm).getTime() > Date.now()
  const dataFim  = agendado ? new Date(cancelaEm).toLocaleDateString('pt-BR') : null

  // O QUE O CLIENTE PERGUNTA quando abre esta tela: quanto pago, quando cai a
  // proxima, e onde pego a nota. Antes so tinha o nome do plano — o resto ele
  // teria que adivinhar ou perguntar pra gente.
  //
  // Durante os 7 dias gratis, `stripe_current_period_end` e o FIM DO TESTE, que
  // e tambem o dia da primeira cobranca. Dizer isso em voz alta e o que evita a
  // pior surpresa possivel: a cobranca que o cliente jurava que nao vinha.
  const status = dados.biz?.stripe_subscription_status || null
  const emTeste = status === 'trialing'
  const proximaCobranca = dados.biz?.stripe_current_period_end || null
  const dataCobranca = proximaCobranca
    ? new Date(proximaCobranca).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const [confirmando, setConfirmando] = React.useState(false)
  const [cancelando, setCancelando] = React.useState(false)
  const [indoPortal, setIndoPortal] = React.useState(false)
  const [aviso, setAviso] = React.useState('')

  // Portal do Stripe: trocar cartao, ver e baixar faturas. Cartao vencido e a
  // maior causa de assinante perdido sem querer, e aqui o proprio cliente
  // resolve — sem abrir chamado, sem esperar a gente.
  async function abrirPortal() {
    setIndoPortal(true); setAviso('')
    try {
      const r = await post('/api/billing?action=billing-portal', {})
      if (!r?.url) throw new Error('Não recebemos o endereço do portal.')
      window.location.href = r.url
    } catch (e) {
      setAviso('err:' + (e.message || 'Não foi possível abrir a área de pagamento.'))
      setIndoPortal(false)
    }
  }

  async function cancelar() {
    setCancelando(true); setAviso('')
    try {
      const r = await post('/api/billing?action=portal', {})
      setAviso('ok:' + (r?.ativoAte
        ? 'Assinatura cancelada. Você continua com o Pro até ' + new Date(r.ativoAte).toLocaleDateString('pt-BR') + '.'
        : 'Assinatura cancelada. Atualizando…'))
      setTimeout(() => dados.recarregar && dados.recarregar(), 2200)
    } catch (e) {
      setAviso('err:' + (e.message || 'Não foi possível cancelar. Fale com a gente.'))
      setCancelando(false); setConfirmando(false)
    }
  }

  return (
    <Panel titulo="Plano" sub="O que sua conta tem hoje">
      <div style={{
        borderRadius: 10, padding: 16,
        background: ehPro ? 'var(--blue)' : 'var(--bg)',
        color: ehPro ? '#fff' : 'var(--ink)',
        border: ehPro ? 'none' : '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', opacity: .85 }}>
            SEU PLANO ATUAL
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
            {ehPro ? 'StarTouch Pro' : 'StarTouch Free'}
          </div>
          {agendado ? (
            <div style={{ fontSize: 12.5, opacity: .9, marginTop: 2 }}>
              Cancelada — ativa até {dataFim}
            </div>
          ) : emTeste ? (
            <div style={{ fontSize: 12.5, opacity: .9, marginTop: 2 }}>
              Teste grátis — R$ 19,90/mês a partir de {dataCobranca}
            </div>
          ) : ehPro ? (
            <div style={{ fontSize: 12.5, opacity: .9, marginTop: 2 }}>
              R$ 19,90/mês{dataCobranca ? ` · próxima cobrança em ${dataCobranca}` : ''}
            </div>
          ) : null}
        </div>
        {!ehPro && <Chip tipo="g">Todos os recursos liberados</Chip>}
      </div>

      {/* O aviso do teste sai do card e ganha destaque proprio: e a informacao
          que mais gera contestacao de cartao quando ninguem avisa. */}
      {emTeste && !agendado && (
        <div style={{
          marginTop: 10, padding: '11px 13px', borderRadius: 9,
          background: 'var(--amber-soft, #FFFBEB)', border: '1px solid #FDE68A',
          fontSize: 12.5, color: '#92400E', lineHeight: 1.5
        }}>
          Seus <strong>7 dias grátis</strong> terminam em <strong>{dataCobranca}</strong>. Nesse dia
          entra a primeira cobrança de R$ 19,90. Se cancelar antes, não é cobrado nada.
        </div>
      )}

      {ehPro && (
        <>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Pagamento e notas</div>
            <p className="v3-dica" style={{ margin: '0 0 10px' }}>
              Troque o cartão, veja e baixe suas faturas. A cobrança é processada pela Stripe.
            </p>
            <button className="v3-btn" onClick={abrirPortal} disabled={indoPortal}>
              {indoPortal ? 'Abrindo…' : 'Gerenciar pagamento'}
            </button>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            {/* Quem já cancelou não vê "cancelar" de novo: vê até quando tem
                Pro e como voltar atrás. */}
            {agendado ? (
              <div style={{ padding: 13, background: 'var(--amber-soft, #FFFBEB)', border: '1px solid #FDE68A', borderRadius: 9 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 5 }}>
                  Assinatura cancelada — sem nova cobrança
                </div>
                <div style={{ fontSize: 12.2, color: 'var(--mid)', lineHeight: 1.55, marginBottom: 11 }}>
                  Você não será cobrado de novo. Seu <strong>Pro continua ativo até {dataFim}</strong>,
                  porque esse período já está pago. Depois dessa data seus dispositivos voltam a levar
                  direto para a avaliação no Google — e seus menus ficam guardados do jeito que estão.
                </div>
                <a className="v3-btn solid" href="/plano-pro">Reativar assinatura</a>
              </div>
            ) : !confirmando ? (
              <>
                <button className="v3-btn" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                  onClick={() => { setConfirmando(true); setAviso('') }}>
                  Cancelar assinatura
                </button>
                {/* Esta frase já disse o contrário duas vezes, e das duas estava
                    certa sobre o código do dia. Se o backend voltar a cortar na
                    hora, é ESTA linha que muda junto. Hoje manda o
                    handlePortalMP + resolvePlano (item 2a). */}
                <p className="v3-dica" style={{ marginTop: 6 }}>
                  Sem fidelidade: a cobrança para na hora e você usa o Pro até o fim do período já pago.
                </p>
              </>
            ) : (
              <div style={{ padding: 13, background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 9 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 5 }}>
                  Cancelar sua assinatura Pro?
                </div>
                <div style={{ fontSize: 12.2, color: 'var(--mid)', lineHeight: 1.55, marginBottom: 11 }}>
                  A próxima cobrança é cancelada e <strong>você continua com o Pro até o fim do
                  período que já pagou</strong>. Depois disso seus dispositivos voltam a levar direto
                  para a avaliação no Google. Seus menus e dispositivos ficam guardados — pra voltar,
                  é só assinar de novo.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="v3-btn solid" style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                    onClick={cancelar} disabled={cancelando}>
                    {cancelando ? 'Cancelando…' : 'Sim, cancelar'}
                  </button>
                  <button className="v3-btn" onClick={() => setConfirmando(false)} disabled={cancelando}>
                    Voltar
                  </button>
                </div>
              </div>
            )}
            <Aviso texto={aviso}/>
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Privacidade e seus dados ────────────────────────────────
// O canal do titular (Art. 18) funciona em /privacidade/solicitacao desde
// 22/08/2026 e ficou sem UM link no site inteiro até 06/09. A Política
// publicada promete esse canal ao cliente — promessa com efeito jurídico
// precisa de porta.
function Privacidade() {
  return (
    <Panel titulo="Privacidade e seus dados"
      sub="O que a gente guarda sobre você, e como pedir cópia ou exclusão">
      <p style={{ fontSize: 12.8, color: 'var(--mid)', lineHeight: 1.6, margin: '0 0 13px' }}>
        Pela LGPD você pode pedir a confirmação do que tratamos, uma cópia dos seus dados,
        correção, portabilidade ou a eliminação da sua conta. O pedido gera um protocolo e
        tem <strong>prazo de resposta de 15 dias</strong>.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="v3-btn solid" href="/privacidade/solicitacao">
          <ShieldCheck size={12} style={{ verticalAlign: -1, marginRight: 5 }}/>
          Fazer uma solicitação
        </a>
        <a className="v3-btn" href="/privacidade" target="_blank" rel="noopener noreferrer">
          Ler a Política de Privacidade <ExternalLink size={12} style={{ verticalAlign: -1 }}/>
        </a>
      </div>
    </Panel>
  )
}

export default function Configuracoes({ dados }) {
  return (
    <>
      <Head titulo="Configurações" sub="Sua conta, seu negócio e seu plano"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Conta/>
        <Negocio dados={dados}/>
        <Plano dados={dados}/>
        <Privacidade/>
      </div>
    </>
  )
}
