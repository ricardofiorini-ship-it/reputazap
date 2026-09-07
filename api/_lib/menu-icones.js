// ============================================================
// StarTouch — Os ícones do Menu Inteligente, em UM lugar só
// ============================================================
// POR QUE ESTE ARQUIVO EXISTE (07/09/2026): o editor desenhava os botões com
// CARACTERES DE TEXTO (★ ✆ ◎ ▤) e o menu público com SVG. Dois desenhos para a
// mesma coisa — e o pior lugar onde isso aparecia era a PRÉVIA DO CELULAR do
// editor, que existe justamente para mostrar o que o cliente vai ver. O lojista
// configurava vendo um símbolo e o cliente dele via outro.
//
// Mesmo remédio do `score-core.js`: módulo PURO (sem React, sem Node, sem
// rede), carregado pelo front pelo Vite e pelo servidor na função. Um desenho
// só, por construção — não por alguém lembrar de copiar.
//
// A MARCA ENTRA EM VETOR, NUNCA COMO ARQUIVO. O PNG oficial do WhatsApp tem
// 209 KB para desenhar 24 pixels; o caminho vetorial tem ~1 KB, não pede rede e
// não borra em tela nenhuma. A página pública abre no 3G do cliente do lojista.
//
// A COR É A DO TEMA, NÃO A DA MARCA. O verde oficial do WhatsApp e o roxo do
// Instagram gritam mais alto que os outros, e o botão que precisa dominar o
// menu é o "Avaliar no Google" — que é o que a StarTouch existe para fazer
// acontecer. Reconhecimento vem da FORMA; a cor mantém a família.
// ============================================================

// Cor por tipo. Sai daqui pro menu público e pro editor.
export const CORES = {
  google: "#F5A623", whatsapp: "#1E8E3E", instagram: "#7B4BC4", food_menu: "#B06000",
  phone: "#1557B0", location: "#4A5666", website: "#1557B0", contact: "#B3261E",
  manager: "#146C6C", booking: "#4A3AA8", custom_url: "#4A5666"
};

// Fundo suave, usado pelas listas do editor.
export const FUNDOS = {
  google: "#FEF6E7", whatsapp: "#E6F4EA", instagram: "#F2ECFB", food_menu: "#FEF3E0",
  phone: "#E8F0FE", location: "#EDF1F6", website: "#E8F0FE", contact: "#FCE8E6",
  manager: "#E3F1EF", booking: "#ECEAF9", custom_url: "#EDF1F6"
};

// Desenhos PREENCHIDOS: a forma oficial de uma marca só é reconhecível inteira
// — o WhatsApp desenhado a traço vira um balão genérico e perde justamente o
// que se identifica de longe. A estrela do Google é cheia por outro motivo: é o
// botão principal do menu, e o contorno fino o deixava tímido ao lado dos outros.
export const CHEIOS = new Set(["whatsapp", "google"]);

// O conteúdo de dentro do <svg viewBox="0 0 24 24">.
export const ICONES = {
  // estrela CHEIA: é o botão principal do menu e o contorno fino o deixava tímido
  google:'<path d="M12 2.6l2.72 5.51 6.08.89-4.4 4.29 1.04 6.06L12 16.48l-5.44 2.87 1.04-6.06-4.4-4.29 6.08-.89z"/>',
  // glyph oficial, em vetor
  whatsapp:'<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>',
  // câmera do perfil, com a lente e o ponto no lugar certo
  instagram:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="16.9" cy="7.1" r="1.05" fill="currentColor" stroke="none"/>',
  // PIN + ROTA + SETA (ideia do Ricardo): diz trajeto, não lugar
  location:'<path d="M9.4 2.6a5.4 5.4 0 0 1 5.4 5.4c0 3.8-5.4 8.8-5.4 8.8S4 11.8 4 8a5.4 5.4 0 0 1 5.4-5.4z"/><circle cx="9.4" cy="7.9" r="2"/><path d="M13.6 15.4l7 2.9-3.1 1.2-1.2 3.1z"/>',
  // pessoa de gravata + balão com reticências (ideia do Ricardo)
  manager:'<path d="M3 6.4A3.4 3.4 0 0 1 6.4 3h11.2A3.4 3.4 0 0 1 21 6.4v7.2a3.4 3.4 0 0 1-3.4 3.4H9.6L4.6 21v-4h-.2A1.4 1.4 0 0 1 3 15.6z"/><circle cx="12" cy="8.4" r="2.3"/><path d="M8.1 14.4a4.2 4.2 0 0 1 7.8 0"/>',
  // cardápio: folha com as linhas do prato, mais respiro que a versão atual
  food_menu:'<rect x="4.5" y="2.8" width="15" height="18.4" rx="2.6"/><path d="M8.4 8.2h7.2M8.4 12h7.2M8.4 15.8h4.2"/>',
  // globo com meridianos que fecham (o de hoje quebra em 24px)
  website:'<circle cx="12" cy="12" r="9"/><path d="M3.2 9.6h17.6M3.2 14.4h17.6"/><path d="M12 3a13.5 13.5 0 0 1 0 18a13.5 13.5 0 0 1 0-18z"/>',
  phone:'<path d="M5.2 3.8h3.6l1.9 4.6-2.3 1.4a10.6 10.6 0 0 0 4.8 4.8l1.4-2.3 4.6 1.9v3.6a1.4 1.4 0 0 1-1.5 1.4A15.6 15.6 0 0 1 3.8 5.3a1.4 1.4 0 0 1 1.4-1.5z"/>',
  contact:'<rect x="2.8" y="4.5" width="18.4" height="15" rx="2.6"/><circle cx="9" cy="10.6" r="2.3"/><path d="M5.4 16.2a3.9 3.9 0 0 1 7.2 0"/><path d="M15.4 9.8h3.4M15.4 13.4h3.4"/>',
  // calendário com o dia marcado: "agendado", não "ver calendário"
  booking:'<rect x="3.2" y="4.6" width="17.6" height="16.2" rx="2.8"/><path d="M8 2.6v4M16 2.6v4M3.2 9.9h17.6"/><path d="M9.1 14.6l2.1 2.1 4-4"/>',
  custom_url:'<path d="M10.2 13.8a4.2 4.2 0 0 0 5.9 0l2.9-2.9a4.2 4.2 0 1 0-5.9-5.9l-1.4 1.4"/><path d="M13.8 10.2a4.2 4.2 0 0 0-5.9 0l-2.9 2.9a4.2 4.2 0 1 0 5.9 5.9l1.4-1.4"/>'
};

/** O SVG inteiro, como string. Usado pelo servidor, que monta HTML. */
export function svgIcone(tipo, tamanho) {
  const cor = CORES[tipo] || CORES.custom_url;
  const d = ICONES[tipo] || ICONES.custom_url;
  const wh = tamanho ? ` width="${tamanho}" height="${tamanho}"` : "";
  return CHEIOS.has(tipo)
    ? `<svg${wh} viewBox="0 0 24 24" fill="${cor}" stroke="none">${d}</svg>`
    : `<svg${wh} viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
