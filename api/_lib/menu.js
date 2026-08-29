// ============================================================
// StarTouch — O contrato do Menu Inteligente
// ============================================================
// Este arquivo É o contrato: o editor escreve por aqui, a página pública lê
// por aqui e a publicação valida por aqui. Um lugar só, porque validação
// duplicada é validação que um dia discorda de si mesma.
//
// Tudo aqui é FUNÇÃO PURA: sem banco, sem rede, sem efeito colateral.
//
// REGRAS QUE MORAM AQUI (decididas em 29/08/2026):
//
//  • O que depende de dado vivo guarda REFERÊNCIA, nunca valor resolvido.
//    `google` e `location` não guardam endereço nenhum — são montados na hora
//    a partir do cadastro do negócio. Se guardassem, o dia em que o lojista
//    corrigisse o cadastro deixaria botão morto em todo menu já publicado — e
//    nós NÃO podemos reescrever o publicado, porque ele é do lojista.
//
//  • Publicar RECUSA em vez de remover em silêncio. Publicar tirando os botões
//    quebrados cumpriria a regra ao pé da letra e criaria o pior erro possível:
//    o lojista vê cinco botões e o cliente encontra quatro. A válvula de escape
//    é o interruptor do botão — desligado não bloqueia, só não vai pro snapshot.
//
//  • `version` existe porque o publicado é eterno. Quando o formato mudar, a
//    página aprende a ler a versão antiga; nós nunca migramos o que o lojista
//    escreveu.
// ============================================================

export const VERSAO_ATUAL = 1;

export const LIMITES = {
  botoes: 12,          // teto técnico: o snapshot é lido no caminho quente
  recomendado: 6,      // acima disso o editor AVISA e publica assim mesmo
  label: 40,
  mensagem: 300,
  titulo: 60,
  subtitulo: 90,
  jsonBytes: 16 * 1024
};

// ── A biblioteca de ações ───────────────────────────────────
// `ref: true` = não guarda destino; é resolvido na hora a partir do negócio.
// `tela: true` = não redireciona; abre uma sub-tela dentro do menu.
// Os nomes são valores GRAVADOS PARA SEMPRE no publicado e em
// experience_events.action — por isso ficam em inglês e não mudam. `food_menu`
// e não `menu` porque `menu` colidiria com o `mode: "menu"` do próprio JSON, e
// ambiguidade em valor imutável custa caro.
export const TIPOS = {
  google:     { label: "Avaliar no Google", ref: true },
  whatsapp:   { label: "WhatsApp",          campos: ["telefone", "mensagem"] },
  instagram:  { label: "Instagram",         campos: ["url"] },
  food_menu:  { label: "Cardápio",          campos: ["url"] },
  phone:      { label: "Telefone",          campos: ["telefone"] },
  location:   { label: "Como chegar",       ref: true },
  website:    { label: "Site",              campos: ["url"] },
  contact:    { label: "Salvar contato",    campos: ["nome", "cargo", "telefone", "email"], tela: true },
  custom_url: { label: "Link personalizado", campos: ["url"] }
};

export const TIPOS_VALIDOS = Object.keys(TIPOS);

// ── Higiene de texto ────────────────────────────────────────
// Tudo o que entra aqui vai ser renderizado numa página pública. A página
// escapa na saída; isto tira o lixo na entrada. As duas coisas, não uma.
function limpo(v, max) {
  if (v == null) return "";
  return String(v)
    .replace(/[\u0000-\u001F\u007F]/g, "")   // caracteres de controle
    .trim()
    .slice(0, max);
}

const soDigitos = (v) => String(v == null ? "" : v).replace(/\D/g, "");

// URL: só http e https. Isto NÃO é preciosismo — um botão com `javascript:`
// vira execução de código na página pública, que é aberta por consumidores
// que não têm relação nenhuma conosco.
function normalizarUrl(v) {
  let s = limpo(v, 500);
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;   // sem esquema → https
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname || !u.hostname.includes(".")) return null;
  return u.toString();
}

// Instagram aceita @usuario ou URL inteira e sai sempre de um jeito só.
function normalizarInstagram(v) {
  const s = limpo(v, 200);
  if (!s) return null;
  const arroba = s.match(/^@?([A-Za-z0-9._]{1,30})$/);
  if (arroba) return `https://instagram.com/${arroba[1]}`;
  const u = normalizarUrl(s);
  if (!u) return null;
  try {
    const url = new URL(u);
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
    return u;
  } catch { return null; }
}

// ── Normalização de um botão ────────────────────────────────
// Devolve o botão limpo. NÃO julga se está válido — quem julga é validarBotao.
// Separados de propósito: o editor precisa guardar rascunho inválido, e só a
// publicação precisa do veredito.
export function normalizarBotao(bruto) {
  if (!bruto || typeof bruto !== "object") return null;
  const type = String(bruto.type || "");
  if (!TIPOS_VALIDOS.includes(type)) return null;

  const b = {
    id: /^b_[a-z0-9]{4,12}$/.test(String(bruto.id || "")) ? bruto.id : novoId(),
    type,
    label: limpo(bruto.label, LIMITES.label) || TIPOS[type].label,
    enabled: bruto.enabled !== false
  };

  const v = bruto.value || {};
  switch (type) {
    case "google":
    case "location":
      break;                                    // referência: não guarda nada
    case "whatsapp":
      b.value = {
        telefone: soDigitos(v.telefone).slice(0, 15),
        mensagem: limpo(v.mensagem, LIMITES.mensagem)
      };
      break;
    case "phone":
      b.value = { telefone: soDigitos(v.telefone).slice(0, 15) };
      break;
    case "instagram":
      b.value = { url: normalizarInstagram(v.url) || "" };
      break;
    case "food_menu":
    case "website":
    case "custom_url":
      b.value = { url: normalizarUrl(v.url) || "" };
      break;
    case "contact":
      b.value = {
        nome: limpo(v.nome, 80),
        cargo: limpo(v.cargo, 60),
        telefone: soDigitos(v.telefone).slice(0, 15),
        email: limpo(v.email, 120)
      };
      break;
  }
  return b;
}

