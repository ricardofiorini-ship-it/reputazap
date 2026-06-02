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
        Pra ajustar quais emails recebe, acesse <a href="https://startouch.com.br/app?tab=alertas" style="color:#1A73E8;text-decoration:none;font-weight:600;">o painel</a>.
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
