// ============================================================
// StarTouch — IA Radar: perguntas, avaliação e score
// ============================================================
import { geminiEval, hasGemini } from "./engines.js";

// 1) Perguntas no estilo do consumidor real (6 por motor).
// Se o bairro for conhecido (via CEP), a maioria das perguntas mira no BAIRRO
// — buscas locais reais são por bairro ("pizza na Aclimação"), não por cidade.
export function buildQuestions(categoria, cidade, bairro, produtos) {
  const c = (categoria || "").trim();
  const cid = (cidade || "").trim();
  const b = (bairro || "").trim();
  const local = b ? `${b}, ${cid}` : cid;

  // "em" e não "na/no": o gênero do bairro é imprevisível. Saía "na Alto da
  // Lapa" na cara do cliente. "em" funciona pra Alto da Lapa, Lapa, Itaim,
  // Pinheiros — e o cliente lê a pergunta que fizemos.
  const perguntas = b
    ? [
        `Qual a melhor ${c} em ${b}, em ${cid}?`,
        `Onde tem uma boa ${c} em ${b}?`,
        `Me indica ${c} de confiança perto de ${b}, ${cid}.`,
        `Estou em ${b} (${cid}) e quero ${c}. O que você sugere?`,
        `${c} bem avaliada em ${cid}?`,
        `Quais as ${c}s mais recomendadas em ${cid}?`,
      ]
    : [
        `Qual a melhor ${c} em ${cid}?`,
        `Onde encontrar ${c} bem avaliada em ${cid}?`,
        `Me indica ${c} de confiança em ${cid}.`,
        `${c} em ${cid} com boas avaliações no Google?`,
        `Quais as ${c}s mais recomendadas perto de ${cid}?`,
        `Estou em ${cid} e preciso de ${c}. O que você sugere?`,
      ];

  // Perguntas de NICHO (produtos/serviços específicos) — opcionais.
  // Capturam onde o negócio realmente pode aparecer (ex: "design de sobrancelha").
  const lista = Array.isArray(produtos) ? produtos : [];
  const tpl = [
    (p) => `Onde encontrar ${p} em ${local}?`,
    (p) => `Qual o melhor lugar pra ${p} em ${local}?`,
    (p) => `Me indica ${p} de confiança em ${local}.`,
  ];
  lista.slice(0, 3).forEach((p, i) => {
    const prod = (p || "").trim();
    if (prod) perguntas.push(tpl[i % tpl.length](prod));
  });

  return perguntas;
}

// Remove cercas de markdown e tenta achar o objeto JSON na string.
function parseJsonLoose(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(t); } catch { /* tenta extrair abaixo */ }
  // Extrai array [...] ou objeto {...} de dentro de texto solto.
  const a1 = t.indexOf("["), a2 = t.lastIndexOf("]");
  if (a1 !== -1 && a2 > a1) { try { return JSON.parse(t.slice(a1, a2 + 1)); } catch { /* */ } }
  const o1 = t.indexOf("{"), o2 = t.lastIndexOf("}");
  if (o1 !== -1 && o2 > o1) { try { return JSON.parse(t.slice(o1, o2 + 1)); } catch { /* */ } }
  return null;
}

// Encurta um texto pra caber no payload (transparência sem peso).
// 800 (era 480): a resposta da IA é o argumento do laudo, e cortar em 480
// truncava no meio do segundo concorrente. O texto é guardado em `detalhe` no
// banco e trafega no payload do /radar/plano — 800 ainda é barato.
function excerpt(s, max = 800) {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

const sameName = (a, b) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

// Limpa uma lista de concorrentes (strings), removendo vazios e o próprio nome.
function cleanCompetitors(arr, nome) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x && !sameName(x, nome));
}

