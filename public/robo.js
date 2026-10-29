/* ============================================================
 * Assistente da loja — a janela (29/10/2026)
 * ============================================================
 * Conversa com /api/robo e EXECUTA na página o que ele pede: rolar até um
 * produto e destacá-lo, passar a demonstração do toque, pôr no carrinho, abrir
 * o pagamento, oferecer o WhatsApp. Só mexe na loja pela ponte `window.stLoja`
 * (fim do kit.html) — nunca em preço nem no checkout em si.
 *
 * TESTE MEIO A MEIO. Metade de quem visita vê o assistente ("com"), metade
 * não ("sem"). O sorteio fica no localStorage (`st_robo_grupo`): é um balde,
 * não um identificador — não sai do aparelho a não ser como "com"/"sem"/
 * "conversou" no pedido (billing.js → shipping.robo) e nos contadores da
 * catraca (/api/visitas, path /robo/...). `?robo=1` força o assistente,
 * `?robo=0` esconde — pra testar sem depender do sorteio.
 *
 * A CONVERSA NÃO SAI DAQUI pra ser guardada: fica no sessionStorage (some ao
 * fechar a aba) e vai inteira ao servidor a cada mensagem só pra IA responder.
 * Política de Privacidade 1.17, §3.1.
 * ============================================================ */
