// ============================================================
// TRYBO — carrinho com a cara da Trybo (19/10/2026)
// Mesma compra do /kit da StarTouch, por baixo: mesmo catálogo
// (cartao-trybo no KIT_CATALOG), mesma cotação de frete (/api/frete),
// mesmo checkout de convidado (billing?action=checkout-kit-guest), mesmo
// webhook e mesmo aviso de pedido pago. O que muda é só o que o cliente vê:
// esta página, a volta do pagamento (`marca: "trybo"` → /comprar-trybo) e os
// e-mails (pedido `kit_trybo_…`).
//
// Só vende o cartão Trybo e só entrega no Brasil — o servidor recusa outra
// coisa vinda daqui. Preço exibido é o do catálogo; quem cobra é o servidor.
// ============================================================
(function () {
  "use strict";

  var PRODUTO = { id: "cartao-trybo", nome: "Cartão Trybo Black", preco: 39.90, img: "/trybo/produto/trybo-1-180.webp" };
  var FRETE_GRATIS = 149;
  var app = document.getElementById("app");
  var q = new URLSearchParams(location.search);

  var estado = {
    qtd: Math.min(99, Math.max(1, parseInt(q.get("qtd") || "1", 10) || 1)),
    frete: null,        // { opcoes, codigo }
    cotando: false,
    erroFrete: null
  };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function brl(v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  var CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

  function gaIds() {
    try {
      var cid = (document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/) || [])[1] || "";
      var sid = (document.cookie.match(/_ga_HCLV0Z640L=GS\d\.\d\.s?(\d+)/) || [])[1] || "";
      return { ga_client_id: cid, ga_session_id: sid };
    } catch (e) { return { ga_client_id: "", ga_session_id: "" }; }
  }

  function subtotal() { return PRODUTO.preco * estado.qtd; }
  function opcaoEscolhida() {
    if (!estado.frete) return null;
    return estado.frete.opcoes.find(function (o) { return o.codigo === estado.frete.codigo; }) || null;
  }

  // ── VOLTA DO PAGAMENTO ──────────────────────────────────────
  // O texto nasce neutro e só vira "confirmado" quando o servidor diz que o
  // dinheiro entrou — mesma regra do /kit (lá, o boleto ensinou que a volta
  // do Stripe não é prova de pagamento).
  function telaSucesso() {
    app.innerHTML =
      '<section class="cmp-ok"><div class="cmp-ok-icone">' + CHECK + "</div>" +
      '<p class="eyebrow">PEDIDO RECEBIDO</p>' +
      '<h1 id="okTitulo">Obrigado pela compra.</h1>' +
      '<p id="okTexto">Estamos confirmando o pagamento. Você recebe tudo por e-mail, inclusive o código de rastreio.</p>' +
      '<div class="cmp-passos"><h2>Quando o cartão chegar</h2><ol>' +
        "<li>Abra <strong>trybo.co/ativar</strong> e digite o código do verso.</li>" +
        "<li>Crie sua conta e escolha as suas redes.</li>" +
        "<li>Pronto: o cliente encosta o celular e segue você.</li>" +
      "</ol></div>" +
      '<a class="button primary" href="https://trybo.co/">Voltar ao site</a></section>';
    var sid = q.get("sid");
    if (!sid) return;
    fetch("/api/billing?action=status-compra&sid=" + encodeURIComponent(sid))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.pago) return;
        document.getElementById("okTitulo").textContent = "Pagamento confirmado.";
        document.getElementById("okTexto").textContent = "Já estamos preparando o envio. O código de rastreio chega no seu e-mail assim que o pacote for postado.";
      })
      .catch(function () { /* fica o texto neutro */ });
  }

  // ── O CARRINHO ──────────────────────────────────────────────
  function resumo() {
    var op = opcaoEscolhida();
    var freteTxt = op ? (op.precoCentavos === 0 ? "Grátis" : brl(op.precoCentavos / 100)) : "informe o CEP";
    var total = subtotal() + (op ? op.precoCentavos / 100 : 0);
    var falta = FRETE_GRATIS - subtotal();
    return '<div class="cmp-item"><img src="' + PRODUTO.img + '" alt="" width="72" height="72">' +
        '<div><strong>' + esc(PRODUTO.nome) + '</strong><span>' + brl(PRODUTO.preco) + " cada</span></div>" +
        '<div class="cmp-qtd" role="group" aria-label="Quantidade"><button type="button" data-q="-1" aria-label="Menos um">−</button>' +
        '<span aria-live="polite">' + estado.qtd + '</span><button type="button" data-q="1" aria-label="Mais um">+</button></div></div>' +
      '<dl class="cmp-contas"><div><dt>Produtos</dt><dd>' + brl(subtotal()) + "</dd></div>" +
        "<div><dt>Frete</dt><dd>" + freteTxt + "</dd></div>" +
        '<div class="total"><dt>Total</dt><dd>' + brl(total) + "</dd></div></dl>" +
      (falta > 0
        ? '<p class="cmp-dica">Faltam ' + brl(falta) + " para o frete grátis. Um cartão para cada pessoa da equipe?</p>"
        : '<p class="cmp-dica ok">' + CHECK + " Frete grátis neste pedido.</p>") +
      '<ul class="cmp-inclui"><li>' + CHECK + "NFC e QR Code, cabe na carteira</li><li>" + CHECK + "Instagram, TikTok, WhatsApp e YouTube sem mensalidade</li><li>" + CHECK + "Garantia de 3 meses</li></ul>";
  }

  function opcoesFrete() {
    if (estado.cotando) return '<p class="cmp-frete-msg">Calculando o frete…</p>';
    if (estado.erroFrete) return '<p class="cmp-frete-msg erro">' + esc(estado.erroFrete) + "</p>";
    if (!estado.frete) return '<p class="cmp-frete-msg">Digite o CEP para ver as opções de entrega.</p>';
    return estado.frete.opcoes.map(function (o) {
      var preco = o.precoCentavos === 0 ? "Grátis" : brl(o.precoCentavos / 100);
      var prazo = o.prazoDias ? o.prazoDias + (o.prazoDias === 1 ? " dia útil" : " dias úteis") : "";
      return '<label class="cmp-op"><input type="radio" name="frete" value="' + esc(o.codigo) + '"' + (o.codigo === estado.frete.codigo ? " checked" : "") + ">" +
        "<span><strong>" + esc(o.transportadora) + " · " + esc(o.servico) + "</strong><small>" + esc(prazo) + "</small></span><b>" + preco + "</b></label>";
    }).join("");
  }

  function atualizarResumo() {
    document.getElementById("resumo").innerHTML = resumo();
    document.getElementById("opcoes").innerHTML = opcoesFrete();
    var op = opcaoEscolhida();
    var total = subtotal() + (op ? op.precoCentavos / 100 : 0);
    document.getElementById("pagar").innerHTML = "Ir para o pagamento · " + brl(total);
    ligarResumo();
  }

  function ligarResumo() {
    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () {
        var nova = Math.min(99, Math.max(1, estado.qtd + Number(b.dataset.q)));
        if (nova === estado.qtd) return;
        estado.qtd = nova;
        // A quantidade muda o peso e o frete grátis: cota de novo.
        if (estado.frete || estado.erroFrete) cotar(); else atualizarResumo();
      };
    });
    document.querySelectorAll('input[name="frete"]').forEach(function (r) {
      r.onchange = function () { estado.frete.codigo = r.value; atualizarResumo(); };
    });
  }

  var pedidoFrete = 0;
  async function cotar() {
    var cep = (document.getElementById("cep").value || "").replace(/\D/g, "");
    if (cep.length !== 8) { estado.frete = null; estado.erroFrete = null; atualizarResumo(); return; }
    var meu = ++pedidoFrete;
    estado.cotando = true; estado.erroFrete = null; atualizarResumo();
    try {
      var r = await fetch("/api/frete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cep, items: [{ id: PRODUTO.id, qty: estado.qtd }], modo: "unitario" })
      });
      var d = await r.json();
      if (meu !== pedidoFrete) return;   // resposta de um CEP que já foi trocado
      if (!r.ok || !d.opcoes || !d.opcoes.length) {
        estado.frete = null;
        estado.erroFrete = (d && d.error) || "Não consegui calcular o frete para esse CEP.";
      } else {
        var antes = estado.frete && estado.frete.codigo;
        var mantem = d.opcoes.some(function (o) { return o.codigo === antes; });
        estado.frete = { opcoes: d.opcoes, codigo: mantem ? antes : d.opcoes[0].codigo };
      }
    } catch (e) {
      if (meu !== pedidoFrete) return;
      estado.frete = null; estado.erroFrete = "Erro de conexão ao calcular o frete.";
    }
    estado.cotando = false;
    atualizarResumo();
  }

  function campo(nome, rotulo, extra) {
    return '<label class="cmp-campo' + (extra && extra.cls ? " " + extra.cls : "") + '"><span>' + rotulo + "</span>" +
      '<input name="' + nome + '" id="' + nome + '"' + (extra && extra.attrs ? " " + extra.attrs : "") + "></label>";
  }

  function telaCarrinho(aviso) {
    app.innerHTML =
      (aviso ? '<p class="cmp-aviso" role="alert">' + esc(aviso) + "</p>" : "") +
      '<h1 class="cmp-titulo">Finalizar compra</h1>' +
      '<div class="cmp-grid">' +
        '<form id="f" class="cmp-form" novalidate>' +
          '<fieldset><legend>Seus dados</legend>' +
            campo("name", "Nome completo", { attrs: 'required autocomplete="name" maxlength="80"' }) +
            '<div class="cmp-2">' +
              campo("email", "E-mail", { attrs: 'type="email" required autocomplete="email" inputmode="email"' }) +
              campo("phone", "WhatsApp", { attrs: 'type="tel" required autocomplete="tel" inputmode="tel" placeholder="(11) 99999-9999"' }) +
            "</div>" +
            campo("cpf_cnpj", "CPF ou CNPJ <small>(para a nota fiscal)</small>", { attrs: 'required inputmode="numeric" maxlength="18"' }) +
          "</fieldset>" +
          '<fieldset><legend>Entrega <small>· todo o Brasil</small></legend>' +
            '<div class="cmp-2">' +
              campo("cep", "CEP", { attrs: 'required inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000"' }) +
              '<p class="cmp-cep" id="cepStatus" aria-live="polite"></p>' +
            "</div>" +
            campo("address", "Rua", { attrs: 'required autocomplete="address-line1"' }) +
            '<div class="cmp-2">' +
              campo("number", "Número", { attrs: 'required inputmode="numeric"' }) +
              campo("complement", "Complemento <small>(opcional)</small>", { attrs: 'autocomplete="address-line2"' }) +
            "</div>" +
            campo("neighborhood", "Bairro", { attrs: "required" }) +
            '<div class="cmp-2">' +
              campo("city", "Cidade", { attrs: 'required autocomplete="address-level2"' }) +
              campo("state", "Estado", { attrs: 'required maxlength="2" autocomplete="address-level1" placeholder="SP"' }) +
            "</div>" +
          "</fieldset>" +
          '<fieldset><legend>Frete</legend><div id="opcoes"></div></fieldset>' +
          '<p class="cmp-erro" id="erro" role="alert" hidden></p>' +
          '<button class="button primary cmp-pagar" id="pagar" type="submit"></button>' +
          '<p class="cmp-seguro">' + CADEADO + " Pagamento seguro pelo Stripe · cartão de crédito (parcelado) ou PIX</p>" +
        "</form>" +
        '<aside class="cmp-lado"><h2>Seu pedido</h2><div id="resumo"></div></aside>' +
      "</div>";

    var f = document.getElementById("f");
    var cep = document.getElementById("cep");
    var doc = document.getElementById("cpf_cnpj");
    var uf = document.getElementById("state");

    cep.addEventListener("input", function () {
      var v = cep.value.replace(/\D/g, "").slice(0, 8);
      cep.value = v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
      if (v.length === 8) buscarCep(v);
    });
    doc.addEventListener("input", function () {
      var d = doc.value.replace(/\D/g, "").slice(0, 14);
      doc.value = d.length <= 11
        ? d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
        : d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
    });
    uf.addEventListener("input", function () { uf.value = uf.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2); });

    f.onsubmit = pagar;
    atualizarResumo();
  }

  var ultimoCep = "";
  async function buscarCep(cep) {
    if (cep === ultimoCep) return;
    ultimoCep = cep;
    var st = document.getElementById("cepStatus");
    st.textContent = "Buscando o endereço…";
    cotar();
    try {
      var r = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      var d = await r.json();
      if (d.erro) { st.textContent = "CEP não encontrado. Preencha o endereço abaixo."; return; }
      if (d.logradouro) document.getElementById("address").value = d.logradouro;
      if (d.bairro) document.getElementById("neighborhood").value = d.bairro;
      if (d.localidade) document.getElementById("city").value = d.localidade;
      if (d.uf) document.getElementById("state").value = d.uf;
      st.textContent = (d.localidade ? d.localidade + " · " + d.uf : "");
      document.getElementById("number").focus();
    } catch (e) {
      st.textContent = "";
    }
  }

  function mostrarErro(msg, focar) {
    var el = document.getElementById("erro");
    el.textContent = msg; el.hidden = false;
    if (focar) { var c = document.getElementById(focar); if (c) c.focus(); }
    else el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function pagar(e) {
    e.preventDefault();
    var f = e.currentTarget;
    var d = new FormData(f);
    var v = function (k) { return String(d.get(k) || "").trim(); };
    document.getElementById("erro").hidden = true;

    if (!v("name")) return mostrarErro("Informe o seu nome.", "name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) return mostrarErro("Confira o e-mail — é nele que chegam o pedido e o rastreio.", "email");
    if (v("phone").replace(/\D/g, "").length < 10) return mostrarErro("Informe o WhatsApp com DDD.", "phone");
    var doc = v("cpf_cnpj").replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) return mostrarErro("Informe um CPF (11 números) ou CNPJ (14 números).", "cpf_cnpj");
    if (v("cep").replace(/\D/g, "").length !== 8) return mostrarErro("Informe o CEP de entrega.", "cep");
    if (!v("address") || !v("number") || !v("neighborhood") || !v("city") || v("state").length !== 2) {
      return mostrarErro("Preencha o endereço completo: rua, número, bairro, cidade e estado.", !v("number") ? "number" : "address");
    }
    if (!opcaoEscolhida()) return mostrarErro(estado.erroFrete || "Escolha uma opção de frete.");

    var botao = document.getElementById("pagar");
    botao.disabled = true; botao.textContent = "Abrindo o pagamento…";
    var customer = {
      name: v("name"), email: v("email"), phone: v("phone"), cpf_cnpj: doc,
      cep: v("cep"), address: v("address"), number: v("number"), complement: v("complement"),
      neighborhood: v("neighborhood"), city: v("city"), state: v("state"), country: "BR"
    };
    var corpo = { marca: "trybo", items: [{ id: PRODUTO.id, qty: estado.qtd }], customer: customer, frete_codigo: estado.frete.codigo };
    var g = gaIds(); corpo.ga_client_id = g.ga_client_id; corpo.ga_session_id = g.ga_session_id;
    try {
      var r = await fetch("/api/billing?action=checkout-kit-guest", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo)
      });
      var j = await r.json();
      if (!r.ok || !j.url) {
        // Frete mudou desde a cotação (preço ou opção sumiu): cota de novo.
        if (j && Array.isArray(j.opcoes) && j.opcoes.length) {
          estado.frete = { opcoes: j.opcoes, codigo: j.opcoes[0].codigo };
          atualizarResumo();
        }
        throw new Error((j && j.error) || "Não consegui abrir o pagamento. Tente de novo.");
      }
      if (window.gtag) window.gtag("event", "begin_checkout", { currency: "BRL", value: subtotal(), items: [{ item_id: PRODUTO.id, item_name: PRODUTO.nome, quantity: estado.qtd }] });
      location.href = j.url;
    } catch (err) {
      botao.disabled = false;
      atualizarResumo();
      mostrarErro(err.message);
    }
  }

  if (q.get("compra") === "sucesso") telaSucesso();
  else telaCarrinho(q.get("compra") === "falhou" ? "O pagamento não foi concluído e nada foi cobrado. É só tentar de novo." : null);
})();
