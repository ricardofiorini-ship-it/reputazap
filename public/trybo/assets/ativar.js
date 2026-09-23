// ============================================================
// TRYBO — ativação de verdade
// Substitui a demonstração do app.js. Mesma cara (usa o app.css do pacote),
// mas cada passo fala com o sistema.
//
// POR QUE O DOMÍNIO TROCA NO MEIO
// O código é digitado em trybo.co — é o endereço impresso no verso do cartão
// e quem chega ali acabou de tirar o cartão do envelope. A partir do LOGIN,
// tudo acontece em startouch.com.br, porque sessão não atravessa domínio: se
// a conta nascesse em trybo.co, a pessoa teria que entrar de novo para abrir
// o painel, no minuto seguinte. A troca acontece exatamente na fronteira do
// login, e a assinatura "Trybo, uma solução StarTouch" viaja junto para que
// ninguém ache que caiu no site errado.
// ============================================================
(function () {
  "use strict";

  var HOST_CONTA = "startouch.com.br";
  var app = document.getElementById("app");

  var icons = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    touch: '<path d="M8 9a5 5 0 0 1 0 6m4-10a11 11 0 0 1 0 14m4-17a17 17 0 0 1 0 20"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    tiktok: '<path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47M14 3c1 4 3 5 6 5v4a10 10 0 0 1-6-2"/>',
    whatsapp: '<path d="m3 21 1.5-5A9 9 0 1 1 8 20L3 21Z"/><path d="M8 7c0 5 4 9 8 9l1-3-3-1-1 1-2-2 1-1-1-3H8Z"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="5"/><path d="m10 9 5 3-5 3z"/>'
  };
  function icon(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[n] || icons.card) + "</svg>";
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // As quatro da arte do cartão. Grátis para sempre — é o que a pessoa
  // segurou na mão, e isso não se trava.
  var REDES = [
    { id: "instagram", nome: "Instagram", dica: "@seuperfil", rotulo: "Seu @ no Instagram" },
    { id: "tiktok",    nome: "TikTok",    dica: "@seuperfil", rotulo: "Seu @ no TikTok" },
    { id: "whatsapp",  nome: "WhatsApp",  dica: "11 99999-9999", rotulo: "Seu WhatsApp com DDD" },
    { id: "youtube",   nome: "YouTube",   dica: "@seucanal",  rotulo: "Seu canal no YouTube" }
  ];

  var estado = {
    passo: "codigo",     // codigo | conta | redes | pronto
    code: "",
    token: null,
    resultado: null
  };

  function token() {
    try { return localStorage.getItem("rz_token"); } catch (e) { return null; }
  }
  function guardarSessao(d) {
    try {
      localStorage.setItem("rz_token", d.token);
      if (d.refresh_token) localStorage.setItem("rz_refresh", d.refresh_token);
      if (d.expires_at) localStorage.setItem("rz_token_exp", String(d.expires_at));
      if (d.user) localStorage.setItem("rz_user", JSON.stringify(d.user));
    } catch (e) { /* navegador sem armazenamento: a sessão vive só nesta aba */ }
    estado.token = d.token;
  }

  async function api(url, opcoes) {
    var r = await fetch(url, opcoes);
    var j = null;
    try { j = await r.json(); } catch (e) { /* resposta sem corpo */ }
    if (!r.ok) throw new Error((j && j.error) || "Não consegui falar com o sistema. Tente de novo.");
    return j;
  }

  // ── Molduras ──────────────────────────────────────────────
  function moldura(passoAtual, conteudo, largo) {
    var passos = ["codigo", "conta", "redes"];
    var i = passos.indexOf(passoAtual);
    var bolinhas = passos.map(function (p, n) {
      var cls = n === i ? "current" : n < i ? "done" : "";
      return '<span class="' + cls + '">' + (n < i ? icon("check") : n + 1) + "</span>";
    }).join("<i></i>");

    app.innerHTML =
      '<header class="activation-header">' +
        '<a class="app-logo" href="https://trybo.co/" aria-label="Trybo — voltar ao site">TRYBO<span>™</span></a>' +
        '<a class="small-link" href="https://trybo.co/">Voltar ao site</a>' +
      "</header>" +
      '<main class="activation-main">' +
        (passoAtual === "pronto" ? "" : '<div class="step-indicator" aria-label="Etapa ' + (i + 1) + ' de 3">' + bolinhas + "</div>") +
        '<section class="activation-panel' + (largo ? " wide" : "") + '">' + conteudo + "</section>" +
      "</main>" +
      '<footer class="activation-footer">Trybo, uma solução StarTouch.</footer>';
  }

  function erro(form, msg) {
    var el = form.querySelector(".form-error");
    el.textContent = msg;
    el.hidden = false;
    el.focus();
  }
  function ocupado(botao, ligado, textoOcupado) {
    botao.disabled = ligado;
    if (ligado) {
      botao.dataset.antes = botao.innerHTML;
      botao.textContent = textoOcupado || "Aguarde…";
    } else if (botao.dataset.antes) {
      botao.innerHTML = botao.dataset.antes;
    }
  }

  // ── PASSO 1 — o código ────────────────────────────────────
  function telaCodigo(aviso) {
    moldura("codigo",
      '<div class="activation-icon">' + icon("touch") + "</div>" +
      '<p class="eyebrow">SEU PRIMEIRO TOQUE COMEÇA AQUI</p>' +
      "<h1>Vamos conectar<br>o seu cartão.</h1>" +
      '<p class="intro">Digite o código que está no verso do cartão.</p>' +
      '<form id="f">' +
        '<label class="field code-label" for="c">Código do cartão</label>' +
        '<input id="c" name="code" class="code-input" placeholder="TRY-XXXXXX" value="' + esc(estado.code) + '" required maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="h">' +
        '<p id="h" class="field-hint">O código está abaixo do QR Code.</p>' +
        '<p class="form-error"' + (aviso ? "" : " hidden") + ' tabindex="-1" role="alert">' + esc(aviso || "") + "</p>" +
        '<button class="btn primary full" type="submit">Continuar ' + icon("arrow") + "</button>" +
      "</form>");

    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var botao = form.querySelector('button[type="submit"]');
      var code = String(new FormData(form).get("code") || "").trim().toUpperCase();
      if (!code) return erro(form, "Digite o código do cartão.");

      ocupado(botao, true, "Conferindo…");
      try {
        var r = await api("/api/trybo?action=checar-codigo&code=" + encodeURIComponent(code));
        // Cada situação tem a sua frase. "Código inválido" para tudo faria a
        // pessoa digitar de novo um código que está certo.
        if (r.situacao === "nao_existe")    return erro(form, "Não encontrei esse código. Confira o que está impresso no verso do cartão.");
        if (r.situacao === "outro_produto") return erro(form, "Esse código é de outro produto da casa, não de um cartão Trybo.");
        if (r.situacao === "bloqueado")     return erro(form, "Esse cartão está bloqueado. Fale com a gente pelo suporte.");
        if (r.situacao === "ja_ativo")      return erro(form, "Esse cartão já está ativado. Se ele é seu, entre no painel para configurá-lo.");

        estado.code = r.code;
        // A fronteira do login. Daqui em diante é a StarTouch que responde,
        // porque é lá que a sessão vive.
        if (location.hostname !== HOST_CONTA && location.hostname.indexOf("localhost") === -1) {
          location.href = "https://" + HOST_CONTA + "/ativar-trybo?code=" + encodeURIComponent(r.code);
          return;
        }
        estado.token = token();
        estado.passo = estado.token ? "redes" : "conta";
        render();
      } catch (err) {
        erro(form, err.message);
      } finally {
        ocupado(botao, false);
      }
    };
  }

  // ── PASSO 2 — a conta ─────────────────────────────────────
  function telaConta(modo) {
    var criar = modo !== "entrar";
    moldura("conta",
      '<button class="back-button" data-voltar>' + icon("back") + " Voltar</button>" +
      '<p class="eyebrow">' + (criar ? "FALTA POUCO" : "BEM-VINDO DE VOLTA") + "</p>" +
      "<h1>" + (criar ? "Crie sua conta." : "Entre na sua conta.") + "</h1>" +
      '<p class="intro">' + (criar
        ? "É com ela que você troca o destino do cartão depois, sem reimprimir nada."
        : "Use o mesmo e-mail que você já usa na StarTouch.") + "</p>" +
      '<div class="code-badge">' + icon("card") + " " + esc(estado.code) + "</div>" +
      '<form id="f">' +
        (criar ? '<label class="field">Seu nome<input name="nome" required maxlength="80" autocomplete="name"></label>' : "") +
        '<label class="field">E-mail<input name="email" type="email" required autocomplete="email" inputmode="email"></label>' +
        '<label class="field">Senha<input name="senha" type="password" required minlength="6" autocomplete="' + (criar ? "new-password" : "current-password") + '"></label>' +
        '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
        '<button class="btn primary full" type="submit">' + (criar ? "Criar conta" : "Entrar") + " " + icon("arrow") + "</button>" +
      "</form>" +
      '<button class="link-button" data-trocar>' + (criar ? "Já tenho conta na StarTouch" : "Ainda não tenho conta") + "</button>");

    app.querySelector("[data-voltar]").onclick = function () { estado.passo = "codigo"; render(); };
    app.querySelector("[data-trocar]").onclick = function () { telaConta(criar ? "entrar" : "criar"); };

    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var botao = form.querySelector('button[type="submit"]');
      var d = new FormData(form);
      ocupado(botao, true, criar ? "Criando…" : "Entrando…");
      try {
        var r = await api(criar ? "/api/register" : "/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(criar
            ? { name: d.get("nome"), email: d.get("email"), password: d.get("senha") }
            : { email: d.get("email"), password: d.get("senha") })
        });
        if (!r || !r.token) throw new Error("Não recebi a sessão. Tente de novo.");
        guardarSessao(r);
        estado.passo = "redes";
        render();
      } catch (err) {
        erro(form, err.message);
      } finally {
        ocupado(botao, false);
      }
    };
  }

  // ── PASSO 3 — as redes ────────────────────────────────────
  function telaRedes() {
    var campos = REDES.map(function (n) {
      return '<label class="network-field">' +
        '<span class="network-icon ' + n.id + '">' + icon(n.id) + "</span>" +
        '<span class="input-wrap"><span class="field-title">' + n.nome + "</span>" +
        '<input name="' + n.id + '" placeholder="' + n.dica + '" aria-label="' + n.rotulo + '" maxlength="50" ' +
        (n.id === "whatsapp" ? 'inputmode="tel"' : 'autocapitalize="none" spellcheck="false"') + "></span>" +
        '<span class="free-mark">Grátis</span></label>';
    }).join("");

    moldura("redes",
      '<p class="eyebrow">SEU CARTÃO. SUAS CONEXÕES.</p>' +
      "<h1>Agora, as<br>suas redes.</h1>" +
      '<p class="intro">Preencha as que você usa. Deixe as outras em branco.</p>' +
      '<div class="code-badge">' + icon("card") + " " + esc(estado.code) + "</div>" +
      '<form id="f">' +
        '<label class="field">Nome que o cliente vê<input name="nome" required maxlength="50" placeholder="Sua marca ou seu nome"></label>' +
        '<div class="network-fields">' + campos + "</div>" +
        '<p class="field-hint">O cartão mostra as <strong>duas primeiras</strong> que você preencher. Dá para trocar depois, no painel, sem reimprimir nada.</p>' +
        '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
        '<div class="form-footer"><span>' + icon("lock") + " Incluído com o cartão</span>" +
        '<button class="btn primary" type="submit">Ativar cartão ' + icon("check") + "</button></div>" +
      "</form>", true);

    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var botao = form.querySelector('button[type="submit"]');
      var d = new FormData(form);
      var perfis = {};
      var algum = false;
      REDES.forEach(function (n) {
        var v = String(d.get(n.id) || "").trim();
        if (v) { perfis[n.id] = v; algum = true; }
      });
      if (!algum) return erro(form, "Preencha pelo menos uma rede.");

      ocupado(botao, true, "Ativando…");
      try {
        var r = await api("/api/trybo?action=ativar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + (estado.token || token())
          },
          body: JSON.stringify({ code: estado.code, nome: d.get("nome"), perfis: perfis })
        });
        estado.resultado = r;
        estado.passo = "pronto";
        render();
      } catch (err) {
        erro(form, err.message);
      } finally {
        ocupado(botao, false);
      }
    };
  }

  // ── PASSO 4 — pronto ──────────────────────────────────────
  function telaPronto() {
    var r = estado.resultado || {};
    var lista = (r.destinos || []).map(function (d) {
      return '<span class="' + esc(d.kind) + '">' + icon(d.kind) + " " + esc(d.label || d.kind) + "</span>";
    }).join("");
    var sobra = (r.sobraram || []).length
      ? '<p class="field-hint">Guardei ' + (r.sobraram.length === 1 ? "a outra rede" : "as outras redes") +
        " na sua conta. Para colocar no cartão, troque no painel." + "</p>"
      : "";

    moldura("pronto",
      '<div class="activation-icon">' + icon("check") + "</div>" +
      '<p class="eyebrow">CARTÃO ATIVO</p>' +
      "<h1>Pronto.<br>Pode usar.</h1>" +
      '<p class="intro">Encoste um celular no cartão — ou toque no botão abaixo para ver exatamente o que o seu cliente vai ver.</p>' +
      '<div class="code-badge">' + icon("card") + " " + esc(r.code || estado.code) + "</div>" +
      '<div class="mini-networks" style="justify-content:center;margin:0 0 20px">' + lista + "</div>" +
      sobra +
      '<a class="btn primary full" href="' + esc(r.url || "#") + '" target="_blank" rel="noopener">Fazer um toque de teste ' + icon("arrow") + "</a>" +
      '<a class="link-button" href="https://' + HOST_CONTA + '/app">Ir para o meu painel</a>');
  }

  function render() {
    document.body.className = "activation-page";
    if (estado.passo === "codigo") return telaCodigo();
    if (estado.passo === "conta")  return telaConta("criar");
    if (estado.passo === "redes")  return telaRedes();
    if (estado.passo === "pronto") return telaPronto();
  }

  // Chegou com o código na URL (veio do /t/CODIGO de um cartão em estoque,
  // ou da troca de domínio do passo 1): já pula a digitação.
  var q = new URLSearchParams(location.search);
  var vindo = (q.get("code") || "").trim().toUpperCase();
  var aviso = q.get("error");
  if (vindo) {
    estado.code = vindo;
    estado.token = token();
    estado.passo = estado.token ? "redes" : "conta";
    render();
  } else if (aviso) {
    var frases = {
      invalida: "Não encontrei esse código. Confira o que está impresso no verso do cartão.",
      bloqueado: "Esse cartão está bloqueado. Fale com a gente pelo suporte.",
      instavel: "Tivemos um soluço para consultar o cartão. Tente de novo em instantes."
    };
    telaCodigo(frases[aviso] || "Não consegui ler esse cartão. Digite o código abaixo.");
  } else {
    render();
  }
})();
