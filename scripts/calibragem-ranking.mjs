// ============================================================
// TESTE DE CALIBRAGEM DO RANKING — quanto o nosso número erra?
// ============================================================
// Pergunta que este script responde, com número em vez de opinião:
//
//   "A posição que o StarTouch mostra bate com o que o cliente vê
//    de verdade no Google Maps?"
//
// Compara, nos MESMOS 5 pontos e com o MESMO termo:
//   CAMINHO A (hoje)  — Places API, via o motor de produção de verdade
//                       (importa fetchGridRanking; nada é reimplementado
//                       aqui, senão o teste mediria o meu código e não o
//                       que está no ar)
//   CAMINHO B (real)  — resultado do Google Maps naquela coordenada,
//                       que é o que aparece na tela do cliente
//
// NÃO TOCA EM NADA QUE ESTÁ NO AR: não escreve no banco, não usa o cache
// de produção (fetchGridRanking é a versão sem cache) e não altera
// nenhuma rota. Só lê e grava arquivos JSON aqui na pasta.
//
// Uso:
//   node --env-file=.env scripts/calibragem-ranking.mjs amostra
//   node --env-file=.env scripts/calibragem-ranking.mjs medir-a --confirmar
//   node --env-file=.env scripts/calibragem-ranking.mjs medir-b --confirmar
//   node --env-file=.env scripts/calibragem-ranking.mjs comparar
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fetchGridRanking, GRID_SPACING_M } from "../api/_lib/competitors.js";

const OUT = path.join(process.cwd(), "scripts", "calibragem-dados");
fs.mkdirSync(OUT, { recursive: true });
const arq = (n) => path.join(OUT, n);
const ler = (n) => JSON.parse(fs.readFileSync(arq(n), "utf8"));
const gravar = (n, o) => fs.writeFileSync(arq(n), JSON.stringify(o, null, 2));

const PLACES_KEY = process.env.PLACES_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ZOOM = process.env.CALIB_ZOOM || "15z";   // nível de zoom do Maps

// Custo por chamada (USD) — só pra avisar antes de gastar.
const CUSTO_PLACES = 0.032;
const USD_BRL = 5.5;

// ------------------------------------------------------------
// AMOSTRA — quem vamos medir.
// ------------------------------------------------------------
// Categorias e bairros escolhidos pra cobrir o cliente típico do
// StarTouch: negócio de bairro, comércio de rua, serviço local.
// De cada busca pegamos negócios em posições VARIADAS (1º, 5º, 10º),
// não só os vencedores — senão o teste só olharia quem já vai bem.
const CATEGORIAS = ["padaria", "bicicletaria", "pet shop", "barbearia", "açaí", "farmácia", "pizzaria"];
const BAIRROS = [
  { nome: "Pinheiros, São Paulo",     lat: -23.5665, lng: -46.7020 },
  { nome: "Tatuapé, São Paulo",       lat: -23.5400, lng: -46.5760 },
  { nome: "Santo Amaro, São Paulo",   lat: -23.6520, lng: -46.7100 },
];
const POSICOES_ALVO = [1, 5, 10];   // de cada busca, pega estes lugares

