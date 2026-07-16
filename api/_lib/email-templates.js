// ============================================================
// StarTouch — Templates de emails transacionais
// ============================================================
// HTML compatível com Gmail dark mode + iOS Mail (inline CSS).
// Mantém visual consistente: header colorido + body card + footer.
// ============================================================

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

// Footer padrão de todos os emails. unsubUrl (opcional) adiciona o link de
// descadastro de 1 clique — usado no digest semanal (não nos transacionais).
function footer(unsubUrl, unsubLabel) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
    <tr><td align="center">
      <p style="font-size:11px;color:#A8B0BB;line-height:1.6;margin:0;">
        Você está recebendo isso porque criou uma conta no StarTouch.<br/>
        Pra ajustar quais emails recebe, acesse <a href="https://startouch.com.br/app?login=1&tab=alertas" style="color:#1A73E8;text-decoration:none;font-weight:600;">o painel</a>.${unsubUrl ? `<br/>Não quer mais ${unsubLabel || "o resumo semanal"}? <a href="${unsubUrl}" style="color:#A8B0BB;text-decoration:underline;">Descadastrar</a>.` : ""}
      </p>
      <p style="font-size:11px;color:#A8B0BB;line-height:1.6;margin:10px 0 0;">
        StarTouch · Reputação no piloto automático<br/>
        <a href="https://startouch.com.br" style="color:#A8B0BB;text-decoration:none;">startouch.com.br</a>
      </p>
    </td></tr>
  </table>
`;
}

// Wrapper que envolve todo email
function shell({ title, headerColor = "#1A73E8", body, unsubUrl, unsubLabel }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#202124;background:#F8F9FA;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
        <tr><td>
          <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${headerColor};margin-bottom:8px;">
            ${title}
          </div>
        </td></tr>
      </table>
      ${body}
      ${footer(unsubUrl, unsubLabel)}
    </div>
  `;
}

