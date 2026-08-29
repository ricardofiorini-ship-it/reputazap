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

export function useDados() {
  const [estado, setEstado] = React.useState({
    carregando: true, erro: null, semNegocio: false, sessaoExpirou: false,
    biz: null, info: null, avaliacoes: null, dispositivos: [], posicao: null
  })
  const [nonce, setNonce] = React.useState(0)

  React.useEffect(() => {
    let vivo = true
    setEstado(e => ({ ...e, carregando: true, erro: null }))

    ;(async () => {
      try {
        const { business: biz } = await api.meuNegocio()
        if (!vivo) return
        if (!biz || !biz.place_id) {
          setEstado(e => ({ ...e, carregando: false, semNegocio: true }))
          return
        }

        const [av, info, disp, pos] = await Promise.all([
          api.avaliacoes(biz.place_id),
          api.dadosDoLocal(biz.place_id),
          api.dispositivos(),
          api.posicao(biz.place_id)
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