async function textSearch(termo, lat, lng, raio = 1500) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`
    + `?query=${encodeURIComponent(termo)}&location=${lat},${lng}&radius=${raio}`
    + `&language=pt-BR&region=br&key=${PLACES_KEY}`;
  const r = await fetch(url);
  const d = await r.json();
  if (d.status && d.status !== "OK" && d.status !== "ZERO_RESULTS") {
    throw new Error(`places:${d.status} ${d.error_message || ""}`);
  }
  return (d.results || []).filter((p) => !p.business_status || p.business_status === "OPERATIONAL");
}

async function montarAmostra() {
  const sujeitos = [];
  const vistos = new Set();
  for (const cat of CATEGORIAS) {
    for (const b of BAIRROS) {
      const res = await textSearch(cat, b.lat, b.lng);
      for (const pos of POSICOES_ALVO) {
        const p = res[pos - 1];
        if (!p || vistos.has(p.place_id)) continue;
        vistos.add(p.place_id);
        sujeitos.push({
          place_id: p.place_id,
          nome: p.name,
          termo: cat,
          bairro: b.nome,
          posicao_na_amostragem: pos,
          endereco: p.formatted_address || "",
        });
      }
    }
  }
  gravar("sujeitos.json", sujeitos);
  console.log(`\n${sujeitos.length} negócios na amostra:\n`);
  for (const s of sujeitos) console.log(`  ${s.nome} — ${s.termo} — ${s.bairro}`);
  console.log(`\nSalvo em ${arq("sujeitos.json")}. Edite o arquivo se quiser trocar por clientes reais.`);
  console.log(`Amostragem custou ~${CATEGORIAS.length * BAIRROS.length} chamadas (~R$ ${(CATEGORIAS.length * BAIRROS.length * CUSTO_PLACES * USD_BRL).toFixed(2)}).`);
}

// ------------------------------------------------------------
// CAMINHO A — o que o StarTouch mostra HOJE
// ------------------------------------------------------------
async function medirA() {
  const sujeitos = ler("sujeitos.json");
  const n = sujeitos.length * 5;
  console.log(`Caminho A: ${sujeitos.length} negócios × 5 pontos = ${n} chamadas Places (~R$ ${(n * CUSTO_PLACES * USD_BRL).toFixed(2)})\n`);
  const out = [];
  for (const [i, s] of sujeitos.entries()) {
    try {
      const g = await fetchGridRanking({ placeId: s.place_id, terms: [s.termo] });
      const t = g.terms[0];
      out.push({
        place_id: s.place_id, nome: s.nome, termo: s.termo,
        centro: g.center,
        // rank por ponto, na ordem centro/N/S/L/O
        pontos: t.points.map((p) => ({ dir: p.dir, ok: p.ok, rank: p.rank })),
        lugar_no_google: t.score,     // o número que vai pra tela
        ordinal: t.rank, total: t.total,
      });
      console.log(`  [${i + 1}/${sujeitos.length}] ${s.nome}: lugar ${t.score ?? "—"} (${t.rank ?? "—"}º de ${t.total})`);
    } catch (e) {
      console.log(`  [${i + 1}/${sujeitos.length}] ${s.nome}: FALHOU (${e.message})`);
      out.push({ place_id: s.place_id, nome: s.nome, termo: s.termo, erro: e.message });
    }
  }
  gravar("caminho-a.json", out);
}

// ------------------------------------------------------------
// CAMINHO B — o que o cliente VÊ no Google Maps
// ------------------------------------------------------------
// Mesmos 5 pontos do caminho A (reusa o centro que o A já resolveu, pra
// garantir que os dois medem exatamente das mesmas coordenadas).
function offsetMetros(lat, lng, norteM, lesteM) {
  const dLat = norteM / 111320;
  const dLng = lesteM / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}
function cincoPontos(lat, lng, m = GRID_SPACING_M) {
  return [
    { dir: "centro", lat, lng },
    { dir: "N", ...offsetMetros(lat, lng, m, 0) },
    { dir: "S", ...offsetMetros(lat, lng, -m, 0) },
    { dir: "L", ...offsetMetros(lat, lng, 0, m) },
    { dir: "O", ...offsetMetros(lat, lng, 0, -m) },
  ];
}

async function mapsSerp(termo, lat, lng) {
  const url = `https://serpapi.com/search.json?engine=google_maps`
    + `&q=${encodeURIComponent(termo)}&ll=@${lat},${lng},${ZOOM}`
    + `&type=search&hl=pt-br&gl=br&api_key=${SERPAPI_KEY}`;
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(`serpapi:${d.error}`);
  return (d.local_results || []).map((x, i) => ({
    pos: x.position ?? i + 1,
    place_id: x.place_id,
    nome: x.title,
  }));
}

async function medirB() {
  const todos = ler("caminho-a.json").filter((x) => !x.erro);
  // RETOMÁVEL: o plano grátis tem 100 buscas no MÊS. Se cair no meio, recomeçar
  // do zero queimaria a cota duas vezes — então já medidos são pulados e o
  // arquivo é gravado a cada negócio.
  const feitos = fs.existsSync(arq("caminho-b.json")) ? ler("caminho-b.json") : [];
  const jaFeito = new Set(feitos.map((x) => x.place_id));
  const limArg = process.argv.find((x) => x.startsWith("--limite="));
  const limite = limArg ? Number(limArg.split("=")[1]) : Infinity;
  const a = todos.filter((x) => !jaFeito.has(x.place_id)).slice(0, limite);
  const n = a.length * 5;
  console.log(`Caminho B: ${a.length} negócios × 5 pontos = ${n} buscas (${feitos.length} já medidos antes)\n`);
  const out = feitos;
  for (const [i, s] of a.entries()) {
    const pontos = [];
    for (const pt of cincoPontos(s.centro.lat, s.centro.lng)) {
      try {
        const lista = await mapsSerp(s.termo, pt.lat, pt.lng);
        const idx = lista.findIndex((x) => x.place_id === s.place_id);
        pontos.push({ dir: pt.dir, ok: true, rank: idx >= 0 ? lista[idx].pos : null, total: lista.length });
      } catch (e) {
        pontos.push({ dir: pt.dir, ok: false, rank: null, erro: e.message });
      }
    }
    const presentes = pontos.filter((p) => p.ok && p.rank != null).map((p) => p.rank);
    const medidos = pontos.filter((p) => p.ok).length;
    // MESMA fórmula do caminho A (ausência = 21ª), pra comparar maçã com maçã.
    const lugar = medidos
      ? Math.round(((presentes.reduce((x, y) => x + y, 0) + 21 * (medidos - presentes.length)) / medidos) * 10) / 10
      : null;
    out.push({ place_id: s.place_id, nome: s.nome, termo: s.termo, pontos, lugar_no_google: lugar });
    gravar("caminho-b.json", out);   // grava a cada um: cota gasta não se perde
    const erros = pontos.filter((p) => !p.ok).length;
    console.log(`  [${i + 1}/${a.length}] ${s.nome}: lugar ${lugar ?? "—"}${erros ? `  (${erros} ponto(s) falharam)` : ""}`);
  }
}

