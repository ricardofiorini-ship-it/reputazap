import { createClient } from "@supabase/supabase-js";
import { sendInBackground } from "./_lib/email-sender.js";
import { businessLinkedEmail } from "./_lib/email-templates.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token obrigatório" });

  const { place_id, name, address, rating, total, manager_email, category_override } = req.body;

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error("[savebiz] Erro de autenticação:", authError);
      return res.status(401).json({ error: "Token inválido" });
    }
    const user_id = userData.user.id;

    // Update parcial: apenas manager_email (Settings → Notificações)
    if (manager_email !== undefined && !place_id) {
      const cleanEmail = (manager_email || "").trim() || null;
      const { error: updErr } = await supabase
        .from("businesses")
        .update({ manager_email: cleanEmail })
        .eq("user_id", user_id);
      if (updErr) {
        console.error("[savebiz] erro ao atualizar manager_email:", updErr);
        return res.status(400).json({ error: updErr.message });
      }
      return res.json({ ok: true, manager_email: cleanEmail });
    }

    // Update parcial: apenas category_override (Settings → Dados do negócio)
    // Per-user, persiste entre devices — substitui o localStorage.rz_activity legado.
    if (category_override !== undefined && !place_id) {
      const cleanCat = (category_override || "").trim() || null;
      const { error: updErr } = await supabase
        .from("businesses")
        .update({ category_override: cleanCat })
        .eq("user_id", user_id);
      if (updErr) {
        console.error("[savebiz] erro ao atualizar category_override:", updErr);
        return res.status(400).json({ error: updErr.message });
      }
      return res.json({ ok: true, category_override: cleanCat });
    }

    // Não logar req.body cru: carrega manager_email (PII). Só o que depura.
    console.log("[savebiz] Payload recebido:", { place_id, name, tem_manager_email: manager_email !== undefined });
    if (!place_id || !name) {
      console.error("[savebiz] Campos obrigatórios faltando:", { place_id, name });
      return res.status(400).json({ error: "place_id e name obrigatórios" });
    }
    console.log("[savebiz] user_id autenticado:", user_id);

    // Garante que existe profile (FK businesses.user_id pode apontar pra profiles)
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user_id,
      name: userData.user.user_metadata?.name || "Usuário",
      phone: userData.user.user_metadata?.phone || ""
    }, { onConflict: "id" });
    if (profileError) console.error("[savebiz] aviso ao upsert profile:", profileError);

    // O PLANO NUNCA VEM DO CORPO (01/10/2026). Antes era `plan: plan || "free"`
    // num upsert: (a) qualquer conta podia mandar `plan: "pro"` e virar Pro sem
    // pagar — `businesses.plan` é a verdade pro resolvePlano; (b) toda tela que
    // manda `plan: "free"` (ativar, ativar-codigo, onboarding) REBAIXAVA um
    // assinante Pro que passasse por ela. Quem escreve plano é o webhook.
    // Negócio novo nasce free; negócio existente mantém o que tem.
    const { data: atual } = await supabase
      .from("businesses")
      .select("id, place_id, name")
      .eq("user_id", user_id)
      .maybeSingle();

    // TROCA DE NEGÓCIO: a conta já tinha um e agora aponta pra outro lugar do
    // Google. A linha é a MESMA (businesses tem UNIQUE user_id), então os
    // dispositivos vinculados vão junto — a tela de troca avisa isso antes.
    const trocou = !!(atual && atual.place_id && atual.place_id !== place_id);

    const cat = (category_override || "").trim();
    const insertPayload = {
      user_id,
      place_id,
      name,
      address,
      rating,
      // Marco zero das "avaliações captadas". Na troca TEM que recomeçar: o
      // total da loja antiga comparado com o da nova seria número inventado.
      total_reviews: total,
      ...(!atual && { plan: "free" }),
      // Termo de busca informado no onboarding (ex: "loja de bicicletas").
      // Fora da troca, só grava se veio preenchido — não apaga um override
      // existente com vazio. Na troca o termo da loja antiga não serve (era
      // "pizzaria", a nova é salão): zera e o painel volta pra categoria do Google.
      ...(cat ? { category_override: cat } : trocou ? { category_override: null } : {})
    };
    console.log("[savebiz] Tentando gravar:", { ...insertPayload, trocou });

    const { data, error } = await supabase
      .from("businesses")
      .upsert(insertPayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("[savebiz] ERRO DO SUPABASE:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log("[savebiz] Sucesso! Business salvo:", data);

    // Email "negócio vinculado" — aguardado antes do res.json
    // (serverless da Vercel corta promises órfãs depois do return)
    const userMeta = userData.user.user_metadata || {};
    const userName = userMeta.name || userMeta.full_name || (userData.user.email || "").split("@")[0] || "";
    const tmpl = businessLinkedEmail({ userName, bizName: name });
    await sendInBackground({
      userId: user_id,
      emailType: "business_linked",
      to: userData.user.email,
      subject: tmpl.subject,
      html: tmpl.html,
      metadata: { business_id: data.id, place_id, business_name: name }
    });

    if (trocou) console.log("[savebiz] TROCA DE NEGOCIO:", { business_id: data.id, de: atual.place_id, de_nome: atual.name, para: place_id });
    res.json({ ok: true, business: data, trocou });
  } catch (err) {
    console.error("[savebiz] Erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}