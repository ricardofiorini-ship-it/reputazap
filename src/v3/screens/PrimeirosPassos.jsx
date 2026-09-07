// ============================================================
// StarTouch V3 — Primeiros passos (quem ainda não tem dispositivo)
// ============================================================
// O QUE VEM ABAIXO DO TOPO DE PRESENÇA quando a conta não tem nenhum
// dispositivo ativo. Substitui quatro blocos que, nesse estado, falavam de
// coisas que a pessoa não tem: a recomendação ("Tudo certo por aqui" — não
// está: ela nem começou), as interações ("sem medição", sempre), a experiência
// configurada e a lista de dispositivos vazia.
//
// QUEM CAI AQUI — levantado com o Ricardo em 07/09/2026, e NÃO é quem eu
// tinha suposto:
//   · o LEAD DO SITE que se cadastrou e ainda não comprou. É o público do
//     tráfego pago, que custa ~R$122 por cadastro — o lugar mais caro do funil
//     para ter uma tela vazia.
//   · quem comprou no próprio site e espera a entrega.
//   · quem ativou tudo e depois desativou (raro).
//
// QUEM NÃO CAI AQUI: o comprador do Mercado Livre. A conta dele nasce NO
// momento da ativação — ele toca o cartão que chegou, cai em /ativar-codigo e
// cria a conta ali, já com dispositivo. Nunca existe conta sem cartão nesse
// caminho. (Era essa a suposição errada que quase priorizou esta tela pelo
// motivo errado.)
//
// POR ISSO A TELA OFERECE, NUNCA AFIRMA. Não dá para escrever "seu cartão está
// a caminho": a venda do Mercado Livre não deixa rastro nenhum na conta — o
// vínculo dispositivo↔negócio só nasce na ativação. Para quem comprou pelo
// site existe registro em `orders` com o `user_id`, e daria para personalizar;
// não foi construído aqui (exigiria endpoint novo) e fica anotado como
// possível, não como pendência.
// ============================================================
import React from 'react'
import { Smartphone, ShoppingBag, Star, MessageSquare, UserCheck, ExternalLink } from 'lucide-react'
import { scoreDoNegocio } from '../lib/score.js'
import { PESOS } from '../../../api/_lib/score-core.js'
import '../comecar.css'

export default function PrimeirosPassos({ dados }) {
  const { biz, info } = dados
  const calc = scoreDoNegocio(dados)
  const faltaNoPerfil = calc.faltando || []
  const pontosDoPerfil = Math.round(PESOS.perfil - calc.perfilPts)
  const linkAvaliacoes = info?.gmapsUrl
    || (biz?.place_id ? `https://search.google.com/local/reviews?placeid=${biz.place_id}` : null)

  // Só entram ações que funcionam HOJE, sem nenhum dispositivo, e que mexem em
  // algo que a tela de cima mede. Conselho genérico de marketing não entra:
  // ele não move o Score e o cliente não tem como verificar se adiantou.
  const acoes = []
  if (faltaNoPerfil.length) {
    acoes.push({
      icon: Star,
      titulo: `Complete seu perfil no Google — vale ${pontosDoPerfil} pontos`,
      texto: `Falta ${faltaNoPerfil.join(' e ')}. É a única parte do seu Score que depende só de você, e leva dois minutos.`,
      cta: { label: 'Abrir meu perfil no Google', url: 'https://business.google.com/' }
    })
  }
  if (linkAvaliacoes) {
    acoes.push({
      icon: MessageSquare,
      titulo: 'Responda quem já avaliou',
      texto: 'Negócios que respondem passam mais confiança, e o Google valoriza perfis ativos. Comece pelas mais recentes.',
      cta: { label: 'Ver minhas avaliações', url: linkAvaliacoes }
    })
  }
  acoes.push({
    icon: UserCheck,
    titulo: 'Peça avaliação a quem já é seu cliente',
    texto: 'Enquanto o dispositivo não chega, o pedido feito na hora do atendimento é o que mais funciona — e cada avaliação nova sobe seu Score.'
  })

  return (
    <>
      <section className="v3-comecar">
        <header>
          <h2>Comece por aqui</h2>
          <p>
            Seu painel já está medindo sua presença no Google — o Score e a colocação acima são
            reais e atualizam sozinhos. O que falta é o dispositivo: é ele que transforma um
            cliente satisfeito em avaliação publicada.
          </p>
        </header>
        <div className="opcoes">
          {/* Dois caminhos, sem adivinhar qual é o dela: a compra feita no
              Mercado Livre não aparece por aqui, então perguntar é mais honesto
              do que supor. */}
          <div className="opcao">
            <div className="ico"><Smartphone size={20} strokeWidth={1.8}/></div>
            <div className="txt">
              <strong>Já tenho meu dispositivo</strong>
              <span>Ative com o código impresso nele — leva menos de um minuto.</span>
            </div>
            <a className="v3-btn solid" href="/ativar-codigo">Ativar dispositivo →</a>
          </div>
          <div className="opcao">
            <div className="ico"><ShoppingBag size={20} strokeWidth={1.8}/></div>
            <div className="txt">
              <strong>Ainda não tenho</strong>
              <span>Cartões, placas de balcão e pulseiras, com o seu QR Code já configurado.</span>
            </div>
            <a className="v3-btn" href="/kit">Ver dispositivos →</a>
          </div>
        </div>
      </section>

      <section className="v3-agora">
        <header>
          <h2>O que dá pra fazer agora</h2>
          <p>Sem depender de nenhum dispositivo — e tudo aqui mexe no seu Score lá em cima.</p>
        </header>
        <div className="lista">
          {acoes.map((a, i) => {
            const Ico = a.icon
            return (
              <article key={i}>
                <div className="ico"><Ico size={17} strokeWidth={1.8}/></div>
                <div className="txt">
                  <strong>{a.titulo}</strong>
                  <p>{a.texto}</p>
                  {a.cta && (
                    <a href={a.cta.url} target="_blank" rel="noopener noreferrer">
                      {a.cta.label} <ExternalLink size={11} style={{ verticalAlign: -1 }}/>
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
