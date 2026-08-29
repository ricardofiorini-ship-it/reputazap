// ============================================================
// StarTouch V3 — tela das áreas que ainda não existem
// ============================================================
// Não é um "em breve". É o mapa respondendo onde estamos: o que a área vai
// fazer, quais recursos estão previstos (com plano e estágio de cada um), o
// que já está decidido e o que falta fechar.
//
// Duas coisas que esta tela NÃO faz, de propósito:
//   • não vende: área em construção não tem botão de assinar. Quem assinasse
//     hoje não receberia nada — seria cobrar por promessa.
//   • não inventa número: nada aqui é preenchido com dado de exemplo.
// ============================================================
import React from 'react'
import { ExternalLink } from 'lucide-react'
import { Head, Panel, ChipStatus, Recursos, DefBox } from '../ui.jsx'

export default function Mapa({ area }) {
  return (
    <>
      <Head titulo={area.nome} sub={area.sub}>
        {area.pro && <div className="v3-picker">Área 100% Pro</div>}
      </Head>

      {area.recursos && <Recursos itens={area.recursos}/>}

      <div className="v3-empty">
        <ChipStatus s={area.status}/>
        {area.lead && <h3>{area.lead}</h3>}
        {area.corpo && <p>{area.corpo}</p>}
        <DefBox decidido={area.decidido} falta={area.falta}/>
        {area.externo && (
          <a className="v3-btn" href={area.externo.url} style={{ marginTop: 6 }}>
            {area.externo.label} <ExternalLink size={12} style={{ verticalAlign: -1 }}/>
          </a>
        )}
      </div>
    </>
  )
}
