// ============================================================
// i18n.js — versões em inglês, espanhol e chinês (09/10/2026)
// ============================================================
// O português é o site de verdade e continua sendo o único que o Google
// indexa. As outras línguas são uma CAMADA: quem escolhe EN/ES/中文 recebe
// o mesmo HTML e este arquivo troca os textos depois que a página monta,
// usando o dicionário /i18n/<pagina>.<lingua>.json.
//
// Por que assim e não página por língua: o texto vive espalhado em HTML e
// JSX sem estrutura nenhuma de tradução. Trocar por chave em cada frase
// seria mexer em milhares de linhas do site que vende. Aqui o português
// original É a chave — nenhuma linha do português precisa mudar.
//
// O preço desse atalho: se alguém editar uma frase em português, a tradução
// dela deixa de bater e o visitante estrangeiro vê o português, calado. É a
// falha silenciosa nº 1 deste projeto, por isso o `scripts/i18n.mjs check`
// roda no `npm run build` e BARRA o deploy se alguma chave ficou órfã.
//
// Uso numa página:  <script src="/i18n.js" data-page="landing"></script>
// Lugar do seletor: um elemento com [data-i18n-switch]; sem ele, o seletor
// flutua no canto inferior esquerdo.
// Diagnóstico:      ?i18n-debug=1 lista no console o que ficou sem tradução.
//
// Quem visita em português NÃO baixa dicionário nenhum: custo zero na home.
// A escolha da língua fica no localStorage (preferência, não dado pessoal).
// ============================================================
(function () {
  var LANGS = [
    { code: "pt", label: "PT", html: "pt-BR", name: "Português" },
    { code: "en", label: "EN", html: "en", name: "English" },
    { code: "es", label: "ES", html: "es", name: "Español" },
    { code: "zh", label: "中文", html: "zh-CN", name: "中文" }
  ];
  var KEY = "st_lang";
  var me = document.currentScript;
  var page = me && me.getAttribute("data-page");

  function valid(c) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === c) return LANGS[i]; return null; }
  function getStored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(c) { try { localStorage.setItem(KEY, c); } catch (e) {} }

  var qs = new URLSearchParams(location.search);
  var fromUrl = qs.get("lang");
  if (fromUrl && valid(fromUrl)) store(fromUrl);
  var lang = (fromUrl && valid(fromUrl) && fromUrl) || (valid(getStored()) && getStored()) || "pt";
  var debug = qs.get("i18n-debug") === "1";

  window.stLang = lang;
  window.stSetLang = function (c) {
    if (!valid(c) || c === lang) return;
    store(c);
    // Volta limpa pro português original: recarregar é mais seguro do que
    // desfazer troca por troca. Tira o ?lang= da URL pra ele não ganhar da escolha.
    var u = new URL(location.href);
    u.searchParams.delete("lang");
    location.replace(u.toString());
  };

  // ---------- seletor ----------
  var GLOBE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  var box = null;
  function buildSwitch() {
    var css = document.createElement("style");
    css.textContent =
      ".st-lang{display:inline-flex;align-items:center;gap:4px;position:relative;color:#3c4043;font:500 13px/1 Inter,system-ui,sans-serif;border:1px solid #dadce0;border-radius:999px;padding:6px 8px 6px 10px;background:#fff;cursor:pointer}" +
      ".st-lang:hover{border-color:#1a73e8;color:#1a73e8}" +
      ".st-lang select{appearance:none;-webkit-appearance:none;border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;padding:0 2px;outline:none}" +
      ".st-lang:focus-within{outline:2px solid #1a73e8;outline-offset:2px}" +
      ".st-lang--float{position:fixed;left:12px;bottom:12px;z-index:9990;box-shadow:0 2px 8px rgba(0,0,0,.15)}" +
      "@media (max-width:767px){[data-i18n-switch] .st-lang{padding:5px 6px 5px 8px;font-size:12px}[data-i18n-switch] .st-lang svg{display:none}}" +
      "@media print{.st-lang{display:none}}";
    document.head.appendChild(css);
    box = document.createElement("label");
    box.className = "st-lang";
    box.setAttribute("data-i18n-skip", "");
    var opts = "";
    for (var i = 0; i < LANGS.length; i++) {
      var l = LANGS[i];
      opts += '<option value="' + l.code + '"' + (l.code === lang ? " selected" : "") + ' title="' + l.name + '">' + l.label + "</option>";
    }
    box.innerHTML = GLOBE + '<select aria-label="Idioma / Language / Idioma / 语言">' + opts + "</select>";
    box.querySelector("select").addEventListener("change", function (e) { window.stSetLang(e.target.value); });
  }
  // Primeiro lugar visível (a página pode ter um no cabeçalho e outro no
  // rodapé, escondidos por tamanho de tela). Nenhum visível = flutua.
  // Roda de novo a cada mudança da página: no painel React o cabeçalho só
  // nasce depois do login, e o seletor tem que se mudar pra lá quando ele nascer.
  function placeSwitch() {
    if (!document.body) return;
    if (!box) buildSwitch();
    var slots = document.querySelectorAll("[data-i18n-switch]"), slot = null;
    for (var s = 0; s < slots.length; s++) if (getComputedStyle(slots[s]).display !== "none") { slot = slots[s]; break; }
    var target = slot || document.body;
    if (box.parentNode === target) return;
    box.className = slot ? "st-lang" : "st-lang st-lang--float";
    target.appendChild(box);
  }
  var placing = false;
  function mountSwitch() {
    placeSwitch();
    new MutationObserver(function () {
      if (placing) return;
      placing = true;
      requestAnimationFrame(function () { placing = false; placeSwitch(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (lang === "pt" || !page) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountSwitch);
    else mountSwitch();
    return;
  }

  // ---------- tradução ----------
  var L = valid(lang);
  document.documentElement.lang = L.html;
  // Esconde o português até a tradução entrar (no máximo 1,5s — depois disso
  // mostra o que tiver, nunca uma página em branco).
  document.documentElement.classList.add("st-i18n-wait");
  var hide = document.createElement("style");
  hide.textContent = "html.st-i18n-wait body{visibility:hidden}";
  document.head.appendChild(hide);
  function reveal() { document.documentElement.classList.remove("st-i18n-wait"); }
  setTimeout(reveal, 1500);

  var T = {}, H = {}, P = [];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var missing = {};
  var made = {}; // o que nós mesmos escrevemos — não é "texto sem tradução"

  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function look(raw) {
    var k = norm(raw);
    if (!k || !/[A-Za-zÀ-ÿ]/.test(k) || made[k]) return null;
    if (Object.prototype.hasOwnProperty.call(T, k)) return T[k];
    for (var i = 0; i < P.length; i++) if (P[i][0].test(k)) return k.replace(P[i][0], P[i][1]);
    if (debug) missing[k] = 1;
    return null;
  }
  function skipped(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP[n.nodeName] || (n.hasAttribute && (n.hasAttribute("data-i18n-skip") || n.getAttribute("translate") === "no"))) return true;
    }
    return false;
  }
  function doText(node) {
    var v = node.nodeValue;
    var t = look(v);
    if (t == null || t === norm(v)) return;
    var lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0];
    made[norm(t)] = 1;
    node.nodeValue = lead + t + tail;
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a) { var t = look(a); if (t != null && t !== a) el.setAttribute(ATTRS[i], t); }
    }
    if (el.nodeName === "INPUT" && /^(submit|button)$/i.test(el.type) && el.value) {
      var tv = look(el.value); if (tv != null) el.value = tv;
    }
  }
  function translate(root) {
    if (root.nodeType === 3) { if (root.parentNode && !skipped(root.parentNode)) doText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    // 1) Frases com negrito/link no meio: a chave é o texto corrido do
    //    elemento e a tradução traz o HTML de volta. Só pra páginas estáticas
    //    (no React, trocar innerHTML quebraria a reconciliação).
    if (H) {
      var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (!el.isConnected || SKIP[el.nodeName]) continue;
        var k = norm(el.textContent);
        if (!k || !Object.prototype.hasOwnProperty.call(H, k) || skipped(el)) continue;
        // Embrulho com o mesmo texto (div > p): quem troca é o de dentro.
        var inner = false;
        for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (norm(c.textContent) === k) { inner = true; break; }
        if (!inner) el.innerHTML = H[k];
      }
    }
    // 2) Texto solto.
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var list = [], n;
    while ((n = w.nextNode())) list.push(n);
    for (var j = 0; j < list.length; j++) if (list[j].parentNode && !skipped(list[j].parentNode)) doText(list[j]);
    // 3) Atributos que a pessoa lê (placeholder, title, aria-label, alt).
    if (root.matches && root.matches("[" + ATTRS.join("],[") + "],input")) doAttrs(root);
    var at = root.querySelectorAll("[" + ATTRS.join("],[") + "],input");
    for (var m = 0; m < at.length; m++) if (!skipped(at[m])) doAttrs(at[m]);
  }

  // Pop-ups do navegador (erros do checkout) não estão no DOM: traduz na saída.
  ["alert", "confirm", "prompt"].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== "function") return;
    window[fn] = function (msg) {
      var a = Array.prototype.slice.call(arguments);
      if (typeof msg === "string") { var t = look(msg); if (t != null) a[0] = t; }
      return orig.apply(window, a);
    };
  });

  function run() {
    var t = look(document.title); if (t) document.title = t;
    var md = document.querySelector('meta[name="description"]');
    if (md) { var d = look(md.content); if (d) md.content = d; }
    translate(document.body);
    reveal();
    // Conteúdo que o JavaScript da página escreve depois (carrinho, frete,
    // mensagens de erro) também passa pela tradução.
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === "characterData") { if (mu.target.parentNode && !skipped(mu.target.parentNode)) doText(mu.target); }
        else for (var j = 0; j < mu.addedNodes.length; j++) translate(mu.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    if (debug) {
      setTimeout(function () {
        var ks = Object.keys(missing);
        console.log("[i18n] " + page + "." + lang + ": " + ks.length + " textos sem tradução", ks);
      }, 3000);
    }
  }

  var dict = fetch("/i18n/" + page + "." + lang + ".json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (j) {
      T = j.t || {};
      H = j.h && Object.keys(j.h).length ? j.h : null;
      // px = regras extras mais precisas (singular/plural), testadas ANTES das
      // geradas pelo extrator. O build não confere px: regra velha só não casa.
      P = (j.px || []).concat(j.p || []).map(function (x) { return [new RegExp(x[0]), x[1]]; });
    })
    .catch(function (e) {
      // Sem dicionário a página segue em português — mas grita, não cala.
      console.warn("[i18n] dicionário " + page + "." + lang + " não carregou:", e && e.message);
    });

  function start() { mountSwitch(); dict.then(run, run); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
