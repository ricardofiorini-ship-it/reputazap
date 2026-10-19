import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { access_token, refresh_token, password, token_hash } = req.body || {};
  if (token_hash) return porTokenHash(res, String(token_hash), password);
  if (!access_token || !refresh_token || !password) {
    return res.status(400).json({ error: "access_token, refresh_token e password obrigatorios" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Senha precisa ter ao menos 6 caracteres" });
  }

  // Cliente com a sessao de recovery do usuario
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sessionError) {
      console.error("[reset-password] setSession:", sessionError);
      return res.status(401).json({ error: "Link de recuperacao invalido ou expirado" });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("[reset-password] updateUser:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] erro inesperado:", err);
    res.status(500).json({ error: err.message });
  }
}

// ── Link da Trybo (19/10/2026) ──────────────────────────────
// O e-mail da Trybo (api/forgot-password.js) traz `token_hash` em vez da
// sessão no fragmento da URL. Aqui ele vira sessão, a senha é trocada e a
// sessão VOLTA pra tela: a pessoa já entra no painel, sem digitar a senha
// nova logo depois de criá-la.
async function porTokenHash(res, tokenHash, password) {
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "A senha precisa de pelo menos 6 caracteres." });
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error || !data?.session) {
      return res.status(401).json({ error: "Este link expirou ou já foi usado. Peça um novo.", codigo: "link_expirado" });
    }
    const s = data.session;
    const { error: sessionError } = await supabase.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
    if (sessionError) {
      console.error("[reset-password/trybo] setSession:", sessionError);
      return res.status(401).json({ error: "Este link expirou ou já foi usado. Peça um novo.", codigo: "link_expirado" });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error("[reset-password/trybo] updateUser:", updateError);
      const igual = /different|same/i.test(updateError.message || "");
      return res.status(400).json({ error: igual ? "A senha nova precisa ser diferente da anterior." : "Não consegui trocar a senha. Tente de novo." });
    }
    const u = data.user || s.user || {};
    return res.json({
      ok: true,
      token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
      user: { id: u.id, email: u.email, name: u.user_metadata?.name || null }
    });
  } catch (err) {
    console.error("[reset-password/trybo] erro inesperado:", err);
    return res.status(500).json({ error: "Não consegui trocar a senha. Tente de novo." });
  }
}
