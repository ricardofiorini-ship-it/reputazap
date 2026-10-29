// ============================================================
// Manual do painel (/app) que a Stella lê — 29/10/2026
// ============================================================
// Levantado do código (src/AppV2.jsx e src/v3/screens/*) e escrito pra IA:
// rótulos entre aspas são EXATAMENTE os da tela, pra ela mandar o cliente
// clicar no lugar certo. Mudou um rótulo, uma tela ou uma regra no painel?
// Muda aqui no mesmo commit — senão a Stella passa a ensinar um botão que
// não existe mais (mesma regra do roteiro do WhatsApp).
// ============================================================

export const MANUAL_PAINEL = `MANUAL DO PAINEL (startouch.com.br/app) — use os rótulos entre aspas exatamente como estão

NAVEGAÇÃO
- Computador: abas no topo — "Painel", "Avaliações", "Menu Inteligente", "Resultados" (só no Pro) e "Loja" (abre a loja). No canto direito, o nome do negócio abre: "Minha conta", "Dados do negócio", "Plano e cobrança", "Central de ajuda" e "Sair". Ao lado, o seletor de idioma.
- Celular: barra de baixo com "Painel", "Avaliações", "Menu", "Loja" e "Mais". Em "Mais" ficam "Resultados" (Pro), "Configurações", "Minha conta", "Central de ajuda" e "Sair".

FAIXAS QUE PODEM APARECER NO TOPO
- "Seu teste grátis de 7 dias começou": o Menu está no ar até a data mostrada; pra continuar depois, "Inserir dados de pagamento" (R$ 19,90/mês, sem fidelidade). Sem cartão, nada é cobrado e os dispositivos voltam ao Google.
- "Seu Menu Inteligente parou de abrir": o Pro acabou; o menu está guardado. "Inserir dados de pagamento" contrata com cartão (não há novo teste).
- "Sua mensalidade do StarTouch Pro está em aberto": cartão recusado; o Menu fica no ar mais alguns dias. "Resolver pagamento".

ABA PAINEL (de cima pra baixo)
- Quatro cartões: "Nota no Google"; "Avaliações" (total no Google); "Presença local" = em quantos pontos da região medida o negócio aparece entre os 10 primeiros do Google ("Forte" 80% ou mais, "Média" 40–79%, "Fraca" abaixo de 40%, "Medindo…" sem medição ainda); "Concorrentes analisados" (quantos estão na lista de concorrentes).
- "Score StarTouch" (0 a 100) soma: nota no Google até 35; volume de avaliações até 30 (cheio com 100 avaliações); lugar no Google até 20 (cheio em 1º, zero do 21º em diante ou se não aparece); perfil completo no Google até 15 (5 cada: foto, telefone, categoria). O link "Por que N? Ver o que falta" mostra cada parte com uma dica. Pra subir o score quase sempre o caminho é volume de avaliações — que é o que o dispositivo faz.
- "Sua ação da semana": uma sugestão só (responder avaliação de 1–2 estrelas, quantas avaliações faltam pra passar um concorrente, ativar dispositivo, ou o ponto fraco do score).
- Faixa da busca: "Medindo quem busca "termo" a até X km". "Trocar busca" muda o termo medido (digite e "Medir").
- "Veja como você está em relação aos concorrentes": tabela com nota e avaliações dos vizinhos, ordenada por reputação (nota e volume juntos), com a linha "(você)". "Ver análise completa dos concorrentes" mostra todos. No grátis a medição é semanal; no Pro, a cada 6 horas.
- "Avaliações recentes": até 5, com "Ver todas".
- "Onde seus clientes avaliam" (os dispositivos): filtros "Sempre", "7 dias", "30 dias", "90 dias" e "Escolher datas"; no período aparece a comparação com o anterior e um gráfico por dia. Cada linha: nome com lápis, tipo, código STAR-…, "último toque há…", toques. "MAIS USADA" marca o líder. "+ N toques repetidos não contados" = mesmo celular no mesmo dia conta uma vez.
  • Renomear: lápis ao lado do nome → escrever (até 40 letras) → "Salvar".
  • Zerar a contagem: só na visão "Sempre", em "zerar contagem". Não apaga nada: mostra "zerado em dd/mm · total desde a instalação: N" e dá pra "desfazer".
  • Desvincular: "Desvincular dispositivo" → digitar o código impresso no verso (STAR-…) → confirmar. O dispositivo sai da lista, a contagem zera (o histórico fica), se abria um menu volta ao Google, e o código fica livre pra ser ativado em outra conta. Chega um e-mail de confirmação. É assim que se passa um dispositivo pra outra loja ou outro dono: desvincula aqui e ativa na outra conta.
  • Ativar: "+ Ativar novo dispositivo" → código STAR-… e um nome (opcional). Cada dispositivo é ativado uma vez; os seguintes são rápidos porque a conta e o negócio já estão lá. Também dá pra ativar encostando o celular no dispositivo novo.
  • "Baixar relatório": abre uma página pra salvar em PDF (liberar pop-ups se não abrir).
  • No Pro: "Ver como é o menu deste dispositivo".

ABA AVALIAÇÕES
- "Suas avaliações": média, total, barras por estrela, filtro por estrelas. Mostra só as últimas avaliações que o Google entrega (até 5). Não dá pra responder dentro do painel: cada uma tem "Responder no Google", que abre o Google.

ABA MENU INTELIGENTE
- Criar: "Criar meu Menu Inteligente". Sem dispositivo ativado, primeiro pede pra ativar ou comprar um.
- Editor em 3 etapas — Crie, Vincule, Publique ("Ver o passo a passo" mostra o guia). O rascunho salva sozinho.
  • "A identidade do seu negócio": título e subtítulo; a foto vem do Google.
  • "Adicionar botão": "Avaliar no Google", "WhatsApp", "Canal direto com a Gerência" (WhatsApp ou e-mail), "Instagram", "Cardápio", "Telefone", "Como chegar", "Site", "Agendar", "Salvar contato", "Link personalizado". Até 12 botões (o ideal é até 6). Cada tipo uma vez, menos o link personalizado.
  • "Avaliar no Google" é fixo: sempre o primeiro, com cadeado.
  • Os outros: arrastar ou setas pra ordenar, interruptor pra ligar/desligar, lixeira pra remover.
  • "Em quais dispositivos este menu deve aparecer?": um interruptor por dispositivo. Desligado = vai direto ao Google. Cada dispositivo abre um menu por vez.
  • "Publicar menu". Quem nunca teve o Pro começa ali os 7 dias grátis sem cartão; quem já teve, vê "Assinar o StarTouch Pro". Passando de 5 dispositivos com menu, pergunta antes de cobrar R$ 1,90/mês por extra — sem confirmar, nada é publicado nem cobrado.
  • "Descartar" volta à versão publicada. "Link mágico" (menu publicado): link pra bio do Instagram, status do WhatsApp ou QR Code.
- Menu excluído não some: fica em "Menus excluídos", com "Recuperar".

ABA RESULTADOS (só Pro)
- Período 7/30/90 dias ou personalizado. "Toques", "Abriram o Menu", "Ações escolhidas", divisão Google × Menu, ranking por dispositivo e por menu, "Ações mais escolhidas no Menu" e gráfico ao longo do tempo. O Google não informa se a avaliação foi publicada.

CONFIGURAÇÕES
- "Minha conta": nome e telefone ("Salvar alterações"); "Alterar senha" (senha atual + nova, mínimo 6); "Trocar e-mail" (novo e-mail + senha atual → "Enviar link de confirmação"; só muda quando clicar no link que chega no e-mail novo). Quem entra com o Google precisa antes criar uma senha em "Esqueci minha senha". Esqueceu a senha atual: sair e usar "Esqueci minha senha" na tela de entrar.
- "Dados do negócio": palavra-chave do ranking ("Alterar palavra-chave da busca"; "Voltar pra categoria automática do Google" desfaz). Nome, endereço e telefone vêm do Google Meu Negócio e mudam lá, não aqui. "Trocar negócio vinculado": buscar o negócio novo → "Confirmar a troca"; os dispositivos vão junto. Se a outra loja é de outra pessoa, desvincular os dispositivos e o dono ativa na conta dele.
- "Plano e cobrança": no Pro, "Abrir portal de cobrança" (trocar cartão, próxima cobrança, recibos) e, no teste, "Cadastrar cartão". "Cancelar assinatura" → "Sim, cancelar": o Pro segue até o fim do período pago, depois os dispositivos voltam ao Google e o menu fica guardado; dá pra "Reativar assinatura".
- "Privacidade e seus dados": "Fazer uma solicitação" (LGPD, resposta em até 15 dias).

ERROS COMUNS
- "Sua sessão expirou" → "Fazer login de novo". "Não conseguimos carregar seus dados" → "Tentar novamente".
- Ativação: "Código não encontrado" (conferir o código no verso); "já foi ativado por outro usuário" → WhatsApp; cartão Trybo se ativa em trybo.co/ativar.
- Desvincular: "O código digitado não confere" → digitar o código do verso daquele dispositivo.
`;
