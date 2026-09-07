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
import { Star, MessageSquare, UserCheck, MapPin, Smartphone, TrendingUp, ExternalLink } from 'lucide-react'
import { scoreDoNegocio, faixaDaNota } from '../lib/score.js'
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
  const { biz, info, posicao, avaliacoes } = dados
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

  // ── A NOTA, pela escala do Ricardo (07/09/2026) ──────────
  // A escala diz ONDE o negócio está; o texto diz POR QUE importa. Sem número
  // de meta, e a decisão é do Ricardo com um motivo que vale registrar: a conta
  // de "faltam N avaliações cinco estrelas" só fecha se TODAS as novas forem
  // cinco estrelas. Na vida real vêm quatro, três — a média sobe menos, o
  // cliente junta as N que a tela pediu, não chega no alvo e conclui, com
  // razão, que o painel mentiu. Seria uma régua criada contra nós mesmos, por
  // uma motivação que dura uma semana.
  const nota = avaliacoes?.rating ?? info?.rating ?? null
  const faixa = nota != null ? faixaDaNota(nota) : null

  const TEXTO_FAIXA = {
    critico:  'Abaixo de 4,0, boa parte das pessoas descarta o negócio antes mesmo de abrir as avaliações. É o ponto mais urgente da sua presença hoje.',
    alerta:   'Entre 4,0 e 4,1, quem compara você com o vizinho costuma ficar com o vizinho. Vale tratar como prioridade.',
    atencao:  'A partir de 4,5 a nota deixa de pesar contra você na hora da comparação. É um ponto a ser considerado.',
    muitobom: 'Você já está bem. De 4,7 para cima, a nota deixa de ser detalhe e vira argumento de venda.'
  }

  const notaAcao = (faixa && faixa.chave !== 'excelente') ? {
    icon: TrendingUp,
    titulo: `Sua nota está em ${nota.toFixed(1).replace('.', ',')} — ${faixa.nome.toLowerCase()}`,
    paragrafos: [
      TEXTO_FAIXA[faixa.chave],
      'Cada avaliação positiva nova puxa a média para cima, e a nota é o fator de maior peso no seu Score.'
    ]
  } : null
  const notaUrgente = notaAcao && (faixa.chave === 'critico' || faixa.chave === 'alerta')

  const acoes = []
  // Nota em nivel critico ou de alerta vem ANTES da posicao: de nada adianta
  // aparecer em primeiro se quem chega ve 3,6 e vai embora.
  if (notaUrgente) acoes.push(notaAcao)

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

  if (notaAcao && !notaUrgente) acoes.push(notaAcao)

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

  // TETO DE QUATRO. Com todas as regras somadas a lista chega a seis itens, e
  // lista de seis tarefas nao e plano de acao, e paisagem: ninguem faz nenhuma.
  // As demais reaparecem sozinhas conforme as primeiras forem resolvidas.
  const visiveis = acoes.slice(0, 4)

  return (
    <section className="v3-agora">
      <header>
        <h2>O que você pode melhorar agora</h2>
        {/* Duas frases irmãs, e a escolha não é estilo: "mesmo sem um
            dispositivo" seria falso para quem tem dois, e este bloco passou a
            aparecer nas duas fases. As duas dizem a mesma coisa — há ganho aqui
            que não depende de hardware — cada uma verdadeira para quem a lê. */}
        <p>
          {temDispositivo
            ? 'Veja as ações que podem aumentar seu Score neste momento.'
            : 'Mesmo sem um dispositivo, você já pode aumentar seu Score.'}
        </p>
      </header>
      <div className="lista">
        {visiveis.map((a, i) => {
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
