import React from 'react'
import { Building2, CheckCircle2, MapPin, Plus, Smartphone, Store } from 'lucide-react'
import { Head } from '../ui.jsx'

const UNIDADES = [
  { nome: 'Café da Praça — Centro', endereco: 'Unidade principal', dispositivos: 2, conectada: true },
  { nome: 'Café da Praça — Shopping', endereco: 'Exemplo de nova unidade', dispositivos: 0, conectada: false }
]

export default function Unidades() {
  return (
    <>
      <Head titulo="Minhas unidades" sub="Gerencie todos os seus locais em um único painel">
        <button className="v3-btn primary"><Plus size={14}/> Adicionar unidade</button>
      </Head>

      <section className="v3-unidades-intro">
        <div className="icone"><Building2 size={21}/></div>
        <div>
          <h2>Uma visão para cada unidade. Uma visão para toda a rede.</h2>
          <p>Cadastre seus locais, conecte o perfil do Google e organize os dispositivos de cada endereço.</p>
        </div>
      </section>

      <section className="v3-unidades-section">
        <header>
          <div>
            <h2>Suas unidades</h2>
            <p>Exemplo visual de como os locais serão organizados.</p>
          </div>
          <span className="contador">2 unidades</span>
        </header>

        <div className="v3-unidades-grid">
          {UNIDADES.map((unidade, i) => (
            <article className={`v3-unidade-card ${i === 0 ? 'principal' : ''}`} key={unidade.nome}>
              <div className="topo">
                <div className="loja"><Store size={19}/></div>
                {i === 0 && <span className="tag">Principal</span>}
              </div>
              <h3>{unidade.nome}</h3>
              <div className="meta"><MapPin size={13}/><span>{unidade.endereco}</span></div>
              <div className="v3-unidade-details">
                <div><Smartphone size={15}/><span><strong>{unidade.dispositivos}</strong> dispositivos</span></div>
                <div className={unidade.conectada ? 'ok' : 'pendente'}>
                  <CheckCircle2 size={15}/><span>{unidade.conectada ? 'Google conectado' : 'Conectar Google'}</span>
                </div>
              </div>
              <button className="v3-btn">Gerenciar unidade</button>
            </article>
          ))}

          <button className="v3-unidade-add">
            <span><Plus size={20}/></span>
            <strong>Adicionar outra unidade</strong>
            <small>Inclua um novo endereço da sua rede</small>
          </button>
        </div>
      </section>

      <section className="v3-unidades-selector-preview">
        <div>
          <span className="eyebrow">NO TOPO DO PAINEL</span>
          <h2>Escolha o que deseja acompanhar</h2>
          <p>Alterne entre uma unidade específica ou veja os resultados consolidados de toda a rede.</p>
        </div>
        <div className="selector-mock">
          <span>Visualizando</span>
          <strong><Building2 size={15}/> Todas as unidades <b>⌄</b></strong>
        </div>
      </section>
    </>
  )
}
