// ============================================================
// StarTouch V3 — Experiência do Cliente
// ============================================================
// Área MISTA: Google Direto é Free e continua sendo (o cliente já comprou
// isso), o Menu Inteligente é o Pro. Por isso a barra lateral não leva selo e
// a classificação vive por dentro, recurso a recurso.
//
// AS DUAS SÃO EXPERIÊNCIAS IRMÃS, não etapas de uma escada:
//   Google Direto    = experiência Free específica — NFC → Google, e só.
//   Menu Inteligente = experiência Pro configurável.
// "Avaliar no Google" NÃO é obrigatório no menu, e a ordem é livre. Quem quer
// só avaliação não monta menu nenhum: usa o Google Direto, que é gratuito.
//
// GOOGLE DIRETO NÃO É LINHA NO BANCO. Ele é o estado-base do dispositivo
// (sem experiência vinculada). Aparece aqui como um cartão de experiência
// porque é assim que o lojista pensa — mas criar uma linha por negócio só
// pra fazer banco e tela se parecerem seria maquinário sem retorno.
//
// E não confundir com a peneira desmontada em 2026-05: peneira era
// INTERCEPTAR quem ia avaliar e desviar o insatisfeito. Um menu sem botão do
// Google não intercepta ninguém — só não oferece aquele caminho naquele
// dispositivo.
// ============================================================
import React from 'react'
import { Plus, Archive, Pencil, ExternalLink, Sparkles } from 'lucide-react'
import { Head, Panel, Chip, Recursos, Carregando, Erro, dataBr } from '../ui.jsx'
import { nomeProduto } from '../lib/dados.js'
import { api } from '../lib/api.js'
import EditorMenu from './EditorMenu.jsx'

const RECURSOS = [
  { n: 'Google Direto', d: 'o toque leva direto à sua página de avaliação', p: 'free', s: 'pronto' },
  { n: 'Menu Inteligente', d: 'o toque abre uma página sua, com os seus botões', p: 'pro', s: 'constr' },
  { n: 'Experiência diferente por dispositivo', p: 'pro', s: 'constr' },
  { n: 'Link próprio da experiência', d: 'compartilhar fora do NFC', p: 'pro', s: 'constr' }
]