// 2) Avalia as respostas de UM motor, PERGUNTA A PERGUNTA: o negócio foi citado?
// quais concorrentes? Usa Gemini (barato) numa única chamada que devolve um array.
// Retorna { mencoes, total, concorrentes, itens } — itens tem o detalhe por
// pergunta (pergunta, mencionado, concorrentes, resposta resumida) p/ transparência.
export async function evaluateEngine({ nome, categoria, cidade, respostas }) {
  const total = respostas.length;
  if (total === 0) return { mencoes: 0, total: 0, concorrentes: [], itens: [] };

  // Base com heurística textual — usada como fallback (sem Gemini ou parse falho).
  const baseItens = respostas.map((r) => ({
    pergunta: r.pergunta,
    resposta: excerpt(r.resposta),
    mencionado: (r.resposta || "").toLowerCase().includes((nome || "").toLowerCase()),
    concorrentes: [],
  }));
  const fallback = () => {
    const mencoes = baseItens.filter((i) => i.mencionado).length;
    return { mencoes, total, concorrentes: [], itens: baseItens };
  };

  if (!hasGemini()) return fallback();

  const bloco = respostas
    .map((r, i) => `[${i}] Pergunta: ${r.pergunta}\nResposta: ${r.resposta}`)
    .join("\n\n");

  const prompt = `Analise as respostas abaixo. Negócio em foco: "${nome}" (${categoria} em ${cidade}).
Para CADA item, diga se "${nome}" foi mencionado (mesmo com pequena variação de grafia) e liste os concorrentes (outros negócios da mesma categoria) citados naquela resposta.
Responda SOMENTE em JSON (sem markdown): um array com um objeto por item, na MESMA ordem, no formato exato:
[{"i":0,"mencionado":true,"concorrentes":["nome1"]}, {"i":1,"mencionado":false,"concorrentes":[]}]

Itens:
${bloco}`;

  let parsed = null;
  try {
    parsed = parseJsonLoose(await geminiEval(prompt));
  } catch (err) {
    console.warn("[radar] falha na avaliação Gemini:", err.message);
  }

  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.itens) ? parsed.itens : null;
  if (!arr) return fallback();

  const itens = baseItens.map((it, idx) => {
    const e = arr.find((x) => Number(x?.i) === idx) || arr[idx] || {};
    return {
      pergunta: it.pergunta,
      resposta: it.resposta,
      mencionado: typeof e.mencionado === "boolean" ? e.mencionado : it.mencionado,
      concorrentes: cleanCompetitors(e.concorrentes, nome),
    };
  });

  const mencoes = itens.filter((i) => i.mencionado).length;
  const concorrentes = consolidateCompetitors(itens.map((i) => i.concorrentes));
  return { mencoes, total, concorrentes, itens };
}

// 3) Consolida concorrentes: dedup (case-insensitive), top 5 por frequência.
// A IA nomeia o mesmo concorrente de jeitos diferentes em respostas diferentes:
// "Dona Deôla" numa, "Dona Deôla - Alto da Lapa" noutra. Contados separadamente,
// ambos apareciam na lista do dono como se fossem dois negócios — e a frequência
// de cada um ficava pela metade.
// Regra: normaliza (minúsculo, sem acento) e funde quando um nome é PREFIXO do
// outro seguido de separador (espaço, hífen, vírgula). Conservador de propósito:
// "Padaria Dara" e "Padaria Dara Centro" fundem; "Padaria Dara" e "Padaria
// Daniela" não (o prefixo não termina em fronteira de palavra).
const normCompetitor = (s) =>
  (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function mesmoNegocio(a, b) {
  if (a === b) return true;
  const [curto, longo] = a.length <= b.length ? [a, b] : [b, a];
  if (!longo.startsWith(curto)) return false;
  return /^[\s\-–—,:|]/.test(longo.slice(curto.length));
}

export function consolidateCompetitors(listas) {
  const grupos = []; // { key, name, n }  — `name` é a grafia mais curta (a canônica)
  for (const lista of listas) {
    for (const raw of lista || []) {
      const nome = (raw || "").trim();
      const key = normCompetitor(nome);
      if (!key) continue;
      const g = grupos.find((x) => mesmoNegocio(x.key, key));
      if (g) {
        g.n += 1;
        if (nome.length < g.name.length) { g.name = nome; g.key = key; } // canônica = mais curta
      } else {
        grupos.push({ key, name: nome, n: 1 });
      }
    }
  }
  return grupos
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => x.name);
}

// 4) Score = % de buscas em que o negócio apareceu.
export function computeScore(mencoes, total) {
  if (!total) return 0;
  return Math.round((mencoes / total) * 100);
}

// 5) Diagnóstico em texto (determinístico, transparente — rotula como taxa de menção).
export function buildDiagnostico({ nome, score, mencoes, total, concorrentes, motoresAtivos }) {
  const motoresTxt =
    motoresAtivos.length === 1
      ? "1 motor de IA"
      : `${motoresAtivos.length} motores de IA`;
  let txt = `${nome} apareceu em ${mencoes} de ${total} buscas feitas em ${motoresTxt} com busca na web (taxa de menção de ${score}%).`;
  if (mencoes === 0) {
    txt += " Hoje as IAs não estão recomendando seu negócio para clientes que procuram pela sua categoria na sua região.";
  } else if (score < 50) {
    txt += " Há espaço claro pra crescer: na maioria das buscas, quem aparece é o concorrente.";
  } else {
    txt += " Boa presença, mas dá pra consolidar a liderança e aparecer em mais respostas.";
  }
  if (concorrentes.length) {
    txt += ` Os nomes que as IAs mais citaram na sua categoria: ${concorrentes.join(", ")}.`;
  }
  return txt;
}
