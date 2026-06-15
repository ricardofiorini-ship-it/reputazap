// ============================================================
// StarTouch — IA Radar: perguntas, avaliação e score
// ============================================================
import { geminiEval, hasGemini } from "./engines.js";

// 1) Perguntas no estilo do consumidor real (6 por motor).
export function buildQuestions(categoria, cidade) {
  const c = (categoria || "").trim();
  const cid = (cidade || "").trim();
  return [
    `Qual a melhor ${c} em ${cid}?`,
    `Onde encontrar ${c} bem avaliada em ${cid}?`,
    `Me indica ${c} de confiança em ${cid}.`,
    `${c} em ${cid} com boas avaliações no Google?`,
    `Quais as ${c}s mais recomendadas perto de ${cid}?`,
    `Estou em ${cid} e preciso de ${c}. O que você sugere?`,
  ];
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
function excerpt(s, max = 480) {
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
export function consolidateCompetitors(listas) {
  const counts = new Map(); // key minúsculo -> { name, n }
  for (const lista of listas) {
    for (const raw of lista || []) {
      const key = raw.trim().toLowerCase();
      if (!key) continue;
      if (counts.has(key)) counts.get(key).n += 1;
      else counts.set(key, { name: raw.trim(), n: 1 });
    }
  }
  return [...counts.values()]
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
    txt += ` Os nomes que mais apareceram no seu lugar: ${concorrentes.join(", ")}.`;
  }
  return txt;
}
