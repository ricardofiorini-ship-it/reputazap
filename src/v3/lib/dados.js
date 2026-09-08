// ============================================================
// StarTouch V3 — carga dos dados reais
// ============================================================
// Uma carga só, no topo, compartilhada pelas telas. As chamadas complementares
// (avaliações, dados do local, dispositivos, posição) usam `tryGet`: se uma
// falhar, ela vira `null` e a tela mostra "sem medição" naquele pedaço em vez
// de a página inteira sumir. A única que pode derrubar é `/api/mybiz` — sem
// negócio não há painel.
//
// Custo: a única chamada que toca o Google é a posição (grade), e ela tem
// cache de 7 dias por termo no backend. Abrir o painel é acerto de cache.
// ============================================================
import React from 'react'
import { api, ApiError } from './api.js'
import { CONVIDADO } from './acesso.js'

export function useDados({ area } = {}) {
  const [estado, setEstado] = React.useState({
    carregando: true, erro: null, semNegocio: false, sessaoExpirou: false, convidado: false,
    biz: null, info: null, avaliacoes: null, dispositivos: [], posicao: null
  })
  const [nonce, setNonce] = React.useState(0)

  // ── CARGA LEVE PARA A TELA DO MENU (08/09/2026) ──
  // O painel esperava CINCO chamadas antes de desenhar qualquer tela: o
  // negócio e, em seguida, avaliações + dados do Google + dispositivos +
  // POSIÇÃO. A posição é a medição da grade, a mais cara das quatro.
  //
  // A tela do Menu não usa nenhuma das três últimas — só o nome do negócio, o
  // plano e a foto. Esperar por elas eram ~4 segundos de tela branca depois do
  // clique, que foi o que o Ricardo cronometrou.
  //
  // Só a tela do Menu é aliviada, de propósito: Início, Reputação e Mapa
  // precisam desses dados de verdade, e cortá-los ali seria trocar lentidão
  // por tela vazia.
  const leve = area === 'experiencia'

  React.useEffect(() => {
    let vivo = true
    setEstado(e => ({ ...e, carregando: true, erro: null }))

    ;(async () => {
      try {
        // ── CONVIDADO ──
        // Sem conta, então nada de `mybiz` nem `plates`: o negócio é montado a
        // partir do que o Google devolve pelo `place_id`, que é público. Ele vê
        // a mesma presença que um cliente vê — é esse o "aha" que faz a pessoa
        // criar conta. O que exige conta some, em vez de dar erro.
        if (CONVIDADO) {
          const [info, av, pos] = await Promise.all([
            api.dadosDoLocal(CONVIDADO.placeId),
            api.avaliacoes(CONVIDADO.placeId),
            api.posicao(CONVIDADO.placeId)
          ])
          if (!vivo) return
          if (!info?.name) {
            setEstado(e => ({ ...e, carregando: false, erro: 'Não encontramos esse negócio no Google.' }))
            return
          }
          setEstado({
            carregando: false, erro: null, semNegocio: false, sessaoExpirou: false,
            convidado: true,
            biz: { name: info.name, place_id: CONVIDADO.placeId, plan: 'free' },
            info,
            avaliacoes: av || null,
            dispositivos: [],
            // Mesma regra do cliente: `measured === 0` é "não sabemos", nunca
            // "você está fora" — anunciar má notícia a partir de falha de
            // infraestrutura seria inventar, e pro convidado seria inventar
            // uma má notícia sobre alguém que nem cliente é.
            posicao: pos?.grid?.terms?.[0]?.measured > 0 ? pos.grid.terms[0] : null
          })
          return
        }

        const { business: biz } = await api.meuNegocio()
        if (!vivo) return
        if (!biz || !biz.place_id) {
          setEstado(e => ({ ...e, carregando: false, semNegocio: true }))
          return
        }

        const [av, info, disp, pos] = await Promise.all([
          leve ? null : api.avaliacoes(biz.place_id),
          api.dadosDoLocal(biz.place_id),
          leve ? null : api.dispositivos(),
          leve ? null : api.posicao(biz.place_id)
        ])
        if (!vivo) return

        setEstado({
          carregando: false, erro: null, semNegocio: false, sessaoExpirou: false,
          biz,
          info: info || null,
          avaliacoes: av || null,
          dispositivos: disp?.plates || [],
          // O backend devolve { ok, grid }. `grid.terms[0]` é a busca principal.
          // measured === 0 quer dizer que o Google não respondeu em nenhum dos
          // pontos: é "não sabemos", nunca "você está fora" — anunciar má
          // notícia a partir de falha de infraestrutura seria inventar.
          posicao: pos?.grid?.terms?.[0]?.measured > 0 ? pos.grid.terms[0] : null
        })
      } catch (e) {
        if (!vivo) return
        const expirou = e instanceof ApiError && e.status === 401
        setEstado({
          carregando: false,
          erro: expirou ? 'Sua sessão expirou.' : (e.message || 'Não foi possível carregar.'),
          sessaoExpirou: expirou, semNegocio: false,
          biz: null, info: null, avaliacoes: null, dispositivos: [], posicao: null
        })
      }
    })()

    return () => { vivo = false }
  }, [nonce])

  return { ...estado, recarregar: () => setNonce(n => n + 1) }
}

// Histórico de toques com janela escolhida pela tela. Fica separado da carga
// principal porque cada tela pergunta um período diferente — e é consulta ao
// nosso banco, não ao Google: trocar de período não custa medição.
export function useToques(dias) {
  const [dados, setDados] = React.useState(null)
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    let vivo = true
    setCarregando(true)
    api.toques(dias).then(r => {
      if (!vivo) return
      setDados(r || null)
      setCarregando(false)
    })
    return () => { vivo = false }
  }, [dias])

  return { toques: dados, carregando }
}

export const LABEL_PRODUTO = {
  placa_balcao: 'Placa de balcão',
  placa_mesa:   'Placa de mesa',
  placa_parede: 'Placa de parede',
  pulseira_nfc: 'Pulseira NFC',
  cartao_nfc:   'Cartão NFC',
  adesivo_nfc:  'Adesivo NFC'
}
export const nomeProduto = (t) => LABEL_PRODUTO[t] || 'Dispositivo'
