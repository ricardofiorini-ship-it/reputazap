// ============================================================
// StarTouch — Auditoria: orquestrador
// ============================================================
// Junta a camada Google (Places API) + a camada Site (fetch/parse) num único
// JSON de checklist, no formato "orçamento de oficina" do Bloco B da
// FUNIL-IMPACTO-SPEC: 3 grupos (Google, Site, Conteúdo), cada item com status
// real (pass | fail | na), + um resumo com a contagem de pendências (N ✗).
//
// A camada Google é o alicerce: se ela falhar (place_id inválido, Google fora),
// a auditoria inteira falha. A camada site é best-effort — sem site, os grupos
// de site/conteúdo somem e a página foca no perfil Google (regra da spec).
// ============================================================
import { fetchPlaceDetails, auditGoogle } from "./google.js";
import { auditSite } from "./site.js";

// Conta pass/fail/na numa lista de itens.
function tally(items) {
  return items.reduce(
    (acc, it) => {
      if (it.status === "pass") acc.passed++;
      else if (it.status === "fail") acc.pending++;
      else acc.na++;
      return acc;
    },
    { passed: 0, pending: 0, na: 0 }
  );
}

/**
 * Roda a auditoria completa de um negócio.
 * @param {object} opts
 * @param {string} opts.placeId  place_id do Google (obrigatório)
 * @param {string} [opts.site]   URL do site (opcional; se ausente, usa o site
 *                               que o Google conhece)
 * @returns {Promise<object>} JSON do checklist (ver formato no endpoint)
 */
export async function runAudit({ placeId, site }) {
  // 1) Camada Google (alicerce) — pode lançar.
  const result = await fetchPlaceDetails(placeId);
  const g = auditGoogle(result);

  // 2) Camada site — usa o site informado ou, na falta, o do Google.
  const siteUrl = (site || "").trim() || g.website || null;
  const s = await auditSite(siteUrl, { name: g.business.name, phone: g.phone });

  // 3) Monta os grupos. Sem site detectado, os grupos de site/conteúdo não
  //    entram — no lugar vai uma nota informativa (não conta como pendência).
  const groups = [
    { key: "google", title: "Perfil no Google", items: g.items },
  ];

  if (s.detected) {
    groups.push({ key: "site", title: "Site na língua dos robôs", items: s.site_items });
    groups.push({ key: "content", title: "Conteúdo e presença", items: s.content_items });
  } else {
    groups.push({
      key: "site",
      title: "Site na língua dos robôs",
      items: [],
      note: "Sem site detectado — vamos focar seu perfil Google e sua presença externa.",
    });
  }

  // 4) Resumo agregado (pendências = total de ✗).
  const allItems = groups.flatMap((grp) => grp.items);
  const summary = tally(allItems);
  summary.total_auditable = summary.passed + summary.pending;

  return {
    place_id: placeId,
    business: g.business,
    site: { detected: s.detected, url: s.url },
    groups,
    summary,
    // Atalho usado pelo widget/email/CTA ("{N} pendências").
    pendencias: summary.pending,
    generated_at: new Date().toISOString(),
  };
}
