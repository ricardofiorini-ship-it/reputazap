// ============================================================
// StarTouch — Auditoria: camada Site (fetch + parse)
// ============================================================
// Baixa a home, o /robots.txt e o /llms.txt do site do negócio e transforma o
// que encontra em itens de checklist (Bloco B "site" + "conteúdo").
//
// REGRA DE OURO: só reportamos o que dá pra verificar de fato. Se o site não
// abre (DNS, timeout, bloqueio), os itens que dependem do HTML viram `na`
// ("não deu pra ler o site") — nunca ✗ chutado. robots.txt e llms.txt são
// buscados à parte: um 404 neles é resposta legítima (não é falha de leitura).
// ============================================================
import { fetchWithTimeout } from "../fetch-timeout.js";

const UA =
  "Mozilla/5.0 (compatible; StarTouchAudit/1.0; +https://startouch.com.br)";

const item = (id, label, status, detail) => ({ id, label, status, detail });

// Normaliza a URL informada → { origin, href } ou null se não for utilizável.
// Aceita "loja.com.br" (sem protocolo) e descarta o que claramente não é http.
export function normalizeSiteUrl(raw) {
  let s = (raw || "").toString().trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null; // "localhost", lixo, etc.
    return { origin: u.origin, href: u.href };
  } catch {
    return null;
  }
}

// Baixa uma URL como texto. Devolve { ok, status, text, contentType, finalUrl }
// — nunca lança (auditoria é best-effort: erro de rede vira ok:false).
// finalUrl importa: sites SPA/CDN respondem /llms.txt e /robots.txt com um
// 301 pra home (200 + HTML) — um "soft 404" que fingiria que o arquivo existe.
async function getText(url, timeoutMs = 7000) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": UA, Accept: "text/html,text/plain,*/*" },
      redirect: "follow",
    }, timeoutMs);
    const text = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      text,
      contentType: (res.headers.get("content-type") || "").toLowerCase(),
      finalUrl: res.url || url,
    };
  } catch (err) {
    return { ok: false, status: 0, text: "", contentType: "", finalUrl: url, error: err.message };
  }
}

// Um arquivo "de texto" (robots.txt / llms.txt) só vale se de fato veio como
// texto — não o HTML da home entregue por um catch-all/redirect (soft 404).
function looksLikeHtml(resp) {
  if ((resp.contentType || "").includes("text/html")) return true;
  const head = (resp.text || "").slice(0, 200).toLowerCase();
  return head.includes("<!doctype") || head.includes("<html") || head.includes("<head");
}
// O arquivo esperado ainda é o que respondeu? (o redirect não nos jogou na home)
function servedPath(resp, expectedSuffix) {
  try {
    return new URL(resp.finalUrl).pathname.toLowerCase().endsWith(expectedSuffix);
  } catch {
    return false;
  }
}
// Um recurso de texto é "real" se veio 200, não é HTML e não foi redirecionado
// pra fora do caminho pedido.
function isRealTextFile(resp, expectedSuffix) {
  return resp.ok && !looksLikeHtml(resp) && servedPath(resp, expectedSuffix);
}

// Só o texto visível, minúsculo e sem acento — pra casar nome/telefone de forma
// tolerante (o site pode escrever "São" ou "Sao", com ou sem HTML no meio).
function visibleText(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Extrai os blocos JSON-LD (<script type="application/ld+json">) e devolve os
// @type encontrados (achatando @graph e arrays), tudo minúsculo.
function extractJsonLdTypes(html) {
  const types = new Set();
  let hasAny = false;
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    hasAny = true;
    let parsed;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    const nodes = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node === "object") {
        nodes.push(node);
        if (node["@graph"]) walk(node["@graph"]);
      }
    };
    walk(parsed);
    for (const n of nodes) {
      const t = n["@type"];
      if (Array.isArray(t)) t.forEach((x) => types.add(String(x).toLowerCase()));
      else if (t) types.add(String(t).toLowerCase());
    }
  }
  return { hasAny, types };
}

// A família LocalBusiness inclui subtipos (Restaurant, Store, Dentist, etc.).
// Como não dá pra enumerar todos, aceitamos LocalBusiness explícito OU os
// subtipos mais comuns de negócio local brasileiro.
const LOCALBIZ_TYPES = new Set([
  "localbusiness", "restaurant", "store", "foodestablishment", "bakery",
  "barorpub", "cafeorcoffeeshop", "beautysalon", "healthandbeautybusiness",
  "medicalbusiness", "dentist", "physician", "hairsalon", "daySpa",
  "automotivebusiness", "professionalservice", "homeandconstructionbusiness",
  "clothingstore", "hardwarestore", "petstore", "pharmacy", "gym",
]);
const hasLocalBusiness = (types) => [...types].some((t) => LOCALBIZ_TYPES.has(t));

// robots.txt → GPTBot / Google-Extended estão liberados? Lê os grupos de
// User-agent e marca bloqueado quem tiver "Disallow: /" (ou "Disallow: /"
// abrangente). Ausência de robots (404) = tudo liberado.
const AI_BOTS = ["gptbot", "google-extended", "ccbot", "anthropic-ai", "perplexitybot"];
function robotsBlocks(robotsTxt) {
  const blocked = [];
  const lines = (robotsTxt || "").split(/\r?\n/).map((l) => l.trim());
  // Agrupa por User-agent → lista de Disallow.
  let current = [];
  const groups = new Map(); // agent(lower) -> disallows[]
  for (const line of lines) {
    if (/^#/.test(line) || !line) continue;
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    const dis = line.match(/^disallow:\s*(.*)$/i);
    if (ua) {
      const name = ua[1].trim().toLowerCase();
      if (!groups.has(name)) groups.set(name, []);
      current = groups.get(name);
    } else if (dis && current) {
      current.push(dis[1].trim());
    }
  }
  for (const bot of AI_BOTS) {
    const rules = groups.get(bot);
    if (rules && rules.some((r) => r === "/" )) blocked.push(bot);
  }
  return blocked;
}

// Detecta FAQ: schema FAQPage OU sinais de texto ("perguntas frequentes",
// "dúvidas frequentes", "FAQ"). Texto já vem normalizado (sem acento).
function detectFaq(jsonldTypes, text) {
  if (jsonldTypes.has("faqpage") || jsonldTypes.has("qapage")) return true;
  return /perguntas frequentes|duvidas frequentes|\bfaq\b/.test(text);
}

// Só os dígitos de um telefone (pra casar formatações diferentes).
const digits = (s) => (s || "").replace(/\D/g, "");

/**
 * Roda a auditoria da camada site.
 * @param {string} siteUrlRaw  URL do site (do param ou do campo website do Google)
 * @param {object} ctx         { name, phone } vindos do Google, pra checar NAP/consistência
 * @returns { detected, url, site_items, content_items }  (grupos já separados)
 */
