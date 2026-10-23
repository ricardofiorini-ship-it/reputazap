// ============================================================
// TRYBO — e-mails da conta (19/10/2026)
// ============================================================
// Até aqui, quem criava conta pela Trybo recebia o "Bem-vindo ao StarTouch"
// (avaliações no Google, "conecte seu negócio") e, ao esquecer a senha, o
// e-mail padrão do login, que levava à página e ao painel da StarTouch. O
// cliente comprou um cartão de redes sociais e caía num produto que não é o
// dele — achado pelo Ricardo na primeira venda da Trybo.
//
// Sempre em PORTUGUÊS, de propósito: a Trybo está fora da camada de tradução
// (decisão de 09/10), e por isso este módulo não entra nas fixtures do
// `scripts/email-fixtures.mjs` — mesmo caso do `email-pro-menu.js`. Quem envia
// passa `lang: "pt"`, senão o email-sender traduziria pela língua da conta.
//
// Mora fora do email-templates.js porque aquele é importado pelo billing.js:
// uma quebra aqui não pode derrubar pagamento (lição de 17/jul).
// ============================================================

const PAINEL = "https://startouch.com.br/painel-trybo";

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Remetente da Trybo: endereço do PRÓPRIO domínio desde 23/10/2026, quando
// trybo.co foi verificado no Resend (só envio; DNS na Hostinger, sem MX no @
// — mesma regra da StarTouch). A resposta do cliente continua indo pra caixa
// do REPLY_TO (email-sender.js): trybo.co não recebe e-mail.
// TRYBO_FROM na Vercel troca o endereço sem deploy de código.
export function remetenteTrybo() {
  return (process.env.TRYBO_FROM || "").trim() || "Trybo <ola@trybo.co>";
}

function casca({ previa, titulo, corpo, botao, link, rodape }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f7f7fa;font-family:Arial,Helvetica,sans-serif;color:#1b1b20">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7fa"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid #e8e6ed;border-radius:18px">
<tr><td style="padding:26px 28px 6px;font-size:28px;font-weight:900;letter-spacing:-2px;color:#1b1b20">TRYBO<span style="font-size:10px;letter-spacing:0;vertical-align:top">™</span></td></tr>
<tr><td style="padding:10px 28px 0">
<h1 style="margin:0 0 14px;font-size:24px;line-height:30px;letter-spacing:-0.5px;color:#1b1b20">${esc(titulo)}</h1>
${corpo}
</td></tr>
<tr><td style="padding:10px 28px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1b1b20" align="center" style="border-radius:10px">
<a href="${esc(link)}" style="display:block;padding:15px 12px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${esc(botao)} &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:14px 28px 26px;font-size:13px;line-height:20px;color:#77747e">${rodape}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;line-height:17px;color:#9a96a1">Trybo, uma solução StarTouch.</p>
</td></tr></table></body></html>`;
}

const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#4d4955">${t}</p>`;

/** Boas-vindas de quem criou a conta pela ativação do cartão Trybo. */
export function tryboBoasVindasEmail({ nome } = {}) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0];
  const titulo = primeiro ? `Bem-vindo à Trybo, ${primeiro}.` : "Bem-vindo à Trybo.";
  return {
    subject: titulo,
    html: casca({
      previa: "Sua conta está criada. É nela que você troca as redes do cartão quando quiser.",
      titulo,
      corpo:
        p("Sua conta está criada. É nela que você escolhe para onde o cartão leva o seu cliente — Instagram, TikTok, WhatsApp ou YouTube — e troca quando quiser, <strong>sem reimprimir nada</strong>.") +
        p("No painel você também vê quantos toques cada cartão recebeu."),
      botao: "Abrir meu painel",
      link: PAINEL,
      rodape: "Para entrar, use este e-mail e a senha que você criou. Se esquecer a senha, toque em <strong>“Esqueci minha senha”</strong> na tela de entrada."
    })
  };
}

/** Link para criar uma senha nova. `link` já vem pronto de quem chama. */
export function tryboNovaSenhaEmail({ link } = {}) {
  const titulo = "Crie uma senha nova.";
  return {
    subject: "Sua nova senha da Trybo",
    html: casca({
      previa: "Toque no botão para criar uma senha nova e voltar ao seu painel.",
      titulo,
      corpo: p("Recebemos um pedido para trocar a senha da sua conta Trybo. Toque no botão abaixo para criar uma senha nova — depois disso você já entra direto no seu painel."),
      botao: "Criar senha nova",
      link,
      rodape: "Por segurança, o link vale por pouco tempo e funciona uma vez só. Se você não pediu a troca, pode ignorar este e-mail: sua senha continua a mesma."
    })
  };
}

