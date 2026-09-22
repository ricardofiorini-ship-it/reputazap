// ============================================================
// TRYBO — regras compartilhadas do cartao de redes sociais
// Arquivo _lib (prefixo _ = NAO vira function serverless na Vercel).
// ============================================================

// ── O CATALOGO DE DESTINOS, DO LADO DO CODIGO ───────────────
// A tabela `destination_kinds` do banco diz QUAIS existem e QUAIS sao
// gratis. Este mapa diz COMO se monta a URL de cada um. Sao perguntas
// diferentes, e a resposta de "e gratis?" continua morando so no banco —
// aqui nao ha copia dela, justamente pra nao existir duas verdades.
//
// `base`  → monta a URL a partir do @ digitado pelo lojista
// `livre` → o lojista cola a URL inteira (nao ha @ que resolva)
const DESTINOS = {
  instagram:      { base: "https://instagram.com/",      host: "instagram.com" },
  tiktok:         { base: "https://www.tiktok.com/@",    host: "tiktok.com" },
  youtube:        { base: "https://youtube.com/@",       host: "youtube.com" },
  whatsapp:       { telefone: true },
  linkedin:       { base: "https://linkedin.com/in/",    host: "linkedin.com" },
  kwai:           { base: "https://www.kwai.com/@",      host: "kwai.com" },
  threads:        { base: "https://threads.net/@",       host: "threads.net" },
  facebook:       { base: "https://facebook.com/",       host: "facebook.com" },
  telegram:       { base: "https://t.me/",               host: "t.me" },
  spotify:        { livre: true },
  whatsapp_canal: { livre: true },
  url:            { livre: true }
};

// ⚠️ POR QUE A REDE GRATIS NAO ACEITA URL COLADA
// Se `instagram` aceitasse qualquer endereco, o lojista apontaria o botao
// "Instagram" pro cardapio dele — e teria o Link Livre, que custa R$ 49, de
// graca. A trava nao e de confianca no cliente: e que sem ela o produto pago
// deixa de existir. Rede gratis so monta URL a partir do @; quem quer apontar
// pra onde quiser compra o desbloqueio.
export function montarUrl(kind, valor) {
  const spec = DESTINOS[kind];
  if (!spec) throw new Error(`Destino "${kind}" não existe.`);

  const bruto = String(valor || "").trim();
  if (!bruto) throw new Error("Preencha o destino.");

  if (spec.livre) {
    if (!/^https?:\/\//i.test(bruto)) throw new Error("Cole o endereço completo, começando com https://");
    return bruto.slice(0, 500);
  }

  if (spec.telefone) {
    // WhatsApp: o lojista digita o telefone. Sobra so digito.
    let d = bruto.replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;      // sem DDI
    if (d.length < 12 || d.length > 13) throw new Error("Telefone inválido. Use DDD + número.");
    return `https://wa.me/${d}`;
  }

  // Rede com @: aceita "@fulano", "fulano" ou a URL do proprio perfil colada
  // (caso comum — a pessoa copia da barra do navegador). Do endereco a gente
  // aproveita SO o ultimo pedaco, e so se o dominio for o certo.
  let handle = bruto;
  if (/^https?:\/\//i.test(bruto)) {
    let u;
    try { u = new URL(bruto); } catch { throw new Error("Endereço inválido."); }
    const host = u.hostname.replace(/^www\./, "");
    if (host !== spec.host && !host.endsWith("." + spec.host)) {
      throw new Error(`Esse endereço não é do ${kind}. Digite só o @, sem o link.`);
    }
    handle = u.pathname.split("/").filter(Boolean).pop() || "";
  }
  handle = handle.replace(/^@+/, "").replace(/[^A-Za-z0-9._\-]/g, "");
  if (!handle) throw new Error("Digite o @ do perfil.");
  return spec.base + handle.slice(0, 80);
}

export function destinoExiste(kind) {
  return Object.prototype.hasOwnProperty.call(DESTINOS, kind);
}

// ============================================================
// RECALCULAR O QUE O CARTAO SERVE
// ============================================================
// O elo entre o painel e o cartao no balcao. Chamado sempre que algo que
// afeta o destino muda: salvou destinos, ativou o cartao, comprou o
// desbloqueio, varredura diaria.
//
// Quem decide o que passa e a funcao do BANCO (trybo_destinos_resolvidos),
// nao este arquivo — e ela tambem quem aplica a rede de seguranca do
// downgrade. Duplicar a regra aqui criaria duas camadas ordenando a mesma
// lista, que e o erro mais caro que este projeto ja cometeu: muda-se uma e
// nada acontece, sem erro nenhum.
//
// Este arquivo faz uma coisa a mais, e so uma: traduz o resultado em MOTIVO,
// pra tela conseguir explicar. Sem isso, um destino sumir por causa de
// cobranca pareceria configuracao perdida.
export async function recalcularCartao(supabase, plateId) {
  const { data: plate, error: plateErr } = await supabase
    .from("plates")
    .select("id, linha")
    .eq("id", plateId)
    .maybeSingle();
  if (plateErr) throw new Error("Não consegui ler o cartão: " + plateErr.message);
  if (!plate) throw new Error("Cartão não encontrado.");

  // Guarda-corpo: esta função escreve served_mode='social'. Rodá-la num
  // dispositivo de avaliação trocaria o destino de um cliente da StarTouch.
  if (plate.linha !== "social") {
    throw new Error(`recalcularCartao só vale para cartão Trybo (linha='social'), e este é '${plate.linha}'.`);
  }

  // Quantos o lojista configurou (antes do filtro de plano).
  const { count: configurados, error: cntErr } = await supabase
    .from("plate_destinations")
    .select("*", { count: "exact", head: true })
    .eq("plate_id", plateId);
  if (cntErr) throw new Error("Não consegui contar os destinos: " + cntErr.message);

  // Quantos sobrevivem ao plano.
  const { data: resolvidos, error: rpcErr } = await supabase
    .rpc("trybo_destinos_resolvidos", { p_plate: plateId });
  if (rpcErr) throw new Error("Não consegui resolver os destinos: " + rpcErr.message);

  const lista = Array.isArray(resolvidos) ? resolvidos : [];

  let motivo = "padrao";                       // nada configurado ainda
  if (lista.length > 0) {
    motivo = (configurados || 0) > lista.length ? "rebaixado_plano" : "publicado";
  }

  const { error: updErr } = await supabase
    .from("plates")
    .update({
      served_destinations: lista,
      served_mode: "social",
      served_reason: motivo,
      served_at: new Date().toISOString()
    })
    .eq("id", plateId);
  // Este erro NAO pode passar calado: sem ele o painel diria "salvo" e o
  // cartao no balcao continuaria servindo o destino antigo.
  if (updErr) throw new Error("Não consegui gravar o destino no cartão: " + updErr.message);

  return { destinos: lista, motivo, configurados: configurados || 0 };
}
