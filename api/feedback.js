import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fallback pra resend.dev (compartilhado, funciona enquanto domínio próprio
// não estiver verificado). Quando setar RESEND_FROM no Vercel pra
// "StarTouch <feedback@startouch.com.br>", troca automático.
const EMAIL_FROM = process.env.RESEND_FROM || "StarTouch <onboarding@resend.dev>";

const EMAIL_FOOTER = `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#80868B;line-height:1.6;text-align:center;">
  <strong style="color:#00C49A;">StarTouch</strong> — Plataforma de relacionamento local<br/>
  <a href="https://startouch.com.br/app" style="color:#00C49A;text-decoration:none;">Abrir painel</a> &middot; <a href="https://startouch.com.br" style="color:#00C49A;text-decoration:none;">startouch.com.br</a>
</div>`;

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

// ─────────────────────────────────────────────────────────────
// DONO DO FEEDBACK (fechado em 05/ago/2026)
//
// Os ramos "responder ao cliente" e "atualizar" aceitavam qualquer POST com um
// `id`: sem login, sem nada. Quem descobrisse um id disparava email saindo de
// feedback@startouch.com.br, assinado com o nome do negócio do cliente, com
// texto livre — phishing com a nossa reputação — e podia alterar o status de
// feedback alheio. O id é um UUID (difícil de adivinhar), mas segredo de URL
// não é controle de acesso: ele vaza em log, histórico e print.
//
// Duas checagens, nesta ordem: (1) o token é válido? (2) o feedback pertence a
// um negócio DESTE usuário? A segunda é a que importa — só exigir login deixaria
// qualquer cliente cadastrado responder pelo feedback de outro.
// ─────────────────────────────────────────────────────────────

/** Valida o token. Devolve { user } ou { erro, status }. */
async function usuarioDoToken(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return { erro: "Token obrigatório", status: 401 };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { erro: "Token inválido", status: 401 };
  return { user: data.user };
}

/**
 * Confere que o feedback existe E é de um negócio do usuário.
 * Devolve { fb, biz } ou { erro, status }.
 *
 * Responde 404 (e não 403) pro feedback de outra pessoa: 403 confirmaria que
 * aquele id existe. Mesmo raciocínio do 404 nos diagnósticos do billing.
 */
async function feedbackDoUsuario(user_id, feedbackId) {
  const { data: fb, error } = await supabase
    .from("feedbacks")
    .select("id, place_id, contact, text, rating")
    .eq("id", feedbackId)
    .maybeSingle();
  if (error) {
    // Falha de banco NÃO é "não encontrado" — dizer 404 aqui mandaria o dono
    // caçar um problema que não existe. 503 diz a verdade: o banco tropeçou.
    console.error("[feedback/auth] erro ao buscar feedback:", error);
    return { erro: "Banco indisponível — tente de novo em instantes", status: 503 };
  }
  if (!fb) return { erro: "Feedback não encontrado", status: 404 };

  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name, user_id")
    .eq("place_id", fb.place_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (bizErr) {
    console.error("[feedback/auth] erro ao buscar negócio:", bizErr);
    return { erro: "Banco indisponível — tente de novo em instantes", status: 503 };
  }
  if (!biz) {
    console.warn(`[feedback/auth] usuário ${user_id} tentou mexer no feedback ${feedbackId}, que não é de um negócio dele`);
    return { erro: "Feedback não encontrado", status: 404 };
  }
  return { fb, biz };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET = lista feedbacks pendentes (rota antiga: /api/feedbacks)
  if (req.method === "GET") return listPending(req, res);

  if (req.method !== "POST") return res.status(405).end();

  const { place_id, text, rating, id, decision, contact, would_have_reviewed_negative, resolved, reply_text, category, sender_name } = req.body;

  // RESPONDER AO CLIENTE (in-app reply): id + reply_text
  if (id && reply_text) {
    const cleanReply = (reply_text || "").trim();
    if (!cleanReply) return res.status(400).json({ error: "reply_text vazio" });
    try {
      // AUTH: precisa estar logado E ser o dono do negócio deste feedback.
      // Este ramo dispara email em nome do negócio — é o de maior estrago.
      const auth = await usuarioDoToken(req);
      if (auth.erro) return res.status(auth.status).json({ error: auth.erro });
      const dono = await feedbackDoUsuario(auth.user.id, id);
      if (dono.erro) return res.status(dono.status).json({ error: dono.erro });

      const { fb, biz } = dono;
      if (!fb.contact || !fb.contact.includes("@")) {
        return res.status(400).json({ error: "Cliente não deixou email — use o botão de WhatsApp" });
      }
      const bizName = biz?.name || "Seu negócio";

      // Envia email pro cliente
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        // Sem o contato: e-mail/telefone de consumidor final não vai pra log.
        console.log("[feedback/reply] RESEND_API_KEY ausente — pulando envio do feedback", id);
      } else {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;">
            <h2 style="color:#00C49A;margin-bottom:8px;">Resposta de ${bizName}</h2>
            <p style="color:#5F6368;font-size:14px;margin-top:0;">Obrigado por nos enviar seu feedback. Veja a resposta do estabelecimento:</p>
            <div style="background:#F8F9FA;border-left:4px solid #00C49A;border-radius:8px;padding:18px 22px;margin:20px 0;font-size:15px;line-height:1.6;color:#202124;white-space:pre-wrap;">${cleanReply.replace(/[<>&"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]))}</div>
            <p style="font-size:12px;color:#80868B;line-height:1.6;">Esta é uma resposta privada. Se quiser conversar mais, basta responder este email.</p>
            ${EMAIL_FOOTER}
          </div>
        `;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM,
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
      if (updErr) {
        // O email JÁ FOI. Não dá pra fingir sucesso completo: o dono veria o
        // feedback voltar à lista de pendentes e responderia de novo, mandando
        // dois emails pro mesmo cliente. Melhor dizer o que houve.
        console.error("[feedback/reply] resposta enviada mas NÃO salva:", updErr);
        return res.status(500).json({
          error: "Sua resposta foi enviada ao cliente, mas não conseguimos registrar aqui. Não responda de novo — o cliente já recebeu."
        });
      }

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

    // AUTH: mesmo tratamento do ramo de resposta. Este ramo nasceu para a
    // "peneira" (o visitante escolhia resolver no privado ou publicar), mas a
    // peneira foi REMOVIDA em 2026-05-23 — as telas ficaram como código morto e
    // nunca aparecem. Hoje quem chama aqui é só o painel do dono, marcando como
    // resolvido. Por isso dá pra exigir login no ramo inteiro sem quebrar o
    // visitante: não existe mais visitante chamando isto.
    const auth = await usuarioDoToken(req);
    if (auth.erro) return res.status(auth.status).json({ error: auth.erro });
    const dono = await feedbackDoUsuario(auth.user.id, id);
    if (dono.erro) return res.status(dono.status).json({ error: dono.erro });

    const patch = {};
    if (decision) patch.decision = decision;
    if (contact !== undefined) patch.contact = contact || null;
    if (would_have_reviewed_negative !== undefined) patch.would_have_reviewed_negative = !!would_have_reviewed_negative;
    if (resolved !== undefined) patch.resolved_at = resolved ? new Date().toISOString() : null;
    const { error: updError } = await supabase
      .from("feedbacks")
      .update(patch)
      .eq("id", id);
    if (updError) {
      // Antes isto respondia ok:true com o banco tendo recusado a escrita. O
      // painel some com o item da lista na hora (update otimista) e o dono
      // acredita que resolveu — até o item reaparecer no próximo carregamento,
      // sem explicação. Devolver erro faz o painel desfazer e avisar.
      console.error("[feedback] Erro ao atualizar:", updError);
      return res.status(500).json({ error: "Não foi possível salvar. Tente de novo." });
    }
    return res.json({ ok: true });
  }

  // ── PORTA FECHADA: insert anônimo de feedback ──────────────────────────
  // Este ramo era o formulário privado da "peneira", removida em 2026-05-23.
  // Nenhuma tela chama mais: avaliar.html não tem formulário (só "Obrigado" e
  // "Erro") e o painel usa exclusivamente os ramos com `id`, que já exigem
  // login desde 05/08. Ficava aberto SEM autenticação, aceitando gravar nome,
  // telefone e e-mail de CONSUMIDOR FINAL vindos de qualquer origem.
  // Fechado em 22/08/2026: a Política de Privacidade declara "não há
  // formulário, não há cadastro" (§4.1) e isso precisa ser verdade no código.
  //
  // ATENÇÃO: este guard sozinho NÃO fechava a porta. Havia uma policy de RLS
  // ("Service can insert feedbacks", INSERT, roles={public}, with_check=true)
  // que permitia gravar direto pela chave anônima, sem passar por aqui. Ela foi
  // removida junto. Se um dia a peneira voltar, reabrir os DOIS lados de
  // propósito — e antes fechar contrato de operador com o lojista, que nesse
  // fluxo é o controlador do dado do consumidor.
  return res.status(410).json({ error: "Este canal foi descontinuado." });
}
