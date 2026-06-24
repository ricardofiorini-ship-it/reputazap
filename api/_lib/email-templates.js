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

// Footer padrão de todos os emails
const FOOTER = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:30px;">
    <tr><td align="center">
      <p style="font-size:11px;color:#A8B0BB;line-height:1.6;margin:0;">
        Você está recebendo isso porque criou uma conta no StarTouch.<br/>
        Pra ajustar quais emails recebe, acesse <a href="https://startouch.com.br/app?login=1&tab=alertas" style="color:#1A73E8;text-decoration:none;font-weight:600;">o painel</a>.
      </p>
      <p style="font-size:11px;color:#A8B0BB;line-height:1.6;margin:10px 0 0;">
        StarTouch · Reputação no piloto automático<br/>
        <a href="https://startouch.com.br" style="color:#A8B0BB;text-decoration:none;">startouch.com.br</a>
      </p>
    </td></tr>
  </table>
`;

// Wrapper que envolve todo email
function shell({ title, headerColor = "#1A73E8", body }) {
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
      ${FOOTER}
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

export function weeklyDigestEmail({ bizName, rating, total, newThisWeek, recentReviews, tip, score, milestone, article }) {
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
