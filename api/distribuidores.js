// ============================================================
// Distribuidores globais — candidatura (23/10/2026)
// ============================================================
// A página /distributors (inglês) vende a exclusividade por país. Não há
// carrinho de propósito: exclusividade é negociada, então o formulário vira
// e-mail pro admin (com Reply-To no candidato) e um "recebemos" em inglês pro
// candidato. Nada é gravado no banco — o registro é o próprio e-mail.
//
// Condições publicadas na página: pedido mínimo US$ 500 FOB São Paulo, tabela
// sob consulta, exclusividade sujeita a metas de volume em contrato. Mudou
// aqui, muda lá.
// ============================================================
import { sendRawEmail } from "./_lib/email-sender.js";
import { limitou, LIMITES } from "./_lib/rate-limit.js";

const limpo = (s, max) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TIPOS = {
  distributor: "Distribuidor / revenda",
  agency: "Agência de marketing",
  pos: "Fornecedor de maquininha / hardware",
  other: "Outro"
};
const VOLUMES = { "500-1k": "US$ 500 – 1.000", "1k-5k": "US$ 1.000 – 5.000", "5k+": "Acima de US$ 5.000" };

function linha(rotulo, valor) {
  return `<tr><td style="padding:8px 10px;color:#5F6368;font-size:13px;vertical-align:top;white-space:nowrap;">${rotulo}</td>` +
         `<td style="padding:8px 10px;font-weight:600;">${valor}</td></tr>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Formulário público que dispara e-mail: o mesmo freio da revenda.
  if (await limitou(req, res, LIMITES.revenda)) return;

  const b = req.body || {};
  // Campo-isca: invisível pra pessoa, robô preenche.
  if (limpo(b.website2, 50)) return res.json({ ok: true });

  const c = {
    empresa: limpo(b.company, 120),
    pais: limpo(b.country, 60),
    nome: limpo(b.name, 100),
    email: limpo(b.email, 160).toLowerCase(),
    telefone: limpo(b.phone, 40),
    site: limpo(b.website, 200),
    tipo: TIPOS[b.type] || TIPOS.other,
    volume: VOLUMES[b.volume] || "—",
    mensagem: String(b.message || "").trim().slice(0, 2000)
  };
  if (!c.empresa || !c.pais || !c.nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) {
    return res.status(400).json({ error: "Please fill in company, country, your name and a valid e-mail." });
  }

  const admin = process.env.ADMIN_NOTIFICATIONS_EMAIL;
  if (!admin) {
    // Sem destino, a candidatura se perderia calada — o candidato precisa
    // saber que não chegou.
    console.error("[distribuidores] ADMIN_NOTIFICATIONS_EMAIL ausente — candidatura NÃO entregue");
    return res.status(503).json({ error: "We could not send your application right now. Please e-mail us at contato@startouch.com.br." });
  }

  const htmlAdmin = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:22px;">
      <h1 style="font-size:19px;color:#202124;margin:0 0 4px;">🌎 Candidato a distribuidor exclusivo</h1>
      <p style="font-size:13.5px;color:#5F6368;margin:0 0 18px;">${esc(c.pais)} · veio de startouch.com.br/distributors</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;">
        ${linha("Empresa", esc(c.empresa))}
        ${linha("País", esc(c.pais))}
        ${linha("Contato", esc(c.nome))}
        ${linha("E-mail", `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}
        ${linha("Telefone/WhatsApp", esc(c.telefone || "—"))}
        ${linha("Site", c.site ? esc(c.site) : "—")}
        ${linha("Tipo", esc(c.tipo))}
        ${linha("1º pedido estimado", esc(c.volume))}
        ${c.mensagem ? linha("Mensagem", esc(c.mensagem).replace(/\n/g, "<br/>")) : ""}
      </table>
      <p style="font-size:12.5px;color:#9AA0A6;margin-top:18px;line-height:1.6;">
        Responder este e-mail vai direto pro candidato (em inglês). Condições publicadas: mínimo US$ 500 FOB São Paulo,
        tabela sob consulta, exclusividade sujeita a metas em contrato.
      </p>
    </div>`;

  const r = await sendRawEmail({
    to: admin,
    subject: `Distribuidor ${c.pais}: ${c.empresa}`,
    html: htmlAdmin,
    replyTo: c.email
  });
  if (r?.error) {
    console.error("[distribuidores] aviso ao admin não saiu:", r.error);
    return res.status(502).json({ error: "We could not send your application right now. Please try again in a few minutes." });
  }

  const primeiro = esc(c.nome.split(" ")[0]);
  const htmlCandidato = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;">
      <h2 style="margin:0 0 12px;">Thanks, ${primeiro} — we received your application</h2>
      <p style="font-size:15px;line-height:1.6;color:#3D4A57;">We are reviewing your application to become the exclusive StarTouch distributor in <strong>${esc(c.pais)}</strong>. A member of our team will reply to this e-mail within 2 business days with the price list and next steps.</p>
      <p style="font-size:15px;line-height:1.6;color:#3D4A57;">Meanwhile, you can see the products at <a href="https://startouch.com.br/kit?lang=en">startouch.com.br/kit</a>.</p>
      <p style="font-size:13px;color:#68757F;margin-top:24px;">StarTouch · São Paulo, Brazil · startouch.com.br</p>
    </div>`;
  const r2 = await sendRawEmail({
    to: c.email,
    subject: "Your StarTouch distributor application",
    html: htmlCandidato
  });
  if (r2?.error) console.warn("[distribuidores] confirmação ao candidato não saiu:", r2.error);

  return res.json({ ok: true });
}