// CTA button reutilizável
function cta(href, label, color = "#1A73E8") {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 6px;">
      <tr><td style="border-radius:10px;background:${color};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif;">
          ${label}
        </a>
      </td></tr>
    </table>
  `;
}

// ─────────────────────────────────────────────────────────────
// 1. BEM-VINDO (após cadastro)
// ─────────────────────────────────────────────────────────────
export function welcomeEmail({ userName }) {
  const name = escapeHtml(userName?.split(" ")[0] || "tudo bem?");
  return {
    subject: `Bem-vindo ao StarTouch, ${name} 👋`,
    html: shell({
      title: "🎉 BEM-VINDO",
      body: `
        <h1 style="margin:0 0 12px;font-size:24px;color:#202124;line-height:1.25;">
          Olá, ${name}!
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 14px;">
          Bom ter você no <strong style="color:#202124;">StarTouch</strong>. Em poucos minutos seu negócio estará coletando avaliações no Google sem você precisar pedir uma por uma.
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;">
          <p style="font-size:13.5px;color:#5F6368;margin:0 0 10px;font-weight:600;">
            ✓ Próximos 3 passos
          </p>
          <ol style="font-size:14px;color:#202124;line-height:1.7;margin:0;padding-left:20px;">
            <li><strong>Conecte seu negócio no Google</strong> — buscamos a sua loja em segundos</li>
            <li><strong>Ative seu primeiro dispositivo</strong> — placa, cartão ou pulseira NFC</li>
            <li><strong>Acompanhe seu ranking</strong> — veja onde você está vs concorrentes</li>
          </ol>
        </div>

        ${cta("https://startouch.com.br/app", "Começar agora →")}

        <p style="font-size:13px;color:#5F6368;line-height:1.6;margin:20px 0 0;">
          Qualquer dúvida, é só responder esse email — a gente lê tudo.<br/>
          Bora?
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 2. NEGÓCIO VINCULADO
// ─────────────────────────────────────────────────────────────
export function businessLinkedEmail({ userName, bizName }) {
  const name = escapeHtml(userName?.split(" ")[0] || "tudo bem?");
  const biz = escapeHtml(bizName || "seu negócio");
  return {
    subject: `📍 ${biz} conectado no StarTouch`,
    html: shell({
      title: "📍 NEGÓCIO CONECTADO",
      headerColor: "#137333",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          ${biz} já está no nosso radar 🎯
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 16px;">
          Boa, ${name}! Acabamos de conectar seu negócio ao Google Meu Negócio. Agora podemos te mostrar:
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;">
          <ul style="font-size:14px;color:#202124;line-height:1.85;margin:0;padding-left:20px;list-style:none;">
            <li>📊 <strong>Sua nota atual</strong> e total de avaliações no Google</li>
            <li>🏆 <strong>Sua posição</strong> no ranking da sua categoria local</li>
            <li>👀 <strong>Seus concorrentes</strong> mais próximos</li>
            <li>📈 <strong>Crescimento</strong> ao longo das semanas</li>
          </ul>
        </div>

        ${cta("https://startouch.com.br/app?tab=concorrentes", "Ver minha posição no ranking →", "#137333")}

        <p style="font-size:13px;color:#5F6368;line-height:1.55;margin:20px 0 0;">
          <strong>Próximo passo:</strong> ative seu primeiro dispositivo NFC pra começar a capturar avaliações. Já tem um? Tem o código atrás (começa com <code style="background:#F1F3F4;padding:2px 6px;border-radius:4px;font-size:12px;">STAR-</code>).
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 3. PRIMEIRO HARDWARE ATIVADO
// ─────────────────────────────────────────────────────────────
export function firstDeviceEmail({ userName, bizName, code, channelName }) {
  const name = escapeHtml(userName?.split(" ")[0] || "tudo bem?");
  const biz = escapeHtml(bizName || "seu negócio");
  const codeStr = escapeHtml(code || "STAR-XXXXX");
  const nick = channelName ? ` (apelido: <strong>${escapeHtml(channelName)}</strong>)` : "";
  return {
    subject: `⚡ Seu primeiro dispositivo está ATIVO em ${biz}`,
    html: shell({
      title: "⚡ DISPOSITIVO ATIVADO",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          Boa, ${name}! Tá funcionando 🎉
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 16px;">
          Seu primeiro dispositivo foi ativado e já está pronto pra capturar avaliações pra <strong>${biz}</strong>.
        </p>

        <div style="background:linear-gradient(135deg,#EAF2FE,#fff);border:1px solid #B9D6FB;border-radius:12px;padding:18px;margin:14px 0;">
          <div style="font-size:11px;color:#1A73E8;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">
            Código ativado
          </div>
          <div style="font-family:monospace;font-size:22px;font-weight:800;color:#0F4DAE;letter-spacing:.05em;">
            ${codeStr}
          </div>
          <div style="font-size:13px;color:#5F6368;margin-top:4px;">
            Vinculado a ${biz}${nick}
          </div>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;">
          <p style="font-size:14px;color:#202124;font-weight:600;margin:0 0 10px;">
            📍 Onde colocar?
          </p>
          <ul style="font-size:13.5px;color:#5F6368;line-height:1.7;margin:0;padding-left:20px;">
            <li><strong>Balcão / caixa</strong> — cliente toca depois de pagar</li>
            <li><strong>Mesa</strong> — fim da refeição é o melhor momento</li>
            <li><strong>Crachá do garçom</strong> — toca após o atendimento</li>
          </ul>
          <p style="font-size:12.5px;color:#5F6368;line-height:1.5;margin:12px 0 0;font-style:italic;">
            Dica: peça verbalmente. "Se gostou, dá uma estrelinha pra gente?" funciona 5x mais que dispositivo silencioso.
          </p>
        </div>

        ${cta("https://startouch.com.br/app#pontos-de-captacao", "Ver minhas placas →")}
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 4. PRIMEIRA AVALIAÇÃO CAPTURADA (marco emocional)
// ─────────────────────────────────────────────────────────────
export function firstReviewEmail({ userName, bizName, channelName }) {
  const name = escapeHtml(userName?.split(" ")[0] || "tudo bem?");
  const biz = escapeHtml(bizName || "seu negócio");
  const ch = channelName ? escapeHtml(channelName) : "um dos seus dispositivos";
  return {
    subject: `🎯 Sua primeira avaliação chegou em ${biz}!`,
    html: shell({
      title: "🎯 PRIMEIRO TOQUE!",
      headerColor: "#137333",
      body: `
        <h1 style="margin:0 0 12px;font-size:24px;color:#202124;line-height:1.25;">
          ${name}, conseguimos! 🎉🎉🎉
        </h1>
        <p style="font-size:16px;color:#5F6368;line-height:1.6;margin:0 0 18px;">
          Um cliente acabou de tocar em <strong>${ch}</strong> e foi direcionado pra deixar avaliação no Google de <strong>${biz}</strong>.
        </p>

        <div style="background:linear-gradient(135deg,#E6F4EA,#fff);border:1px solid #A7F3D0;border-radius:12px;padding:24px;margin:16px 0;text-align:center;">
          <div style="font-size:48px;line-height:1;margin-bottom:8px;">⭐</div>
          <div style="font-size:18px;font-weight:700;color:#065F46;line-height:1.3;">
            Esse é o primeiro de muitos
          </div>
          <div style="font-size:13.5px;color:#137333;margin-top:6px;line-height:1.5;">
            Cada toque pode virar uma avaliação. Mais avaliações = mais clientes te encontrando.
          </div>
        </div>

        ${cta("https://startouch.com.br/app", "Acompanhar no painel →", "#137333")}

        <p style="font-size:13px;color:#5F6368;line-height:1.6;margin:20px 0 0;">
          <strong>Próximo passo:</strong> coloca mais dispositivos em outros pontos (mesa, balcão, crachá). Quanto mais pontos de contato, mais avaliações por mês.
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// ADMIN: novo cliente cadastrado (interno — pra Ricardo)
// ─────────────────────────────────────────────────────────────
export function adminNewClientEmail({ clientName, clientEmail, clientPhone, source }) {
  const name = escapeHtml(clientName || "(sem nome)");
  const email = escapeHtml(clientEmail || "");
  const phone = clientPhone ? escapeHtml(clientPhone) : "—";
  const srcLabel = {
    register: "📝 Cadastro email/senha",
    login_google: "🔵 Login Google (1ª vez)",
    activate_codigo: "📦 Veio pelo /ativar-codigo (NFC)",
    activate_inbound: "🌐 Veio pela landing"
  }[source] || source || "Direto";
  const when = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return {
    subject: `🎉 Novo cliente no StarTouch: ${name}`,
    html: shell({
      title: "🎉 NOVO CLIENTE",
      headerColor: "#137333",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          ${name} acabou de criar conta
        </h1>
        <p style="font-size:14px;color:#5F6368;line-height:1.6;margin:0 0 14px;">
          Notificação automática — chegou um cliente novo no sistema.
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-size:13.5px;">
            <tr>
              <td style="padding:4px 0;color:#5F6368;width:130px;">Nome</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Email</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;"><a href="mailto:${email}" style="color:#1A73E8;text-decoration:none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">WhatsApp</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${phone}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Origem</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${escapeHtml(srcLabel)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Data</td>
              <td style="padding:4px 0;color:#202124;">${when}</td>
            </tr>
          </table>
        </div>

        ${cta(`https://supabase.com/dashboard`, "Ver no Supabase →", "#137333")}

        <p style="font-size:12px;color:#80868B;line-height:1.55;margin:14px 0 0;">
          Dica: salva o WhatsApp no Customer Success — o cliente recebeu o email de boas-vindas e tá começando o onboarding agora.
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// ADMIN: dispositivo ativado (interno — pra Ricardo)
// ─────────────────────────────────────────────────────────────
const PRODUCT_LABELS_PT = {
  placa_balcao: "Placa de Balcão",
  placa_mesa: "Placa de Mesa",
  placa_parede: "Placa de Parede",
  pulseira_nfc: "Pulseira NFC",
  cartao_nfc: "Cartão NFC"
};

export function adminDeviceActivatedEmail({
  clientName, clientEmail, bizName, code, channelName, productType, totalDevices
}) {
  const name = escapeHtml(clientName || "Cliente");
  const email = escapeHtml(clientEmail || "");
  const biz = escapeHtml(bizName || "—");
  const codeStr = escapeHtml(code || "STAR-XXXXX");
  const nick = channelName ? escapeHtml(channelName) : "<em>(sem apelido)</em>";
  const product = PRODUCT_LABELS_PT[productType] || escapeHtml(productType || "Dispositivo");
  const total = totalDevices || 1;
  const when = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return {
    subject: `⚡ ${codeStr} ativado por ${biz}`,
    html: shell({
      title: "⚡ DISPOSITIVO ATIVADO",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          ${biz} acabou de ativar um dispositivo
        </h1>
        <p style="font-size:14px;color:#5F6368;line-height:1.6;margin:0 0 14px;">
          ${total === 1
            ? "Primeira ativação desse cliente! Marco importante 🎯"
            : `É o ${total}º dispositivo desse cliente.`}
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-size:13.5px;">
            <tr>
              <td style="padding:4px 0;color:#5F6368;width:130px;">Cliente</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${name}<br/><a href="mailto:${email}" style="color:#1A73E8;font-size:12.5px;text-decoration:none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Negócio</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${biz}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Código</td>
              <td style="padding:4px 0;color:#202124;font-family:monospace;font-weight:700;letter-spacing:.04em;">${codeStr}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Tipo</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${product}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Apelido</td>
              <td style="padding:4px 0;color:#202124;">${nick}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Total ativos</td>
              <td style="padding:4px 0;color:#202124;font-weight:600;">${total} dispositivo${total > 1 ? "s" : ""}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#5F6368;">Data</td>
              <td style="padding:4px 0;color:#202124;">${when}</td>
            </tr>
          </table>
        </div>

        <p style="font-size:12px;color:#80868B;line-height:1.55;margin:14px 0 0;">
          O cliente já recebeu o email de confirmação. ${total === 1 ? "Bom momento pra dar oi no WhatsApp e oferecer ajuda com o posicionamento." : ""}
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 5. HARDWARE ADICIONAL (2ª, 3ª placa…)
// ─────────────────────────────────────────────────────────────
export function additionalDeviceEmail({ userName, bizName, code, channelName, totalCount }) {
  const name = escapeHtml(userName?.split(" ")[0] || "tudo bem?");
  const biz = escapeHtml(bizName || "seu negócio");
  const codeStr = escapeHtml(code || "STAR-XXXXX");
  const nick = channelName ? escapeHtml(channelName) : codeStr;
  const ordinal = totalCount >= 4 ? `${totalCount}ª` : totalCount === 3 ? "3ª" : "2ª";
  return {
    subject: `✅ Mais um ponto de captação em ${biz}`,
    html: shell({
      title: "✅ + 1 DISPOSITIVO",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          Seu ${ordinal} dispositivo está ativo 💪
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 14px;">
          Mais um ponto de contato com seus clientes em <strong>${biz}</strong>. Quanto mais lugares com NFC, mais chances de coletar avaliação.
        </p>

        <div style="background:#EAF2FE;border:1px solid #B9D6FB;border-radius:10px;padding:14px;margin:14px 0;">
          <div style="font-size:13px;color:#0F4DAE;font-weight:600;margin-bottom:2px;">
            ${nick}
          </div>
          <div style="font-family:monospace;font-size:12.5px;color:#5F6368;">
            ${codeStr}
          </div>
        </div>

        ${cta("https://startouch.com.br/app#pontos-de-captacao", "Ver todos os dispositivos →")}
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 8. ALERTA: AVALIAÇÃO NEGATIVA NOVA (Pro)
// ─────────────────────────────────────────────────────────────
export function negativeReviewEmail({ bizName, author, rating, text, placeId }) {
  const biz = escapeHtml(bizName || "seu negócio");
  const who = escapeHtml(author || "Um cliente");
  const r = Math.max(0, Math.min(5, rating || 0));
  const stars = "★".repeat(r) + "☆".repeat(5 - r);
  const comment = escapeHtml((text || "").slice(0, 400));
  const url = placeId
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`
    : "https://business.google.com/";
  return {
    subject: `⚠️ ${biz} recebeu uma avaliação ${r}★ no Google`,
    html: shell({
      title: "⚠️ AVALIAÇÃO NEGATIVA",
      headerColor: "#C5221F",
      body: `
        <h1 style="margin:0 0 12px;font-size:22px;color:#202124;line-height:1.3;">
          Uma avaliação ${r}★ acabou de aparecer
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 14px;">
          <strong>${who}</strong> avaliou <strong>${biz}</strong> no Google. Responder rápido e com educação mostra pros próximos clientes que você se importa — e muitas vezes recupera quem reclamou.
        </p>

        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;margin:14px 0;">
          <div style="font-size:16px;color:#C5221F;margin-bottom:6px;">${stars}</div>
          <div style="font-size:13px;color:#202124;font-weight:600;margin-bottom:${comment ? "8px" : "0"};">${who}</div>
          ${comment ? `<p style="font-size:14px;color:#5F6368;line-height:1.6;margin:0;font-style:italic;">"${comment}"</p>` : ""}
        </div>

        ${cta(url, "Responder no Google →", "#C5221F")}

        <p style="font-size:13px;color:#5F6368;line-height:1.55;margin:18px 0 0;">
          <strong>Dica:</strong> agradeça o feedback, reconheça o ponto e ofereça resolver no privado. Uma boa resposta pública vale mais que a própria avaliação.
        </p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 9. RESUMO SEMANAL (Pro) — cobre "te ultrapassou", "nota caiu", digest
// ─────────────────────────────────────────────────────────────
export function weeklyReportEmail({ bizName, ratingNow, ratingDelta, reviewsDelta, rankNow, rankDelta, total, aheadName }) {
  const biz = escapeHtml(bizName || "seu negócio");
  const r = (n) => (typeof n === "number" ? n : 0);

  // Título se adapta ao evento mais importante da semana
  let title, headerColor, h1, lead;
  if (r(rankDelta) < 0) {
    title = "⚠️ VOCÊ PERDEU POSIÇÃO"; headerColor = "#C5221F";
    h1 = `Você caiu ${Math.abs(rankDelta)} ${Math.abs(rankDelta) === 1 ? "posição" : "posições"} essa semana`;
    lead = aheadName ? `A <strong>${escapeHtml(aheadName)}</strong> está logo na sua frente agora. Dá pra reagir — veja como abaixo.` : `Um concorrente passou na sua frente. Dá pra reagir — veja como abaixo.`;
  } else if (r(rankDelta) > 0) {
    title = "🎉 VOCÊ SUBIU NO RANKING"; headerColor = "#137333";
    h1 = `Você subiu ${rankDelta} ${rankDelta === 1 ? "posição" : "posições"} essa semana!`;
    lead = `Seu trabalho de coletar avaliações está dando resultado. Continue no ritmo pra manter (e subir mais).`;
  } else if (r(ratingDelta) < 0) {
    title = "⚠️ SUA NOTA CAIU"; headerColor = "#C5221F";
    h1 = `Sua nota caiu essa semana`;
    lead = `Vale dar uma olhada nas últimas avaliações e responder. Avaliações 5★ novas trazem a média de volta pra cima.`;
  } else {
    title = "📊 SEU RESUMO DA SEMANA"; headerColor = "#1A73E8";
    h1 = `Como ${biz} foi essa semana`;
    lead = `Aqui está o que mudou nos últimos 7 dias.`;
  }

  const arrow = (n, goodWhenPositive = true) => {
    if (!n) return `<span style="color:#5F6368;">— sem mudança</span>`;
    const up = n > 0;
    const good = goodWhenPositive ? up : !up;
    const color = good ? "#137333" : "#C5221F";
    const sign = up ? "▲ +" : "▼ ";
    return `<span style="color:${color};font-weight:700;">${sign}${Math.abs(n) % 1 === 0 ? Math.abs(n) : Math.abs(n).toFixed(1)}</span>`;
  };
  // rank: subir = número menor (delta positivo na nossa convenção = subiu)
  const rankArrow = !rankDelta ? `<span style="color:#5F6368;">— manteve</span>`
    : rankDelta > 0 ? `<span style="color:#137333;font-weight:700;">▲ subiu ${rankDelta}</span>`
    : `<span style="color:#C5221F;font-weight:700;">▼ caiu ${Math.abs(rankDelta)}</span>`;

  const row = (label, value, delta) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#5F6368;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#202124;font-weight:700;text-align:right;">${value}</td>
      <td style="padding:10px 0 10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;text-align:right;white-space:nowrap;">${delta}</td>
    </tr>`;

  return {
    subject: `${r(rankDelta) < 0 ? "⚠️" : r(rankDelta) > 0 ? "🎉" : "📊"} Resumo da semana — ${biz}`,
    html: shell({
      title, headerColor,
      body: `
        <h1 style="margin:0 0 8px;font-size:22px;color:#202124;line-height:1.3;">${h1}</h1>
        <p style="font-size:14.5px;color:#5F6368;line-height:1.6;margin:0 0 16px;">${lead}</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:6px 16px;margin:14px 0;">
          ${row("Posição no ranking", `#${rankNow}${total ? ` de ${total}` : ""}`, rankArrow)}
          ${row("Sua nota", r(ratingNow).toFixed(1), arrow(ratingDelta, true))}
          ${row("Avaliações na semana", `${reviewsDelta > 0 ? "+" : ""}${r(reviewsDelta)}`, arrow(reviewsDelta, true))}
        </table>

        ${cta("https://startouch.com.br/app?tab=concorrentes", "Ver detalhes no painel →", headerColor)}
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// 10. RESUMO SEMANAL (digest p/ TODOS — free + pro). Só dados do
//     próprio negócio (nota, avaliações, últimas reviews) + 1 dica.
//     NÃO depende do cron de concorrentes (Fase 1 do plano de emails).
// ─────────────────────────────────────────────────────────────
const WEEKLY_TIPS = [
  { t: "Responda às avaliações", d: "Negócios que respondem passam mais confiança — e o Google valoriza perfis ativos. Reserve 5 minutos pra responder as últimas." },
  { t: "Peça no momento certo", d: "O melhor momento de pedir uma avaliação é logo após um bom atendimento, com o cliente ainda no local. Uma placa NFC no balcão faz isso sozinha." },
  { t: "Complete seu perfil no Google", d: "Foto, horário, telefone e categoria preenchidos aumentam sua visibilidade nas buscas locais — e contam pontos no seu Score." },
  { t: "Suba uma foto nova", d: "Perfis com fotos recentes aparecem mais. Tire uma foto do seu produto ou ambiente e suba no Google Meu Negócio — leva 1 minuto." },
  { t: "Repita o que você faz", d: "Ao responder avaliações, mencione naturalmente seu ramo ('obrigado por avaliar nossa pizzaria') — ajuda o Google a entender seu negócio." },
];

// Escolhe a dica da semana (rotaciona por número da semana — estável dentro
// da mesma semana, mesma pra todos os clientes naquele envio).
export function pickWeeklyTip(weekIndex) {
  const i = Number.isFinite(weekIndex) ? weekIndex : Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const n = WEEKLY_TIPS.length;
  return WEEKLY_TIPS[((i % n) + n) % n];
}

function starRow(n) {
  const full = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return `<span style="color:#FBBC04;letter-spacing:1px;">${"★".repeat(full)}${"☆".repeat(5 - full)}</span>`;
}

// ─────────────────────────────────────────────────────────────
// DICA DA SEMANA — email educativo DEDICADO (cron weekly-tips).
// Banco de dicas sobre Google Meu Negócio e presença em IA, na
// língua do dono de negócio local (sem jargão). Ordenado alternando
// Google/IA — assim semanas seguidas variam de tema. Cada dica tem
// por que importa (why) + o que fazer hoje (action) + CTA opcional.
// Rende meses sem repetir. Editar aqui = muda o email da semana.
// ─────────────────────────────────────────────────────────────
const RADAR_URL = "https://startouch.com.br/radar?utm_source=email&utm_medium=dica&utm_campaign=dica_semanal";
const APP_URL = "https://startouch.com.br/app?login=1";

// Indicação no rodapé de cada dica. utm_campaign=email_dica distingue no GA4
// as indicações vindas do email de dica (vs. as do resumo semanal).
const REFERRAL_TIP_MSG = "Oi! Tô usando o StarTouch pra receber mais avaliações no Google e aparecer nas buscas por IA — tá ajudando demais. Acho que ia ser útil pro seu negócio também 👉 https://startouch.com.br/?utm_source=indicacao&utm_medium=whatsapp&utm_campaign=email_dica";
const REFERRAL_TIP_WA = "https://wa.me/?text=" + encodeURIComponent(REFERRAL_TIP_MSG);

// Entrada padrão pro Perfil da Empresa (ex-"Google Meu Negócio"): hoje se
// gerencia direto na Busca/Maps, logado na conta dona. As dicas repetem esse
// caminho de propósito — o dono aprende por repetição.
const EDU_TIPS = [
  { tag: "Google", t: "Responda toda avaliação — a boa e, principalmente, a ruim",
    subject: "A resposta que você dá numa avaliação é lida por dezenas de futuros clientes",
    why: "Quem escreveu a avaliação já é seu cliente. Quem lê a sua resposta ainda vai decidir se te procura — e essa gente é muito mais numerosa. Uma crítica respondida com calma vale mais pra quem está lendo do que a própria estrela. E tem o outro lado: o Google dá mais visibilidade a perfis ativos, e responder é um dos sinais mais simples de que tem alguém atento ali. Avaliação pendurada sem resposta passa a impressão de negócio no piloto automático — no sentido ruim.",
    steps: [
      "No celular, abra o Google logado na conta da empresa e pesquise o nome do seu negócio. Vai aparecer o painel de gerência (ou app Google Maps → sua foto no canto → 'Seu perfil de empresa').",
      "Toque em 'Avaliações'.",
      "Embaixo de cada uma, toque em 'Responder', escreva e envie.",
      "Nas boas, agradeça citando o que a pessoa elogiou — 'que bom que você gostou do corte, volta sempre!' soa real; 'obrigado pela avaliação' soa robô. Nas ruins, responda com calma, sem discutir ponto a ponto: reconheça o ocorrido e leve pro privado — 'sinto muito por isso, me chama no [telefone] que a gente resolve'.",
    ],
    note: { label: "Nunca", text: "responder no impulso, brigar com o cliente ou expor dados dele em público. Quem lê julga muito mais o seu tom do que o motivo da reclamação." },
    closing: "Feche essa lista uma vez por semana e seu perfil já sai na frente de metade dos concorrentes — que simplesmente não respondem.",
    cta: { url: APP_URL, text: "Ver minhas avaliações →" } },

  { tag: "IA", t: "Por que o ChatGPT recomenda um negócio e não outro",
    why: "Quando alguém pergunta a uma IA 'melhor [seu ramo] na [sua cidade]', ela não sorteia — junta o que encontra sobre você espalhado pela web. Quem tem informação clara e repetida em vários lugares é lembrado; quem quase não aparece, some da resposta.",
    steps: [
      "Abra o ChatGPT (site chat.openai.com ou o app) e faça login (dá pra usar de graça).",
      "Digite: 'Qual a melhor [seu ramo] em [sua cidade/bairro]?' — ex: 'melhor pizzaria em Sorocaba'.",
      "Veja se o nome do seu negócio aparece na resposta.",
      "Se não aparecer, é sinal de que falta presença — as próximas dicas (perfil completo, informação igual em todo lugar, avaliações) resolvem isso.",
    ],
    closing: "Saber onde você está hoje já é meio caminho. Com presença consistente, da próxima vez o seu nome aparece nessa resposta.",
    cta: { url: RADAR_URL, text: "Medir minha presença nas IAs →" } },

  { tag: "Google", t: "Peça a avaliação no momento certo",
    why: "O melhor momento pra pedir uma avaliação é logo depois de um bom atendimento, com o cliente ainda satisfeito e no local. Pedir dias depois, por mensagem, rende muito menos.",
    steps: [
      "Deixe o dispositivo StarTouch sempre à vista, no balcão ou no caixa.",
      "Ao fim de um bom atendimento, diga algo simples: 'Se puder deixar uma nota aqui, ajuda muito a gente.'",
      "Aproxime o celular do cliente do dispositivo (ou peça pra ele escanear o QR) — abre direto a tela de avaliação.",
      "Combine com toda a equipe pra fazer isso virar hábito em cada atendimento.",
    ],
    closing: "É simples assim: quando você pede na hora certa, com o dispositivo à mão, seu perfil enche de avaliações sem esforço." },

  { tag: "IA", t: "Nome, endereço e telefone iguais em todo lugar",
    why: "Se o seu telefone está de um jeito no Google, outro no Instagram e um terceiro num guia antigo, a IA (e o próprio Google) ficam em dúvida sobre qual é o certo — e acabam deixando você de lado.",
    steps: [
      "Escreva num papel a versão OFICIAL: nome exato, endereço completo e telefone com DDD.",
      "No Google: pesquise sua empresa (logado) → 'Editar perfil' → confira nome, endereço e telefone.",
      "No Instagram/Facebook: confira a bio e a seção de informações da página.",
      "No seu site, se tiver. Deixe tudo IDÊNTICO — até a abreviação ('Av.' num lugar e 'Avenida' no outro já confunde).",
    ],
    closing: "Informação idêntica em todo lugar faz o Google e a IA confiarem em você — é um dos ajustes mais rápidos e que mais rendem." },

  { tag: "Google", t: "Complete 100% do seu perfil",
    why: "Com foto, horário, telefone, categoria e endereço preenchidos, você aparece mais nas buscas locais. Perfil pela metade aparece menos — e passa menos confiança.",
    steps: [
      "Pesquise sua empresa no Google (logado na conta dela) e toque em 'Editar perfil'.",
      "Preencha campo por campo, sem deixar nada em branco: categoria, endereço, telefone, site e horário.",
      "Adicione os atributos que se aplicam ('aceita cartão', 'acessível para cadeirantes', 'Wi-Fi grátis').",
      "Depois, no painel StarTouch, veja exatamente o que ainda falta pro seu Score subir.",
    ],
    closing: "Quando você completa tudo, aparece mais e passa mais confiança. Cada campo preenchido hoje é cliente te achando amanhã.",
    cta: { url: APP_URL, text: "Ver o que falta no meu Score →" } },

  { tag: "IA", t: "Avaliação também alimenta a IA",
    why: "Não é só o Google que lê suas avaliações — as IAs também. Quanto mais gente fala bem de você online, mais a IA te trata como referência do seu ramo e te inclui nas respostas.",
    steps: [
      "Trate avaliação como rotina, não como sorte: cada review é uma menção sua a mais na web.",
      "Use o dispositivo StarTouch em todo bom atendimento pra manter o fluxo constante.",
      "Responda as avaliações — o texto da sua resposta também é lido pela IA.",
      "Meta simples e realista: algumas avaliações novas toda semana, sem parar.",
    ],
    closing: "Coletando sempre, você não melhora só a nota: constrói sua reputação aos olhos do Google e das IAs ao mesmo tempo." },

  { tag: "Google", t: "Use os Posts do Google toda semana",
    why: "Poucos donos usam, mas o Google deixa você publicar novidades, promoções e avisos direto no seu perfil — e mostra isso pra quem te busca. Além de aparecer mais, você mostra que está ativo e presente.",
    steps: [
      "Pesquise sua empresa no Google (logado) e toque em 'Adicionar novidade' (ou 'Promoções').",
      "Escolha o tipo: Novidade, Oferta ou Evento.",
      "Escreva um texto curto, coloque uma foto boa e, se quiser, um botão ('Ligar', 'Saiba mais').",
      "Toque em 'Publicar'. Repita uma vez por semana — vira hábito de 2 minutos.",
    ],
    closing: "Dois minutos por semana mantêm seu perfil vivo — o Google percebe e você aparece mais. Comece hoje." },

  { tag: "IA", t: "Tenha uma frase que te define",
    why: "A IA aprende a te encaixar nas respostas pela forma como você é descrito. 'Padaria' é vago; 'padaria artesanal com café da manhã no [bairro]' diz exatamente quando te recomendar.",
    steps: [
      "Monte a frase juntando: o que você é + sua especialidade + o bairro. Ex: 'Padaria artesanal com café da manhã na Vila Nova.'",
      "No Google: 'Editar perfil' → campo 'Descrição da empresa' → cole a frase no começo.",
      "No Instagram: coloque a mesma frase na bio.",
      "No site, se tiver: use ela no topo da página inicial.",
    ],
    closing: "Com uma frase clara repetida em todo lugar, você ensina o Google e a IA exatamente quando te recomendar." },

  { tag: "Google", t: "Suba fotos novas com frequência",
    why: "Com fotos recentes, você aparece mais e recebe mais cliques. Foto parada há um ano passa impressão de negócio abandonado.",
    steps: [
      "Tire 1 foto hoje, com boa luz: um produto, o ambiente ou a equipe trabalhando.",
      "Pesquise sua empresa no Google (logado) e toque em 'Adicionar foto'.",
      "Escolha a categoria certa (fachada, ambiente, produto) e envie.",
      "Crie o hábito de uma foto nova por semana — coloque um lembrete no celular.",
    ],
    closing: "Foto nova toda semana mantém seu perfil atraente e ativo — e é de graça. Vale virar hábito." },

  { tag: "IA", t: "Teste você mesmo nas IAs",
    why: "Você não precisa adivinhar como as IAs te enxergam — dá pra perguntar direto pra elas. É o jeito mais honesto de saber se você aparece ou está invisível pra quem busca por IA.",
    steps: [
      "Faça a MESMA pergunta em três lugares: ChatGPT, Gemini (gemini.google.com) e Perplexity (perplexity.ai).",
      "Pergunta: 'Qual a melhor [seu ramo] em [sua cidade]?'",
      "Anote em quais você aparece — e quais concorrentes aparecem no seu lugar.",
      "Pra não fazer isso na mão, o Radar roda esse teste completo e te entrega num relatório.",
    ],
    closing: "Agora você sabe como as IAs te enxergam. O próximo passo é corrigir o que falta — e o Radar te mostra por onde começar.",
    cta: { url: RADAR_URL, text: "Rodar meu Radar de IA →" } },

  { tag: "Google", t: "Preencha produtos e serviços",
    why: "Cada produto ou serviço que você lista no perfil vira uma palavra que o Google associa a você. É de graça e a maioria dos concorrentes não faz.",
    steps: [
      "Pesquise sua empresa no Google (logado) → toque em 'Editar produtos' ou 'Editar serviços'.",
      "Adicione item por item: nome, categoria e, se der, preço e uma foto.",
      "Capriche no nome do item — é a palavra que o Google vai ligar a você.",
      "Liste pelo menos os 5 principais que você quer que apareçam nas buscas.",
    ],
    closing: "Cada item listado é uma palavra a mais te ligando a quem procura. Trabalho de uma vez que rende sempre." },

  { tag: "IA", t: "Apareça em mais de um lugar na web",
    why: "A IA cruza fontes: Google, redes sociais, guias locais, seu site. Se você só existe num canto, tem pouca prova pra ser recomendado; se aparece em vários lugares, vira referência.",
    steps: [
      "Garanta o perfil no Google ativo e completo (é a base de tudo).",
      "Tenha um Instagram (ou Facebook) com as MESMAS informações do Google.",
      "Tenha um site ou uma página simples — mesmo que seja só uma página.",
      "Confirme que nome, endereço e telefone estão iguais nos três lugares.",
    ],
    closing: "Quanto mais lugares confirmam quem você é, mais a IA te trata como referência. Presença espalhada = mais chances de ser indicado." },

  { tag: "Google", t: "Confira o horário antes de todo feriado",
    subject: "2 minutos antes do feriado que evitam uma nota 1 estrela injusta",
    why: "Horário errado no Google é o pior tipo de nota ruim: a que você não merecia. O cliente confia no que o Google mostra, se desloca, encontra a porta fechada — e descarrega a frustração numa estrela. Não foi seu produto nem seu atendimento; foi um campo desatualizado. Pior: quando o Google percebe que você não cadastrou o feriado, ele mesmo avisa o cliente que 'o horário pode variar' — o que já derruba a confiança antes de a pessoa sair de casa.",
    steps: [
      "Alguns dias antes do feriado, pesquise sua empresa no Google (logado na conta da empresa).",
      "Toque em 'Editar perfil' → 'Horários' → 'Horários especiais' (ou 'Feriados').",
      "Adicione a data com o horário certo — ou marque 'Fechado'.",
      "Confira também véspera e emenda, quando o movimento e o horário costumam mudar.",
    ],
    closing: "Transforme isso num gatilho fixo: todo feriado à vista, dois minutos no perfil antes de fechar a semana. Vale um lembrete no celular pra não escapar.",
    cta: { url: APP_URL, text: "Atualizar meu horário →" } },

  { tag: "IA", t: "Um site simples, com informação clara, ajuda a IA",
    why: "Você não precisa de um site sofisticado. Precisa de um lugar seu, claro, dizendo o que faz, onde fica e como falar com você — a IA lê isso e usa como fonte confiável sobre o seu negócio.",
    steps: [
      "Se você NÃO tem site: no Google, 'Editar perfil' → procure a opção 'Site' — o próprio Google monta um grátis a partir do seu perfil.",
      "Se você JÁ tem site: abra e leia como um cliente novo leria.",
      "Confirme que estão visíveis e atualizados: o que você faz, endereço, telefone e horário.",
      "Adicione um mapa e um botão de WhatsApp pra facilitar o contato.",
    ],
    closing: "Um cantinho seu, claro e atualizado, vira fonte confiável pra IA falar de você. Não precisa ser perfeito — precisa existir." },

  { tag: "Google", t: "Escreva a descrição com as palavras do cliente",
    why: "O cliente não busca pelo nome da sua loja — ele busca pelo que precisa. Sua descrição precisa ter as palavras que ele digita, não só o nome fantasia.",
    steps: [
      "Pense: que palavras o cliente digitaria pra achar um negócio como o seu? (ramo + especialidade + bairro).",
      "No Google: 'Editar perfil' → campo 'Descrição da empresa'.",
      "Escreva usando essas palavras. Ex: 'Hamburgueria artesanal com opções veganas na Vila Hortência.'",
      "Evite só elogios genéricos ('somos os melhores') — foque no que a pessoa procura.",
    ],
    closing: "Falar a língua de quem busca é o que te coloca na busca certa. Reescreva hoje e sinta a diferença." },

  { tag: "IA", t: "Preencha você mesmo as perguntas frequentes do seu perfil",
    subject: "O concorrente pode responder as perguntas do SEU perfil — adiante-se",
    why: "Poucos donos sabem disso: a seção 'Perguntas e respostas' do seu perfil é aberta. Qualquer pessoa pode perguntar e responder — inclusive um cliente mal informado ou um concorrente. Se você não ocupa esse espaço, alguém ocupa por você, com a informação que quiser. E tem um ganho novo: tanto o Google quanto as IAs (ChatGPT, Gemini) leem esse conteúdo pra decidir o que recomendar. Deixar as dúvidas comuns já respondidas, com as suas palavras, te ajuda a aparecer na hora em que alguém pergunta exatamente aquilo.",
    steps: [
      "Abra seu negócio no Google Maps (ou pesquise o nome no Google), logado na conta da empresa.",
      "Role até 'Perguntas e respostas', perto das avaliações.",
      "Toque em 'Faça uma pergunta' e escreva uma dúvida real de cliente — 'Vocês têm estacionamento?'.",
      "Responda você mesmo (aparece como resposta do dono). Repita com as 3 ou 4 perguntas que mais chegam no seu balcão: 'aceita Pix?', 'faz entrega?', 'precisa agendar?', 'atende no sábado?'.",
    ],
    note: { label: "Dica", text: "as melhores perguntas são as que você mais ouve no dia a dia. Se um cliente já perguntou pessoalmente, outros dez pesquisaram no Google sem perguntar." },
    closing: "Cinco minutos preenchendo isso e você controla o que o Google e as IAs mostram sobre você — em vez de deixar no acaso.",
    cta: { url: APP_URL, text: "Ver meu perfil →" } },

  { tag: "Google", t: "Ative e responda as mensagens",
    why: "O Google deixa o cliente te mandar mensagem direto do perfil. Responder rápido melhora sua reputação e evita que a pessoa vá pro concorrente que respondeu antes.",
    steps: [
      "Pesquise sua empresa no Google (logado) e toque em 'Mensagens' → 'Ativar'.",
      "Configure uma mensagem de boas-vindas automática (ex: 'Oi! Já respondemos, um instante.').",
      "Instale o app do Google Maps no celular pra receber e responder de qualquer lugar.",
      "Combine com a equipe de responder no mesmo dia — rapidez fecha venda.",
    ],
    closing: "Responder rápido é o que fecha a venda antes do concorrente. Ative hoje e combine quem cuida das respostas." },

  { tag: "IA", t: "Informação atualizada, sempre — a consistência conta",
    why: "Presença em IA não é tarefa de uma vez só. Se você mantém tudo atualizado ao longo do tempo — horário, fotos, avaliações novas — vai ganhando confiança das IAs; se congela, vai perdendo espaço.",
    steps: [
      "Marque 10 minutos fixos por semana na agenda (ex: toda segunda de manhã) só pra isso.",
      "Confira: horário, telefone e endereço continuam certos no Google?",
      "Tem foto nova pra subir? Tem avaliação nova pra responder?",
      "Fez algo mudar (novo produto, nova promoção)? Publique um Post. Constância é o que te mantém no topo.",
    ],
    closing: "Dez minutos por semana é o que separa quem sobe de quem congela. Constância é o seu maior aliado." },
];

// Escolhe a dica educativa da semana (rotaciona por número da semana —
// estável dentro da mesma semana, igual pra todos naquele envio).
export function pickEduTip(weekIndex) {
  const i = Number.isFinite(weekIndex) ? weekIndex : Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const n = EDU_TIPS.length;
  return EDU_TIPS[((i % n) + n) % n];
}

// Email DEDICADO de dica da semana. Um assunto por dica, corpo focado:
// badge do tema + título + "por que importa" + "faça isso hoje" + CTA.
export function weeklyTipEmail({ tip, unsubUrl }) {
  const t = tip || EDU_TIPS[0];
  const isIA = t.tag === "IA";
  const accent = isIA ? "#6D28D9" : "#1A73E8";
  const badgeBg = isIA ? "#F3EEFF" : "#EAF2FE";
  const badgeText = isIA ? "Presença em IA" : "Google Meu Negócio";

  // Passo a passo numerado (círculo com número + texto). Fallback pro campo
  // antigo `action` se alguma dica não tiver `steps`.
  const stepsHtml = Array.isArray(t.steps) && t.steps.length
    ? t.steps.map((s, i) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 10px;">
          <tr>
            <td valign="top" width="30" style="padding-right:10px;">
              <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:#137333;color:#fff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${i + 1}</span>
            </td>
            <td style="font-size:14.5px;color:#202124;line-height:1.55;">${escapeHtml(s)}</td>
          </tr>
        </table>`).join("")
    : `<div style="font-size:14.5px;color:#202124;line-height:1.6;">${escapeHtml(t.action || "")}</div>`;

  // Bloco de alerta/dica opcional (ex: "Nunca: …" ou "Dica: …") entre os
  // passos e a conclusão. Estilo de aviso (vermelho) se o rótulo for negativo.
  const note = t.note;
  const noteWarn = note && /^(nunca|evite|cuidado|jamais)/i.test(note.label || "");
  const noteHtml = note
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${noteWarn ? "#FEF2F2" : "#EFF6FF"};border:1px solid ${noteWarn ? "#FBD5D5" : "#CFE0FB"};border-radius:10px;margin:12px 0 0;">
          <tr><td style="padding:12px 14px;font-size:13.5px;color:#202124;line-height:1.55;">
            <strong style="color:${noteWarn ? "#B42318" : "#1A56DB"};">${noteWarn ? "🚫" : "💡"} ${escapeHtml(note.label)}:</strong> ${escapeHtml(note.text)}
          </td></tr>
        </table>`
    : "";

  return {
    subject: t.subject || `💡 Dica da semana: ${t.t}`,
    html: shell({
      title: "💡 DICA DA SEMANA",
      headerColor: accent,
      unsubUrl,
      unsubLabel: "a dica da semana",
      body: `
        <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${accent};background:${badgeBg};border-radius:999px;padding:5px 12px;margin:0 0 12px;">${badgeText}</div>
        <h1 style="margin:0 0 14px;font-size:23px;color:#202124;line-height:1.3;">${escapeHtml(t.t)}</h1>

        <p style="font-size:12px;font-weight:700;color:#202124;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Por que importa</p>
        <p style="font-size:15px;color:#5F6368;line-height:1.65;margin:0 0 20px;">${escapeHtml(t.why)}</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F0FBF4;border:1px solid #BBF0CD;border-radius:12px;margin:0 0 8px;">
          <tr><td style="padding:16px 18px;">
            <div style="font-size:12px;font-weight:700;color:#137333;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">✅ Passo a passo</div>
            ${stepsHtml}
          </td></tr>
        </table>

        ${noteHtml}

        ${t.closing ? `<p style="font-size:14.5px;color:#202124;line-height:1.65;font-weight:600;margin:16px 2px 0;">${escapeHtml(t.closing)}</p>` : ""}

        ${t.cta ? cta(t.cta.url, t.cta.text, accent) : ""}

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin:20px 0 4px;">
          <tr><td style="padding:16px 18px;">
            <div style="font-size:14px;color:#202124;font-weight:700;margin-bottom:3px;">🤝 Indique o StarTouch para um amigo</div>
            <div style="font-size:13px;color:#5F6368;line-height:1.55;margin-bottom:12px;">Conhece outro dono de negócio que ia gostar dessas dicas e de mais avaliações no Google? Indicar leva 10 segundos.</div>
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#25D366;">
              <a href="${REFERRAL_TIP_WA}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif;">Indicar pelo WhatsApp →</a>
            </td></tr></table>
          </td></tr>
        </table>

        <p style="font-size:13px;color:#5F6368;line-height:1.6;margin:18px 0 0;">Uma dica nova toda semana, do time StarTouch — pra você aparecer mais no Google e nas IAs sem complicação.</p>
      `
    })
  };
}

// Manifesto de artigos do blog (MAIS RECENTE PRIMEIRO). Ao publicar um novo,
// adicione no TOPO — o resumo semanal usa o primeiro como "artigo da semana".
const ARTICLES = [
  { slug: "como-subir-no-ranking-do-google-meu-negocio", title: "Como subir no ranking do Google Meu Negócio: guia prático 2026", excerpt: "O passo a passo pra aparecer mais alto nas buscas locais." },
  { slug: "como-pedir-avaliacao-no-google-sem-parecer-chato", title: "Como pedir avaliação no Google sem parecer chato", excerpt: "Roteiros prontos pra pedir review sem constrangimento." },
  { slug: "como-melhorar-a-nota-no-google", title: "Como melhorar a nota no Google: do 3 ao 5 estrelas", excerpt: "O que fazer pra a média subir de verdade." },
  { slug: "como-conseguir-mais-avaliacoes-no-google", title: "Como conseguir mais avaliações no Google: 7 estratégias", excerpt: "Táticas que realmente trazem mais avaliações." },
  { slug: "como-aparecer-primeiro-no-google-maps", title: "Como aparecer em primeiro no Google Maps", excerpt: "Os fatores que mais pesam no ranking local." },
];
export function latestArticle() {
  const a = ARTICLES[0];
  return a ? { title: a.title, excerpt: a.excerpt, url: `https://startouch.com.br/artigos/${a.slug}` } : null;
}

// Próximo marco de avaliações (motivacional). Retorna null se já passou de tudo.
const MILESTONES = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 1000];
export function nextMilestone(total) {
  const n = Number(total) || 0;
  const target = MILESTONES.find((m) => m > n);
  return target ? { target, remaining: target - n } : null;
}

// Veredito da semana — tom adapta ao ritmo de coleta (newThisWeek = avaliações
// dos últimos 7 dias). Leve quando fraco (lembrete pra equipe, sem ralhar),
// parabéns quando bom. Obs: newThisWeek satura em 5 (Google só devolve as 5
// mais recentes), então >=5 já é "semana excelente".
export function weekVerdict(newThisWeek) {
  const n = Number(newThisWeek) || 0;
  const GREEN = { color: "#137333", bg: "#ECFDF5", border: "#A7F3D0" };
  const AMBER = { color: "#B7791F", bg: "#FFF8E1", border: "#FCE8A6" };
  if (n >= 5) return { ...GREEN, emoji: "🎉", title: "Que semana!", msg: "Foram 5 ou mais avaliações novas nos últimos 7 dias — esse é o ritmo que faz subir no Google. Continue assim!" };
  if (n >= 3) return { ...GREEN, emoji: "🙌", title: "Boa semana!", msg: `${n} avaliações novas. Tá no caminho certo — mantenha o time pedindo a cada bom atendimento.` };
  if (n >= 1) return { ...AMBER, emoji: "💪", title: "Dá pra acelerar", msg: `${n === 1 ? "1 avaliação nova" : n + " avaliações novas"} esta semana. Combine com a equipe de pedir a avaliação em todo bom atendimento — apontar o dispositivo StarTouch pro cliente já acelera.` };
  return { ...AMBER, emoji: "📣", title: "Vamos buscar avaliações?", msg: "Nenhuma avaliação nova nos últimos 7 dias. Vale lembrar a equipe de pedir ao final de cada atendimento — com seu dispositivo StarTouch à vista, o cliente avalia em segundos." };
}

// Score StarTouch — MESMA fórmula do painel (src/AppV2.jsx → scoreBreakdown,
// pesos 35/30/20/15). Mantida em paralelo aqui (sem módulo compartilhado
// front/back). ⚠️ Se mudar a fórmula no painel, atualize aqui também.
export function emailScore({ rating, reviews, total, pos, photo, phone, category }) {
  const rt = Number(rating) || 0;
  const rv = Number(reviews) || 0;
  const tot = Number(total) || 0;
  const p = Number(pos) || tot;
  const notaPts = (rt / 5) * 35;
  const volPts = Math.min(rv / 100, 1) * 30;
  const posPts = tot > 0 ? ((tot - p + 1) / tot) * 20 : 10;
  const hasPhoto = !!photo, hasPhone = !!phone, hasCat = !!category;
  const perfilPts = (hasPhoto ? 5 : 0) + (hasPhone ? 5 : 0) + (hasCat ? 5 : 0);
  const score = Math.max(0, Math.min(100, Math.round(notaPts + volPts + posPts + perfilPts)));
  const missing = [];
  if (perfilPts < 15) {
    const f = [!hasPhoto && "foto", !hasPhone && "telefone", !hasCat && "categoria"].filter(Boolean);
    missing.push(`complete o perfil no Google (${f.join(", ")})`);
  }
  if (rv < 100) missing.push("colete mais avaliações");
  return { score, missing };
}

// Indicação — MESMO mecanismo honesto do ativar-codigo.html (link UTM +
// mensagem pronta de WhatsApp, sem recompensa inventada, sem backend).
// utm_campaign distingue indicações vindas do email semanal no GA4.
const REFERRAL_LINK = "https://startouch.com.br/?utm_source=indicacao&utm_medium=whatsapp&utm_campaign=email_semanal";
const REFERRAL_MSG = "Oi! Tô usando o StarTouch pra receber mais avaliações no Google — tá ajudando demais. Acho que ia ser útil pro seu negócio também 👉 " + REFERRAL_LINK;
const REFERRAL_WA = "https://wa.me/?text=" + encodeURIComponent(REFERRAL_MSG);

export function weeklyDigestEmail({ bizName, rating, total, newThisWeek, recentReviews, tip, score, milestone, article, unsubUrl }) {
  const biz = escapeHtml(bizName || "seu negócio");
  const note = (typeof rating === "number" && rating > 0) ? rating.toFixed(1).replace(".", ",") : "—";
  const tot = Number(total) || 0;
  const nw = Number(newThisWeek) || 0;
  const t = tip || WEEKLY_TIPS[0];

  const newLine = nw > 0
    ? `<span style="color:#137333;font-weight:700;">▲ +${nw} ${nw === 1 ? "nova" : "novas"}</span>`
    : `<span style="color:#5F6368;font-weight:600;">— nenhuma nova</span>`;

  const row = (label, value) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #eef0f3;font-size:14px;color:#5F6368;">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #eef0f3;font-size:15px;color:#202124;font-weight:700;text-align:right;white-space:nowrap;">${value}</td>
    </tr>`;

  const reviewsBlock = (recentReviews && recentReviews.length)
    ? `
      <p style="font-size:12px;font-weight:700;color:#202124;margin:22px 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Últimas avaliações</p>
      ${recentReviews.slice(0, 2).map((rv) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 8px;">
          <tr><td style="padding:12px 14px;">
            <div style="font-size:13.5px;color:#202124;"><strong>${escapeHtml(rv.author || "Cliente Google")}</strong> &nbsp;${starRow(rv.rating)} <span style="color:#A8B0BB;font-size:12px;">· ${escapeHtml(rv.date || "")}</span></div>
            ${rv.text ? `<div style="font-size:13px;color:#5F6368;line-height:1.55;margin-top:4px;">"${escapeHtml(rv.text.length > 160 ? rv.text.slice(0, 160) + "…" : rv.text)}"</div>` : ""}
          </td></tr>
        </table>`).join("")}
    `
    : "";

  // Veredito da semana (tom adapta ao ritmo de coleta)
  const v = weekVerdict(nw);
  const verdictBlock = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${v.bg};border:1px solid ${v.border};border-radius:12px;margin:14px 0;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:15px;color:${v.color};font-weight:800;margin-bottom:3px;">${v.emoji} ${escapeHtml(v.title)}</div>
        <div style="font-size:13px;color:#5F6368;line-height:1.55;">${escapeHtml(v.msg)}</div>
      </td></tr>
    </table>`;

  // Bloco Score StarTouch (0–100) + o que falta pros 100
  const scoreBlock = score && typeof score.score === "number"
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFF8E1;border:1px solid #FCE8A6;border-radius:12px;margin:14px 0;">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:12px;font-weight:700;color:#B7791F;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">🏅 Seu Score StarTouch</div>
          <div style="font-size:26px;font-weight:800;color:#202124;line-height:1;">${score.score}<span style="font-size:15px;color:#5F6368;font-weight:700;"> / 100</span></div>
          ${score.missing && score.missing.length
            ? `<div style="font-size:13px;color:#5F6368;line-height:1.5;margin-top:6px;">Pra subir: ${escapeHtml(score.missing[0])}. <a href="https://startouch.com.br/app?login=1" style="color:#1A73E8;text-decoration:none;font-weight:600;">Ver o que falta →</a></div>`
            : `<div style="font-size:13px;color:#137333;font-weight:600;margin-top:6px;">Presença completa! 🎉</div>`}
        </td></tr>
      </table>`
    : "";

  // Linha de próximo marco de avaliações
  const milestoneLine = milestone && milestone.remaining > 0
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;margin:12px 0;"><tr><td style="padding:11px 14px;font-size:13.5px;color:#202124;line-height:1.5;">🎯 <strong>Faltam ${milestone.remaining} ${milestone.remaining === 1 ? "avaliação" : "avaliações"}</strong> pra você chegar a ${milestone.target} no Google.</td></tr></table>`
    : "";

  // Bloco artigo da semana (newsletter consolidada aqui)
  const articleBlock = article && article.title
    ? `
      <p style="font-size:12px;font-weight:700;color:#202124;margin:22px 0 8px;text-transform:uppercase;letter-spacing:0.05em;">📖 Leia esta semana</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 4px;">
        <tr><td style="padding:14px 16px;">
          <a href="${article.url}" target="_blank" style="font-size:15px;font-weight:700;color:#1A73E8;text-decoration:none;line-height:1.3;">${escapeHtml(article.title)}</a>
          ${article.excerpt ? `<div style="font-size:13px;color:#5F6368;line-height:1.55;margin-top:5px;">${escapeHtml(article.excerpt)}</div>` : ""}
          <div style="margin-top:8px;"><a href="${article.url}" target="_blank" style="font-size:13px;color:#1A73E8;text-decoration:none;font-weight:600;">Ler artigo →</a></div>
        </td></tr>
      </table>`
    : "";

  return {
    subject: `📊 Sua semana no Google — ${biz}`,
    html: shell({
      title: "📊 SEU RESUMO DA SEMANA",
      headerColor: "#1A73E8",
      unsubUrl,
      body: `
        <h1 style="margin:0 0 8px;font-size:22px;color:#202124;line-height:1.3;">Como ${biz} foi essa semana</h1>
        <p style="font-size:14.5px;color:#5F6368;line-height:1.6;margin:0 0 16px;">Um resumo rápido da sua presença no Google nos últimos 7 dias.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:6px 16px;margin:14px 0;">
          ${row("Sua nota no Google", `${note} ⭐`)}
          ${row("Total de avaliações", String(tot))}
          ${row("Novas nesta semana", newLine)}
        </table>

        ${verdictBlock}
        ${milestoneLine}
        ${scoreBlock}
        ${reviewsBlock}
        ${articleBlock}

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EAF2FE;border:1px solid #cfe0fb;border-radius:12px;margin:18px 0 4px;">
          <tr><td style="padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;color:#1A73E8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">💡 Dica da semana</div>
            <div style="font-size:14px;color:#202124;font-weight:700;margin-bottom:3px;">${escapeHtml(t.t)}</div>
            <div style="font-size:13px;color:#5F6368;line-height:1.55;">${escapeHtml(t.d)}</div>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F0FBF4;border:1px solid #BBF0CD;border-radius:12px;margin:14px 0 4px;">
          <tr><td style="padding:16px;">
            <div style="font-size:14px;color:#202124;font-weight:700;margin-bottom:3px;">🤝 Indique para um amigo</div>
            <div style="font-size:13px;color:#5F6368;line-height:1.55;margin-bottom:10px;">Conhece outro comércio que merece mais avaliações no Google? Indicar leva 10 segundos — e ajuda outro negócio da sua região.</div>
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#25D366;">
              <a href="${REFERRAL_WA}" target="_blank" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;font-family:Arial,sans-serif;">Indicar pelo WhatsApp →</a>
            </td></tr></table>
          </td></tr>
        </table>

        ${cta("https://startouch.com.br/app?login=1", "Ver no painel →")}
        <p style="font-size:13px;color:#5F6368;line-height:1.6;margin:8px 0 0;">Quer mais avaliações? <a href="https://startouch.com.br/kit" style="color:#1A73E8;text-decoration:none;font-weight:600;">Adicione uma placa ou cartão NFC →</a></p>
      `
    })
  };
}

// ─────────────────────────────────────────────────────────────
// PLANO DE TRABALHO (Gatilho 3 do funil-impacto)
// Leva pro /radar/plano?code=…&origem=email. Assunto e corpo seguem a spec:
// contexto curto + CTA + preview de 1 pendência real (+ "e mais N-1").
// ─────────────────────────────────────────────────────────────
export function planoTrabalhoEmail({ empresa, pendencias, code, checklistItem, unsubUrl }) {
  const nome = escapeHtml(empresa || "seu negócio");
  const nomeAssunto = empresa || "sua empresa";
  const n = Number(pendencias) || 0;
  const link = `https://startouch.com.br/radar/plano?code=${encodeURIComponent(code || "")}&origem=email`;
  const restantes = Math.max(0, n - 1);

  // Preview de 1 pendência REAL (✗) + "e mais N-1". Só entra se veio item real.
  const preview = (checklistItem && checklistItem.label)
    ? `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:16px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td valign="top" style="padding-right:10px;">
              <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:6px;background:#FCE8E6;color:#A50E0E;font-weight:800;font-size:13px;">✗</span>
            </td>
            <td>
              <div style="font-size:14px;font-weight:700;color:#202124;">${escapeHtml(checklistItem.label)}</div>
              ${checklistItem.detail ? `<div style="font-size:13px;color:#5F6368;line-height:1.5;margin-top:2px;">${escapeHtml(checklistItem.detail)}</div>` : ""}
            </td>
          </tr>
        </table>
        ${restantes > 0 ? `<p style="font-size:13px;color:#80868B;margin:12px 0 0;">…e mais ${restantes} pendência${restantes > 1 ? "s" : ""} no seu plano completo.</p>` : ""}
      </div>`
    : "";

  return {
    subject: `O plano de trabalho da ${nomeAssunto} está pronto (${n} pendência${n === 1 ? "" : "s"})`,
    html: shell({
      title: "🛰️ PLANO DE TRABALHO",
      body: `
        <h1 style="margin:0 0 12px;font-size:23px;color:#202124;line-height:1.25;">
          O plano de trabalho da ${nome} está pronto
        </h1>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 6px;">
          Testamos a presença da ${nome} nas inteligências artificiais (ChatGPT, Gemini, Perplexity).
        </p>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 6px;">
          Encontramos <strong style="color:#202124;">${n} ponto${n === 1 ? "" : "s"}</strong> segurando a sua visibilidade — e listamos, item por item, o que precisa ser feito.
        </p>
        <p style="font-size:15px;color:#5F6368;line-height:1.6;margin:0 0 6px;">
          Leva 1 minuto pra ver e mostra exatamente onde você está hoje.
        </p>
        ${cta(link, "Ver meu plano de trabalho →")}
        ${preview}
      `,
      unsubUrl
    })
  };
}
