// ============================================================
// StarTouch V3 — O que você pode melhorar agora
// ============================================================
// AS AÇÕES QUE SOBEM O SCORE, e elas valem para as duas fases. Nasceram dentro
// da tela de quem ainda não tem dispositivo e ficaram presas lá por um dia —
// o que produzia o pior caso possível: um negócio que JÁ opera, com Score 33 e
// "Fora da lista" na tela, lia o diagnóstico inteiro e não recebia um único
// caminho de saída. Dizer o problema sem mostrar a saída é o que uma
// ferramenta de diagnóstico faz; a StarTouch se vende como o tratamento.
//
// REGRA DE ENTRADA: o bloco só aparece quando há o que melhorar de verdade —
// presença fora do verde, perfil incompleto ou ausência nas buscas. Quem está
// no topo não precisa de lição de casa inventada, e um bloco de melhorias
// permanente vira paisagem.
//
// O QUE PODE ENTRAR NA LISTA: só ação que o lojista executa sozinho, hoje, e
// que mexe num fator que o topo da tela MEDE. Conselho genérico de marketing
// fica de fora — não move o Score e o cliente não tem como verificar se
// adiantou.
// ============================================================
import React from 'react'
import { Star, MessageSquare, UserCheck, MapPin, Smartphone, ExternalLink } from 'lucide-react'
import { scoreDoNegocio } from '../lib/score.js'
import { PESOS } from '../../../api/_lib/score-core.js'
import '../comecar.css'

/**
 * Vale a pena mostrar o bloco? Devolve false para quem já está bem — nesse
 * caso a tela não inventa tarefa.
 */
export function temMelhorias(dados) {
  const calc = scoreDoNegocio(dados)
  const semPerfil = (calc.faltando || []).length > 0
  const foraDeTudo = calc.posFonte === 'fora'
  return semPerfil || foraDeTudo || calc.score < 70
}

export default function Melhorias({ dados, temDispositivo }) {
  const { biz, info, posicao } = dados
  const calc = scoreDoNegocio(dados)
  const faltaNoPerfil = calc.faltando || []
  const pontosDoPerfil = Math.round(PESOS.perfil - calc.perfilPts)
  const linkAvaliacoes = info?.gmapsUrl
    || (biz?.place_id ? `https://search.google.com/local/reviews?placeid=${biz.place_id}` : null)

  // Fora de tudo, ou aparece mas nunca entre os três primeiros: nos dois casos
  // a região é o problema, e o caminho é o mesmo.
  const pontos = (posicao?.points || []).filter(p => p.ok)
  const top3 = pontos.length ? pontos.filter(p => p.rank != null && p.rank <= 3).length : null
  const foraDeTudo = calc.posFonte === 'fora'
  const foraDoTopo = top3 === 0 && !foraDeTudo

  const acoes = []

  // A POSIÇÃO VEM PRIMEIRO quando é ela o problema — é o que o cartão ao lado
  // está gritando, e a tela ficava incoerente mandando cuidar de outra coisa.
  if (foraDeTudo || foraDoTopo) {
    acoes.push({
      icon: MapPin,
      titulo: foraDeTudo
        ? 'Apareça nas buscas da sua região'
        : 'Suba para os três primeiros da sua região',
      paragrafos: [
        foraDeTudo
          ? 'Hoje sua empresa não aparece quando alguém procura por perto. O Google escolhe quem mostrar pela reputação do perfil — e é isso que está ao seu alcance mudar.'
          : 'Sua empresa aparece, mas abaixo do terceiro lugar, que é até onde a maioria das pessoas olha.',
        'Nota alta, volume de avaliações e perfil completo são o que faz o Google confiar mais no seu negócio do que no vizinho. Não existe atalho, e quem promete posição garantida está vendendo o que não tem.'
      ]
    })
  }

  if (faltaNoPerfil.length) {
    acoes.push({
      icon: Star,
      titulo: `Complete o perfil da sua empresa no Google — +${pontosDoPerfil} pontos`,
      // Concordância: "Ainda falta foto" com um item, "Ainda faltam foto e
      // telefone" com dois. O que falta é calculado, então o plural também.
      paragrafos: [
        `Ainda ${faltaNoPerfil.length > 1 ? 'faltam' : 'falta'} ${faltaNoPerfil.join(' e ')}. ` +
        'É uma melhoria simples, depende apenas de você e leva poucos minutos.'
      ],
      cta: { label: 'Completar perfil da empresa', url: 'https://business.google.com/' }
    })
  }

  if (linkAvaliacoes) {
    acoes.push({
      icon: MessageSquare,
      titulo: 'Responda às avaliações da sua empresa',
      paragrafos: [
        'Responder demonstra atenção aos clientes e mantém o perfil da empresa ativo. ' +
        'Comece pelas avaliações mais recentes.'
      ],
      cta: { label: 'Ver avaliações da empresa', url: linkAvaliacoes }
    })
  }

  // A última ação muda conforme a pessoa já tenha ou não o dispositivo — é a
  // única diferença real entre as duas fases nesta lista.
  acoes.push(temDispositivo ? {
    icon: Smartphone,
    titulo: 'Use seu dispositivo em todo atendimento',
    paragrafos: [
      'O dispositivo funciona quando está à vista e é oferecido — no fim do atendimento, ' +
      'com o cliente ainda na loja. Deixado no balcão sem ninguém apontar, ele rende bem menos.',
      'Cada nova avaliação contribui para fortalecer a presença da empresa no Google e melhorar seu Score.'
    ]
  } : {
    icon: UserCheck,
    titulo: 'Peça novas avaliações aos seus clientes',
    paragrafos: [
      'Você não precisa esperar o dispositivo chegar. Clientes que já conhecem sua empresa ' +
      'podem avaliar sua experiência agora.',
      'Cada nova avaliação contribui para fortalecer a presença da empresa no Google e ' +
      'melhorar seu Score.'
    ]
  })

  return (
    <section className="v3-agora">
      <header>
        <h2>O que você pode melhorar agora</h2>
        <p>
          Algumas ações já podem melhorar a presença da sua empresa no Google e aumentar
          seu Score{temDispositivo ? '.' : ' — mesmo antes de receber qualquer dispositivo.'}
        </p>
      </header>
      <div className="lista">
        {acoes.map((a, i) => {
          const Ico = a.icon
          return (
            <article key={i}>
              <div className="ico"><Ico size={17} strokeWidth={1.8}/></div>
              <div className="txt">
                <strong>{a.titulo}</strong>
                {a.paragrafos.map((t, j) => <p key={j}>{t}</p>)}
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
  )
}
