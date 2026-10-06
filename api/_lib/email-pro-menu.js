// ============================================================
// StarTouch Pro / Menu Inteligente — e-mail de LANÇAMENTO
// ============================================================
// Campanha "pro-menu" do api/cron/broadcast.js: vai só pra quem ainda não
// assinou (06/10/2026).
//
// O layout segue a direção de arte que o Ricardo trouxe (hero com celular,
// 3 benefícios, bloco dos dispositivos, exemplos de uso, caixa de preço), com
// TRÊS regras que o arquivo de referência não seguia:
//   1. Só imagem NOSSA, hospedada em startouch.com.br. O Gmail bloqueia imagem
//      embutida (data:), e a referência trazia logo e foto de produto que não
//      são os nossos. Os produtos de verdade são os PRETOS de public/img/kit.
//   2. A tela do celular (public/email/menu-celular.jpg) saiu do MESMO código
//      que monta o menu real (api/m/[slug].js), só com botões que o editor
//      oferece. A referência prometia "Promoções", que não existe como botão.
//   3. Estilo embutido em cada elemento: <style> no <head> some em vários
//      clientes de e-mail. O <style> daqui só empilha as colunas no celular —
//      se ele sumir, o e-mail fica em duas colunas, mas inteiro.
//
// `dispositivos` (ativos StarTouch do usuário) muda UMA frase.
// Mora fora do email-templates.js de propósito: aquele arquivo é importado
// pelo billing.js, e uma quebra num e-mail de campanha não pode derrubar o
// pagamento (já aconteceu em 17/jul).
// ============================================================

const BASE = "https://startouch.com.br";
const LINK = `${BASE}/app?tab=menu&utm_source=email&utm_medium=broadcast&utm_campaign=pro-menu`;
const AZ = "#1A73E8", TX = "#0C1524", MU = "#5C667A", FONTE = "Arial,Helvetica,sans-serif";

const botao = (txt) => `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:12px;background:${AZ};">
      <a href="${LINK}" target="_blank" style="display:inline-block;padding:16px 26px;font-family:${FONTE};font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;white-space:nowrap;">${txt}</a>
    </td></tr></table>`;

const beneficio = (icone, titulo, texto) => `<td class="feat" width="33%" valign="top" style="padding:14px 10px;text-align:center;font-family:${FONTE};">
      <div style="width:46px;height:46px;line-height:46px;border-radius:23px;background:#EEF5FF;color:${AZ};font-size:20px;font-weight:800;margin:0 auto 10px;">${icone}</div>
      <div style="font-size:15px;font-weight:800;color:${TX};line-height:1.25;margin-bottom:5px;">${titulo}</div>
      <div style="font-size:13px;line-height:1.45;color:#6A7487;">${texto}</div></td>`;

const uso = (titulo, texto) => `<td class="uso" width="33%" valign="top" style="padding:4px;">
      <div style="background:#ffffff;border:1px solid #E6EBF2;border-radius:14px;padding:16px 14px;font-family:${FONTE};">
        <div style="font-size:15px;font-weight:800;color:${TX};margin-bottom:5px;">${titulo}</div>
        <div style="font-size:13px;line-height:1.45;color:#6A7487;">${texto}</div></div></td>`;

const par = (txt, extra = "") =>
  `<p style="margin:0;font-family:${FONTE};font-size:16px;line-height:1.55;color:${MU};${extra}">${txt}</p>`;

