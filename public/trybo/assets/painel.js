// ============================================================
// TRYBO — o painel de verdade
// Mesmo desenho da demonstração (app.css, exportado do construtor), mas cada
// número vem do banco e cada botão muda o cartão no balcão.
//
// MORA EM startouch.com.br/painel-trybo, NÃO em trybo.co/painel: é aqui que a
// sessão vive (a ativação troca de domínio no login pelo mesmo motivo). O
// trybo.co/painel redireciona pra cá.
//
// A regra da sessão é a mesma do /app (src/lib/sessao.js), copiada e não
// importada porque esta página não passa pelo Vite. Se mudar lá, muda aqui:
// renovar antes de vencer, uma renovação por vez, e só apagar a sessão quando
// o servidor RECUSA a renovação — falha de rede não é sessão inválida.
// ============================================================
(function () {
  "use strict";

  var app = document.getElementById("app");
  var modal = document.getElementById("modal");
  var fmt = new Intl.NumberFormat("pt-BR");

  // ── Sessão ────────────────────────────────────────────────
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function salvarSessao(d) {
    if (!d) return;
    if (d.token) gravar("rz_token", d.token);
    if (d.refresh_token) gravar("rz_refresh", d.refresh_token);
    if (d.expires_at) gravar("rz_token_exp", String(d.expires_at));
    if (d.user) gravar("rz_user", JSON.stringify(d.user));
  }
  function limparSessao() { ["rz_token", "rz_refresh", "rz_token_exp", "rz_user"].forEach(function (k) { gravar(k, null); }); }

  var renovando = null;
  function renovar() {
    var refresh = ler("rz_refresh");
    if (!refresh) return Promise.resolve(null);
    if (renovando) return renovando;
    renovando = fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", refresh_token: refresh })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (!r.ok || !d || !d.token) { limparSessao(); return null; }
        salvarSessao(d);
        return d.token;
      });
    }).catch(function () { return null; })
      .then(function (t) { renovando = null; return t; });
    return renovando;
  }
  function tokenValido() {
    var token = ler("rz_token");
    if (!token) return Promise.resolve(null);
    var exp = parseInt(ler("rz_token_exp") || "0", 10);
    if (!exp || exp - 60 > Math.floor(Date.now() / 1000)) return Promise.resolve(token);
    return renovar().then(function (t) { return t || token; });
  }

  function SemSessao() { this.message = "Sua sessão terminou. Entre de novo."; }

  // Toda chamada passa por aqui: token renovado, UMA segunda tentativa depois
  // de 401 (relógio do aparelho errado), e sessão morta vira tela de login —
  // nunca um erro sem explicação.
  async function api(url, opcoes, tentouDeNovo) {
    var token = await tokenValido();
    if (!token) throw new SemSessao();
    var o = opcoes || {};
    var headers = Object.assign({}, o.headers || {}, { Authorization: "Bearer " + token });
    if (o.body) headers["Content-Type"] = "application/json";
    var r = await fetch(url, Object.assign({}, o, { headers: headers }));
    if (r.status === 401) {
      if (!tentouDeNovo && (await renovar())) return api(url, opcoes, true);
      limparSessao();
      throw new SemSessao();
    }
    var j = null;
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((j && j.error) || "Não consegui falar com o sistema. Tente de novo.");
    return j;
  }

  // ── Desenho ───────────────────────────────────────────────
  var icons = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    links: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    touch: '<path d="M8 9a5 5 0 0 1 0 6m4-10a11 11 0 0 1 0 14m4-17a17 17 0 0 1 0 20"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a3 3 0 0 0-4-4L5 15l-1 5Z"/>',
    transfer: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',
    spark: '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z"/>',
    logout: '<path d="M9 4H4v16h5m5-13 5 5-5 5m-6-5h11"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    tiktok: '<path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47M14 3c1 4 3 5 6 5v4a10 10 0 0 1-6-2"/>',
    whatsapp: '<path d="m3 21 1.5-5A9 9 0 1 1 8 20L3 21Z"/><path d="M8 7c0 5 4 9 8 9l1-3-3-1-1 1-2-2 1-1-1-3H8Z"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="5"/><path d="m10 9 5 3-5 3z"/>'
  };
  function icon(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[n] || icons.links) + "</svg>";
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var logo = '<a class="app-logo" href="https://trybo.co/" aria-label="Trybo — ir ao site">TRYBO<span>™</span></a>';

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("visible"); }, 4500);
  }
  function erro(form, msg) {
    var el = form.querySelector(".form-error");
    el.textContent = msg;
    el.hidden = false;
    el.focus();
  }
  function ocupado(botao, ligado, texto) {
    botao.disabled = ligado;
    if (ligado) { botao.dataset.antes = botao.innerHTML; botao.textContent = texto || "Aguarde…"; }
    else if (botao.dataset.antes) botao.innerHTML = botao.dataset.antes;
  }
  function abrirModal(titulo, conteudo) {
    modal.innerHTML = '<div class="modal-head"><h2 id="modal-title">' + esc(titulo) + '</h2><button type="button" class="icon-btn" data-fechar aria-label="Fechar">' + icon("close") + "</button></div>" + conteudo;
    modal.querySelectorAll("[data-fechar]").forEach(function (b) { b.onclick = fecharModal; });
    modal.showModal();
  }
  function fecharModal() { if (modal.open) modal.close(); }

  // ── Estado ────────────────────────────────────────────────
  var estado = { view: "overview", dias: 7, dados: null, editando: null };

  function nomeKind(kind) {
    var c = (estado.dados && estado.dados.catalogo || []).find(function (k) { return k.kind === kind; });
    return c ? c.label : kind;
  }
  function nomeCartao(c) { return c.apelido || "Cartão " + c.code.slice(-6); }
  function situacao(c) {
    if (c.substituido) return { cls: "blocked", txt: "Trocado" };
    if (c.status === "disabled") return { cls: "blocked", txt: "Bloqueado" };
    return { cls: "active", txt: "Ativo" };
  }

  // O @ de volta a partir da URL gravada — pra o formulário abrir preenchido
  // com o que o lojista digitou, não com um link que ele não reconhece.
  function valorDe(kind, url) {
    if (!url) return "";
    if (kind === "whatsapp") {
      var d = url.replace(/\D/g, "");
      return d.indexOf("55") === 0 && d.length >= 12 ? d.slice(2) : d;
    }
    if (["url", "spotify", "whatsapp_canal"].indexOf(kind) !== -1) return url;
    var partes = url.split("/").filter(Boolean);
    return "@" + (partes[partes.length - 1] || "").replace(/^@/, "");
  }

  // ── Login ─────────────────────────────────────────────────
  function telaLogin(aviso) {
    document.body.className = "activation-page";
    app.innerHTML =
      '<header class="activation-header">' + logo + '<a class="small-link" href="https://trybo.co/">Voltar ao site</a></header>' +
      '<main class="activation-main"><section class="activation-panel">' +
        '<div class="activation-icon">' + icon("card") + "</div>" +
        '<p class="eyebrow">MEU PAINEL</p><h1>Entre na<br>sua conta.</h1>' +
        '<p class="intro">Use o e-mail e a senha que você criou ao ativar o cartão.</p>' +
        '<form id="f">' +
          '<label class="field">E-mail<input name="email" type="email" required autocomplete="email" inputmode="email"></label>' +
          '<label class="field">Senha<input name="senha" type="password" required autocomplete="current-password"></label>' +
          '<p class="form-error"' + (aviso ? "" : " hidden") + ' tabindex="-1" role="alert">' + esc(aviso || "") + "</p>" +
          '<button class="btn primary full" type="submit">Entrar ' + icon("arrow") + "</button>" +
        "</form>" +
        '<button class="link-button" type="button" data-esqueci>Esqueci minha senha</button>' +
        '<a class="link-button" href="/ativar-trybo">Tenho um cartão novo para ativar</a>' +
      "</section></main>" +
      '<footer class="activation-footer">Trybo, uma solução StarTouch.</footer>';

    // Mesma chamada do login da StarTouch. A resposta é sempre a mesma frase,
    // exista ou não a conta — dizer "não achei esse e-mail" contaria a quem
    // está sondando quem é cliente.
    app.querySelector("[data-esqueci]").onclick = async function () {
      var form = document.getElementById("f");
      var email = String(form.email.value || "").trim();
      if (!email) return erro(form, "Digite o seu e-mail acima e toque de novo em \"Esqueci minha senha\".");
      try {
        await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email })
        });
      } catch (e) {}
      erro(form, "Se esse e-mail tiver conta, chega um link para criar uma senha nova. Confira também o spam.");
    };

    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var botao = form.querySelector('button[type="submit"]');
      var d = new FormData(form);
      ocupado(botao, true, "Entrando…");
      try {
        var r = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: d.get("email"), password: d.get("senha") })
        });
        var j = await r.json().catch(function () { return null; });
        if (!r.ok || !j || !j.token) throw new Error((j && j.error) || "E-mail ou senha não conferem.");
        salvarSessao(j);
        carregar();
      } catch (err) {
        erro(form, err.message);
        ocupado(botao, false);
      }
    };
  }

  // ── Carregar ──────────────────────────────────────────────
  async function carregar() {
    if (!ler("rz_token")) return telaLogin();
    if (!estado.dados) {
      document.body.className = "activation-page";
      app.innerHTML = '<main class="activation-main"><section class="activation-panel"><p class="intro">Carregando seu painel…</p></section></main>';
    }
    try {
      estado.dados = await api("/api/trybo?action=painel&dias=" + estado.dias);
      shell();
    } catch (err) {
      if (err instanceof SemSessao) return telaLogin(err.message);
      document.body.className = "activation-page";
      app.innerHTML = '<main class="activation-main"><section class="activation-panel">' +
        '<h1>Não consegui abrir<br>o painel.</h1><p class="intro">' + esc(err.message) + "</p>" +
        '<button class="btn primary full" id="denovo">Tentar de novo</button></section></main>';
      document.getElementById("denovo").onclick = carregar;
    }
  }

  function tratar(err) {
    if (err instanceof SemSessao) { fecharModal(); telaLogin(err.message); return true; }
    return false;
  }

  // ── Moldura do painel ─────────────────────────────────────
  function shell() {
    var d = estado.dados;
    var cartoes = d.cartoes || [];
    var nome = (d.negocio && d.negocio.nome) || "Minha marca";
    var titulo = { overview: "Visão geral", cards: "Meus cartões", edit: "Editar cartão" }[estado.view];
    document.body.className = "dashboard-page";
    document.title = titulo + " — Trybo";

    function lado(view, txt, sym) {
      var ativo = estado.view === view || (view === "cards" && estado.view === "edit");
      return '<button class="side-link ' + (ativo ? "active" : "") + '" data-nav="' + view + '"' + (ativo ? ' aria-current="page"' : "") + ">" +
        icon(sym) + txt + (view === "cards" ? '<span class="count-pill">' + cartoes.length + "</span>" : "") + "</button>";
    }

    var upgrade = d.desbloqueado
      ? '<div class="upgrade-box"><span>' + icon("check") + " Destinos avançados</span><strong>Liberados na sua conta.</strong></div>"
      : '<div class="upgrade-box"><span>' + icon("spark") + " Mais possibilidades</span><strong>Destinos avançados.</strong>" +
        "<span>Link livre, LinkedIn, Spotify e mais, por R$ 49 uma vez.<br>A compra pelo painel chega em breve.</span></div>";

    app.innerHTML =
      '<a class="skip" href="#dashboard-main">Pular para o conteúdo</a>' +
      '<aside class="sidebar"><div class="sidebar-brand">' + logo + "<span>MEU PAINEL</span></div>" +
        '<div class="workspace"><span class="avatar">' + esc(nome.slice(0, 1).toUpperCase()) + "</span><div><strong>" + esc(nome) + "</strong><span>" + (d.desbloqueado ? "Destinos avançados" : "Plano gratuito") + "</span></div></div>" +
        '<nav class="side-nav" aria-label="Painel">' + lado("overview", "Visão geral", "grid") + lado("cards", "Meus cartões", "card") + "</nav>" +
        '<div class="sidebar-lower">' + upgrade +
          (d.tambem_startouch ? '<a class="side-link" href="/app">' + icon("arrow") + " Painel StarTouch</a>" : "") +
          '<button class="side-link" data-sair>' + icon("logout") + " Sair</button>" +
          '<div class="sidebar-footer">Uma solução <strong>StarTouch</strong></div></div></aside>' +
      '<div class="dashboard-body"><header class="dash-top"><span class="breadcrumb">Meu painel <span>/</span> ' + titulo + "</span>" +
        '<div class="top-right"><span class="free-badge">SEM MENSALIDADE</span><span class="avatar small">' + esc(nome.slice(0, 1).toUpperCase()) + "</span></div></header>" +
        '<main id="dashboard-main" class="dashboard-main">' + cabecalho() + '<div id="view-content"></div></main>' +
        '<footer class="dashboard-footer">Trybo, uma solução StarTouch.<span>Sem mensalidade. Sempre com você.</span></footer></div>';

    app.querySelectorAll("[data-nav]").forEach(function (b) {
      b.onclick = function () { estado.view = b.dataset.nav; shell(); window.scrollTo(0, 0); };
    });
    app.querySelector("[data-sair]").onclick = function () { limparSessao(); estado.dados = null; telaLogin(); };
    app.querySelectorAll("[data-ativar]").forEach(function (b) { b.onclick = function () { location.href = "/ativar-trybo"; }; });

    var alvo = document.getElementById("view-content");
    if (estado.view === "overview") { alvo.innerHTML = overview(); ligarOverview(); }
    else if (estado.view === "cards") { alvo.innerHTML = grade(); ligarGrade(); }
    else { alvo.innerHTML = editor(); ligarEditor(); }
  }

  function cabecalho() {
    var t = {
      overview: ["CONECTE. COMPARTILHE. CRESÇA.", "Suas conexões, de perto.", "O movimento que começa com os seus cartões."],
      cards: ["UM CARTÃO. MUITAS CONEXÕES.", "Meus cartões", "Um cartão por profissional. Cada um com as suas redes."],
      edit: ["SUA MARCA. SUAS REDES. UM TOQUE.", "Para onde o cartão leva", "Troque quando quiser. O cartão continua o mesmo."]
    }[estado.view];
    return '<div class="page-heading"><div><p class="eyebrow">' + t[0] + "</p><h1>" + t[1] + "</h1><p>" + t[2] + "</p></div>" +
      '<button class="btn primary" data-ativar>' + icon("plus") + " Ativar um cartão</button></div>";
  }

  // ── Visão geral ───────────────────────────────────────────
  function periodo() {
    return '<div class="segmented" aria-label="Período">' + [7, 30].map(function (n) {
      return '<button data-dias="' + n + '" class="' + (estado.dias === n ? "selected" : "") + '" aria-pressed="' + (estado.dias === n) + '">' + n + " dias</button>";
    }).join("") + "</div>";
  }

  function grafico(serie) {
    var valores = serie.map(function (s) { return s.toques; });
    var max = Math.max.apply(null, valores.concat([1]));
    var pico = valores.indexOf(Math.max.apply(null, valores));
    var total = valores.reduce(function (a, b) { return a + b; }, 0);
    function data(s) { var p = s.dia.split("-"); return p[2] + "/" + p[1]; }
    function rotulo(s) {
      if (serie.length > 7) return data(s);
      return new Date(s.dia + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
    }
    return '<div class="bar-chart ' + (serie.length > 7 ? "many" : "") + '" role="img" aria-label="Toques por dia. Total no período: ' + fmt.format(total) + '.">' +
      serie.map(function (s, i) {
        return '<div class="bar-column"><div class="bar-track"><span class="bar ' + (total && i === pico ? "peak" : "") + '" style="height:' + Math.max(s.toques ? 3 : 0, s.toques / max * 100) + '%" title="' + data(s) + ": " + s.toques + ' toques"><span>' + s.toques + "</span></span></div>" +
          '<span class="bar-label">' + rotulo(s) + "</span></div>";
      }).join("") + "</div>" +
      '<details class="chart-data"><summary>Ver valores por dia</summary><div class="chart-data-grid">' +
      serie.map(function (s) { return "<span>" + data(s) + "<strong>" + s.toques + "</strong></span>"; }).join("") + "</div></details>";
  }

  function paraOndeForam(redes) {
    var total = redes.reduce(function (a, r) { return a + r.cliques; }, 0);
    var corpo = total
      ? '<div class="network-results">' + redes.map(function (r) {
          return '<div class="network-result"><div class="result-label"><span><i class="network-icon ' + esc(r.kind) + '">' + icon(r.kind) + "</i>" + esc(nomeKind(r.kind)) + "</span><strong>" + fmt.format(r.cliques) + "</strong></div>" +
            '<div class="progress-track"><span class="' + esc(r.kind) + '" style="width:' + (r.cliques / total * 100) + '%"></span></div></div>';
        }).join("") + "</div>"
      : '<p class="panel-note">Ninguém abriu uma rede pelo cartão neste período ainda.</p>';
    return '<section class="panel network-summary"><div class="panel-heading"><div><h2>Para onde foram?</h2><p>Quem abriu cada rede pelo cartão</p></div>' + icon("links") + "</div>" + corpo +
      '<p class="panel-note">Abrir a rede não é o mesmo que seguir: isso só o Instagram sabe.</p></section>';
  }

  function tabela(cartoes) {
    return '<div class="table-scroll"><table><thead><tr><th>Cartão</th><th>Status</th><th>Leva para</th><th class="number">Toques · ' + estado.dias + ' dias</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>' +
      cartoes.map(function (c) {
        var s = situacao(c);
        return '<tr><td><div class="card-cell"><span class="card-symbol">' + icon("card") + "</span><span><strong>" + esc(nomeCartao(c)) + "</strong><small>" + esc(c.code) + "</small></span></div></td>" +
          '<td><span class="status ' + s.cls + '">' + s.txt + "</span></td>" +
          '<td><div class="mini-networks">' + miniRedes(c) + "</div></td>" +
          '<td class="number"><strong>' + fmt.format(c.toques_periodo) + "</strong></td>" +
          '<td><button class="icon-btn" data-editar="' + esc(c.code) + '" aria-label="Editar ' + esc(nomeCartao(c)) + '">' + icon("edit") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function miniRedes(c) {
    if (!c.servidos.length) return '<small>Sem destino</small>';
    return c.servidos.map(function (d) {
      return '<span class="' + esc(d.kind) + '" title="' + esc(d.label || nomeKind(d.kind)) + '" aria-label="' + esc(d.label || nomeKind(d.kind)) + '">' + icon(d.kind) + "</span>";
    }).join("");
  }

  function overview() {
    var d = estado.dados;
    var cartoes = d.cartoes || [];
    if (!cartoes.length) return vazio();
    var toques = d.serie.reduce(function (a, s) { return a + s.toques; }, 0);
    var ativos = cartoes.filter(function (c) { return c.status === "active"; }).length;
    var abriram = d.redes.reduce(function (a, r) { return a + r.cliques; }, 0);
    return '<div class="overview-toolbar"><span>Seu movimento nos últimos ' + estado.dias + " dias</span>" + periodo() + "</div>" +
      '<div class="metric-grid">' +
        '<section class="metric"><div><span>Toques no período</span>' + icon("touch") + "</div><strong>" + fmt.format(toques) + "</strong><p>Celulares que encostaram ou leram o QR</p></section>" +
        '<section class="metric"><div><span>Abriram uma rede</span>' + icon("links") + "</div><strong>" + fmt.format(abriram) + "</strong><p>Chegaram no seu perfil pelo cartão</p></section>" +
        '<section class="metric"><div><span>Cartões ativos</span>' + icon("card") + "</div><strong>" + ativos + "<small> / " + cartoes.length + "</small></strong><p>Prontos para novas conexões</p></section>" +
      "</div>" +
      '<div class="analytics-grid"><section class="panel activity-panel"><div class="panel-heading"><div><h2>Cada toque conta.</h2><p>Toques nos seus cartões, por dia</p></div><span class="chart-legend"><i></i> Toques</span></div>' + grafico(d.serie) + "</section>" +
        paraOndeForam(d.redes) + "</div>" +
      '<section class="panel"><div class="panel-heading"><div><h2>Seus cartões</h2><p>Cada profissional, de perto.</p></div><button class="text-btn" data-nav-cards>Ver todos ' + icon("arrow") + "</button></div>" + tabela(cartoes.slice(0, 4)) + "</section>" +
      '<div class="tip"><span>' + icon("spark") + "</span><div><strong>O melhor momento é logo depois de um bom atendimento.</strong><p>Apresente o cartão e convide o cliente a acompanhar o seu trabalho.</p></div></div>";
  }

  function vazio() {
    // Quem entrou com a conta da StarTouch e ainda não tem cartão Trybo: diz
    // onde ele está e por que a tela está vazia, em vez de deixá-lo achar
    // que as placas dele sumiram.
    var st = estado.dados && estado.dados.tambem_startouch
      ? '<p class="panel-note">Você entrou com a sua conta StarTouch. Os cartões Trybo ficam aqui, separados das suas placas de avaliação, que continuam no <a href="/app">painel StarTouch</a>.</p>'
      : "";
    return '<div class="panel empty"><h2>Seu primeiro cartão começa aqui.</h2><p>Digite o código que está no verso do cartão e escolha as suas redes.</p>' + st +
      '<button class="btn primary" data-ativar>' + icon("plus") + " Ativar um cartão</button></div>";
  }

  function ligarOverview() {
    app.querySelectorAll("[data-dias]").forEach(function (b) {
      b.onclick = async function () {
        estado.dias = Number(b.dataset.dias);
        try { estado.dados = await api("/api/trybo?action=painel&dias=" + estado.dias); shell(); }
        catch (err) { if (!tratar(err)) toast(err.message); }
      };
    });
    var todos = app.querySelector("[data-nav-cards]");
    if (todos) todos.onclick = function () { estado.view = "cards"; shell(); };
    ligarEditar();
    app.querySelectorAll("#view-content [data-ativar]").forEach(function (b) { b.onclick = function () { location.href = "/ativar-trybo"; }; });
  }

  function ligarEditar() {
    app.querySelectorAll("[data-editar]").forEach(function (b) {
      b.onclick = function () { estado.editando = b.dataset.editar; estado.view = "edit"; shell(); window.scrollTo(0, 0); };
    });
  }

  // ── Meus cartões ──────────────────────────────────────────
  function grade() {
    var cartoes = estado.dados.cartoes || [];
    if (!cartoes.length) return vazio();
    return '<div class="cards-grid">' + cartoes.map(function (c) {
      var s = situacao(c);
      var acoes = c.substituido
        ? "<small>Quem encostar vai direto para o cartão novo.</small>"
        : '<button data-bloquear="' + esc(c.code) + '">' + icon("lock") + " " + (c.status === "disabled" ? "Desbloquear" : "Bloquear") + "</button>" +
          '<button data-transferir="' + esc(c.code) + '">' + icon("transfer") + " Trocar por um novo</button>";
      return '<article class="panel managed-card"><div class="managed-card-head"><span class="card-symbol">' + icon("card") + '</span><span class="status ' + s.cls + '">' + s.txt + "</span></div>" +
        "<h2>" + esc(nomeCartao(c)) + '</h2><p class="code-text">' + esc(c.code) + "</p>" +
        '<div class="managed-networks">' + miniRedes(c) + "<span>" + fmt.format(c.toques_periodo) + " toques · " + estado.dias + " dias</span></div>" +
        (c.substituido ? "" : '<button class="btn secondary full" data-editar="' + esc(c.code) + '">' + icon("edit") + " Editar redes</button>") +
        '<div class="card-actions">' + acoes + "</div></article>";
    }).join("") + "</div>";
  }

  function ligarGrade() {
    ligarEditar();
    app.querySelectorAll("#view-content [data-ativar]").forEach(function (b) { b.onclick = function () { location.href = "/ativar-trybo"; }; });
    app.querySelectorAll("[data-bloquear]").forEach(function (b) { b.onclick = function () { confirmarBloqueio(b.dataset.bloquear); }; });
    app.querySelectorAll("[data-transferir]").forEach(function (b) { b.onclick = function () { transferir(b.dataset.transferir); }; });
  }

  function acharCartao(code) {
    return (estado.dados.cartoes || []).find(function (c) { return c.code === code; });
  }

  function confirmarBloqueio(code) {
    var c = acharCartao(code);
    if (!c) return;
    var bloquear = c.status !== "disabled";
    abrirModal(bloquear ? "Bloquear este cartão?" : "Desbloquear este cartão?",
      '<p class="modal-copy">' + esc(nomeCartao(c)) + " · " + esc(c.code) + "</p>" +
      "<p>" + (bloquear
        ? "Quem encostar o celular vai ver o aviso de cartão bloqueado. As suas redes ficam guardadas: se ele aparecer, é só desbloquear."
        : "O cartão volta a levar para as mesmas redes de antes.") + "</p>" +
      '<div class="modal-actions"><button class="btn secondary" data-fechar>Cancelar</button><button class="btn ' + (bloquear ? "danger" : "primary") + '" id="ok">' + (bloquear ? "Bloquear" : "Desbloquear") + "</button></div>");
    document.getElementById("ok").onclick = async function (e) {
      var botao = e.currentTarget;
      ocupado(botao, true);
      try {
        await api("/api/trybo?action=bloquear", { method: "POST", body: JSON.stringify({ code: code, bloquear: bloquear }) });
        fecharModal();
        toast(bloquear ? "Cartão bloqueado." : "Cartão desbloqueado.");
        await carregar();
      } catch (err) {
        if (!tratar(err)) { ocupado(botao, false); toast(err.message); }
      }
    };
  }

  function transferir(code) {
    var c = acharCartao(code);
    if (!c) return;
    abrirModal("Trocar por um cartão novo",
      '<p class="modal-copy">As redes de <strong>' + esc(nomeCartao(c)) + "</strong> passam para o cartão novo. O antigo é bloqueado, e quem encostar nele vai direto para o novo.</p>" +
      '<form id="tf"><label class="field">Código do cartão novo<input name="novo" required maxlength="12" placeholder="TRY-XXXXXX" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>' +
      '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
      '<div class="modal-actions"><button type="button" class="btn secondary" data-fechar>Cancelar</button><button class="btn primary" type="submit">Trocar</button></div></form>');
    document.getElementById("tf").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var botao = form.querySelector('button[type="submit"]');
      ocupado(botao, true, "Trocando…");
      try {
        var r = await api("/api/trybo?action=transferir", {
          method: "POST",
          body: JSON.stringify({ code: code, novo: String(new FormData(form).get("novo") || "").trim().toUpperCase() })
        });
        fecharModal();
        toast("Pronto. O cartão " + r.novo + " já leva para as suas redes.");
        await carregar();
      } catch (err) {
        if (!tratar(err)) { ocupado(botao, false); erro(form, err.message); }
      }
    };
  }

  // ── Editar o destino ──────────────────────────────────────
  function opcoes(selecionado, permitirNenhum) {
    var d = estado.dados;
    return (permitirNenhum ? '<option value="">Nenhum (o cartão abre direto na primeira)</option>' : "") +
      d.catalogo.map(function (k) {
        var travado = !k.is_free && !d.desbloqueado;
        return '<option value="' + esc(k.kind) + '"' + (k.kind === selecionado ? " selected" : "") + (travado ? " disabled" : "") + ">" +
          esc(k.label) + (travado ? " · destinos avançados" : "") + "</option>";
      }).join("");
  }

  function dicaDe(kind) {
    if (kind === "whatsapp") return "11 99999-9999";
    if (["url", "spotify", "whatsapp_canal"].indexOf(kind) !== -1) return "https://…";
    return "@seuperfil";
  }

  // Ao escolher a rede, o campo abre com o @ que a conta já usou nela.
  function perfilGuardado(kind) {
    var p = (estado.dados.perfis || []).find(function (x) { return x.kind === kind; });
    return p ? valorDe(kind, p.url) : "";
  }

  function slot(n, destino, permitirNenhum) {
    var kind = destino ? destino.kind : (permitirNenhum ? "" : "instagram");
    var valor = destino ? valorDe(destino.kind, destino.url) : (kind ? perfilGuardado(kind) : "");
    return '<div class="form-grid" data-slot="' + n + '">' +
      '<label class="field">' + (n === 1 ? "Primeiro destino" : "Segundo destino") + '<select name="kind' + n + '">' + opcoes(kind, permitirNenhum) + "</select></label>" +
      '<label class="field" ' + (kind ? "" : "hidden") + '>Perfil<input name="valor' + n + '" value="' + esc(valor) + '" placeholder="' + dicaDe(kind) + '" maxlength="500" autocapitalize="none" spellcheck="false"></label>' +
      "</div>";
  }

  function previa(c) {
    if (c.status === "disabled") {
      return '<div class="profile-preview blocked-preview">' + icon("lock") + "<h3>Cartão bloqueado</h3><p>Quem encostar vê o aviso de cartão bloqueado.</p></div>";
    }
    var s = c.servidos;
    if (!s.length) return '<div class="profile-preview"><h3>Sem destino</h3><p>Quem encostar vê um aviso de que o cartão ainda não foi configurado.</p></div>';
    if (s.length === 1) {
      return '<div class="profile-preview"><span class="preview-avatar">' + icon(s[0].kind) + "</span><h3>Abre direto</h3><p>Quem encostar vai direto para o " + esc(s[0].label || nomeKind(s[0].kind)) + ", sem tela no meio.</p>" +
        '<span class="preview-brand">TRYBO <small>uma solução StarTouch</small></span></div>';
    }
    return '<div class="profile-preview"><h3>O cliente escolhe</h3><p>Duas opções, um toque.</p><div class="preview-links">' +
      s.map(function (d) { return '<span class="preview-link ' + esc(d.kind) + '">' + icon(d.kind) + "<span>" + esc(d.label || nomeKind(d.kind)) + "</span>" + icon("arrow") + "</span>"; }).join("") +
      '</div><span class="preview-brand">TRYBO <small>uma solução StarTouch</small></span></div>';
  }

  function editor() {
    var cartoes = (estado.dados.cartoes || []).filter(function (c) { return !c.substituido; });
    if (!cartoes.length) return vazio();
    var c = acharCartao(estado.editando) || cartoes[0];
    if (c.substituido) c = cartoes[0];
    estado.editando = c.code;
    var cfg = c.configurados;
    var aviso = c.motivo === "rebaixado_plano"
      ? '<p class="form-error" role="alert">Um destino deste cartão faz parte dos destinos avançados e não está sendo mostrado. O cartão está levando só para o que é grátis.</p>'
      : "";
    return '<div class="network-editor-head"><label class="field">Qual cartão?<select id="qual">' +
        cartoes.map(function (x) { return '<option value="' + esc(x.code) + '"' + (x.code === c.code ? " selected" : "") + ">" + esc(nomeCartao(x)) + " — " + esc(x.code) + "</option>"; }).join("") +
      '</select></label><span class="status ' + situacao(c).cls + '">' + (c.status === "disabled" ? "Cartão bloqueado" : "Cartão ativo") + "</span></div>" +
      '<div class="editor-grid"><section class="panel editor-panel"><div class="panel-heading"><div><h2>Para onde ele leva.</h2><p>Instagram, TikTok, WhatsApp e YouTube: grátis, para sempre.</p></div></div>' +
        '<form id="ef">' + aviso +
          '<label class="field">Nome do cartão<input name="apelido" maxlength="60" value="' + esc(c.apelido || "") + '" placeholder="Ex.: Camila · cadeira 2"></label>' +
          slot(1, cfg.find(function (d) { return d.posicao === 1; }), false) +
          slot(2, cfg.find(function (d) { return d.posicao === 2; }), true) +
          '<p class="field-hint">Com <strong>um</strong> destino, o celular abre direto nele — é o que mais converte. Com <strong>dois</strong>, o cliente escolhe.</p>' +
          '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
          '<div class="form-footer"><a class="small-link" href="https://trybo.co/t/' + encodeURIComponent(c.code) + '" target="_blank" rel="noopener">Fazer um toque de teste</a>' +
          '<button class="btn primary" type="submit">Salvar ' + icon("check") + "</button></div>" +
        "</form></section>" +
        '<aside class="preview-column"><p class="eyebrow">O QUE SEU CLIENTE VÊ AGORA</p>' + previa(c) + '<p class="preview-caption">É o que está no ar neste momento. Muda assim que você salvar.</p></aside></div>';
  }

  function ligarEditor() {
    ligarEditar();
    var qual = document.getElementById("qual");
    if (!qual) return;
    qual.onchange = function () { estado.editando = qual.value; shell(); };

    var form = document.getElementById("ef");
    [1, 2].forEach(function (n) {
      var sel = form.querySelector('[name="kind' + n + '"]');
      var campo = form.querySelector('[name="valor' + n + '"]');
      sel.onchange = function () {
        campo.parentNode.hidden = !sel.value;
        campo.placeholder = dicaDe(sel.value);
        campo.value = sel.value ? perfilGuardado(sel.value) : "";
      };
    });

    form.onsubmit = async function (e) {
      e.preventDefault();
      var botao = form.querySelector('button[type="submit"]');
      var d = new FormData(form);
      var c = acharCartao(estado.editando);
      var destinos = [];
      [1, 2].forEach(function (n) {
        var kind = d.get("kind" + n);
        if (kind) destinos.push({ posicao: destinos.length + 1, kind: kind, valor: String(d.get("valor" + n) || "").trim() });
      });
      if (!destinos.length) return erro(form, "Escolha pelo menos um destino.");
      if (destinos.some(function (x) { return !x.valor; })) return erro(form, "Preencha o perfil de cada destino escolhido.");
      if (destinos.length === 2 && destinos[0].kind === destinos[1].kind && destinos[0].valor === destinos[1].valor) {
        return erro(form, "Os dois destinos são iguais. Deixe só um — o cartão abre direto nele.");
      }

      ocupado(botao, true, "Salvando…");
      try {
        await api("/api/trybo?action=salvar-destinos", { method: "POST", body: JSON.stringify({ code: c.code, destinos: destinos }) });
        var apelido = String(d.get("apelido") || "").trim();
        if (apelido !== (c.apelido || "")) {
          await api("/api/trybo?action=renomear", { method: "POST", body: JSON.stringify({ code: c.code, apelido: apelido }) });
        }
        toast("Salvo. O cartão já leva para o destino novo.");
        await carregar();
      } catch (err) {
        if (!tratar(err)) { ocupado(botao, false); erro(form, err.message); }
      }
    };
  }

  modal.addEventListener("click", function (e) { if (e.target === modal) fecharModal(); });

  var q = new URLSearchParams(location.search);
  if (q.get("cartao")) { estado.editando = q.get("cartao").toUpperCase(); estado.view = "edit"; }
  carregar();
})();
