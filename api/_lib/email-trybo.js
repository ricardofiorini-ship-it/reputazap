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

// Remetente com o nome da Trybo e o MESMO endereço da StarTouch: o domínio
// verificado no Resend é startouch.com.br, e endereço de outro domínio seria
// recusado. O nome é o que o cliente lê na caixa de entrada.
export function remetenteTrybo(from = process.env.RESEND_FROM || "") {
  const m = String(from).match(/<([^>]+)>/);
  const endereco = m ? m[1] : (String(from).includes("@") ? String(from).trim() : null);
  return endereco ? `Trybo <${endereco}>` : null;
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
