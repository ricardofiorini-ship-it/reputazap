// ============================================================
// StarTouch — SESSÃO QUE NÃO CAI
// ============================================================
// Nasceu em 11/09/2026, de um número: 59 das 114 contas entraram UMA vez,
// no dia do cadastro. O painel não renovava a sessão — o token do Supabase
// vence em 1 hora e o cliente era jogado pra fora. Na prática ele digitava
// e-mail e senha toda vez que queria olhar o painel, e quem compra um cartão
// no Mercado Livre pra deixar no balcão não faz isso duas vezes.
//
// MORA NUM ARQUIVO SÓ de propósito. O `/app` e o V3 são duas telas com a mesma
// conta e o mesmo localStorage; regra de sessão aplicada em uma e esquecida na
// outra é o erro que já se repetiu três vezes neste projeto.
//
// COMO FUNCIONA: o login guarda o par (token de acesso + token de renovação) e
// a hora em que o primeiro vence. Antes de cada chamada, se faltar menos de um
// minuto pro vencimento, troca por um novo. O Supabase ROTACIONA o token de
// renovação a cada uso — o que fica guardado vale uma renovação só.
//
// SESSÃO ANTIGA CONTINUA FUNCIONANDO COMO ANTES: quem já está logado hoje não
// tem token de renovação guardado. Nesse caso nada acontece de novo — vence e
// cai na tela de login, igual a ontem. Na próxima entrada ele ganha o par.

const K_TOKEN   = 'rz_token';
const K_REFRESH = 'rz_refresh';
const K_EXP     = 'rz_token_exp';   // segundos epoch, como o Supabase manda

// Margem pra renovar ANTES de vencer. Sem ela, uma chamada iniciada com o
// token no último segundo chegaria no servidor já vencida.
const MARGEM_S = 60;

function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
function gravar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }

// Guarda o que o /api/login e o /api/register devolvem. Ponto único de
// escrita: se um dia o formato mudar, muda aqui.
export function salvarSessao(data) {
  if (!data) return;
  if (data.token) gravar(K_TOKEN, data.token);
  if (data.refresh_token) gravar(K_REFRESH, data.refresh_token);
  if (data.expires_at) gravar(K_EXP, String(data.expires_at));
}

export function limparSessao() {
  gravar(K_TOKEN, null); gravar(K_REFRESH, null); gravar(K_EXP, null);
}

function venceEm() {
  const exp = parseInt(ler(K_EXP) || '0', 10);
  return Number.isFinite(exp) && exp > 0 ? exp : null;
}

// Uma renovação por vez. Sem esta trava, o painel — que dispara várias
// chamadas juntas ao abrir — pediria N renovações simultâneas com o MESMO
// token de renovação; como ele é rotativo, a primeira venceria e as outras
// receberiam "token inválido" e derrubariam a sessão. O bug seria intermitente
// e só apareceria em quem tem muitos dispositivos, que é o cliente melhor.
let renovando = null;

async function renovar() {
  const refresh = ler(K_REFRESH);
  if (!refresh) return null;
  if (renovando) return renovando;

  renovando = (async () => {
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', refresh_token: refresh })
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.token) {
        // Renovação recusada = fim de sessão. Apaga o par pra não ficar
        // tentando de novo em toda chamada — e pra a tela de login aparecer
        // em vez de um erro sem explicação.
        limparSessao();
        return null;
      }
      salvarSessao(d);
      return d.token;
    } catch {
      // Falha de REDE não é sessão inválida: não apaga nada, só não renova
      // agora. Apagar aqui deslogaria quem só passou por um túnel.
      return null;
    } finally {
      renovando = null;
    }
  })();

  return renovando;
}

// O token que deve ir na chamada de agora. Renova sozinho se estiver na hora.
export async function tokenValido() {
  const token = ler(K_TOKEN);
  if (!token) return null;
  const exp = venceEm();
  // Sessão antiga (sem validade guardada): usa como está. Se estiver vencida,
  // o 401 da chamada resolve pelo caminho de baixo.
  if (exp == null) return token;
  if (exp - MARGEM_S > Math.floor(Date.now() / 1000)) return token;
  return (await renovar()) || token;
}

// Segunda rede de proteção: o relógio do aparelho pode estar errado e o
// servidor pode invalidar antes da hora. Quem levou 401 tenta renovar UMA vez
// e repete a chamada. Uma só — repetir em laço transformaria sessão morta em
// martelada no servidor.
export async function apos401() {
  return await renovar();
}

export function temSessao() { return !!ler(K_TOKEN); }