(function () {
  "use strict";
  if (window.stRobo) return;
  var loja = window.stLoja;
  if (!loja) return;

  // ---------- grupo do teste ----------
  var K_GRUPO = "st_robo_grupo", K_CONVERSOU = "st_robo_conversou", K_CONVERSA = "st_robo_conversa", K_VISTO = "st_robo_visto";
  function ler(st, k) { try { return st.getItem(k); } catch (e) { return null; } }
  function gravar(st, k, v) { try { st.setItem(k, v); } catch (e) {} }

  var qs = new URLSearchParams(location.search);
  var grupo = ler(localStorage, K_GRUPO);
  if (grupo !== "com" && grupo !== "sem") {
    grupo = Math.random() < 0.5 ? "com" : "sem";
    gravar(localStorage, K_GRUPO, grupo);
  }
  if (qs.get("robo") === "1") grupo = "com";
  if (qs.get("robo") === "0") grupo = "sem";

  // "conversou" vale 30 dias: quem conversou hoje e volta amanhã pra comprar
  // ainda conta como venda com conversa.
  function conversou() {
    var t = parseInt(ler(localStorage, K_CONVERSOU) || "0", 10);
    return t && Date.now() - t < 30 * 86400000;
  }
  window.stRobo = { grupoDoPedido: function () { return grupo === "sem" ? "sem" : (conversou() ? "conversou" : "com"); } };

  // ---------- contadores (catraca, sem dado pessoal) ----------
  function contar(evento) {
    try {
      var corpo = JSON.stringify({
        path: "/robo/" + evento,
        source: qs.get("utm_source") || location.pathname,
        medium: qs.get("utm_medium") || "",
        campaign: grupo
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/visitas", new Blob([corpo], { type: "application/json" }));
      else fetch("/api/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true });
      if (typeof window.gtag === "function") window.gtag("event", "assistente", { acao: evento, grupo: grupo });
    } catch (e) { /* contador nunca quebra a página */ }
  }
  if (!ler(sessionStorage, K_VISTO)) { gravar(sessionStorage, K_VISTO, "1"); contar("visto-" + grupo); }
  if (grupo === "sem") return;

  // ---------- textos da janela (a resposta da IA já vem na língua da pessoa) ----------
  var L = (window.stLang || "pt").slice(0, 2);
  var TX = {
    pt: { nome: "Assistente StarTouch", sub: "Inteligência artificial · responde na hora",
      ola: "Oi! Sou o assistente virtual da StarTouch, uma inteligência artificial. Posso te mostrar como funciona, ajudar a escolher e até ver como a sua empresa aparece no Google agora. Que tipo de negócio você tem?",
      chips: ["Como funciona?", "Qual devo escolher?", "Ver minha empresa no Google", "Frete e prazo"],
      ph: "Escreva sua pergunta…", enviar: "Enviar", fechar: "Fechar", abrir: "Falar com o assistente",
      aviso: "IA: pode errar. A conversa não é guardada; não escreva dados pessoais.", politica: "Privacidade",
      teaser: "Quer ajuda pra escolher? Vejo sua empresa no Google em 10 segundos.",
      erro: "Não consegui responder agora. Quer falar com a gente no WhatsApp?", limite: "Muitas mensagens em pouco tempo. Continue pelo WhatsApp:",
      wa: "Continuar no WhatsApp", verCarrinho: "Ver carrinho", pagar: "Finalizar compra", demo: "Encostou, avaliou." },
    en: { nome: "StarTouch Assistant", sub: "Artificial intelligence · instant replies",
      ola: "Hi! I'm StarTouch's virtual assistant, an artificial intelligence. I can show you how it works, help you choose, and even check how your business looks on Google right now. What kind of business do you have?",
      chips: ["How does it work?", "Which one should I pick?", "Check my business on Google", "Shipping and delivery"],
      ph: "Type your question…", enviar: "Send", fechar: "Close", abrir: "Chat with the assistant",
      aviso: "AI: it can make mistakes. The chat isn't stored; don't share personal data.", politica: "Privacy",
      teaser: "Need help choosing? I'll check your business on Google in 10 seconds.",
      erro: "I couldn't answer right now. Want to talk to us on WhatsApp?", limite: "Too many messages in a short time. Continue on WhatsApp:",
      wa: "Continue on WhatsApp", verCarrinho: "View cart", pagar: "Checkout", demo: "Tap, review." },
    es: { nome: "Asistente StarTouch", sub: "Inteligencia artificial · responde al instante",
      ola: "¡Hola! Soy el asistente virtual de StarTouch, una inteligencia artificial. Puedo mostrarte cómo funciona, ayudarte a elegir y ver ahora mismo cómo aparece tu empresa en Google. ¿Qué tipo de negocio tienes?",
      chips: ["¿Cómo funciona?", "¿Cuál elijo?", "Ver mi empresa en Google", "Envío y plazo"],
      ph: "Escribe tu pregunta…", enviar: "Enviar", fechar: "Cerrar", abrir: "Hablar con el asistente",
      aviso: "IA: puede equivocarse. La conversación no se guarda; no escribas datos personales.", politica: "Privacidad",
      teaser: "¿Te ayudo a elegir? Veo tu empresa en Google en 10 segundos.",
      erro: "No pude responder ahora. ¿Hablamos por WhatsApp?", limite: "Demasiados mensajes en poco tiempo. Sigue por WhatsApp:",
      wa: "Seguir en WhatsApp", verCarrinho: "Ver carrito", pagar: "Finalizar compra", demo: "Acercó, reseñó." },
    zh: { nome: "StarTouch 助手", sub: "人工智能 · 即时回复",
      ola: "你好！我是 StarTouch 的虚拟助手，一个人工智能。我可以演示它如何运作、帮你挑选，还能马上查看你的商家在 Google 上的表现。你经营什么类型的生意？",
      chips: ["怎么用？", "我该选哪个？", "查看我的商家", "运费和时效"],
      ph: "输入你的问题…", enviar: "发送", fechar: "关闭", abrir: "与助手聊天",
      aviso: "人工智能可能出错。对话不会被保存；请勿填写个人信息。", politica: "隐私",
      teaser: "需要帮你挑选吗？10 秒查看你的商家在 Google 上的情况。",
      erro: "暂时无法回答。要通过 WhatsApp 联系我们吗？", limite: "消息过于频繁。请通过 WhatsApp 继续：",
      wa: "在 WhatsApp 继续", verCarrinho: "查看购物车", pagar: "去结算", demo: "一碰即评。" }
  };
  var T = TX[L] || TX.pt;
  var WA = "5511976944026";
  var celular = function () { return window.matchMedia("(max-width:759px)").matches; };

  // ---------- estilo ----------
  var css = "" +
    ".str-root{--a:#1A73E8;--ae:#1557B0;--as:#E8F0FE;--t:#0f172a;--m:#64748b;--b:#e5e7eb;font-family:inherit;}" +
    ".str-fab{position:fixed;left:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:9998;height:56px;padding:0 18px 0 8px;border:none;border-radius:999px;background:var(--a);color:#fff;display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 10px 24px -6px rgba(26,115,232,.55);transition:transform .18s ease}" +
    ".str-fab:hover{transform:translateY(-2px)}" +
    "body.sticky-on .str-fab,body.sticky-on .str-teaser{bottom:calc(82px + env(safe-area-inset-bottom,0px))}" +
    ".str-cara{width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}" +
    ".str-olho{animation:strPisca 4.5s infinite;transform-origin:center}" +
    "@keyframes strPisca{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}" +
    ".str-teaser{position:fixed;left:20px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:9998;max-width:270px;background:#fff;color:var(--t);border:1px solid var(--b);border-radius:16px 16px 16px 4px;padding:12px 34px 12px 14px;font-size:14px;line-height:1.4;box-shadow:0 14px 34px -12px rgba(15,23,42,.35);cursor:pointer;animation:strSobe .35s ease}" +
    "body.sticky-on .str-teaser{bottom:calc(148px + env(safe-area-inset-bottom,0px))}" +
    ".str-teaser button{position:absolute;top:6px;right:6px;border:none;background:none;color:var(--m);font-size:18px;cursor:pointer;width:24px;height:24px}" +
    "@keyframes strSobe{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
    ".str-painel{position:fixed;left:20px;bottom:20px;z-index:9999;width:380px;height:min(600px,calc(100vh - 110px));background:#fff;border:1px solid var(--b);border-radius:20px;box-shadow:0 24px 60px -18px rgba(15,23,42,.45);display:flex;flex-direction:column;overflow:hidden;animation:strSobe .25s ease}" +
    "@media(max-width:759px){.str-painel{left:0;right:0;bottom:0;width:auto;height:62vh;border-radius:20px 20px 0 0}.str-fab{left:14px;padding-right:14px}.str-teaser{left:14px}}" +
    ".str-topo{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;background:var(--a);color:#fff}" +
    ".str-topo .str-cara{width:36px;height:36px}" +
    ".str-topo b{display:block;font-size:15px}.str-topo small{display:block;font-size:12px;opacity:.85}" +
    ".str-x{margin-left:auto;border:none;background:rgba(255,255,255,.18);color:#fff;width:34px;height:34px;border-radius:10px;font-size:20px;cursor:pointer}" +
    ".str-lista{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}" +
    ".str-msg{max-width:86%;padding:10px 13px;border-radius:16px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
    ".str-ia{align-self:flex-start;background:#fff;border:1px solid var(--b);color:var(--t);border-bottom-left-radius:4px}" +
    ".str-eu{align-self:flex-end;background:var(--a);color:#fff;border-bottom-right-radius:4px}" +
    ".str-chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}" +
    ".str-chip{border:1px solid var(--a);background:#fff;color:var(--a);border-radius:999px;padding:7px 12px;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}" +
    ".str-chip.cheio{background:var(--a);color:#fff}.str-chip.wa{border-color:#1E8E3E;background:#1E8E3E;color:#fff}" +
    ".str-dig{align-self:flex-start;background:#fff;border:1px solid var(--b);border-radius:16px;padding:12px 14px;display:flex;gap:4px}" +
    ".str-dig i{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:strDig 1s infinite}.str-dig i:nth-child(2){animation-delay:.15s}.str-dig i:nth-child(3){animation-delay:.3s}" +
    "@keyframes strDig{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-4px);opacity:1}}" +
    ".str-form{display:flex;gap:8px;padding:10px 12px 6px;border-top:1px solid var(--b);background:#fff}" +
    ".str-form input{flex:1;min-width:0;border:1px solid var(--b);border-radius:12px;padding:11px 12px;font-size:16px;font-family:inherit;color:var(--t)}" +
    ".str-form input:focus{outline:2px solid var(--as);border-color:var(--a)}" +
    ".str-form button{border:none;background:var(--a);color:#fff;border-radius:12px;padding:0 14px;font-weight:700;cursor:pointer}" +
    ".str-form button:disabled{opacity:.5;cursor:default}" +
    ".str-aviso{font-size:11.5px;color:var(--m);padding:0 14px 10px;background:#fff}.str-aviso a{color:var(--m)}" +
    // destaque do produto que o assistente mostrou
    ".str-foco{position:relative;z-index:5;animation:strFoco 2.8s ease 1;border-radius:18px}" +
    "@keyframes strFoco{0%{box-shadow:0 0 0 0 rgba(26,115,232,0)}15%{box-shadow:0 0 0 6px rgba(26,115,232,.55)}70%{box-shadow:0 0 0 6px rgba(26,115,232,.55)}100%{box-shadow:0 0 0 0 rgba(26,115,232,0)}}" +
    // demonstração do toque
    ".str-demo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);animation:strSome 7s ease forwards;pointer-events:none}" +
    "@keyframes strSome{0%{opacity:0}6%{opacity:1}90%{opacity:1}100%{opacity:0}}" +
    ".str-palco{position:relative;width:300px;height:300px}" +
    ".str-cartao{position:absolute;left:18px;top:150px;width:150px;height:94px;border-radius:12px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;padding:12px;box-shadow:0 14px 30px -8px rgba(0,0,0,.6);font-size:12px;font-weight:700}" +
    ".str-cartao em{display:block;font-style:normal;font-size:10px;font-weight:500;opacity:.7;margin-top:4px}" +
    ".str-onda{position:absolute;left:78px;top:180px;width:34px;height:34px;border-radius:50%;border:3px solid #8ab4f8;opacity:0;animation:strOnda 7s ease forwards}" +
    "@keyframes strOnda{0%,30%{opacity:0;transform:scale(.4)}34%{opacity:1}48%{opacity:0;transform:scale(2.6)}100%{opacity:0}}" +
    ".str-cel{position:absolute;left:150px;top:10px;width:118px;height:220px;border-radius:22px;background:#0f172a;padding:8px;box-shadow:0 18px 40px -10px rgba(0,0,0,.6);animation:strCel 7s ease forwards}" +
    "@keyframes strCel{0%{transform:translate(90px,-20px) rotate(12deg)}22%{transform:translate(0,0) rotate(0)}32%{transform:translate(-80px,70px) rotate(-8deg)}44%{transform:translate(-80px,70px) rotate(-8deg)}58%,100%{transform:translate(0,0) rotate(0)}}" +
    ".str-tela{width:100%;height:100%;border-radius:16px;background:#fff;overflow:hidden;position:relative}" +
    ".str-tela .str-vazia{position:absolute;inset:0;background:#e2e8f0;animation:strVazia 7s steps(1) forwards}" +
    "@keyframes strVazia{0%,44%{opacity:1}45%,100%{opacity:0}}" +
    ".str-g{padding:12px 8px;text-align:center;font-size:10px;color:#202124}" +
    ".str-g b{display:block;font-size:13px;letter-spacing:-.2px;margin-bottom:6px}" +
    ".str-g .g1{color:#4285F4}.str-g .g2{color:#EA4335}.str-g .g3{color:#FBBC05}.str-g .g4{color:#34A853}" +
    ".str-est{display:flex;justify-content:center;gap:2px;margin:10px 0 8px;font-size:17px;color:#dadce0}" +
    ".str-est span{animation:strEst 7s steps(1) forwards}" +
    ".str-est span:nth-child(1){animation-name:strE1}.str-est span:nth-child(2){animation-name:strE2}.str-est span:nth-child(3){animation-name:strE3}.str-est span:nth-child(4){animation-name:strE4}.str-est span:nth-child(5){animation-name:strE5}" +
    "@keyframes strE1{0%,60%{color:#dadce0}61%,100%{color:#FBBC05}}@keyframes strE2{0%,64%{color:#dadce0}65%,100%{color:#FBBC05}}@keyframes strE3{0%,68%{color:#dadce0}69%,100%{color:#FBBC05}}@keyframes strE4{0%,72%{color:#dadce0}73%,100%{color:#FBBC05}}@keyframes strE5{0%,76%{color:#dadce0}77%,100%{color:#FBBC05}}" +
    ".str-g i{display:block;height:6px;border-radius:3px;background:#e8eaed;margin:5px 6px}" +
    ".str-legenda{position:absolute;left:0;right:0;bottom:-6px;text-align:center;color:#fff;font-weight:700;font-size:18px;opacity:0;animation:strLeg 7s ease forwards}" +
    "@keyframes strLeg{0%,78%{opacity:0}84%,100%{opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.str-cel,.str-onda,.str-vazia,.str-est span,.str-legenda,.str-foco,.str-olho{animation-duration:.01s!important;animation-delay:0s!important}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var raiz = document.createElement("div");
  raiz.className = "str-root";
  raiz.setAttribute("data-i18n-skip", "");
  document.body.appendChild(raiz);

  var CARA = '<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="8" width="22" height="18" rx="7" fill="#1A73E8"/><rect x="14.5" y="3" width="3" height="5" rx="1.5" fill="#1A73E8"/><circle cx="16" cy="3.5" r="2.2" fill="#FBBC05"/><g class="str-olho"><circle cx="12" cy="16.5" r="2.4" fill="#fff"/><circle cx="20" cy="16.5" r="2.4" fill="#fff"/></g><rect x="12" y="21" width="8" height="1.8" rx=".9" fill="#fff"/></svg>';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(tag, cls, s) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = s; return e; }

  // ---------- estado ----------
  var conversa = [];
  try { conversa = JSON.parse(ler(sessionStorage, K_CONVERSA) || "[]") || []; } catch (e) { conversa = []; }
  function salvar() { gravar(sessionStorage, K_CONVERSA, JSON.stringify(conversa.slice(-30))); }
  var painel = null, lista = null, campo = null, botao = null, ocupado = false, fab = null, teaser = null;

  // ---------- botão flutuante ----------
  fab = el("button", "str-fab", '<span class="str-cara">' + CARA + "</span>");
  fab.appendChild(document.createTextNode(T.abrir));
  fab.type = "button";
  fab.setAttribute("aria-label", T.abrir);
  fab.addEventListener("click", abrir);
  raiz.appendChild(fab);

  // Puxa conversa uma vez por sessão: quem para 14s sem rolar, ou quem volta
  // do pagamento sem pagar (?compra=falhou) — o momento em que a venda escapa.
  var parado = null;
  function armarTeaser() {
    if (ler(sessionStorage, "st_robo_teaser") || painel) return;
    clearTimeout(parado);
    parado = setTimeout(mostrarTeaser, qs.get("compra") === "falhou" ? 2500 : 14000);
  }
  function mostrarTeaser() {
    if (painel || teaser || ler(sessionStorage, "st_robo_teaser")) return;
    if (document.querySelector(".checkout-modal:not([hidden])")) return;
    gravar(sessionStorage, "st_robo_teaser", "1");
    teaser = el("div", "str-teaser");
    teaser.appendChild(txt("span", "", T.teaser));
    var x = txt("button", "", "×");
    x.type = "button";
    x.setAttribute("aria-label", T.fechar);
    x.addEventListener("click", function (ev) { ev.stopPropagation(); fecharTeaser(); });
    teaser.appendChild(x);
    teaser.addEventListener("click", function () { contar("teaser"); abrir(); });
    raiz.appendChild(teaser);
  }
  function fecharTeaser() { if (teaser) { teaser.remove(); teaser = null; } }
  ["scroll", "pointerdown", "keydown"].forEach(function (ev) { window.addEventListener(ev, armarTeaser, { passive: true }); });
  armarTeaser();

  // ---------- painel ----------
  function abrir() {
    fecharTeaser();
    if (painel) { campo && campo.focus(); return; }
    contar("abriu");
    painel = el("div", "str-painel");
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", T.nome);
    var topo = el("div", "str-topo", '<span class="str-cara">' + CARA + "</span>");
    var nomes = el("div", "");
    nomes.appendChild(txt("b", "", T.nome));
    nomes.appendChild(txt("small", "", T.sub));
    topo.appendChild(nomes);
    var x = txt("button", "str-x", "×");
    x.type = "button";
    x.setAttribute("aria-label", T.fechar);
    x.addEventListener("click", fechar);
    topo.appendChild(x);
    painel.appendChild(topo);

    lista = el("div", "str-lista");
    lista.setAttribute("aria-live", "polite");
    painel.appendChild(lista);

    var form = el("form", "str-form");
    campo = el("input");
    campo.type = "text";
    campo.maxLength = 800;
    campo.placeholder = T.ph;
    campo.setAttribute("aria-label", T.ph);
    botao = txt("button", "", T.enviar);
    botao.type = "submit";
    form.appendChild(campo);
    form.appendChild(botao);
    form.addEventListener("submit", function (ev) { ev.preventDefault(); enviar(campo.value); });
    painel.appendChild(form);

    var aviso = el("div", "str-aviso");
    aviso.appendChild(document.createTextNode(T.aviso + " "));
    var a = txt("a", "", T.politica);
    a.href = "/privacidade";
    a.target = "_blank";
    a.rel = "noopener";
    aviso.appendChild(a);
    painel.appendChild(aviso);

    raiz.appendChild(painel);
    fab.style.display = "none";

    balao("assistant", T.ola, true);
    if (!conversa.length) mostrarChips(T.chips);
    conversa.forEach(function (m) { balao(m.role, m.content, true); });
    if (!celular()) campo.focus();
  }
  function fechar() {
    if (!painel) return;
    painel.remove();
    painel = lista = campo = botao = null;
    fab.style.display = "";
  }
  // No celular o painel cobre metade da tela: recolhe pra pessoa ver o que o
  // assistente está mostrando, e o botão traz de volta a conversa inteira.
  function recolherNoCelular() { if (celular()) fechar(); }

  function rolarFim() { if (lista) lista.scrollTop = lista.scrollHeight; }
  function balao(role, texto, semGravar) {
    if (!lista) return;
    lista.appendChild(txt("div", "str-msg " + (role === "user" ? "str-eu" : "str-ia"), texto));
    rolarFim();
  }
  function mostrarChips(chips) {
    if (!lista) return;
    var box = el("div", "str-chips");
    chips.forEach(function (c) {
      var b = txt("button", "str-chip", c);
      b.type = "button";
      b.addEventListener("click", function () { box.remove(); enviar(c); });
      box.appendChild(b);
    });
    lista.appendChild(box);
    rolarFim();
  }
  function chipLink(rotulo, href, cls) {
    var a = txt("a", "str-chip " + (cls || ""), rotulo);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }
  function chipAcao(rotulo, fn, cls) {
    var b = txt("button", "str-chip " + (cls || ""), rotulo);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }
  function linhaDeBotoes(itens) {
    if (!lista) return;
    var box = el("div", "str-chips");
    itens.forEach(function (i) { box.appendChild(i); });
    lista.appendChild(box);
    rolarFim();
  }
  function botaoWhatsapp(texto) {
    contar("whatsapp");
    linhaDeBotoes([chipLink(T.wa, "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto || "Oi! Vim pelo site."), "wa")]);
  }

  // ---------- conversa com o servidor ----------
  function enviar(texto) {
    texto = String(texto || "").trim();
    if (!texto || ocupado) return;
    if (!painel) abrir();
    campo.value = "";
    var chips = lista.querySelector(".str-chips:last-child");
    if (chips && lista.lastChild === chips && !chips.querySelector("a")) chips.remove();
    conversa.push({ role: "user", content: texto.slice(0, 800) });
    salvar();
    balao("user", texto);
    if (!ler(sessionStorage, "st_robo_contou_conversa")) { gravar(sessionStorage, "st_robo_contou_conversa", "1"); contar("conversou"); }
    gravar(localStorage, K_CONVERSOU, String(Date.now()));
    ocupado = true;
    botao.disabled = true;
    var dig = el("div", "str-dig", "<i></i><i></i><i></i>");
    lista.appendChild(dig);
    rolarFim();

    fetch("/api/robo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagens: conversa, carrinho: loja.carrinho(), lang: L })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; });
    }).then(function (res) {
      dig.remove();
      if (res.status === 503 && res.d && res.d.desligado) {
        fechar(); fab.remove(); return;
      }
      if (res.status === 429) { balao("assistant", T.limite); botaoWhatsapp(); return; }
      if (res.status !== 200) { balao("assistant", T.erro); botaoWhatsapp(); return; }
      if (res.d.texto) {
        conversa.push({ role: "assistant", content: res.d.texto });
        salvar();
        balao("assistant", res.d.texto);
      }
      executar(res.d.acoes || []);
    }).catch(function () {
      dig.remove();
      balao("assistant", T.erro);
      botaoWhatsapp();
    }).then(function () {
      ocupado = false;
      if (botao) botao.disabled = false;
      if (campo && !celular()) campo.focus();
    });
  }

  // ---------- o que o assistente faz na tela ----------
  function executar(acoes) {
    acoes.forEach(function (a, i) {
      setTimeout(function () {
        if (a.tipo === "mostrar") mostrarProduto(a.id);
        else if (a.tipo === "demo") demonstrar();
        else if (a.tipo === "carrinho") porNoCarrinho(a.itens || []);
        else if (a.tipo === "pagar") irPagar();
        else if (a.tipo === "whatsapp") botaoWhatsapp(a.texto);
      }, i * 500);
    });
  }
  function mostrarProduto(id) {
    var card = loja.cardDo(id);
    if (!card) return;
    contar("mostrou");
    recolherNoCelular();
    card.scrollIntoView({ behavior: "smooth", block: celular() ? "start" : "center" });
    card.classList.remove("str-foco");
    void card.offsetWidth;
    card.classList.add("str-foco");
    setTimeout(function () { card.classList.remove("str-foco"); }, 3000);
  }
  function demonstrar() {
    if (document.querySelector(".str-demo")) return;
    contar("demo");
    recolherNoCelular();
    var d = el("div", "str-demo",
      '<div class="str-palco">' +
        '<div class="str-cartao">StarTouch<em>NFC · QR Code</em></div>' +
        '<div class="str-onda"></div>' +
        '<div class="str-cel"><div class="str-tela">' +
          '<div class="str-g"><b><span class="g1">G</span><span class="g2">o</span><span class="g3">o</span><span class="g1">g</span><span class="g4">l</span><span class="g2">e</span></b>' +
          '<i></i><i style="width:60%"></i>' +
          '<div class="str-est"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>' +
          '<i></i><i></i><i style="width:45%"></i></div>' +
          '<div class="str-vazia"></div>' +
        "</div></div>" +
        '<div class="str-legenda"></div>' +
      "</div>");
    d.querySelector(".str-legenda").textContent = T.demo;
    d.setAttribute("aria-hidden", "true");
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 7100);
  }
  function porNoCarrinho(itens) {
    var ok = false;
    itens.forEach(function (i) { if (loja.adicionar(i.id, i.qty)) ok = true; });
    if (!ok) return;
    contar("carrinho");
    if (celular()) {
      linhaDeBotoes([
        chipAcao(T.verCarrinho, function () { fechar(); loja.abrirCarrinho(); }),
        chipAcao(T.pagar, function () { irPagar(); }, "cheio")
      ]);
    } else {
      loja.abrirCarrinho();
      linhaDeBotoes([chipAcao(T.pagar, function () { irPagar(); }, "cheio")]);
    }
  }
  function irPagar() {
    if (!loja.carrinho().length) return;
    contar("pagamento");
    fechar();   // o formulário de pagamento precisa da tela inteira
    loja.finalizar();
  }
})();