export async function auditSite(siteUrlRaw, ctx = {}) {
  const norm = normalizeSiteUrl(siteUrlRaw);
  if (!norm) {
    return { detected: false, url: null, site_items: [], content_items: [] };
  }

  // Busca home, robots e llms em paralelo (best-effort, cada um com seu timeout).
  const [home, robots, llms] = await Promise.all([
    getText(norm.href, 7000),
    getText(norm.origin + "/robots.txt", 5000),
    getText(norm.origin + "/llms.txt", 5000),
  ]);

  const site_items = [];
  const content_items = [];

  // ---- Itens que dependem do HTML da home ----
  if (home.ok && home.text) {
    const html = home.text;
    const text = visibleText(html);
    const { hasAny, types } = extractJsonLdTypes(html);

    // Dados estruturados (schema LocalBusiness).
    if (hasLocalBusiness(types)) {
      site_items.push(item("structured_data", "Dados estruturados (schema) no site", "pass",
        "O site tem schema de negócio local — as IAs leem nome, endereço e categoria."));
    } else if (hasAny) {
      site_items.push(item("structured_data", "Dados estruturados (schema) no site", "fail",
        "Há dados estruturados, mas sem schema de negócio local (LocalBusiness)."));
    } else {
      site_items.push(item("structured_data", "Dados estruturados (schema) no site", "fail",
        "Nenhum dado estruturado — as IAs leem o site como texto solto."));
    }

    // NAP em texto: nome e/ou telefone aparecem no texto (não em imagem).
    const nameNorm = (ctx.name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const nameInText = nameNorm.length >= 3 && text.includes(nameNorm);
    const phoneDigits = digits(ctx.phone);
    const phoneInText = phoneDigits.length >= 8 && digits(html).includes(phoneDigits);
    if (nameInText || phoneInText) {
      const found = [nameInText && "nome", phoneInText && "telefone"].filter(Boolean).join(" e ");
      site_items.push(item("nap_text", "Nome/telefone em texto no site", "pass",
        `O site traz ${found} em texto (legível pelos robôs).`));
    } else {
      site_items.push(item("nap_text", "Nome/telefone em texto no site", "fail",
        "Nome e telefone não aparecem no texto que os robôs leem (podem estar em imagem ou só via JavaScript)."));
    }

    // FAQ (schema ou seção de perguntas).
    content_items.push(
      detectFaq(types, text)
        ? item("faq", "Página de perguntas e respostas (FAQ)", "pass",
            "O site tem seção de perguntas frequentes — formato que as IAs citam.")
        : item("faq", "Página de perguntas e respostas (FAQ)", "fail",
            "Sem seção de perguntas e respostas — as IAs gostam desse formato.")
    );

    // Consistência Google ↔ site: o telefone do Google aparece no site?
    // Só afirmamos o POSITIVO (bate = pass). Não achar não prova divergência —
    // pode estar carregado por JS —, então vira `na`, nunca ✗ chutado.
    if (phoneDigits.length >= 8) {
      content_items.push(
        phoneInText
          ? item("consistency", "Dados do Google batem com o site", "pass",
              "O telefone do Google também aparece no site.")
          : item("consistency", "Dados do Google batem com o site", "na",
              "Não deu pra confirmar o telefone do Google no texto do site.")
      );
    } else {
      content_items.push(item("consistency", "Dados do Google batem com o site", "na",
        "Sem telefone no Google para comparar com o site."));
    }
  } else {
    // Home não abriu: os itens de HTML viram `na` (nunca ✗ chutado).
    const why = "Não foi possível ler o site agora.";
    site_items.push(item("structured_data", "Dados estruturados (schema) no site", "na", why));
    site_items.push(item("nap_text", "Nome/telefone em texto no site", "na", why));
    content_items.push(item("faq", "Página de perguntas e respostas (FAQ)", "na", why));
    content_items.push(item("consistency", "Dados do Google batem com o site", "na", why));
  }

  // ---- robots.txt: robôs de IA liberados ----
  // Só tratamos como robots.txt real se veio texto de verdade (não a home via
  // soft 404). robots.txt ausente/soft-404 = nada bloqueado (acesso livre).
  if (isRealTextFile(robots, "/robots.txt")) {
    const blocked = robotsBlocks(robots.text);
    site_items.push(
      blocked.length === 0
        ? item("ai_bots", "Robôs de IA liberados no robots.txt", "pass",
            "O robots.txt não bloqueia os robôs das IAs.")
        : item("ai_bots", "Robôs de IA liberados no robots.txt", "fail",
            `O robots.txt bloqueia: ${blocked.join(", ")}. As IAs não conseguem ler o site.`)
    );
  } else if (robots.status === 404 || robots.ok) {
    // 404 explícito OU 200 que na verdade é a home (sem robots.txt de fato).
    site_items.push(item("ai_bots", "Robôs de IA liberados no robots.txt", "pass",
      "Sem robots.txt bloqueando — os robôs das IAs têm acesso livre."));
  } else {
    site_items.push(item("ai_bots", "Robôs de IA liberados no robots.txt", "na",
      "Não foi possível ler o robots.txt agora."));
  }

  // ---- llms.txt presente ----
  // Precisa ser um arquivo de texto real no caminho /llms.txt — não a home
  // entregue por redirect/catch-all (o soft 404 que mentiria "existe").
  if (isRealTextFile(llms, "/llms.txt") && (llms.text || "").trim().length > 0) {
    site_items.push(item("llms_txt", "Arquivo llms.txt presente", "pass",
      "O site tem llms.txt — o mapa que orienta as IAs sobre o negócio."));
  } else if (llms.status === 404 || llms.ok) {
    // 404 explícito OU 200-que-é-a-home: em ambos, não há llms.txt de verdade.
    site_items.push(item("llms_txt", "Arquivo llms.txt presente", "fail",
      "Sem llms.txt — falta o guia que orienta as IAs sobre o negócio."));
  } else {
    site_items.push(item("llms_txt", "Arquivo llms.txt presente", "na",
      "Não foi possível verificar o llms.txt agora."));
  }

  return { detected: true, url: norm.href, site_items, content_items };
}
