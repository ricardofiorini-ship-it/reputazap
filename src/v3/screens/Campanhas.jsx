import React from 'react'
import { CalendarDays, ExternalLink, Gift, Link2, Plus, QrCode, Smartphone, Sparkles } from 'lucide-react'
import { Head } from '../ui.jsx'

const CANAIS = [
  { icon: Smartphone, nome: 'Menu Inteligente', texto: 'Destaque a oferta no menu dos seus dispositivos.' },
  { icon: Link2, nome: 'Link próprio', texto: 'Compartilhe no WhatsApp, Instagram ou onde preferir.' },
  { icon: QrCode, nome: 'QR Code', texto: 'Use em mesas, balcões, vitrines e materiais impressos.' }
]

export default function Campanhas() {
  return (
    <>
      <Head titulo="Campanhas e promoções" sub="Crie ofertas e compartilhe onde seus clientes estão">
        <button className="v3-btn primary"><Plus size={14}/> Criar promoção</button>
      </Head>

      <section className="v3-camp-hero">
        <div className="v3-camp-copy">
          <span className="eyebrow"><Sparkles size={13}/> CAMPANHAS STARTOUCH</span>
          <h2>Transforme uma boa oferta em mais oportunidades</h2>
          <p>Monte uma promoção, escolha onde divulgar e acompanhe o interesse demonstrado pelos clientes.</p>
          <span className="status">Recurso em desenvolvimento</span>
        </div>

        <article className="v3-camp-preview">
          <div className="imagem"><Gift size={30}/><span>OFERTA ESPECIAL</span></div>
          <div className="conteudo">
            <small>Café da Praça</small>
            <h3>Café + pão de queijo</h3>
            <p>Uma combinação especial para começar bem o dia.</p>
            <div className="validade"><CalendarDays size={12}/> Válida até 30 de setembro</div>
            <button>Quero aproveitar <ExternalLink size={12}/></button>
          </div>
        </article>
      </section>

      <section className="v3-camp-section">
        <header>
          <h2>Uma campanha, vários lugares</h2>
          <p>Crie uma vez e escolha os canais que fazem sentido para o seu negócio.</p>
        </header>
        <div className="v3-camp-channels">
          {CANAIS.map(({ icon: Icon, nome, texto }) => (
            <article key={nome}>
              <div className="icone"><Icon size={18}/></div>
              <div><h3>{nome}</h3><p>{texto}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="v3-camp-flow">
        <div><span>1</span><strong>Crie a oferta</strong><small>Título, imagem, descrição e validade</small></div>
        <i>→</i>
        <div><span>2</span><strong>Escolha onde publicar</strong><small>Menu Inteligente, link ou QR Code</small></div>
        <i>→</i>
        <div><span>3</span><strong>Acompanhe o interesse</strong><small>Visualizações e ações registradas</small></div>
      </section>
    </>
  )
}
