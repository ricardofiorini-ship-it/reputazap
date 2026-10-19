// ============================================================
// TRYBO — criar senha nova (19/10/2026)
// Chega aqui pelo e-mail da Trybo (api/forgot-password.js), com
// ?token_hash= e, se a pessoa estava ativando um cartão, ?code=.
// Troca a senha, já guarda a sessão e segue: com código, de volta pra
// ativação do cartão; sem código, pro painel. Antes disso, quem esquecia a
// senha caía na página e no painel da StarTouch.
// ============================================================
(function () {
  "use strict";

  var app = document.getElementById("app");
  var q = new URLSearchParams(location.search);
  var tokenHash = q.get("token_hash") || "";
  var code = (q.get("code") || "").trim().toUpperCase();

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var seta = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';

  function moldura(conteudo) {
    document.body.className = "activation-page";
    app.innerHTML =
      '<header class="activation-header">' +
        '<a class="app-logo" href="https://trybo.co/" aria-label="Trybo — voltar ao site">TRYBO<span>™</span></a>' +
        '<a class="small-link" href="/painel-trybo">Ir para o painel</a>' +
      "</header>" +
      '<main class="activation-main"><section class="activation-panel">' + conteudo + "</section></main>" +
      '<footer class="activation-footer">Trybo, uma solução StarTouch.</footer>';
  }
  function erro(form, msg) {
    var el = form.querySelector(".form-error");
    el.textContent = msg; el.hidden = false; el.focus();
  }
  function guardarSessao(d) {
    try {
      localStorage.setItem("rz_token", d.token);
      if (d.refresh_token) localStorage.setItem("rz_refresh", d.refresh_token);
      if (d.expires_at) localStorage.setItem("rz_token_exp", String(d.expires_at));
      if (d.user) localStorage.setItem("rz_user", JSON.stringify(d.user));
    } catch (e) { /* sem armazenamento: o painel vai pedir login, com a senha nova */ }
  }
  function destino() {
    return code ? "/ativar-trybo?code=" + encodeURIComponent(code) : "/painel-trybo";
  }

  // Link vencido, usado ou cortado pelo app de e-mail: pede outro aqui
  // mesmo, sem mandar a pessoa procurar a tela de entrada.
  function telaPedirOutro(aviso) {
    moldura(
      '<p class="eyebrow">LINK VENCIDO</p>' +
      "<h1>Vamos mandar<br>outro link.</h1>" +
      '<p class="intro">' + esc(aviso || "Este link expirou ou já foi usado.") + " Digite o seu e-mail e enviamos um novo.</p>" +
      '<form id="f">' +
        '<label class="field">E-mail<input name="email" type="email" required autocomplete="email" inputmode="email"></label>' +
        '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
        '<button class="btn primary full" type="submit">Enviar link ' + seta + "</button>" +
      "</form>");
    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget, botao = form.querySelector("button");
      botao.disabled = true;
      try {
        await fetch("/api/forgot-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: new FormData(form).get("email"), produto: "trybo", code: code || undefined })
        });
      } catch (err) { /* a resposta é a mesma de qualquer jeito */ }
      botao.disabled = false;
      erro(form, "Se esse e-mail tiver conta, o link novo chega em instantes. Confira também o spam.");
    };
  }

  function telaSenha() {
    moldura(
      '<p class="eyebrow">QUASE LÁ</p>' +
      "<h1>Crie uma<br>senha nova.</h1>" +
      '<p class="intro">' + (code ? "Depois disso você volta direto para a ativação do cartão." : "Depois disso você já entra no seu painel.") + "</p>" +
      '<form id="f">' +
        '<label class="field">Senha nova<input name="senha" type="password" required minlength="6" autocomplete="new-password"></label>' +
        '<label class="field">Repita a senha<input name="senha2" type="password" required minlength="6" autocomplete="new-password"></label>' +
        '<p class="field-hint">Pelo menos 6 caracteres.</p>' +
        '<p class="form-error" hidden tabindex="-1" role="alert"></p>' +
        '<button class="btn primary full" type="submit">Salvar e entrar ' + seta + "</button>" +
      "</form>");
    document.getElementById("f").onsubmit = async function (e) {
      e.preventDefault();
      var form = e.currentTarget, botao = form.querySelector('button[type="submit"]');
      var d = new FormData(form);
      var senha = String(d.get("senha") || "");
      if (senha.length < 6) return erro(form, "A senha precisa de pelo menos 6 caracteres.");
      if (senha !== String(d.get("senha2") || "")) return erro(form, "As duas senhas não estão iguais.");
      botao.disabled = true; botao.textContent = "Salvando…";
      try {
        var r = await fetch("/api/reset-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token_hash: tokenHash, password: senha })
        });
        var j = null; try { j = await r.json(); } catch (x) {}
        if (r.status === 401 || (j && j.codigo === "link_expirado")) return telaPedirOutro();
        if (!r.ok || !j || !j.token) throw new Error((j && j.error) || "Não consegui trocar a senha. Tente de novo.");
        guardarSessao(j);
        location.replace(destino());
      } catch (err) {
        botao.disabled = false; botao.innerHTML = "Salvar e entrar " + seta;
        erro(form, err.message);
      }
    };
  }

  if (!tokenHash) telaPedirOutro("Este endereço está incompleto.");
  else telaSenha();
})();
