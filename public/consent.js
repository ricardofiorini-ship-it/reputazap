// ============================================================
// StarTouch — Consentimento de cookies + Google Consent Mode v2
// ============================================================
// Carregado com <script src="/consent.js"></script> no <head>, ANTES de
// qualquer tag. Ele é quem carrega o GA4 e o Meta Pixel — nunca o contrário.
// A ordem importa: o `consent default` precisa existir antes de a tag subir,
// senão a primeira medição sai com cookie mesmo sem consentimento.
//
// Consent Mode v2 NÃO bloqueia o GA4: sem consentimento ele manda ping sem
// cookie e sem identificador, o que alimenta a modelagem de conversão. É a
// diferença entre "não medir" e "medir sem identificar". O Meta Pixel não tem
// Consent Mode — ali é bloqueio de verdade (`fbq('consent','revoke')`).
//
// REGRAS QUE NÃO MUDAM:
//   • Aceitar e recusar têm o MESMO peso visual e a MESMA distância (1 clique).
//     Consentimento sob a LGPD precisa ser livre (Art. 5º, XII); banner onde
//     recusar exige submenu produz consentimento viciado, que juridicamente
//     equivale a nenhum.
//   • NADA de aceite por rolagem ou navegação continuada. Só clique afirmativo.
//   • Quem não decide fica NEGADO e o banner volta na próxima visita.
//   • A /avaliar não carrega este arquivo. Quem passa por lá é o consumidor do
//     lojista, que não tem relação com a StarTouch. Não reintroduzir.
// ============================================================
(function () {
  "use strict";

  var GA4_ID = "G-HCLV0Z640L";
  var PIXEL_ID = "767972996338904";
  var COOKIE = "st_consent";
  var MESES = 12;

  // Cinto e suspensório: mesmo que alguém inclua este arquivo na /avaliar por
  // engano, ele não faz nada lá.
  if (/^\/avaliar/.test(location.pathname)) return;

  // MODO SÓ-PREFERÊNCIAS (<script src="/consent.js" data-prefs-only>):
  // usado pelas páginas legais. Elas NÃO carregam GA4 nem Pixel — quem abre uma
  // política de privacidade não pode ser rastreado por abri-la — mas precisam
  // oferecer o link de revogação prometido no §6.1. Aqui o arquivo só salva a
  // decisão no cookie; ela passa a valer na próxima página que tem tag.
  var SO_PREFS = !!(document.currentScript && document.currentScript.hasAttribute("data-prefs-only"));

  // ── A CATRACA: contagem agregada, FORA do consentimento ─────
  // Isto NÃO é uma tag e NÃO passa pelo aceite. É deliberado, e a razão
  // precisa estar escrita aqui pra ninguém "consertar" isso depois:
  //
  // O GA4 só conta quem aceita cookies. Medido em 02/09/2026: 1.100
  // carregamentos reais no servidor contra 195 registrados pelo GA4 em 7 dias.
  // O site inteiro virou invisível pra si mesmo, e a queda apareceu como se
  // fosse menos gente entrando. A catraca conta a PORTA — dia, página e
  // origem, somados num balde. Sem IP, sem user agent, sem cookie, sem id de
  // navegador, sem hora exata. Nada que individualize, logo não é dado
  // pessoal (LGPD Art. 5º, I) e não há o que consentir.
  // Declarado na Política §6.5. Detalhe em supabase/schema-visitas.sql.
  //
  // Mora AQUI, e não num arquivo próprio, de propósito: o check-tracking.mjs
  // já garante que o consent.js está em toda página pública e em nenhuma
  // página proibida. Pendurar a catraca nele faz ela herdar essa garantia —
  // em vez de virar mais um arquivo que alguém esquece de incluir. Foi
  // exatamente esse esquecimento que deixou o /app dez dias sem medição.
  //
  // Não roda na /avaliar (o `return` lá em cima já barrou) nem nas páginas
  // legais: quem abre uma política de privacidade não é contado por abri-la.
  function contarVisita() {
    try {
      var q = new URLSearchParams(location.search);
      var ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
      var externo = ref && ref !== location.hostname;
      var corpo = JSON.stringify({
        path: location.pathname,
        // Sem UTM, a origem é o site que mandou. O navegador interno do
        // Instagram costuma não mandar referrer nenhum — esse caso cai em
        // "(direto)" no servidor, e é uma limitação conhecida, não um bug.
        source: q.get("utm_source") || (externo ? ref : ""),
        medium: q.get("utm_medium") || (externo ? "referencia" : ""),
        campaign: q.get("utm_campaign") || ""
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/visitas", new Blob([corpo], { type: "application/json" }));
      } else {
        fetch("/api/visitas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: corpo,
          keepalive: true
        });
      }
    } catch (e) {
      /* a catraca nunca pode quebrar a página */
    }
  }
  if (!SO_PREFS) contarVisita();

  // ── Estado salvo ────────────────────────────────────────────
  function ler() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    if (!m) return null;
    try {
      var v = JSON.parse(decodeURIComponent(m[1]));
      return v && typeof v === "object" ? v : null;
    } catch (e) { return null; }
  }

  function salvar(estado) {
    var exp = new Date();
    exp.setMonth(exp.getMonth() + MESES);
    document.cookie = COOKIE + "=" + encodeURIComponent(JSON.stringify(estado)) +
      ";path=/;expires=" + exp.toUTCString() + ";SameSite=Lax" +
      (location.protocol === "https:" ? ";Secure" : "");
  }

  // `gtag` no escopo do módulo (NÃO dentro do if): declaração de função dentro
  // de bloco é block-scoped em modo estrito, e aplicar() lá embaixo só a
  // acharia por acidente, via window. Definir aqui é o que a torna visível.
  window.dataLayer = window.dataLayer || [];
  var gtag = function () { window.dataLayer.push(arguments); };
  window.gtag = gtag;

  // ── Consent Mode v2: DEFAULT NEGADO, antes de qualquer tag ──
  // (pulado inteiro no modo só-preferências: não há tag pra governar)
  if (!SO_PREFS) {
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",  // sessão/segurança: cookies necessários
    security_storage: "granted",
    // Segura os disparos meio segundo pra quem já decidiu em visita anterior,
    // pra não perder o pageview enquanto o `update` não chegou.
    wait_for_update: 500
  });

  // ── Meta Pixel: stub + revoke ANTES do init ─────────────────
  // Sem Consent Mode aqui. O revoke enfileira os eventos; nada sai até o grant.
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  fbq("consent", "revoke");
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");

  // ── GA4 ─────────────────────────────────────────────────────
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
  document.head.appendChild(s);
  gtag("js", new Date());
  gtag("config", GA4_ID);
  } // fim do !SO_PREFS

  // ── Aplica a decisão ────────────────────────────────────────
  function aplicar(estado) {
    // Sem tag na página (modo só-preferências): a decisão fica no cookie e vale
    // na próxima página que tiver tag. Chamar gtag/fbq aqui estouraria.
    if (SO_PREFS) return;
    gtag("consent", "update", {
      analytics_storage: estado.analise ? "granted" : "denied",
      ad_storage: estado.publicidade ? "granted" : "denied",
      ad_user_data: estado.publicidade ? "granted" : "denied",
      ad_personalization: estado.publicidade ? "granted" : "denied"
    });
    fbq("consent", estado.publicidade ? "grant" : "revoke");
  }

  var salvo = ler();
  if (salvo) aplicar(salvo);

  // ── Interface ───────────────────────────────────────────────
  var CSS =
    '.stc-backdrop{position:fixed;inset:0;background:rgba(32,33,36,.45);z-index:2147483646;}' +
    '.stc{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#fff;' +
    'border-top:1px solid #DADCE0;box-shadow:0 -4px 24px rgba(60,64,67,.14);' +
    "font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:#202124;}" +
    '.stc-in{max-width:900px;margin:0 auto;padding:20px 24px;display:flex;gap:20px;' +
    'align-items:center;flex-wrap:wrap;}' +
    '.stc-txt{flex:1 1 320px;font-size:13.5px;line-height:1.6;color:#5F6368;}' +
    '.stc-txt strong{color:#202124;display:block;font-size:15px;margin-bottom:4px;}' +
    '.stc-txt a{color:#1A73E8;text-decoration:none;}.stc-txt a:hover{text-decoration:underline;}' +
    '.stc-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}' +
    // Aceitar e recusar: mesmo tamanho, mesma fonte, mesmo padding. Só a cor muda.
    '.stc-b{font:700 14px/1 Inter,system-ui,sans-serif;padding:12px 22px;border-radius:8px;' +
    'cursor:pointer;border:1px solid #DADCE0;background:#fff;color:#202124;min-width:132px;}' +
    '.stc-b:hover{background:#F1F3F4;}' +
    '.stc-b--ok{background:#1A73E8;border-color:#1A73E8;color:#fff;}' +
    '.stc-b--ok:hover{background:#174EA6;}' +
    '.stc-link{background:none;border:0;color:#5F6368;font:500 13px Inter,system-ui,sans-serif;' +
    'cursor:pointer;text-decoration:underline;padding:8px;}' +
    '.stc-modal{position:fixed;z-index:2147483647;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;' +
    'border-radius:14px;padding:28px;box-shadow:0 24px 64px rgba(60,64,67,.3);' +
    "font-family:'Inter',system-ui,sans-serif;color:#202124;}" +
    '.stc-modal h2{margin:0 0 6px;font-size:19px;}' +
    '.stc-opt{display:flex;gap:12px;padding:16px 0;border-top:1px solid #E8EAED;}' +
    '.stc-opt input{margin-top:3px;width:17px;height:17px;accent-color:#1A73E8;}' +
    '.stc-opt b{display:block;font-size:14px;}' +
    '.stc-opt span{font-size:12.5px;color:#5F6368;line-height:1.55;}';

  function css() {
    if (document.getElementById("stc-css")) return;
    var st = document.createElement("style");
    st.id = "stc-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function remover(id) {
    var el = document.getElementById(id);
    if (el) el.parentNode.removeChild(el);
  }

  function decidir(analise, publicidade) {
    var estado = { analise: analise, publicidade: publicidade, em: new Date().toISOString() };
    salvar(estado); aplicar(estado);
    remover("stc-banner"); remover("stc-modal"); remover("stc-backdrop");
  }

  function banner() {
    css();
    var d = document.createElement("div");
    d.id = "stc-banner"; d.className = "stc";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Aviso de cookies");
    d.innerHTML =
      '<div class="stc-in">' +
        '<div class="stc-txt"><strong>Cookies</strong>' +
        'Usamos cookies necessários para o site funcionar. Com a sua permissão, também usamos cookies ' +
        'de análise e de publicidade para entender o uso das páginas e medir campanhas. ' +
        'Veja a <a href="/privacidade">Política de Privacidade</a>.</div>' +
        '<div class="stc-acts">' +
          '<button type="button" class="stc-b" id="stc-no">Recusar</button>' +
          '<button type="button" class="stc-b stc-b--ok" id="stc-yes">Aceitar</button>' +
          '<button type="button" class="stc-link" id="stc-pref">Preferências</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    document.getElementById("stc-yes").onclick = function () { decidir(true, true); };
    document.getElementById("stc-no").onclick = function () { decidir(false, false); };
    document.getElementById("stc-pref").onclick = modal;
  }

  function modal() {
    css();
    var atual = ler() || { analise: false, publicidade: false };
    var bd = document.createElement("div");
    bd.id = "stc-backdrop"; bd.className = "stc-backdrop";
    var m = document.createElement("div");
    m.id = "stc-modal"; m.className = "stc-modal";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML =
      '<h2>Preferências de cookies</h2>' +
      '<div class="stc-opt"><input type="checkbox" checked disabled/>' +
        '<div><b>Necessários</b><span>Sessão, segurança e o registro da sua escolha aqui. ' +
        'Não podem ser desativados.</span></div></div>' +
      '<div class="stc-opt"><input type="checkbox" id="stc-an"' + (atual.analise ? " checked" : "") + '/>' +
        '<div><b>Análise</b><span>Google Analytics 4, para entender como as páginas são usadas.</span></div></div>' +
      '<div class="stc-opt"><input type="checkbox" id="stc-ad"' + (atual.publicidade ? " checked" : "") + '/>' +
        '<div><b>Publicidade</b><span>Meta Pixel, para medir campanhas e apresentar anúncios.</span></div></div>' +
      '<div class="stc-acts" style="margin-top:20px;justify-content:flex-end;">' +
        '<button type="button" class="stc-b" id="stc-cancel">Cancelar</button>' +
        '<button type="button" class="stc-b stc-b--ok" id="stc-save">Salvar</button>' +
      '</div>';
    document.body.appendChild(bd);
    document.body.appendChild(m);
    document.getElementById("stc-save").onclick = function () {
      decidir(document.getElementById("stc-an").checked, document.getElementById("stc-ad").checked);
    };
    document.getElementById("stc-cancel").onclick = function () {
      remover("stc-modal"); remover("stc-backdrop");
      // Cancelar não decide nada: se ainda não havia decisão, o banner fica.
      if (!ler() && !document.getElementById("stc-banner")) banner();
    };
  }

  // Reabrir pelo link "Preferências de cookies" do rodapé.
  window.stConsent = { abrir: modal };

  // Sem decisão salva → banner. NUNCA por rolagem ou navegação: só clique.
  if (!salvo && !SO_PREFS) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", banner);
    } else { banner(); }
  }
})();
