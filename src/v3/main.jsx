// ============================================================
// StarTouch V3 — porta de entrada (rota privada; o endereço vive em App.jsx)
// ============================================================
// Login COMPARTILHADO com o painel atual: mesmo `rz_token` no localStorage,
// mesma tela de login. Quem já está logado no /app entra aqui sem relogar, e
// pode alternar entre os dois painéis à vontade — que é o ponto de construir
// em paralelo em vez de substituir.
//
// PORTÃO DE VISIBILIDADE, NÃO DE SEGURANÇA. O V3 é privado nesta fase e o
// portão abaixo é de interface: ele decide quem VÊ a tela nova, não quem
// alcança dado. Isso é seguro de afirmar porque o V3 não abre nenhuma porta
// nova — ele consome exatamente os mesmos endpoints do painel atual, todos
// autenticados e escopados ao próprio usuário. Alguém que burlasse o portão
// veria o próprio negócio numa casca diferente, nada mais.
// ============================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { currentUser, token } from './lib/api.js'
import { ehInterno } from './lib/acesso.js'
import Login from '../Login.jsx'
import './theme.css'

// LOGIN NATIVO desde 07/09/2026. Antes o V3 mandava quem nao tinha sessao pro
// `/app?login=1&next=...` — ou seja, dependia do painel antigo pra abrir, e nao
// dava pra aposentar a tela que era a porta da outra.
//
// A troca foi barata porque o `Login.jsx` sempre foi autossuficiente: componente
// isolado, sem nada do AppV2, com estilos inline (as classes `login-*` que ele
// usa nao existem em CSS nenhum) e ja gravando `rz_token`/`rz_user` sozinho. E
// o MESMO componente dos dois paineis, entao a tela de entrada nao tem como
// divergir entre eles.
function Porta() {
  // Modo de revisão visual local. O teste de DEV é eliminado no build de
  // produção, portanto `?preview` não contorna o portão publicado.
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')
  if (preview) return <App/>

  // `useState` e não leitura direta: depois de entrar, o componente precisa
  // re-renderizar com a sessão nova sem recarregar a página.
  const [user, setUser] = React.useState(() => (token() ? currentUser() : null))

  // Sem sessão → o login acontece AQUI, na própria rota. Nada de mandar pro
  // painel antigo e voltar: quem entra pelo endereço do V3 fica no V3.
  if (!token() || !user) {
    return <Login onLogin={(u) => setUser(u)}/>
  }

  // BETA ABERTO EM 08/09/2026: cliente entra. O que ele VÊ é decidido no
  // App.jsx — cliente comum recebe só a tela do Menu (modo solo), interno
  // recebe o painel completo. Ver src/v3/lib/acesso.js.
  return <App/>
}

ReactDOM.createRoot(document.getElementById('root')).render(<Porta/>)
