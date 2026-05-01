import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function sendEmail({ to, bizName, rating, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const subject = `[ReputaZap] Feedback ${rating === 1 ? "negativo" : "neutro"} de ${bizName}`;
  const ratingLabel = rating === 1 ? "Ruim 😞" : rating === 3 ? "Ok 😐" : "Não informado";
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="color:#10b981;margin-bottom:8px;">Você recebeu um feedback</h2>
      <p style="color:#64748b;font-size:14px;margin-top:0;">${bizName}</p>
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Avaliação do cliente</div>
        <div style="font-size:18px;font-weight:700;">${ratingLabel}</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">O que o cliente escreveu</div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${text.replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]))}</div>
      </div>
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;">
        Esse feedback foi interceptado antes de virar uma avaliação pública.
        Aproveite pra entrar em contato com o cliente e resolver a situação.
      </p>
    </div>
  `;

  if (!apiKey) {
    console.log("[feedback] RESEND_API_KEY não definida — pulando envio. Email seria:", { to, subject });
    return { skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "ReputaZap <onboarding@resend.dev>",
      to: [to],
      subject,
      html: htmlBody
    })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("[feedback] Resend erro:", data);
    return { error: data };
  }
  return { id: data.id };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { place_id, text, rating } = req.body;
  if (!place_id || !text) return res.status(400).json({ error: "place_id e text obrigatórios" });

  try {
    // 1. Salva feedback
    const { error: insertError } = await supabase
      .from("feedbacks")
      .insert({ place_id, text, rating: rating ?? null });
    if (insertError) console.error("[feedback] Erro ao salvar:", insertError);

    // 2. Busca o negócio + email do dono
    const { data: biz } = await supabase
      .from("businesses")
      .select("user_id, name, manager_email")
      .eq("place_id", place_id)
      .maybeSingle();

    if (!biz) {
      console.warn("[feedback] Negócio não encontrado para place_id:", place_id);
      return res.json({ ok: true, emailSent: false });
    }

    // 3. Resolve email do destinatário (manager_email > auth email do dono)
    let recipient = biz.manager_email;
    if (!recipient) {
      const { data: userData } = await supabase.auth.admin.getUserById(biz.user_id);
      recipient = userData?.user?.email;
    }
    if (!recipient) {
      console.warn("[feedback] Sem email do destinatário pra place_id:", place_id);
      return res.json({ ok: true, emailSent: false });
    }

    // 4. Envia email
    const result = await sendEmail({ to: recipient, bizName: biz.name, rating, text });
    res.json({ ok: true, emailSent: !result.skipped && !result.error, result });
  } catch (err) {
    console.error("[feedback] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