// ── Pedido feito no carrinho da Trybo (19/10/2026) ──────────
// Até aqui, quem comprava o cartão Trybo recebia "Recebemos seu pedido
// StarTouch" e "ative em startouch.com.br" — a instrução de ativação errada.
// O webhook (billing.js) escolhe estes pelo prefixo `kit_trybo` do pedido.
const brl = (c) => "R$ " + (Number(c || 0) / 100).toFixed(2).replace(".", ",");

export function tryboPedidoRecebidoEmail({ nome, ref, itens = [], totalCentavos } = {}) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0];
  const linhas = itens.map((i) =>
    `<tr><td style="padding:6px 0;font-size:14px;color:#4d4955">${esc(i.qty || 1)} × ${esc(i.name || "Cartão Trybo")}</td></tr>`).join("");
  return {
    subject: "Recebemos seu pedido Trybo",
    html: casca({
      previa: "Seu pedido chegou até nós. Assim que o pagamento for confirmado, preparamos o envio.",
      titulo: primeiro ? `Pedido recebido, ${primeiro}.` : "Pedido recebido.",
      corpo:
        p("Seu pedido chegou até nós. Assim que o pagamento for confirmado, preparamos o envio e você recebe o código de rastreio por aqui.") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e6ed;border-bottom:1px solid #e8e6ed;margin:0 0 14px">${linhas}` +
        `<tr><td style="padding:8px 0;font-size:14px;color:#1b1b20"><strong>Total: ${brl(totalCentavos)}</strong> <span style="color:#9a96a1">· pedido ${esc(ref || "—")}</span></td></tr></table>`,
      botao: "Ver como funciona",
      link: "https://trybo.co/#como-funciona",
      rodape: "Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp (11) 97694-4026."
    })
  };
}

export function tryboPedidoConfirmadoEmail({ nome, ref, totalCentavos } = {}) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0];
  return {
    subject: "Pagamento confirmado — seu cartão Trybo",
    html: casca({
      previa: "Pagamento confirmado. Já estamos preparando o envio do seu cartão.",
      titulo: primeiro ? `Tudo certo, ${primeiro}.` : "Pagamento confirmado.",
      corpo:
        p(`Pagamento confirmado (${brl(totalCentavos)} · pedido ${esc(ref || "—")}). Já estamos preparando o envio e você recebe o código de rastreio por aqui.`) +
        p("<strong>Quando o cartão chegar</strong>, é só abrir <strong>trybo.co/ativar</strong> e digitar o código do verso. Em um minuto ele já leva o cliente para as suas redes."),
      botao: "Ver como ativar",
      link: "https://trybo.co/ativar",
      rodape: "Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp (11) 97694-4026."
    })
  };
}

// ============================================================
// O RESTO DO CICLO (23/10/2026) — "da mesma maneira que a StarTouch"
// ============================================================
// Até aqui a Trybo tinha só os quatro e-mails acima. Ativar um cartão,
// trocar um cartão perdido, comprar os botões avançados e acompanhar a
// entrega ou saíam calados, ou saíam com a cara da StarTouch. Cada modelo
// abaixo é o par de um da StarTouch (o nome do par vai no comentário), com
// o vocabulário da Trybo: cartão, redes, toques — nunca "avaliação".

const WHATS = "Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp (11) 97694-4026.";

const NOME_REDE = {
  instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp", youtube: "YouTube",
  url: "Link livre", whatsapp_canal: "Canal do WhatsApp", linkedin: "LinkedIn",
  spotify: "Spotify", kwai: "Kwai", threads: "Threads", facebook: "Facebook", telegram: "Telegram"
};   // mesmos rótulos de destination_kinds (supabase/trybo-001-banco.sql)
export const nomeDaRede = (k) => NOME_REDE[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1) : "—");

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