// ------------------------------------------------------------
// COMPARAR
// ------------------------------------------------------------
const mediana = (v) => { if (!v.length) return null; const s=[...v].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2 };
const pct = (x, t) => t ? `${Math.round((x / t) * 100)}%` : "—";

function comparar() {
  const A = ler("caminho-a.json"), B = ler("caminho-b.json");
  const bPor = new Map(B.map((x) => [x.place_id, x]));

  let pares = 0, difs = [], concordaTop3 = 0, divergeTop3 = 0;
  let fantasma = 0, invisivel = 0;   // A vê e B não / B vê e A não
  const linhas = [];

  for (const a of A) {
    const b = bPor.get(a.place_id);
    if (!b || a.erro) continue;
    for (let i = 0; i < 5; i++) {
      const pa = a.pontos[i], pb = b.pontos[i];
      if (!pa?.ok || !pb?.ok) continue;
      pares++;
      const ra = pa.rank, rb = pb.rank;
      if (ra != null && rb == null) fantasma++;
      else if (ra == null && rb != null) invisivel++;
      else if (ra != null && rb != null) difs.push(Math.abs(ra - rb));
      // O veredito que importa pro dono: está no bloco dos 3 primeiros?
      const t3a = ra != null && ra <= 3, t3b = rb != null && rb <= 3;
      if (t3a === t3b) concordaTop3++; else divergeTop3++;
    }
    linhas.push({
      nome: a.nome, termo: a.termo,
      hoje: a.lugar_no_google, real: b.lugar_no_google,
      dif: (a.lugar_no_google != null && b.lugar_no_google != null)
        ? Math.round((b.lugar_no_google - a.lugar_no_google) * 10) / 10 : null,
    });
  }

  console.log(`\n===============================================`);
  console.log(`RESULTADO — ${linhas.length} negócios, ${pares} pontos comparados`);
  console.log(`===============================================\n`);
  console.log(`Concorda no veredito "está no top 3":  ${concordaTop3}/${pares}  (${pct(concordaTop3, pares)})`);
  console.log(`Diverge no veredito:                   ${divergeTop3}/${pares}  (${pct(divergeTop3, pares)})`);
  console.log(`\nDiferença de posição (quando os dois acham o negócio):`);
  console.log(`  mediana: ${mediana(difs) ?? "—"} lugares   |   média: ${difs.length ? (difs.reduce((a,b)=>a+b,0)/difs.length).toFixed(1) : "—"}`);
  console.log(`  bateu exato: ${pct(difs.filter(d=>d===0).length, difs.length)}   |   erro <= 2 lugares: ${pct(difs.filter(d=>d<=2).length, difs.length)}`);
  console.log(`\nDiscordância grave:`);
  console.log(`  dizemos que aparece e NÃO aparece:  ${fantasma}  (${pct(fantasma, pares)})`);
  console.log(`  dizemos que não aparece e APARECE:  ${invisivel}  (${pct(invisivel, pares)})`);
  console.log(`\nPor negócio (lugar no Google — hoje vs real):\n`);
  console.log(`  ${"negócio".padEnd(34)} ${"termo".padEnd(13)} hoje   real   dif`);
  for (const l of linhas.sort((x,y)=>Math.abs(y.dif??0)-Math.abs(x.dif??0))) {
    console.log(`  ${(l.nome||"").slice(0,33).padEnd(34)} ${(l.termo||"").padEnd(13)} ${String(l.hoje??"—").padStart(4)}  ${String(l.real??"—").padStart(5)}  ${l.dif>0?"+":""}${l.dif??"—"}`);
  }
  const csv = ["negocio,termo,lugar_hoje,lugar_real,diferenca",
    ...linhas.map(l=>`"${(l.nome||"").replace(/"/g,"'")}",${l.termo},${l.hoje??""},${l.real??""},${l.dif??""}`)].join("\n");
  fs.writeFileSync(arq("resultado.csv"), csv);
  console.log(`\nCSV: ${arq("resultado.csv")}`);
}

// ------------------------------------------------------------
const passo = process.argv[2];
const confirmar = process.argv.includes("--confirmar");
if (!PLACES_KEY && passo !== "comparar") { console.error("Falta PLACES_API_KEY"); process.exit(1) }
if (passo === "medir-b" && !SERPAPI_KEY) { console.error("Falta SERPAPI_KEY no .env"); process.exit(1) }
if ((passo === "amostra" || passo === "medir-a") && !confirmar) {
  console.log("Este passo GASTA cota do Google. Rode de novo com --confirmar."); process.exit(0);
}

if (passo === "amostra") await montarAmostra();
else if (passo === "medir-a") await medirA();
else if (passo === "medir-b") await medirB();
else if (passo === "comparar") comparar();
else console.log("Passos: amostra | medir-a | medir-b | comparar");
