// ============================================================
// StarTouch — Os ícones das marcas (Google, WhatsApp, Instagram…)
// ============================================================
// Nasceu dentro de src/v3/screens/Experiencia.jsx e saiu de lá em 08/09/2026,
// quando o banner do painel atual passou a precisar dos mesmos desenhos.
//
// Duas cópias do G do Google seriam duas cópias que um dia divergem — e o
// sintoma seria a marca do Google aparecendo de dois jeitos no mesmo produto,
// que é exatamente o tipo de detalhe que ninguém revisa depois da primeira vez.
//
// As FORMAS continuam vindo do contrato (`api/_lib/menu-icones.js`), que é a
// mesma fonte que o menu público usa. Aqui mora só a COR de marca, que o menu
// público não usa de propósito (lá os ícones são monocromáticos).
// ============================================================
import React from 'react'
import { ICONES, CHEIOS } from '../api/_lib/menu-icones.js'

export const MARCA = {
  google: null,                 // desenho próprio abaixo: o G oficial
  whatsapp: '#25D366',
  website: '#1A73E8',
  booking: '#6C3FD1',
  contact: '#E11D48',
  manager: '#E11D48',
  instagram: 'url(#ig-grad)'
}

// O G do Google são quatro caminhos de cores diferentes — não dá para pintar
// com um `fill` só, então ele é o único que vem desenhado por extenso.
export const G_GOOGLE = (
  <>
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.55-5.17 3.55-8.88z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z"/>
    <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
  </>
)

export function IconeMenu({ tipo, tamanho = 17 }) {
  if (tipo === 'google') {
    return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">{G_GOOGLE}</svg>
  }
  const cor = MARCA[tipo]
  const cheio = CHEIOS.has(tipo)
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true"
      fill={cheio ? (cor || 'currentColor') : 'none'}
      stroke={cheio ? 'none' : (cor || 'currentColor')}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {tipo === 'instagram' && (
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDCB52"/>
            <stop offset="45%" stopColor="#E1306C"/>
            <stop offset="100%" stopColor="#833AB4"/>
          </linearGradient>
        </defs>
      )}
      <g dangerouslySetInnerHTML={{ __html: ICONES[tipo] || ICONES.custom_url }}/>
    </svg>
  )
}