// O código em bloco próprio e monoespaçado — mesmo motivo da StarTouch: ele
// existe pra ser conferido contra o verso do cartão.
function blocoCodigo(rotulo, code, legenda) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f7fa;border:1px solid #e8e6ed;border-radius:12px;margin:0 0 16px"><tr><td style="padding:16px 18px">
<div style="font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#77747e;margin-bottom:6px">${esc(rotulo)}</div>
<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:20px;font-weight:bold;letter-spacing:1px;color:#1b1b20">${esc(code)}</div>
${legenda ? `<div style="font-size:13px;color:#77747e;margin-top:4px">${legenda}</div>` : ""}
</td></tr></table>`;
}

function listaRedes(redes = []) {
  const nomes = redes.map(nomeDaRede).filter(Boolean);
  if (!nomes.length) return "";
  return p(`Quem encostar o celular vai ver: <strong>${nomes.map(esc).join(" · ")}</strong>.`);
}

/**
 * Primeiro cartão ativado. Par: `firstDeviceEmail` (StarTouch).
 * `redes`: os kinds que o cartão serve (ex.: ["instagram","whatsapp"]).
 */
export function tryboPrimeiroCartaoEmail({ nome, negocio, code, apelido, redes = [] } = {}) {
  const pn = primeiroNome(nome);
  return {
    subject: "Seu cartão Trybo está ativo",
    html: casca({
      previa: "Pronto: quem encostar o celular no cartão já cai nas suas redes.",
      titulo: pn ? `Tá funcionando, ${pn}.` : "Tá funcionando.",
      corpo:
        p(`Seu primeiro cartão foi ativado${negocio ? ` em <strong>${esc(negocio)}</strong>` : ""}. A partir de agora, quem encostar o celular nele vai direto pras suas redes — sem digitar @, sem procurar perfil.`) +
        blocoCodigo("Cartão ativado", code, apelido ? `Apelido no painel: ${esc(apelido)}` : "") +
        listaRedes(redes) +
        `<p style="margin:4px 0 8px;font-size:15px;line-height:23px;color:#1b1b20"><strong>Como fazer o cartão render</strong></p>` +
        `<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:22px;color:#4d4955">
<li><strong>Ofereça na hora boa</strong> — no fim do atendimento, quando o cliente está olhando o resultado no espelho.</li>
<li><strong>Fale uma frase só</strong>: “Encosta o celular aqui que você já me segue.” Cartão parado no balcão rende muito menos que cartão oferecido.</li>
<li><strong>Troque a rede quando quiser</strong> no painel. O cartão não precisa ser reimpresso.</li>
</ul>`,
      botao: "Abrir meu painel",
      link: PAINEL,
      rodape: WHATS
    })
  };
}

/** Segundo cartão em diante. Par: `additionalDeviceEmail` (StarTouch). */
export function tryboOutroCartaoEmail({ nome, negocio, code, apelido, total } = {}) {
  const pn = primeiroNome(nome);
  const n = Number(total) || 2;
  return {
    subject: `Mais um cartão Trybo ativo${negocio ? ` em ${negocio}` : ""}`,
    html: casca({
      previa: `Agora são ${n} cartões levando clientes pras suas redes.`,
      titulo: pn ? `Mais um no time, ${pn}.` : "Mais um cartão no time.",
      corpo:
        p(`Agora são <strong>${n} cartões</strong> ativos${negocio ? ` em ${esc(negocio)}` : ""}. Um cartão por atendente é o jeito mais simples de saber quem está oferecendo — no painel você vê os toques de cada um.`) +
        blocoCodigo("Cartão ativado", code, apelido ? `Apelido no painel: ${esc(apelido)}` : "") +
        p("Dica: dê um apelido a cada cartão (o nome de quem usa, ou a cadeira). Fica fácil comparar no fim da semana."),
      botao: "Ver meus cartões",
      link: PAINEL,
      rodape: WHATS
    })
  };
}

/**
 * Cartão trocado (o antigo foi bloqueado e passou a apontar pro novo).
 * Par: `deviceUnlinkedEmail` (StarTouch) — e pelo mesmo motivo: não é
 * cortesia, é a metade de segurança. Mudança no destino de um cartão sem o
 * dono saber é problema; com um e-mail no mesmo minuto, é um chamado.
 */
export function tryboCartaoTrocadoEmail({ nome, antigo, novo, apelido } = {}) {
  const pn = primeiroNome(nome);
  return {
    subject: `Cartão ${antigo} trocado pelo ${novo}`,
    html: casca({
      previa: "O cartão novo herdou as redes e o apelido. O antigo foi bloqueado.",
      titulo: pn ? `${pn}, a troca está feita.` : "A troca está feita.",
      corpo:
        p(`O cartão <strong>${esc(novo)}</strong> já está funcionando com as mesmas redes${apelido ? ` e o mesmo apelido (“${esc(apelido)}”)` : ""} do antigo.`) +
        blocoCodigo("Cartão antigo — bloqueado", antigo, "Quem ainda encostar nele vai parar no cartão novo.") +
        `<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:22px;color:#4d4955">
