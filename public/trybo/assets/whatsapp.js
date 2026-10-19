// ============================================================
// TRYBO — botão flutuante do WhatsApp de atendimento (19/10/2026)
// Mesmo número e mesmo desenho do botão da StarTouch (kit.html): o
// atendimento é um só. Um arquivo pras quatro páginas da Trybo (site,
// ativação, painel, nova senha), pra que trocar o número seja trocar aqui.
// A mensagem pronta muda conforme a página: no site é quem quer comprar;
// nas outras é cliente pedindo ajuda.
// ============================================================
(function () {
  "use strict";
  if (document.getElementById("st-wa-fab")) return;

  var NUMERO = "5511976944026";
  var site = location.hostname === "trybo.co" && (location.pathname === "/" || location.pathname === "/index.html");
  var texto = site ? "Oi! Quero saber mais sobre o Trybo." : "Oi! Sou cliente Trybo e preciso de ajuda.";

  var a = document.createElement("a");
  a.id = "st-wa-fab";
  a.href = "https://wa.me/" + NUMERO + "?text=" + encodeURIComponent(texto);
  a.target = "_blank";
  a.rel = "noreferrer";
  a.setAttribute("aria-label", "Falar com a Trybo no WhatsApp (11) 97694-4026");
  a.title = "Trybo · WhatsApp (11) 97694-4026";
  a.innerHTML =
    '<span aria-hidden="true" id="st-wa-halo"></span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" style="position:relative">' +
    '<path fill="currentColor" d="M16.001 3C9.373 3 4 8.373 4 15c0 2.252.624 4.36 1.706 6.165L4 29l8.06-1.667A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3Zm0 21.6c-1.747 0-3.4-.46-4.825-1.293l-.345-.205-4.78.988.999-4.654-.225-.359A9.55 9.55 0 0 1 6.4 15c0-5.293 4.308-9.6 9.601-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6Zm5.522-7.182c-.302-.151-1.792-.884-2.07-.985-.279-.101-.481-.151-.683.151-.202.302-.783.985-.96 1.187-.176.202-.353.227-.655.076-.302-.151-1.276-.47-2.43-1.5-.898-.8-1.504-1.79-1.681-2.093-.176-.302-.019-.466.132-.616.135-.135.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.076-.151-.683-1.647-.936-2.256-.247-.594-.498-.513-.683-.523l-.581-.01c-.202 0-.53.076-.806.378-.279.302-1.061 1.037-1.061 2.528 0 1.49 1.087 2.93 1.238 3.132.151.202 2.14 3.27 5.187 4.586.725.313 1.29.5 1.731.64.727.231 1.388.198 1.91.12.583-.087 1.792-.732 2.045-1.439.252-.706.252-1.31.176-1.439-.076-.126-.279-.202-.581-.353Z"/></svg>';

  var css = document.createElement("style");
  css.textContent =
    "#st-wa-fab{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));width:56px;height:56px;border-radius:50%;" +
    "background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 8px 22px rgba(37,211,102,.38),0 2px 6px rgba(0,0,0,.1);z-index:9999;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease}" +
    "#st-wa-fab:hover{transform:translateY(-2px) scale(1.05)}" +
    "#st-wa-halo{position:absolute;inset:0;border-radius:50%;background:#25D366;opacity:.35;animation:stWaPulse 1.8s ease-out infinite}" +
    "@keyframes stWaPulse{0%{transform:scale(1);opacity:.35}70%{transform:scale(1.65);opacity:0}100%{transform:scale(1.65);opacity:0}}" +
    // Nas telas de formulário, o rodapé ganha folga pra o botão não cobrir o último campo.
    ".activation-footer{padding-bottom:84px!important}" +
    "@media (prefers-reduced-motion:reduce){#st-wa-halo{display:none}}";

  function por() {
    document.head.appendChild(css);
    document.body.appendChild(a);
    setTimeout(function () { var h = document.getElementById("st-wa-halo"); if (h) h.style.display = "none"; }, 8000);
  }
  if (document.body) por(); else document.addEventListener("DOMContentLoaded", por);
})();