export function proMenuEmail({ unsubUrl, dispositivos = 0 } = {}) {
  const fraseDispositivo = dispositivos > 0
    ? `Você continua usando ${dispositivos === 1 ? "seu dispositivo" : `seus ${dispositivos} dispositivos`} normalmente. O Menu Inteligente funciona ${dispositivos === 1 ? "nele" : "neles"} sem trocar nada — é só montar o menu e ligar.`
    : "O Menu Inteligente funciona na placa, no cartão e na pulseira StarTouch — e também por link e QR Code, pra pôr na bio do Instagram ou no balcão.";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><title>Menu Inteligente StarTouch</title>
<style>
@media screen and (max-width:620px){
  .pad{padding-left:22px!important;padding-right:22px!important}
  .h1{font-size:33px!important}
  .col,.feat,.uso{display:block!important;width:100%!important;box-sizing:border-box!important}
  .col{padding-right:0!important}
  .col2{padding-top:24px!important}
  .uso{padding:4px 0!important}
}
</style></head>
<body style="margin:0;padding:0;background:#F4F7FB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Agora o mesmo toque abre Google, WhatsApp, Instagram, cardápio e agenda — tudo numa tela só.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F7FB;"><tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border-radius:22px;overflow:hidden;">

  <tr><td class="pad" style="padding:22px 36px;border-bottom:1px solid #EDF1F6;">
    <img src="${BASE}/startouch-logo-dark.png" alt="StarTouch" width="150" style="display:block;width:150px;height:auto;border:0;">
  </td></tr>

  <tr><td class="pad" style="padding:34px 36px 36px;background:#F5F9FF;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
      <td class="col" width="55%" valign="middle" style="padding-right:18px;font-family:${FONTE};">
        <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;color:${AZ};">Novidade StarTouch</div>
        <div class="h1" style="margin:12px 0 0;font-size:40px;line-height:1.05;letter-spacing:-1.5px;font-weight:800;color:${TX};">Um toque.<br><span style="color:${AZ};">Muito mais possibilidades.</span></div>
        <div style="height:18px;"></div>
        ${par("Chegou o Menu Inteligente.", "font-size:18px;color:#243147;font-weight:700;")}
        <div style="height:10px;"></div>
        ${par("Agora o mesmo cartão, placa ou pulseira abre uma tela com o nome do seu negócio e os botões que você escolher: avaliação no Google, WhatsApp, Instagram, cardápio, agenda, como chegar e muito mais.")}
        <div style="height:22px;"></div>
        ${botao("Ativar meu Menu Inteligente →")}
        <div style="height:10px;"></div>
        <div style="font-family:${FONTE};font-size:12px;line-height:1.45;color:#7D8798;">Monte grátis e teste 7 dias antes de pagar.</div>
      </td>
      <td class="col col2" width="45%" valign="middle" align="center">
        <a href="${LINK}" target="_blank"><img src="${BASE}/email/menu-celular.jpg" alt="Celular mostrando o Menu Inteligente: Avaliar no Google, Fale no WhatsApp, Agendar horário, Instagram, Tabela de serviços e Como chegar" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 auto;"></a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td class="pad" style="padding:24px 26px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
      ${beneficio("★", "Mais caminhos pro cliente", "Avaliação, atendimento e redes sociais no mesmo toque.")}
      ${beneficio("▣", "Um menu por dispositivo", "A placa do balcão e o cartão de cada vendedor podem abrir menus diferentes.")}
      ${beneficio("↗", "Vai além do NFC", "Seu menu também tem link e QR Code pra compartilhar.")}
    </tr></table>
  </td></tr>

  <tr><td class="pad" style="padding:6px 36px 34px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F7F9FC;border-radius:18px;">
    <tr><td style="padding:26px 26px 10px;font-family:${FONTE};">
      <div style="font-size:27px;line-height:1.12;letter-spacing:-0.6px;font-weight:800;color:${TX};">Seu StarTouch não mudou.<br><span style="color:${AZ};">Ficou mais inteligente.</span></div>
      <div style="height:12px;"></div>
      ${par(fraseDispositivo)}
    </td></tr>
    <tr><td style="padding:12px 18px 20px;">
      <img src="${BASE}/email/produtos.jpg" alt="Placa de balcão, cartão e pulseira StarTouch" width="548" style="display:block;width:100%;max-width:548px;height:auto;border:0;border-radius:14px;">
    </td></tr></table>
  </td></tr>

  <tr><td class="pad" style="padding:0 32px 32px;font-family:${FONTE};">
    <div style="font-size:27px;line-height:1.1;letter-spacing:-0.6px;font-weight:800;color:${TX};padding:0 4px 14px;">Exemplos de uso</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
      ${uso("No balcão", "Avaliação · WhatsApp · Instagram")}
      ${uso("Na mesa", "Cardápio · Avaliação · Instagram")}
      ${uso("Com sua equipe", "Avaliação · WhatsApp · Salvar contato")}
    </tr></table>
  </td></tr>

  <tr><td class="pad" style="padding:32px 36px 34px;background:#EEF5FF;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
      <td class="col" width="48%" valign="middle" style="padding-right:18px;font-family:${FONTE};">
        <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;color:${AZ};">StarTouch Pro</div>
        <div style="margin-top:12px;font-size:42px;line-height:1;letter-spacing:-1px;font-weight:900;color:${AZ};">R$ 19,90<span style="font-size:20px;">/mês</span></div>
        <div style="height:10px;"></div>
        ${par('<strong style="color:#243147;">7 dias grátis pra testar.</strong><br>Sem fidelidade. Cancele quando quiser, no próprio painel.', "font-size:15px;")}
      </td>
      <td class="col col2" width="52%" valign="middle" style="font-family:${FONTE};font-size:14px;line-height:1.5;color:#243147;">
        ✓ Menu Inteligente nos seus dispositivos StarTouch<br><br>
        ✓ Um menu diferente por dispositivo, se quiser<br><br>
        ✓ Link e QR Code do seu menu<br><br>
        ✓ Veja quais botões seus clientes mais tocam
      </td>
    </tr></table>
    <div style="height:22px;"></div>
    ${botao("Começar meus 7 dias grátis →")}
  </td></tr>

  <tr><td class="pad" style="padding:26px 36px 28px;text-align:center;">
    ${par('Seu dispositivo já está nas mãos dos seus clientes.<br><strong>Agora faça cada toque valer ainda mais.</strong>', "font-size:14px;color:#243147;")}
    <div style="height:14px;"></div>
    <div style="font-family:${FONTE};font-size:12.5px;line-height:1.5;color:#7D8798;">Tudo o que você já usa no painel — ranking, toques, alertas e resumo semanal — continua grátis.<br>Dúvidas? É só responder este e-mail. · Equipe StarTouch</div>
  </td></tr>

</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;"><tr><td style="padding:18px 20px 6px;text-align:center;font-family:${FONTE};font-size:11px;line-height:1.6;color:#A8B0BB;">
  Você está recebendo isso porque criou uma conta no StarTouch.<br>
  ${unsubUrl ? `Não quer mais receber nossos emails? <a href="${unsubUrl}" style="color:#A8B0BB;text-decoration:underline;">Descadastrar</a>.<br>` : ""}
  StarTouch · <a href="${BASE}" style="color:#A8B0BB;text-decoration:none;">startouch.com.br</a>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject: "Chegou o Menu Inteligente: um toque, muito mais possibilidades", html };
}