<li>Os toques que o antigo já tinha <strong>continuam no histórico</strong>; o novo começa do zero.</li>
<li>O código antigo <strong>não pode</strong> ser ativado por outra pessoa.</li>
</ul>` +
        p("<strong>Não foi você?</strong> Responda este e-mail com os dois códigos acima e a gente desfaz."),
      botao: "Ver meus cartões",
      link: PAINEL,
      rodape: WHATS
    })
  };
}

/** Botões avançados liberados (compra única de R$ 49). */
export function tryboDesbloqueioEmail({ nome, ref, totalCentavos } = {}) {
  const pn = primeiroNome(nome);
  return {
    subject: "Botões avançados liberados — Trybo",
    html: casca({
      previa: "Link livre, LinkedIn, Spotify e as demais redes já estão liberados em todos os seus cartões.",
      titulo: pn ? `Liberado, ${pn}.` : "Botões avançados liberados.",
      corpo:
        p(`Pagamento confirmado (${brl(totalCentavos)}${ref ? ` · pedido ${esc(ref)}` : ""}). Os <strong>botões avançados</strong> já valem em <strong>todos os cartões Trybo da sua conta</strong> — os de hoje e os que você ativar depois.`) +
        p("Agora você pode apontar o cartão pra um <strong>link livre</strong> (cardápio, agenda, site, catálogo) e pras redes de nicho, como LinkedIn e Spotify. É só abrir o cartão no painel e adicionar o botão.") +
        p("Pagamento único: <strong>não há mensalidade</strong>."),
      botao: "Adicionar um botão",
      link: PAINEL,
      rodape: WHATS
    })
  };
}

/**
 * O pedido andou (produção, postagem, cancelamento). Par:
 * `pedidoAtualizadoEmail` (StarTouch), mesmos três estados e o mesmo
 * `null` pro estado que não merece e-mail.
 */
export function tryboPedidoAtualizadoEmail({ nome, ref, estado, rastreio, transportadora } = {}) {
  const pn = primeiroNome(nome);
  const rodape = `Pedido ${esc(ref || "—")}. ${WHATS}`;

  if (estado === "em_producao") {
    return {
      subject: "Seu cartão Trybo está sendo preparado",
      html: casca({
        previa: "Seu pedido entrou em preparação. O código de rastreio chega por aqui.",
        titulo: pn ? `Mãos à obra, ${pn}.` : "Seu pedido está sendo preparado.",
        corpo: p("Seu pedido entrou em preparação. Assim que a caixa for postada, você recebe o código de rastreio aqui mesmo."),
        botao: "Ver como funciona",
        link: "https://trybo.co/#como-funciona",
        rodape
      })
    };
  }

  if (estado === "postado") {
    return {
      subject: "Seu cartão Trybo foi postado",
      html: casca({
        previa: rastreio ? `Código de rastreio: ${rastreio}` : "Seu pedido está a caminho.",
        titulo: pn ? `A caminho, ${pn}.` : "Seu pedido está a caminho.",
        corpo:
          p(`Seu pedido saiu daqui${transportadora ? ` pela <strong>${esc(transportadora)}</strong>` : ""}.`) +
          (rastreio
            ? blocoCodigo("Código de rastreio", rastreio, "Acompanhe no site da transportadora. Pode levar algumas horas até aparecer.")
            : "") +
          p("<strong>Quando chegar</strong>, abra <strong>trybo.co/ativar</strong> e digite o código do verso do cartão. Em um minuto ele já leva o cliente pras suas redes."),
        botao: "Ver como ativar",
        link: "https://trybo.co/ativar",
        rodape
      })
    };
  }

  if (estado === "cancelado") {
    return {
      subject: "Seu pedido Trybo foi cancelado",
      html: casca({
        previa: "Seu pedido foi cancelado e não será enviado.",
        titulo: "Pedido cancelado.",
        corpo: p("Seu pedido foi cancelado e não será enviado. Se houve pagamento, o estorno segue o prazo da operadora. <strong>Se isso foi engano, responda este e-mail</strong> que a gente resolve."),
        botao: "Falar com a gente",
        link: "https://wa.me/5511976944026",
        rodape
      })
    };
  }

  return null;
}

/**
 * Resumo semanal da Trybo. Par: `weeklyDigestEmail` (StarTouch).
 *
 * TOQUE ≠ SEGUIDOR. O e-mail diz "toques" e "encaminhamentos" e nunca
 * "seguidores novos": o Instagram não conta isso pra ninguém, e prometer o
 * que não medimos é o tipo de número que o lojista confere e deixa de
 * acreditar no resto. Mesma disciplina do painel (api/trybo.js, handlePainel).
 *
 * `cartoes`: [{ code, apelido, toques }] da semana, já ordenado (mais toques primeiro).
 * `redes`:   [{ kind, cliques }] da semana, já ordenado.
 */
export function tryboResumoSemanalEmail({ nome, negocio, toques = 0, toquesAntes = 0, cartoes = [], redes = [], unsubUrl } = {}) {
  const pn = primeiroNome(nome);
  const delta = toques - toquesAntes;
  const comparacao = toquesAntes > 0 || toques > 0
    ? (delta > 0 ? `<span style="color:#86efac">+${delta}</span> em relação à semana anterior`
      : delta < 0 ? `<span style="color:#fca5a5">${delta}</span> em relação à semana anterior`
      : "igual à semana anterior")
    : "";

  const numero = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1b1b20" style="background:#1b1b20;border-radius:14px;margin:0 0 16px"><tr><td style="padding:20px 22px">
<div style="font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#a9a6b0">Toques nos últimos 7 dias</div>
<div style="font-size:40px;line-height:46px;font-weight:900;color:#ffffff">${toques}</div>
${comparacao ? `<div style="font-size:13px;color:#d6d4da">${comparacao}</div>` : ""}
</td></tr></table>`;

  const tabela = (titulo, linhas) => linhas.length
    ? `<p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#1b1b20">${titulo}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e8e6ed;margin:0 0 16px">${linhas.join("")}</table>`
    : "";
  const linha = (rot, val) => `<tr><td style="padding:7px 0;border-bottom:1px solid #f0eef3;font-size:14px;color:#4d4955">${rot}</td><td align="right" style="padding:7px 0;border-bottom:1px solid #f0eef3;font-size:14px;font-weight:bold;color:#1b1b20">${val}</td></tr>`;

  const porCartao = cartoes.length > 1
    ? tabela("Toques por cartão", cartoes.slice(0, 8).map((c) => linha(esc(c.apelido || c.code), c.toques)))
    : "";
  const porRede = tabela("Pra onde as pessoas foram", redes.slice(0, 6).map((r) => linha(esc(nomeDaRede(r.kind)), r.cliques)));

  const lider = cartoes[0], lanterna = cartoes[cartoes.length - 1];
  const conselho = toques === 0
    ? p("Semana em branco. Quase sempre é o cartão parado no balcão: <strong>oferecer na mão</strong>, no fim do atendimento, com uma frase só — “encosta aqui que você já me segue” — é o que faz o número andar.")
    : cartoes.length > 1 && lider.toques > 0 && lanterna.toques === 0
      ? p(`<strong>${esc(lider.apelido || lider.code)}</strong> puxou a semana. Vale perguntar o que essa pessoa fala na hora de oferecer — e passar a frase pro resto do time.`)
      : p("Toque é quem encostou o celular; encaminhamento é quem chegou na rede. Seguidor novo o Instagram não conta pra ninguém — mas quem chega no perfil logo depois do atendimento é quem mais segue.");

  return {
    subject: toques > 0
      ? `${toques} ${toques === 1 ? "toque" : "toques"} nos seus cartões esta semana`
      : "Sua semana na Trybo",
    html: casca({
      previa: toques > 0
        ? `${toques} ${toques === 1 ? "pessoa encostou" : "pessoas encostaram"} o celular nos seus cartões.`
        : "Nenhum toque esta semana — veja como virar isso.",
      titulo: pn ? `Sua semana, ${pn}.` : "Sua semana na Trybo.",
      corpo:
        (negocio ? `<p style="margin:-6px 0 14px;font-size:13px;color:#77747e">${esc(negocio)}</p>` : "") +
        numero + porCartao + porRede + conselho,
      botao: "Abrir meu painel",
      link: PAINEL,
      rodape: `Você recebe este resumo toda segunda porque tem cartões Trybo ativos.${unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:#77747e">Não quero mais receber</a>.` : ""}`
    })
  };
}
