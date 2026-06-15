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
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

const sameName = (a, b) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

// 2) Avalia as respostas de UM motor: o negócio foi citado? quais concorrentes?
// Usa Gemini (barato), pede JSON puro. Parse defensivo.
// total é determinístico (nº de respostas), não confiamos na contagem do modelo.
export async function evaluateEngine({ nome, categoria, cidade, respostas }) {
  const total = respostas.length;
  if (total === 0) return { mencoes: 0, total: 0, concorrentes: [] };

  // Heurística de base: conta respostas onde o nome aparece textualmente.
  // Serve de fallback se o Gemini não estiver disponível ou o parse falhar.
  const heuristicaMencoes = respostas.filter((r) =>
    (r.resposta || "").toLowerCase().includes((nome || "").toLowerCase())
  ).length;

  if (!hasGemini()) {
    return { mencoes: heuristicaMencoes, total, concorrentes: [] };
  }

  const bloco = respostas
    .map((r, i) => `--- Resposta ${i + 1} (pergunta: ${r.pergunta}) ---\n${r.resposta}`)
    .join("\n\n");

  const prompt = `Analise as respostas abaixo. Negócio em foco: "${nome}" (${categoria} em ${cidade}).
Para CADA resposta, diga se "${nome}" foi mencionado (mesmo com pequena variação de grafia) e liste os nomes de concorrentes (outros negócios da mesma categoria) citados.
Responda SOMENTE em JSON, sem markdown, no formato exato:
{"mencoes": <numero de respostas em que "${nome}" aparece>, "concorrentes": ["nome1","nome2"]}

Respostas:
${bloco}`;

  let parsed = null;
  try {
    parsed = parseJsonLoose(await geminiEval(prompt));
  } catch (err) {
    console.warn("[radar] falha na avaliação Gemini:", err.message);
  }

  if (!parsed) return { mencoes: heuristicaMencoes, total, concorrentes: [] };

  const mencoes = Math.max(0, Math.min(total, parseInt(parsed.mencoes, 10) || 0));
  const concorrentes = Array.isArray(parsed.concorrentes)
    ? parsed.concorrentes
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter((x) => x && !sameName(x, nome))
    : [];
  return { mencoes, total, concorrentes };
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
