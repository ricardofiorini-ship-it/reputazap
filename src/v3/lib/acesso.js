// ============================================================
// StarTouch V3 — quem entra, e vendo o quê
// ============================================================
// Duas perguntas diferentes, e misturá-las foi o que deu errado antes:
//
//   1. QUEM pode entrar aqui  → decidido na porta (main.jsx)
//   2. VENDO O QUÊ            → decidido pelo modo (App.jsx)
//
// Desde 08/09/2026 o Menu Inteligente está à venda, então CLIENTE ENTRA. Mas
// entra vendo UMA TELA — a do Menu —, não o painel inteiro: várias áreas daqui
// ainda estão em construção, e o cliente não pediu pra trocar de painel, pediu
// pra montar um menu.
//
// Interno (administrador e testadores) vê o painel completo, porque é quem
// precisa revisar o que ainda não está pronto.
//
// Quando o V3 substituir o /app, este arquivo inteiro sai: não haverá "modo
// solo" nem "painel de trás", só o painel.
// ============================================================

export const ADMINS = ['ricardo.fiorini@gmail.com']

// Espelha BETA_TESTERS do api/experiences.js. São duas listas porque uma é a
// porta da TELA e a outra a da API — e elas precisam concordar.
export const TESTADORES = ['ricardo@gt6.com.br']

export function ehInterno(user) {
  const email = (user?.email || '').toLowerCase().trim()
  return ADMINS.includes(email) || TESTADORES.includes(email)
}

// `?solo=1` — uma tela só, sem a navegação daqui.
//
// FICA GUARDADO NA SESSÃO por um motivo concreto: quem assina sai daqui pro
// Stripe e volta por um endereço FIXO, configurado no painel dele, que não
// carrega o parâmetro. Sem a lembrança, a pessoa sairia de uma tela simples e
// voltaria dentro do painel inteiro — logo depois de pagar, que é a pior hora
// possível pra parecer que algo mudou sem aviso.
export const CHAVE_SOLO = 'st_v3_solo'

export const SOLO_PEDIDO = (() => {
  try {
    if (new URLSearchParams(window.location.search).get('solo') === '1') {
      sessionStorage.setItem(CHAVE_SOLO, '1')
      return true
    }
    return sessionStorage.getItem(CHAVE_SOLO) === '1'
  } catch { return false }
})()

// Modo de revisão local (`?preview`), que não tem usuário logado. Sem esta
// exceção ele seria tratado como cliente e cairia sempre em solo — e a prévia
// deixaria de servir pra revisar o painel completo, que é pra isso que ela
// existe. Preso a `import.meta.env.DEV`: não existe no site publicado.
const PREVIEW = (() => {
  try {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
  } catch { return false }
})()

// O modo final: cliente comum é SEMPRE solo, tenha pedido ou não. Sem isto,
// bastaria tirar `?solo=1` do endereço pra cair no painel em construção.
export function modoSolo(user) {
  // O convidado vê o painel, não uma tela solta: ele veio pra CONHECER a
  // ferramenta, e "Voltar ao painel" não faz sentido pra quem não tem painel.
  if (CONVIDADO) return false
  if (SOLO_PEDIDO) return true
  if (PREVIEW) return false
  return !ehInterno(user)
}

// ============================================================
// O CONVIDADO — quem chega sem conta, vindo da landing
// ============================================================
// Mesmo contrato de URL do painel atual (`?place_id=…&terms=…`), de propósito:
// os links que já existem no site continuam funcionando quando o V3 assumir,
// e não há um segundo formato pra manter.
//
// Ele NÃO tem conta, então nada aqui pode depender de token: negócio, nota,
// avaliações e posição saem de endpoints públicos, por `place_id`. O que exige
// conta (dispositivos, menus, configurações) simplesmente não aparece pra ele.
export const CONVIDADO = (() => {
  try {
    // SÓ VALE SEM SESSÃO. Sem esta linha, um cliente LOGADO que abrisse um link
    // antigo com `?place_id=` seria tratado como visitante e veria o negócio de
    // OUTRA pessoa no lugar do dele — foi o que aconteceu no primeiro teste em
    // produção. Quem tem conta vê o negócio da conta, sempre.
    if (localStorage.getItem('rz_token')) return null

    const p = new URLSearchParams(window.location.search)
    const placeId = p.get('place_id') || p.get('place') || null
    if (!placeId) return null
    const termos = (p.get('terms') || p.get('keyword') || '')
      .split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
    return { placeId, termos, keyword: p.get('keyword') || '', cep: p.get('cep') || '' }
  } catch { return null }
})()

// Endereço do cadastro, carregando o contexto pra conta já nascer ligada ao
// negócio que a pessoa acabou de ver — sem isso ela teria que buscar de novo,
// que é onde o funil perde gente.
// Áreas que não existem sem conta. Some da navegação em vez de aparecer
// bloqueada: mostrar cadeado pra quem nem conta tem é anunciar parede antes
// de mostrar porta.
export const AREAS_DE_CLIENTE = ['dispositivos', 'experiencia', 'config', 'resultados', 'clientes', 'campanhas', 'unidades']

export function urlCadastro() {
  const q = new URLSearchParams({ from: 'painel-convidado' })
  if (CONVIDADO?.placeId) q.set('place_id', CONVIDADO.placeId)
  if (CONVIDADO?.keyword) q.set('keyword', CONVIDADO.keyword)
  return '/ativar?' + q.toString()
}
