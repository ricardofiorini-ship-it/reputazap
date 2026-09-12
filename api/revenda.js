// ============================================================
// StarTouch — Pedido de REVENDA (público, sem login)
// ============================================================
// Recebe o pedido da página /revenda e avisa o admin por e-mail.
//
// NÃO É CHECKOUT, e isso é deliberado enquanto o frete não for calculável:
// produção é sob encomenda (10 dias úteis), o frete depende de peso e região,
// e a venda é só pra PJ com nota fiscal. Cobrar antes de fechar o frete
// obrigaria a estornar depois. A página diz isso em voz alta ("nenhum
// pagamento acontece nesta página") — promessa que a tela faz, o servidor
// cumpre.
//
// O PREÇO É DAQUI, não da página. O HTML calcula o total só pra o comprador
// ver antes de enviar; este arquivo recalcula do zero e ignora qualquer valor
// que venha de fora. Preço que chega do cliente é sugestão, nunca dado.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { sendRawEmail } from "./_lib/email-sender.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";
import { cotaFrete } from "./_lib/frenet.js";

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// Tabela de revenda. Espelha os preços da página /revenda — se mudar um, muda
// o outro. Ficam separados do KIT_CATALOG (billing.js) de propósito: aquele é
// o preço de VAREJO, e misturar os dois seria a próxima confusão cara.
const REVENDA = {
  cartao: { nome: "Cartão de Avaliação NFC", centavos: 1390 },
  placag: { nome: "Placa de Balcão G",       centavos: 3290 },
  placam: { nome: "Placa de Balcão M",       centavos: 2290 },
};
const MINIMO_CENTAVOS = 80000;   // R$ 800,00, sem o frete
const MAX_UNIDADES = 10000;

// A tabela da revenda usa outros ids que o catalogo do site. Duas grafias pro
// mesmo produto ja existiam aqui; o que nao pode e o frete e o preco
// discordarem sobre QUAL item e.
const ALIASES_CATALOGO = { cartao: "cartao-nfc", placag: "placa-balcao", placam: "placa-mesa" };

// Dias uteis de producao antes de postar. O numero e do Ricardo e ja esta
// publicado na pagina de revenda — fica aqui pra somar ao prazo da
// transportadora, senao o e-mail diria "chega em 6 dias" com a peca ainda
// por fazer.
const DIAS_DE_PRODUCAO = 10;

