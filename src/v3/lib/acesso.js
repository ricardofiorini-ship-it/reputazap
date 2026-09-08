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
  if (SOLO_PEDIDO) return true
  if (PREVIEW) return false
  return !ehInterno(user)
}
