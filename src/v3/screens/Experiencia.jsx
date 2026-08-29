// ============================================================
// StarTouch V3 — Experiência do Cliente
// ============================================================
// Fase 1 mostra o ESTADO REAL e nada além disso: hoje todo dispositivo leva
// direto ao Google, porque é o que o `/r/CODE` faz — e ele não foi tocado.
// Nenhum editor, nenhuma prévia, nenhuma promessa de assinatura: o Menu
// Inteligente é Fase 2 e aqui aparece como construção em andamento.
//
// É a área que originou a regra dos selos: Google Direto é Free e continua
// sendo (o cliente já comprou isso), o Menu é o Pro. Por isso a barra lateral
// não leva selo nenhum e a classificação vive por dentro, recurso a recurso.
// ============================================================
import React from 'react'
import { Clock } from 'lucide-react'
import { Head, Panel, Chip, Recursos, DefBox } from '../ui.jsx'
import { useToques, nomeProduto } from '../lib/dados.js'

const RECURSOS = [
  { n: 'Google Direto', d: 'o toque leva direto à sua página de avaliação', p: 'free', s: 'pronto' },
  { n: 'Menu Inteligente', d: 'o toque abre uma página sua, com os seus botões', p: 'pro', s: 'constr' },
  { n: 'Experiência diferente por dispositivo', p: 'pro', s: 'constr' },
  { n: 'Link próprio da experiência', d: 'compartilhar fora do NFC', p: 'pro', s: 'constr' }
]

export default function Experiencia({ dados }) {
  const { toques } = useToques(7)
  const ativos = dados.dispositivos.filter(d => d.status === 'active')

  return (
    <>
      <Head titulo="Experiência do Cliente" sub="O que acontece depois que alguém encosta o celular"/>

      <Panel
        titulo="Google Direto"
        extra={<Chip tipo="g">Free</Chip>}
        sub={ativos.length
          ? `Em uso em ${ativos.length === 1 ? 'seu dispositivo' : `seus ${ativos.length} dispositivos`}`
          : 'Será o padrão dos seus dispositivos'}>
        <p style={{ fontSize: 12.8, color: 'var(--mid)', padding: '6px 0 10px', margin: 0 }}>
          O cliente encosta o celular e vai direto para a sua página de avaliação no Google. É o padrão de
          todo dispositivo novo, e continua gratuito.
        </p>
        {ativos.length > 0 && (
          <div className="v3-table-wrap">
            <table className="v3-t">
              <thead><tr><th>Dispositivo</th><th>Tipo</th><th className="num">Toques (7 dias)</th></tr></thead>
              <tbody>
                {ativos.map(d => (
                  <tr key={d.id}>
                    <td className="nm">{d.channel_name || nomeProduto(d.product_type)}</td>
                    <td className="sm">{nomeProduto(d.product_type)}</td>
                    <td className="num">{toques?.available ? (toques.by_plate?.[d.id] || 0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        titulo="Menu Inteligente"
        extra={<><Chip>PRO</Chip><Chip tipo="n">Em construção</Chip></>}
        sub="O toque abre uma página sua em vez de ir direto ao Google">
        <p style={{ fontSize: 12.8, color: 'var(--mid)', padding: '6px 0 4px', margin: 0 }}>
          Avaliar no Google, cardápio, pedido no WhatsApp, Instagram, promoção — na ordem que você definir,
          com o seu logo. Editar e publicar são passos separados: você mexe à vontade e só vai ao ar quando
          publicar.
        </p>
        <DefBox
          decidido={[
            'Google Direto continua o padrão de fábrica de todo dispositivo novo',
            'O que você publicar não é apagado nem alterado por cancelamento de assinatura',
            'Cada dispositivo pode ter a sua própria experiência',
            'A experiência também vive fora do NFC, por um link próprio'
          ]}
          falta={[
            'Quantos botões cabem antes de virar bagunça',
            'Se avaliar no Google pode ser sempre o primeiro botão',
            'Quantas experiências por negócio'
          ]}/>
      </Panel>

      <div className="v3-callout">
        <Clock size={16} color="var(--amber)" style={{ flex: 'none', marginTop: 1 }}/>
        <div>
          <div className="t">Ainda não está disponível para nenhum plano</div>
          <div className="s">
            O Menu Inteligente está sendo construído. Enquanto isso, seus dispositivos seguem levando
            direto ao Google — exatamente como sempre fizeram.
          </div>
        </div>
      </div>

      <Recursos itens={RECURSOS}/>
    </>
  )
}
