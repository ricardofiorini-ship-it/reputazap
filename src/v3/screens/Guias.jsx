import React from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Clock3, MessageSquareText, PlayCircle, Smartphone, Sparkles, Star } from 'lucide-react'
import { Head } from '../ui.jsx'

const GUIAS = [
  { icon: Star, tipo: 'Avaliações', titulo: 'Como pedir avaliações de forma natural', tempo: '3 min' },
  { icon: Smartphone, tipo: 'Dispositivos', titulo: 'Onde posicionar sua placa ou cartão', tempo: '4 min' },
  { icon: MessageSquareText, tipo: 'Reputação', titulo: 'Como responder uma avaliação negativa', tempo: '5 min' },
  { icon: Sparkles, tipo: 'Menu Inteligente', titulo: 'Como escolher os primeiros botões do menu', tempo: '3 min' },
  { icon: PlayCircle, tipo: 'Equipe', titulo: 'Apresente a StarTouch aos seus atendentes', tempo: '2 min' },
  { icon: BookOpen, tipo: 'Divulgação', titulo: 'Use seu link no WhatsApp e Instagram', tempo: '3 min' }
]

export default function Guias() {
  return (
    <>
      {/* Maquete: os guias listados abaixo ainda não existem e o botão não
          abre nada. Ver o comentário equivalente em Unidades.jsx. */}
      <Head titulo="Dicas e guias" sub="Orientações práticas para aproveitar melhor a StarTouch">
        <div className="v3-picker">Em desenvolvimento</div>
      </Head>

      <section className="v3-guias-featured">
        <div className="icone"><Smartphone size={23}/></div>
        <div className="texto">
          <span>RECOMENDADO PARA COMEÇAR</span>
          <h2>Escolha o melhor lugar para seus dispositivos</h2>
          <p>Veja exemplos de posicionamento para tornar o toque mais natural durante o atendimento.</p>
        </div>
        <button className="v3-btn solid">Ver guia <ArrowRight size={13}/></button>
      </section>

      <section className="v3-guias-start">
        <header>
          <div><h2>Primeiros passos</h2><p>Uma sequência simples para deixar tudo pronto.</p></div>
          <span>2 de 4 concluídos</span>
        </header>
        <div className="progresso"><i style={{ width: '50%' }}/></div>
        <div className="passos">
          <div className="feito"><CheckCircle2 size={17}/><span>Ative seu primeiro dispositivo</span></div>
          <div className="feito"><CheckCircle2 size={17}/><span>Confira a experiência após o toque</span></div>
          <div><span className="numero">3</span><span>Teste com o próprio celular</span></div>
          <div><span className="numero">4</span><span>Acompanhe os primeiros resultados</span></div>
        </div>
      </section>

      <section className="v3-guias-library">
        <header><h2>Guias rápidos</h2><p>Respostas diretas para situações do dia a dia.</p></header>
        <div className="v3-guias-grid">
          {GUIAS.map(({ icon: Icon, tipo, titulo, tempo }) => (
            <article key={titulo}>
              <div className="topo"><span className="icone"><Icon size={17}/></span><small>{tipo}</small></div>
              <h3>{titulo}</h3>
              <div className="rodape"><span><Clock3 size={11}/>{tempo} de leitura</span><ArrowRight size={14}/></div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