const brl = (c) => "R$ " + (Number(c || 0) / 100).toFixed(2).replace(".", ",");
const limpo = (s, max) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Validação real do CNPJ (dígitos verificadores). Formato sozinho deixa passar
// 00.000.000/0000-00 e qualquer sequência inventada — e pedido com CNPJ falso
// custa uma ida e volta de e-mail pra descobrir.
function cnpjValido(bruto) {
  const n = String(bruto || "").replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
  const digito = (base) => {
    let peso = base.length === 12 ? 5 : 6, soma = 0;
    for (const ch of base) {
      soma += Number(ch) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return Number(n[12]) === digito(n.slice(0, 12)) && Number(n[13]) === digito(n.slice(0, 13));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método não permitido" });

  // Endpoint público que dispara e-mail: sem freio, um laço queima a cota do
  // Resend e enche a caixa do admin. Mesma regra dos outros públicos.
  if (await limitou(req, res, LIMITES.revenda)) return;

  const b = req.body || {};
  const razao = limpo(b.razao, 120);
  const cnpj = limpo(b.cnpj, 18);
  const nome = limpo(b.nome, 80);
  const email = limpo(b.email, 120);
  const whatsapp = limpo(b.whatsapp, 20);
  const cep = limpo(b.cep, 9);
  const observacoes = limpo(b.observacoes, 600);

  if (!razao || !nome || !email || !whatsapp || !cep) {
    return res.status(400).json({ ok: false, error: "Faltou preencher um dos campos obrigatórios." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Confira o e-mail informado." });
  }
  if (String(cep).replace(/\D/g, "").length !== 8) {
    return res.status(400).json({ ok: false, error: "Confira o CEP informado." });
  }
  if (!cnpjValido(cnpj)) {
    return res.status(400).json({ ok: false, error: "Esse CNPJ não confere. A revenda é somente para pessoa jurídica." });
  }

  // Monta o pedido SÓ com o que existe na tabela daqui.
  const itens = [];
  let total = 0;
  for (const [id, prod] of Object.entries(REVENDA)) {
    const q = parseInt((b.itens || {})[id], 10);
    if (!Number.isFinite(q) || q <= 0) continue;
    if (q > MAX_UNIDADES) {
      return res.status(400).json({ ok: false, error: `Quantidade acima do que dá pra pedir por aqui em ${prod.nome}. Fale com a gente.` });
    }
    const sub = q * prod.centavos;
    total += sub;
    itens.push({ id, nome: prod.nome, qtd: q, unitario: prod.centavos, subtotal: sub });
  }

  if (!itens.length) return res.status(400).json({ ok: false, error: "Escolha ao menos um produto." });
  if (total < MINIMO_CENTAVOS) {
    return res.status(400).json({ ok: false, error: `O pedido mínimo é ${brl(MINIMO_CENTAVOS)} sem o frete. Faltam ${brl(MINIMO_CENTAVOS - total)}.` });
  }

  const ref = `revenda_${Date.now()}`;

  // Grava antes de avisar. E-mail se perde no spam, sistema de e-mail cai, e
  // um pedido que só existe numa caixa de entrada é um pedido a uma pane de
  // distância de sumir. Best-effort: se a gravação falhar, o aviso ainda sai.
  let gravado = false;
  if (supabase) {
    const { error } = await supabase.from("orders").insert({
      external_reference: ref,
      status: "pending",
      amount_cents: total,
      items: itens,
      shipping: { razao, cnpj, nome, email, whatsapp, cep, observacoes, tipo: "revenda" },
    });
    if (error) console.error("[revenda] não gravei o pedido:", error.message);
    else gravado = true;
  }

  // COTA O FRETE. `consolidado` porque na revenda o pedido inteiro vai numa
  // caixa so: mandar 500 cartoes como 500 pacotes faria a transportadora cobrar
  // pelo peso cubado de 500 embalagens — cerca de TRES vezes o real.
  //
  // Best-effort de proposito: se a Frenet estiver fora, o pedido nao pode se
  // perder por causa disso. O e-mail sai dizendo que a cotacao falhou, que e
  // diferente de sair sem frete nenhum e parecer que esta tudo certo.
  const frete = await cotaFrete({
    cep,
    items: itens.map((i) => ({ id: i.id, qty: i.qtd })),
    aliases: ALIASES_CATALOGO,
    modo: "consolidado",
    // A pulseira esta esgotada no varejo e nao entra na tabela da revenda;
    // esta trava aqui so atrapalharia se um dia voltar com estoque separado.
    checarEstoque: false,
    maxQtd: MAX_UNIDADES,
    // O valor da NOTA e o do pedido de revenda, nao o preco de tabela do
    // site: os mesmos produtos custam menos aqui, e declarar o preco de
    // varejo infla o seguro embutido no frete.
    valorCentavos: total,
  });
  if (frete.erro) console.warn(`[revenda] sem cotacao de frete (${frete.motivo}): ${frete.erro}`);

  const linhas = itens.map((i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eef0f3;">${esc(i.nome)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right;">${i.qtd}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right;">${brl(i.unitario)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eef0f3;text-align:right;font-weight:700;">${brl(i.subtotal)}</td>
    </tr>`).join("");

  // O bloco de frete do e-mail. Tres estados, e nenhum deles e silencio:
  // cotou, nao cotou (com o motivo), ou o CEP nao tem cobertura.
  const freteHtml = frete.erro
    ? `<div style="border:1px solid #F9DEDC;background:#FFF8F7;border-radius:10px;padding:12px 14px;margin-bottom:18px;">
         <div style="font-size:13.5px;font-weight:700;color:#B3261E;margin-bottom:4px;">Não consegui cotar o frete</div>
         <div style="font-size:13px;color:#5F6368;line-height:1.6;">${esc(frete.erro)} (${esc(frete.motivo || "?")})<br/>
         Cote na mão no painel da Frenet antes de responder.</div>
       </div>`
    : `<table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:18px;">
         <tr><td colspan="3" style="padding:10px 10px 4px;font-size:13.5px;font-weight:700;color:#202124;">Frete cotado na Frenet</td></tr>
         ${frete.opcoes.map((o, idx) => `
           <tr>
             <td style="padding:7px 10px;border-top:1px solid #eef0f3;font-size:13px;">${esc(o.servico)} <span style="color:#9AA0A6;">· ${esc(o.transportadora)}</span></td>
             <td style="padding:7px 10px;border-top:1px solid #eef0f3;text-align:right;font-size:13px;color:#5F6368;white-space:nowrap;">
               ${o.prazoDias ? `${o.prazoDias + DIAS_DE_PRODUCAO} dias úteis` : "prazo não informado"}
             </td>
             <td style="padding:7px 10px;border-top:1px solid #eef0f3;text-align:right;font-weight:${idx === 0 ? 800 : 600};white-space:nowrap;">${brl(o.precoCentavos)}</td>
           </tr>`).join("")}
         <tr><td colspan="3" style="padding:9px 10px;border-top:1px solid #eef0f3;font-size:12px;color:#9AA0A6;line-height:1.6;">
           Prazo já inclui os ${DIAS_DE_PRODUCAO} dias úteis de produção.
           Pacote estimado: ${frete.pacote ? `${frete.pacote.Length}×${frete.pacote.Width}×${frete.pacote.Height} cm · ${String(frete.pacote.Weight).replace(".", ",")} kg` : "—"}.
           <strong>Confira antes de fechar</strong> — peso e caixa ainda são estimados, não medidos.
         </td></tr>
       </table>`;

  const admin = process.env.ADMIN_NOTIFICATIONS_EMAIL;
  if (admin) {
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:22px;">
        <h1 style="font-size:19px;color:#202124;margin:0 0 4px;">Pedido de revenda</h1>
        <p style="font-size:13.5px;color:#5F6368;margin:0 0 18px;">${esc(ref)}${gravado ? "" : " · <strong style='color:#B3261E;'>NÃO gravado no banco</strong>"}</p>

        <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:18px;">
          ${linhas}
          <tr>
            <td colspan="3" style="padding:11px 10px;text-align:right;font-weight:700;">Total sem frete</td>
            <td style="padding:11px 10px;text-align:right;font-weight:800;font-size:17px;">${brl(total)}</td>
          </tr>
        </table>

        ${freteHtml}

        <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;">
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">Razão social</td><td style="padding:8px 10px;font-weight:600;">${esc(razao)}</td></tr>
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">CNPJ</td><td style="padding:8px 10px;font-weight:600;">${esc(cnpj)}</td></tr>
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">Contato</td><td style="padding:8px 10px;font-weight:600;">${esc(nome)}</td></tr>
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">E-mail</td><td style="padding:8px 10px;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">WhatsApp</td><td style="padding:8px 10px;font-weight:600;">${esc(whatsapp)}</td></tr>
          <tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;">CEP</td><td style="padding:8px 10px;font-weight:600;">${esc(cep)}</td></tr>
          ${observacoes ? `<tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;vertical-align:top;">Observações</td><td style="padding:8px 10px;">${esc(observacoes)}</td></tr>` : ""}
        </table>

        <p style="font-size:12.5px;color:#9AA0A6;margin-top:18px;line-height:1.6;">
          ${frete.erro ? "Falta cotar o frete e emitir a NF" : "Falta conferir o frete acima e emitir a NF"} antes de responder.
        </p>
      </div>`;

    const r = await sendRawEmail({
      to: admin,
      subject: `Revenda: ${brl(total)} — ${razao}`,
      html,
      replyTo: email,
    });
    if (r?.error) console.error("[revenda] aviso ao admin não saiu:", r.error);
  } else {
    console.warn("[revenda] ADMIN_NOTIFICATIONS_EMAIL ausente — pedido recebido sem aviso.");
  }

  // `frete` vai na resposta pra quando a pagina quiser mostrar a estimativa
  // na hora. Hoje ela nao mostra de proposito: peso e caixa sao estimados, e
  // numero errado na cara do revendedor e pior do que numero nenhum. Sai do
  // armario quando alguns pedidos reais confirmarem a conta.
  return res.status(200).json({
    ok: true,
    referencia: ref,
    total_centavos: total,
    frete: frete.erro ? null : { opcoes: frete.opcoes, dias_de_producao: DIAS_DE_PRODUCAO },
  });
}
