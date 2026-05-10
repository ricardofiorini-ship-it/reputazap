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

async function listPending(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError) return res.status(401).json({ error: "Token inválido" });

    const user_id = userData.user.id;
    const { data: business } = await supabase
      .from("businesses")
      .select("place_id")
      .eq("user_id", user_id)
      .maybeSingle();
    if (!business?.place_id) return res.json({ feedbacks: [] });

    const { data: feedbacks, error } = await supabase
      .from("feedbacks")
      .select("id, text, rating, contact, created_at")
      .eq("place_id", business.place_id)
      .eq("decision", "wait")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[feedback/list] Erro ao buscar:", error);
      return res.status(400).json({ error: error.message });
    }
    return res.json({ feedbacks: feedbacks || [] });
  } catch (err) {
    console.error("[feedback/list] Erro inesperado:", err);
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET = lista feedbacks pendentes (rota antiga: /api/feedbacks)
  if (req.method === "GET") return listPending(req, res);

  if (req.method !== "POST") return res.status(405).end();

  const { place_id, text, rating, id, decision, contact, would_have_reviewed_negative, resolved, reply_text } = req.body;

  // RESPONDER AO CLIENTE (in-app reply): id + reply_text
  if (id && reply_text) {
    const cleanReply = (reply_text || "").trim();
    if (!cleanReply) return res.status(400).json({ error: "reply_text vazio" });
    try {
      // Busca o feedback pra pegar contato e place_id
      const { data: fb, error: fbErr } = await supabase
        .from("feedbacks").select("contact, place_id, text, rating").eq("id", id).single();
      if (fbErr || !fb) return res.status(404).json({ error: "Feedback não encontrado" });
      if (!fb.contact || !fb.contact.includes("@")) {
        return res.status(400).json({ error: "Cliente não deixou email — use o botão de WhatsApp" });
      }

      // Busca biz pro nome
      const { data: biz } = await supabase
        .from("businesses").select("name").eq("place_id", fb.place_id).maybeSingle();
      const bizName = biz?.name || "Seu negócio";

      // Envia email pro cliente
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.log("[feedback/reply] RESEND_API_KEY ausente — pulando envio. Cliente:", fb.contact);
      } else {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;">
            <h2 style="color:#1A73E8;margin-bottom:8px;">Resposta de ${bizName}</h2>
            <p style="color:#5F6368;font-size:14px;margin-top:0;">Obrigado por nos enviar seu feedback. Veja a resposta do estabelecimento:</p>
            <div style="background:#F8F9FA;border-left:4px solid #1A73E8;border-radius:8px;padding:18px 22px;margin:20px 0;font-size:15px;line-height:1.6;color:#202124;white-space:pre-wrap;">${cleanReply.replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]))}</div>
            <p style="font-size:12px;color:#80868B;line-height:1.6;">Esta é uma resposta privada. Se quiser conversar mais, basta responder este email.</p>
          </div>
        `;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ReputaZap <onboarding@resend.dev>",
            to: [fb.contact],
            reply_to: fb.contact,
            subject: `Resposta de ${bizName}`,
            html
          })
        });
      }

      // Salva resposta + marca como resolvido
      const { error: updErr } = await supabase
        .from("feedbacks")
        .update({ reply_text: cleanReply, replied_at: new Date().toISOString(), resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (updErr) console.error("[feedback/reply] erro ao salvar resposta:", updErr);

      return res.json({ ok: true });
    } catch (err) {
      console.error("[feedback/reply] erro inesperado:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // UPDATE: registra a decisão do cliente (resolver / publicar), contato ou marca como resolvido pelo dono
  if (id && (decision || contact !== undefined || would_have_reviewed_negative !== undefined || resolved !== undefined)) {
    if (decision && !["wait", "public"].includes(decision)) {
      return res.status(400).json({ error: "decision inválida" });
    }
    const patch = {};
    if (decision) patch.decision = decision;
    if (contact !== undefined) patch.contact = contact || null;
    if (would_have_reviewed_negative !== undefined) patch.would_have_reviewed_negative = !!would_have_reviewed_negative;
    if (resolved !== undefined) patch.resolved_at = resolved ? new Date().toISOString() : null;
    const { error: updError } = await supabase
      .from("feedbacks")
      .update(patch)
      .eq("id", id);
    if (updError) console.error("[feedback] Erro ao atualizar:", updError);
    return res.json({ ok: true });
  }

  if (!place_id || !text) return res.status(400).json({ error: "place_id e text obrigatórios" });

  try {
    // 1. Salva feedback (sempre antes de redirecionar — regra de negócio)
    const { data: inserted, error: insertError } = await supabase
      .from("feedbacks")
      .insert({ place_id, text, rating: rating ?? null })
      .select("id")
      .single();
    if (insertError) console.error("[feedback] Erro ao salvar:", insertError);
    const feedbackId = inserted?.id ?? null;

    // 2. Busca o negócio + email do dono
    const { data: biz } = await supabase
      .from("businesses")
      .select("user_id, name, manager_email")
      .eq("place_id", place_id)
      .maybeSingle();

    if (!biz) {
      console.warn("[feedback] Negócio não encontrado para place_id:", place_id);
      return res.json({ ok: true, id: feedbackId, emailSent: false });
    }

    // 3. Resolve email do destinatário (manager_email > auth email do dono)
    let recipient = biz.manager_email;
    if (!recipient) {
      const { data: userData } = await supabase.auth.admin.getUserById(biz.user_id);
      recipient = userData?.user?.email;
    }
    if (!recipient) {
      console.warn("[feedback] Sem email do destinatário pra place_id:", place_id);
      return res.json({ ok: true, id: feedbackId, emailSent: false });
    }

    // 4. Envia email
    const result = await sendEmail({ to: recipient, bizName: biz.name, rating, text });
    res.json({ ok: true, id: feedbackId, emailSent: !result.skipped && !result.error, result });
  } catch (err) {
    console.error("[feedback] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}