export function novoId() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return "b_" + s;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ── Veredito de um botão ────────────────────────────────────
// Mensagem escrita pro lojista, não pro log: diz o que fazer, não o que falhou.
export function validarBotao(b) {
  if (!b || !TIPOS_VALIDOS.includes(b.type)) return { ok: false, msg: "Tipo de ação desconhecido." };
  const v = b.value || {};
  switch (b.type) {
    case "google":
    case "location":
      return { ok: true };
    case "whatsapp":
    case "phone":
      if (soDigitos(v.telefone).length < 10) {
        return { ok: false, campo: "telefone", msg: "Informe o telefone com DDD (ex: 11 99999-9999)." };
      }
      return { ok: true };
    case "instagram":
      if (!v.url) return { ok: false, campo: "url", msg: "Informe o @usuário ou o endereço do seu Instagram." };
      return { ok: true };
    case "food_menu":
    case "website":
    case "custom_url":
      if (!v.url) {
        return { ok: false, campo: "url", msg: "Informe um endereço completo, começando com https://" };
      }
      return { ok: true };
    case "contact":
      if (!v.nome) return { ok: false, campo: "nome", msg: "Informe o nome de quem será salvo no contato." };
      if (soDigitos(v.telefone).length < 10 && !EMAIL_RE.test(v.email)) {
        return { ok: false, campo: "telefone", msg: "Informe ao menos um telefone com DDD ou um e-mail." };
      }
      return { ok: true };
    default:
      return { ok: false, msg: "Tipo de ação desconhecido." };
  }
}

// ── A experiência inteira ───────────────────────────────────
export function normalizarExperiencia(bruto) {
  const d = bruto && typeof bruto === "object" ? bruto : {};
  const marca = d.brand && typeof d.brand === "object" ? d.brand : {};
  const botoes = Array.isArray(d.buttons) ? d.buttons : [];
  return {
    version: VERSAO_ATUAL,
    mode: "menu",
    brand: {
      titulo: limpo(marca.titulo, LIMITES.titulo),
      subtitulo: limpo(marca.subtitulo, LIMITES.subtitulo),
      // Referência, não URL: "use a imagem do Google". Se congelássemos o
      // endereço da foto, ele quebraria quando o Google trocasse o link — e o
      // publicado não pode ser reescrito por nós.
      logo: marca.logo === "google" ? "google" : null
    },
    buttons: botoes.map(normalizarBotao).filter(Boolean).slice(0, LIMITES.botoes)
  };
}

/**
 * Veredito da publicação.
 * @returns {{ podePublicar, erros:[{id,label,campo,msg}], avisos:[string], habilitados:number }}
 */
export function validarParaPublicar(exp) {
  const e = normalizarExperiencia(exp);
  const erros = [];
  const avisos = [];

  const ligados = e.buttons.filter((b) => b.enabled);

  for (const b of ligados) {
    const v = validarBotao(b);
    if (!v.ok) erros.push({ id: b.id, label: b.label, campo: v.campo || null, msg: v.msg });
  }

  if (!ligados.length) {
    erros.push({ id: null, label: null, campo: null, msg: "Ligue ao menos uma ação para publicar o menu." });
  }
  if (!e.brand.titulo) {
    erros.push({ id: null, label: null, campo: "titulo", msg: "Dê um título ao menu — é o que o cliente lê primeiro." });
  }

  // Avisos NUNCA bloqueiam. Informam e saem da frente.
  if (ligados.length > LIMITES.recomendado) {
    avisos.push(`Seu menu tem ${ligados.length} ações. Muitas opções dificultam a escolha do cliente — o ideal são até ${LIMITES.recomendado}.`);
  }
  if (!ligados.some((b) => b.type === "google")) {
    avisos.push("Este menu não inclui “Avaliar no Google”. Se este dispositivo também é usado para receber avaliações, considere adicionar essa opção. Você pode publicar assim mesmo.");
  }

  return { podePublicar: erros.length === 0, erros, avisos, habilitados: ligados.length };
}

/**
 * O snapshot publicado. Só entra o que está ligado E válido — é a regra "o
 * publicado não contém botão que sabemos que não vai funcionar". Como a
 * publicação recusa quando há ligado inválido, na prática este filtro nunca
 * descarta nada; ele existe como cinto de segurança para o dia em que alguém
 * chamar isto por outro caminho.
 */
export function montarPublicado(draft) {
  const e = normalizarExperiencia(draft);
  return {
    ...e,
    buttons: e.buttons.filter((b) => b.enabled && validarBotao(b).ok)
  };
}

export function tamanhoOk(json) {
  try { return Buffer.byteLength(JSON.stringify(json), "utf8") <= LIMITES.jsonBytes; }
  catch { return false; }
}

// Rascunho inicial de uma experiência nova. Nasce com o essencial ligado e o
// resto vazio — tela em branco trava mais gente do que excesso de opção.
export function rascunhoInicial({ nomeDoNegocio } = {}) {
  return {
    version: VERSAO_ATUAL,
    mode: "menu",
    brand: {
      titulo: limpo(nomeDoNegocio, LIMITES.titulo),
      subtitulo: "Como podemos ajudar?",
      logo: "google"
    },
    buttons: [
      { id: novoId(), type: "google", label: TIPOS.google.label, enabled: true }
    ]
  };
}