export default function Experiencia({ dados }) {
  const [estado, setEstado] = React.useState({ carregando: true, erro: null, dados: null })
  const [abertaId, setAbertaId] = React.useState(() => {
    try { return new URLSearchParams(window.location.search).get('exp') } catch { return null }
  })
  const [criando, setCriando] = React.useState(false)

  const carregar = React.useCallback(async () => {
    try {
      const r = await api.experiencias.listar()
      setEstado({ carregando: false, erro: null, dados: r })
    } catch (e) {
      setEstado({ carregando: false, erro: e.message || 'Não foi possível carregar.', dados: null })
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])

  // A experiência aberta vira `?exp=` na URL: dá pra atualizar a página e
  // continuar onde estava, e o botão voltar do navegador funciona.
  const abrir = React.useCallback((id) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('exp', id); else url.searchParams.delete('exp')
    window.history.pushState({}, '', url)
    setAbertaId(id)
    window.scrollTo(0, 0)
  }, [])

  React.useEffect(() => {
    const onPop = () => {
      try { setAbertaId(new URLSearchParams(window.location.search).get('exp')) } catch {}
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  async function criar() {
    setCriando(true)
    try {
      const r = await api.experiencias.criar('Menu do ' + (estado.dados?.negocio?.name || 'meu negócio'))
      await carregar()
      abrir(r.experience.id)
    } catch (e) {
      setEstado(s => ({ ...s, erro: e.message }))
    } finally { setCriando(false) }
  }

  if (estado.carregando) return <Carregando o="suas experiências"/>
  if (estado.erro) return <Erro mensagem={estado.erro} onTentar={carregar}/>

  const { experiences = [], devices = [], tipos, limites } = estado.dados || {}
  const ativas = experiences.filter(e => !e.archived_at)
  const arquivadas = experiences.filter(e => e.archived_at)
  const aberta = abertaId ? experiences.find(e => e.id === abertaId) : null
  const semExperiencia = devices.filter(d => !d.experience_id)

  // ── Editor ──
  if (aberta) {
    return (
      <EditorMenu
        exp={aberta}
        tipos={tipos}
        limites={limites}
        foto={dados.info?.photoUrl || null}
        dados={{
          info: dados.info,
          devices,
          dispositivosDaExp: devices.filter(d => d.experience_id === aberta.id && d.experience_enabled)
        }}
        onVoltar={() => abrir(null)}
        onAtualizar={(_exp, opts) => { if (!opts?.silencioso) carregar() }}
      />
    )
  }

  // ── Lista ──
  return (
    <>
      <Head titulo="Experiência do Cliente" sub="O que acontece depois que alguém encosta o celular">
        <button className="v3-btn solid" onClick={criar} disabled={criando}>
          <Plus size={13}/> {criando ? 'Criando…' : 'Criar menu'}
        </button>
      </Head>

      {/* Google Direto: cartão de experiência na tela, ausência de vínculo no
          banco. Ele é o padrão de fábrica e continua gratuito. */}
      <Panel
        titulo="Google Direto"
        extra={<Chip tipo="g">Free</Chip>}
        sub={semExperiencia.length
          ? `Em uso em ${semExperiencia.length} ${semExperiencia.length === 1 ? 'dispositivo' : 'dispositivos'}`
          : 'Nenhum dispositivo usando no momento'}>
        <p className="v3-dica" style={{ padding: '6px 0 10px' }}>
          O cliente encosta o celular e vai direto para a sua página de avaliação no Google. É o padrão de
          todo dispositivo novo, e continua gratuito.
        </p>
        {semExperiencia.length > 0 && (
          <div className="v3-table-wrap">
            <table className="v3-t">
              <thead><tr><th>Dispositivo</th><th>Tipo</th><th className="num">Toques (total)</th></tr></thead>
              <tbody>
                {semExperiencia.map(d => (
                  <tr key={d.id}>
                    <td className="nm">{d.channel_name || nomeProduto(d.product_type)}</td>
                    <td className="sm">{nomeProduto(d.product_type)}</td>
                    <td className="num">{(d.total_taps || 0).toLocaleString('pt-BR')}</td>
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
        <p className="v3-dica" style={{ padding: '6px 0 10px' }}>
          Avaliar no Google, cardápio, pedido no WhatsApp, Instagram, salvar contato — na ordem que você
          definir. Editar e publicar são passos separados: você mexe à vontade e só vai ao ar quando publicar.
        </p>

        {!ativas.length && (
          <div className="v3-empty" style={{ padding: '20px' }}>
            <Sparkles size={18} color="var(--blue)"/>
            <h3>Você ainda não criou nenhum menu</h3>
            <p>Crie o primeiro e monte as ações. Nada vai ao ar até você publicar e ligar em um dispositivo.</p>
            <button className="v3-btn solid" onClick={criar} disabled={criando}>
              <Plus size={13}/> Criar meu primeiro menu
            </button>
          </div>
        )}

        {ativas.map(e => {
          const usando = devices.filter(d => d.experience_id === e.id && d.experience_enabled)
          const naoPublicado = JSON.stringify(e.draft) !== JSON.stringify(e.published)
          return (
            <div className="v3-expcard" key={e.id} onClick={() => abrir(e.id)} role="button" tabIndex={0}
              onKeyDown={ev => { if (ev.key === 'Enter') abrir(e.id) }}>
              <div className="txt">
                <div className="t">{e.name}</div>
                <div className="d">
                  {e.published
                    ? `Publicado em ${dataBr(e.published_at)}`
                    : 'Ainda não publicado'}
                  {' · '}
                  {(e.published?.buttons || e.draft?.buttons || []).length} ações
                  {usando.length > 0 && ` · no ar em ${usando.length} ${usando.length === 1 ? 'dispositivo' : 'dispositivos'}`}
                </div>
              </div>
              {naoPublicado && <Chip tipo="a">alterações não publicadas</Chip>}
              {usando.length > 0 && <Chip tipo="g">no ar</Chip>}
              <button className="v3-btn ghost" onClick={ev => { ev.stopPropagation(); abrir(e.id) }}>
                <Pencil size={13}/> Editar
              </button>
            </div>
          )
        })}
      </Panel>

      {arquivadas.length > 0 && (
        <Panel titulo="Arquivadas" sub="Nada foi apagado — dá para trazer de volta a qualquer momento">
          {arquivadas.map(e => (
            <div className="v3-onde" key={e.id}>
              <span className="txt"><span className="t">{e.name}</span>
                <span className="d">arquivada em {dataBr(e.archived_at)}</span></span>
              <button className="v3-btn ghost" onClick={async () => { await api.experiencias.arquivar(e.id, true); carregar() }}>
                <Archive size={13}/> Trazer de volta
              </button>
            </div>
          ))}
        </Panel>
      )}

      <Recursos itens={RECURSOS}/>
    </>
  )
}
