// Testa a maquina de estados do pedido. A trava que mais importa: `paid` nunca
// pode ser marcado a mao — e um teste por combinacao garante que ninguem abra
// essa porta sem querer.
import { ESTADOS, TRANSICOES, destinosPossiveis, exigeRastreio,
         validaTransicao, camposDaTransicao, ROTULO, ROTULO_CLIENTE, EM_ABERTO }
  from "../../api/_lib/pedido-estados.js";

let ok = 0; const falhas = [];
const checa = (n, c, d) => { if (c) { ok++; console.log("  OK   " + n); }
  else { falhas.push(n); console.log("  FALHA " + n + (d !== undefined ? " -> " + d : "")); } };

console.log("\n1. A TRAVA: `paid` nunca sai de uma tela");
{
  // Combinacao exaustiva: nenhum estado pode ter `paid` como destino.
  for (const de of ESTADOS)
    checa(`de "${de}" NAO da pra ir pra paid`, !validaTransicao(de, "paid", {}).ok);
  checa("e a mensagem explica por que",
    /provedor/.test(validaTransicao("pending", "paid", {}).erro || ""),
    validaTransicao("pending", "paid", {}).erro);
  checa("paid nao aparece em nenhuma lista de destino",
    !Object.values(TRANSICOES).some(l => l.includes("paid")));
}

console.log("\n2. O caminho normal");
{
  checa("paid -> em_producao", validaTransicao("paid", "em_producao", {}).ok);
  checa("em_producao -> postado (com rastreio)", validaTransicao("em_producao", "postado", { rastreio: "BR123" }).ok);
  checa("postado -> entregue", validaTransicao("postado", "entregue", {}).ok);
  checa("paid -> postado direto (producao rapida) tambem vale",
    validaTransicao("paid", "postado", { rastreio: "BR1" }).ok);
}

console.log("\n3. Postado exige rastreio");
{
  checa("sem rastreio recusa", !validaTransicao("em_producao", "postado", {}).ok);
  checa("com espaco em branco tambem recusa", !validaTransicao("em_producao", "postado", { rastreio: "   " }).ok);
  checa("a mensagem diz o que fazer",
    /rastreio/.test(validaTransicao("em_producao", "postado", {}).erro || ""));
  checa("exigeRastreio so vale pra postado",
    exigeRastreio("postado") && !exigeRastreio("entregue") && !exigeRastreio("em_producao"));
}

console.log("\n4. O que NAO pode acontecer");
{
  checa("pendente nao vai pra producao (nao foi pago)", !validaTransicao("pending", "em_producao", {}).ok);
  checa("pendente nao vai pra postado", !validaTransicao("pending", "postado", { rastreio: "X" }).ok);
  checa("entregue e final", destinosPossiveis("entregue").length === 0);
  checa("cancelado e final", destinosPossiveis("cancelado").length === 0);
  checa("postado NAO volta pra producao", !validaTransicao("postado", "em_producao", {}).ok);
  checa("postado NAO cancela (ja saiu da casa)", !validaTransicao("postado", "cancelado", {}).ok);
  checa("mesmo estado recusa", !validaTransicao("paid", "paid", {}).ok);
  checa("estado inventado recusa", !validaTransicao("paid", "voando", {}).ok);
  checa("pedido em estado desconhecido recusa", !validaTransicao("xpto", "entregue", {}).ok);
}

console.log("\n5. O que fica gravado");
{
  const p = camposDaTransicao("postado", { rastreio: " br123456789br ", quem: "ricardo" });
  checa("status vira postado", p.status === "postado");
  checa("rastreio normalizado (sem espaco, maiusculo)", p.tracking_code === "BR123456789BR", p.tracking_code);
  checa("carimba shipped_at", !!p.shipped_at);
  checa("registra quem mexeu", p.status_updated_by === "ricardo");
  checa("NAO carimba delivered_at", p.delivered_at === undefined);
  const e = camposDaTransicao("em_producao", { quem: "x" });
  checa("producao carimba production_started_at", !!e.production_started_at && !e.shipped_at);
  const d = camposDaTransicao("entregue", {});
  checa("entrega carimba delivered_at", !!d.delivered_at);
  checa("sem `quem` grava null, nao 'undefined'", d.status_updated_by === null, d.status_updated_by);
}

console.log("\n6. Rotulos");
{
  checa("todo estado tem rotulo de admin", ESTADOS.every(e => ROTULO[e]));
  checa("todo estado tem rotulo de cliente", ESTADOS.every(e => ROTULO_CLIENTE[e]));
  checa("os dois sao diferentes onde importa (paid)", ROTULO.paid !== ROTULO_CLIENTE.paid);
  checa("em aberto = o que ainda pede acao nossa",
    EM_ABERTO.has("paid") && EM_ABERTO.has("postado") && !EM_ABERTO.has("entregue") && !EM_ABERTO.has("pending"));
}

console.log("\n" + "=".repeat(56));
console.log(ok + " verificacoes OK, " + falhas.length + " falhas");
if (falhas.length) { falhas.forEach(f => console.log("  x " + f)); process.exit(1); }
