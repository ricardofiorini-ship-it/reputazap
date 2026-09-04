import React from 'react'
import { Gift, MessageCircle, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { Head } from '../ui.jsx'

const POSSIBILIDADES = [
  { icon: Gift, titulo: 'Ofereça um benefício', texto: 'Convide o cliente a participar de uma promoção ou receber uma novidade.' },
  { icon: MessageCircle, titulo: 'Ouça seus clientes', texto: 'Crie pesquisas rápidas, sugestões e outros caminhos de conversa.' },
  { icon: UserPlus, titulo: 'Construa relacionamento', texto: 'Receba os contatos que o cliente decidir compartilhar com o seu negócio.' }
]

export default function Clientes() {
  return (
    <>
      <Head titulo="Clientes" sub="Transforme uma interação em oportunidade de relacionamento">
        <div className="v3-picker">PRO</div>
      </Head>

      <section className="v3-clientes-hero">
        <div className="v3-clientes-copy">
          <span className="eyebrow"><Sparkles size={13}/> CLIENTES PRO</span>
          <h2>Continue a conversa depois do toque</h2>
          <p>
            Crie experiências em que seus clientes possam deixar um contato, responder uma pergunta
            ou participar de uma ação — sempre de forma clara e voluntária.
          </p>
          <span className="v3-clientes-status">Recurso em desenvolvimento</span>
        </div>

        <div className="v3-clientes-preview" aria-label="Exemplo de experiência no celular">
          <div className="phone-top"><i/></div>
          <div className="phone-brand">C</div>
          <strong>Café da Praça</strong>
          <span>Quer receber nossas novidades?</span>
          <div className="phone-field">Seu nome</div>
          <div className="phone-field">Seu WhatsApp</div>
          <div className="phone-action">Quero participar</div>
          <small>Você escolhe se quer compartilhar seus dados.</small>
        </div>
      </section>

      <section className="v3-clientes-section">
        <header>
          <h2>O que você poderá criar</h2>
          <p>Escolha o objetivo de cada ação e use o formato que fizer sentido para o seu negócio.</p>
        </header>
        <div className="v3-clientes-grid">
          {POSSIBILIDADES.map(({ icon: Icon, titulo, texto }) => (
            <article key={titulo} className="v3-clientes-card">
              <div className="icone"><Icon size={18}/></div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="v3-clientes-trust">
        <ShieldCheck size={20}/>
        <div>
          <strong>Confiança em primeiro lugar</strong>
          <span>O cliente entende o que está aceitando e mantém o controle sobre seus dados.</span>
        </div>
      </div>
    </>
  )
}
