// ============================================================
// StarTouch V3 — camada única de chamada de API
// ============================================================
// O V3 NÃO tem backend próprio. Ele consome exatamente os mesmos endpoints
// que o painel atual usa — é assim que o reaproveitamento acontece sem
// duplicar 6.664 linhas de tela.
//
// Regra de custo, herdada do painel atual: nada aqui pode disparar medição
// paga no Google a cada abertura. O único endpoint que toca o Places é a
// grade (`/api/diagnostico?grid=1`) e ela tem cache de 7 dias por termo —
// abrir o painel é acerto de cache, não medição nova. Foi essa distinção
// que custou R$452 em julho quando se perdeu de vista.
// ============================================================

export function token() {
  try { return localStorage.getItem('rz_token') } catch { return null }
}

export function currentUser() {
  try {
    const raw = localStorage.getItem('rz_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function logout() {
  try {
    localStorage.removeItem('rz_token')
    localStorage.removeItem('rz_user')
  } catch {}
  window.location.href = '/app'
}

function authHeader() {
  const t = token()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// Erro carrega o status HTTP: a tela precisa distinguir "token venceu" (401,
// manda relogar) de "deu ruim" (500, mostra e deixa tentar de novo). Sem o
// status, todo erro vira a mesma mensagem inútil.
export class ApiError extends Error {
  // Carrega o CORPO da resposta, não só a mensagem: quando a publicação recusa,
  // o servidor manda junto a lista do que corrigir. Perder isso obrigaria a
  // tela a adivinhar o motivo — ou a ter regra própria, que é o que a gente
  // não quer.
  constructor(message, status, corpo) {
    super(message); this.status = status; this.corpo = corpo || null
    this.validacao = corpo?.validacao || null
  }
}

export async function get(path, { auth = false } = {}) {
  const r = await fetch(path, { headers: auth ? authHeader() : {} })
  let body = null
  try { body = await r.json() } catch {}
  if (!r.ok || body?.error) {
    throw new ApiError(body?.error || `Falha ao carregar (${r.status})`, r.status, body)
  }
  return body || {}
}

// Chamada que PODE falhar sem derrubar a tela. Devolve null em vez de estourar.
// Usado onde o dado é complementar: se a grade não responde, o painel continua
// de pé com nota, avaliações e dispositivos — o contrário (tela em branco por
// causa de um número) seria pior que a ausência do número.
export async function tryGet(path, opts) {
  try { return await get(path, opts) } catch { return null }
}

export async function post(path, data, { auth = true } = {}) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? authHeader() : {}) },
    body: JSON.stringify(data || {})
  })
  let body = null
  try { body = await r.json() } catch {}
  if (!r.ok || body?.error) {
    throw new ApiError(body?.error || `Falha ao salvar (${r.status})`, r.status, body)
  }
  return body || {}
}

// ── Endpoints ───────────────────────────────────────────────
export const api = {
  meuNegocio:   ()          => get('/api/mybiz?_t=' + Date.now(), { auth: true }),
  avaliacoes:   (placeId)   => tryGet(`/api/reviews?place_id=${encodeURIComponent(placeId)}`),
  dadosDoLocal: (placeId)   => tryGet(`/api/bizinfo?place_id=${encodeURIComponent(placeId)}`),
  dispositivos: ()          => tryGet('/api/plates?action=my-plates', { auth: true }),
  toques:       (dias)      => tryGet(`/api/plates?action=taps-history&days=${dias}`, { auth: true }),
  renomear:     (id, nome)  => post('/api/plates?action=rename-plate', { plate_id: id, channel_name: nome }),

  // A grade é a fonte única de posição desde 03/08. Sem `terms`, o backend
  // resolve sozinho: primeiro a busca que o dono salvou (`category_override`),
  // depois a categoria oficial do Google. Mesma chamada do painel atual.
  posicao: (placeId) => tryGet(`/api/diagnostico?grid=1&place_id=${encodeURIComponent(placeId)}`, { auth: true }),

  // ── Experiências (Menu Inteligente) ──
  // O veredito de validação SEMPRE vem do servidor: `save-draft` e `publish`
  // devolvem `validacao`. O editor não tem regra própria — se tivesse, um dia
  // ela discordaria da que decide na hora de publicar.
  experiencias: {
    listar:    ()               => get('/api/experiences?action=list', { auth: true }),
    criar:     (name)           => post('/api/experiences?action=create', { name }),
    salvar:    (id, draft)      => post('/api/experiences?action=save-draft', { id, draft }),
    publicar:  (id)             => post('/api/experiences?action=publish', { id }),
    descartar: (id)             => post('/api/experiences?action=discard', { id }),
    arquivar:  (id, undo)       => post('/api/experiences?action=archive', { id, undo: !!undo }),
    renomear:  (id, name)       => post('/api/experiences?action=rename', { id, name }),
    dispositivo: (payload)      => post('/api/experiences?action=set-device', payload)
  }
}
