import {
  BarChart3,
  Brain,
  Flame,
  GraduationCap,
  LogOut,
  Medal,
  Route,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { Avatar } from './components/Avatar'
import { imagemCartaColecionavel } from './data/cardImages'
import { CartaColecionavel, cartasColecionaveis } from './data/cartasColecionaveis'
import { AuthScreen } from './pages/AuthScreen'
import { DashboardScreen } from './pages/DashboardScreen'
import { PerfilScreen } from './pages/PerfilScreen'
import { QuizScreen } from './pages/QuizScreen'
import { RecomendacoesScreen } from './pages/RecomendacoesScreen'
import { TrilhasScreen } from './pages/TrilhasScreen'
import { buscarEstadoUsuario, alterarXpUsuario, atualizarBossUsuario, comprarCartaUsuario, resetarDadosUsuario } from './services/userStateApi'
import { carregarSessao, limparSessao, salvarSessao, SESSION_KEY, XP_INICIAL, userStorageKey } from './storage'
import { BauConquista, BauConquistaTipo, Dashboard, DailyMissions, Progresso, Quiz, Recomendacao, Tela, Trilha, Usuario } from './types'
import { cartaEstaDesbloqueada, cartaExigeCompra, cartaDisponivelDesdeInicio, cartaGanhaAutomaticamente } from './utils/cardRules'

type AtividadeRecente = {
  id: string
  titulo: string
  detalhe: string
  data: string
  tipo: 'trilha' | 'quiz' | 'recompensa' | 'carta' | 'boss'
}

type CartaFeedback = {
  carta: CartaColecionavel
  tipo: 'conquistada' | 'desbloqueada'
}

const menu = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'trilhas', label: 'Trilhas', icon: Route },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'recomendacoes', label: 'Missões', icon: Sparkles },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
] satisfies { id: Tela; label: string; icon: typeof BarChart3 }[]

function App() {
  const [sessaoCarregada, setSessaoCarregada] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [xp, setXp] = useState(XP_INICIAL)
  const [tela, setTela] = useState<Tela>('dashboard')
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [trilhaId, setTrilhaId] = useState('logica-programacao')
  const [quizTrilhaId, setQuizTrilhaId] = useState('logica-programacao')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [recomendacao, setRecomendacao] = useState<Recomendacao | null>(null)
  const [progressoTrilha, setProgressoTrilha] = useState<Progresso | null>(null)
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [dailyMissions, setDailyMissions] = useState<DailyMissions>(() => criarMissoesDoDia())
  const [mensagem, setMensagem] = useState('')
  const [modoCadastro, setModoCadastro] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [dadosLoading, setDadosLoading] = useState(Boolean(usuario))
  const [cartasUsuario, setCartasUsuario] = useState<string[]>([])
  const [conquistasBauUsuario, setConquistasBauUsuario] = useState<BauConquista[]>([])
  const [cartaFeedbackAnimada, setCartaFeedbackAnimada] = useState<CartaFeedback | null>(null)
  const [filaCartaFeedback, setFilaCartaFeedback] = useState<CartaFeedback[]>([])
  const cartasAutoProcessadasRef = useRef<Set<string>>(new Set())
  const desbloqueiosProcessadosRef = useRef<Set<string>>(new Set())
  const carregamentoIdRef = useRef(0)
  const loadingTimeoutRef = useRef<number | null>(null)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    dataNascimento: '',
    senha: '',
    confirmarSenha: '',
    imagemPerfil: '',
    objetivo: '',
  })

  useEffect(() => {
    const sessao = carregarSessao()
    setUsuario(sessao)
    setDadosLoading(Boolean(sessao))
    setSessaoCarregada(true)
  }, [])

  const trilhaAtual = useMemo(() => trilhas.find((trilha) => trilha.id === trilhaId), [trilhaId, trilhas])
  function selecionarTrilha(id: string) {
    const usuarioId = usuario?.id || 'u-demo'

    setTrilhaId(id)
    setProgressoTrilha(progressoVazio(usuarioId, id))
    setRecomendacao(null)
    setMensagem('')
  }

  function trocarTela(proximaTela: Tela) {
    if (proximaTela === tela) return

    setDadosLoading(true)
    setTela(proximaTela)
  }

  async function alterarXp(valor: number) {
    const usuarioId = usuario?.id
    if (!usuarioId) return

    const resultado = await alterarXpUsuario(usuarioId, valor)
    setXp(resultado.xp)
  }

  function atualizarMissaoDoDia(mutacao: (atual: DailyMissions) => DailyMissions) {
    setDailyMissions((atual) => mutacao(atual.data === hojeLocal() ? atual : criarMissoesDoDia()))
  }

  async function sincronizarEstadoUsuario() {
    if (!usuario) return

    const estado = await buscarEstadoUsuario(usuario.id)
    setXp(estado.xp)
    setDailyMissions(estado.missaoDiaria)
    setCartasUsuario(estado.cartas)
    setConquistasBauUsuario(estado.conquistasBau)
  }

  function mostrarCartaFeedback(carta: CartaColecionavel, tipo: CartaFeedback['tipo']) {
    const novoFeedback = { carta, tipo }

    setFilaCartaFeedback((filaAtual) => {
      const jaEstaNaFila = filaAtual.some((item) => item.carta.id === carta.id && item.tipo === tipo)
      const jaEstaNaTela = cartaFeedbackAnimada?.carta.id === carta.id && cartaFeedbackAnimada.tipo === tipo

      if (jaEstaNaFila || jaEstaNaTela) return filaAtual

      return [...filaAtual, novoFeedback]
    })
  }

  function aplicarConquistaBau(tipo: BauConquistaTipo) {
    atualizarMissaoDoDia((atual) => {
      if (tipo === 'complete-student') {
        registrarAtividade('Conquista usada', 'Missão Estudante dedicado marcada como concluída na quinzena.', 'recompensa')
        return { ...atual, etapasTrilha: Math.max(atual.etapasTrilha, 5) }
      }

      if (tipo === 'complete-combo') {
        registrarAtividade('Conquista usada', 'Missão Combo de fogo marcada como concluída na semana.', 'recompensa')
        return { ...atual, quizzesPerfeitos: Math.max(atual.quizzesPerfeitos, 5) }
      }

      registrarAtividade('Conquísta usada', 'Missão Caçador de boss marcada como concluída pelo baú diário.', 'recompensa')
      return { ...atual, bossDerrotado: true, bossPerdido: false }
    })
  }

  function registrarAtividade(titulo: string, detalhe: string, tipo: AtividadeRecente['tipo']) {
    void titulo
    void detalhe
    void tipo
  }

  async function limparDadosLocais() {
    const sessaoAtual = localStorage.getItem(SESSION_KEY)
    Object.keys(localStorage)
      .filter((chave) => chave.startsWith('adaptivelearn:') && chave !== SESSION_KEY)
      .forEach((chave) => localStorage.removeItem(chave))

    if (sessaoAtual) {
      localStorage.setItem(SESSION_KEY, sessaoAtual)
    }

    setMensagem('Dados locais limpos. As informações serão carregadas novamente do banco.')
    await carregarDados(usuario?.id, trilhaId)
  }

  async function resetarBancoELocal() {
    if (!usuario) return

    await resetarDadosUsuario(usuario.id)
    await limparDadosLocais()
    setDashboard(null)
    setRecomendacao(null)
    setProgressoTrilha(progressoVazio(usuario.id, trilhaId))
    setRespostas({})
    setXp(0)
    setDailyMissions(criarMissoesDoDia())
    setMensagem('Banco e dados locais limpos. O sistema foi recarregado sem histórico.')
    await carregarDados(usuario.id, trilhaId)
  }

  function progressoVazio(userId: string, selectedTrail: string): Progresso {
    return {
      usuarioId: userId,
      trilhaId: selectedTrail,
      conteudosConcluidos: [],
      quizConcluido: false,
      liberada: true,
    }
  }

  async function carregarDados(userId = usuario?.id || 'u-demo', selectedTrail = trilhaId) {
    const carregamentoId = carregamentoIdRef.current + 1
    carregamentoIdRef.current = carregamentoId
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setDadosLoading(true)

    try {
      const trilhasData = await api<Trilha[]>('/trilhas')
      const trilhaSelecionada = trilhasData.some((trilha) => trilha.id === selectedTrail)
        ? selectedTrail
        : trilhasData[0]?.id || selectedTrail
      const quizTrilhaSelecionada = trilhasData.some((trilha) => trilha.id === quizTrilhaId)
        ? quizTrilhaId
        : trilhaSelecionada

      if (trilhaSelecionada !== trilhaId) {
        setTrilhaId(trilhaSelecionada)
      }

      if (quizTrilhaSelecionada !== quizTrilhaId) {
        setQuizTrilhaId(quizTrilhaSelecionada)
      }

      const [quizData, dashboardData, recomendacaoData, progressoData, estadoData] = await Promise.all([
        api<Quiz>(`/quizzes/${quizTrilhaSelecionada}`).catch(() => null),
        api<Dashboard>(`/dashboard/${userId}`).catch(() => null),
        api<Recomendacao>(`/recomendações/${userId}/${trilhaSelecionada}`).catch(() => null),
        api<Progresso>(`/progresso/${userId}/${trilhaSelecionada}`).catch(() => null),
        buscarEstadoUsuario(userId).catch(() => null),
      ])

      const progressoSeguro = progressoData
        || criarProgressoPorDashboard(userId, trilhaSelecionada, trilhasData, dashboardData)

      setTrilhas(trilhasData)
      setQuiz(quizData || null)
      setDashboard(dashboardData)
      setRecomendacao(recomendacaoData)
      const progressoFinal = progressoSeguro || progressoVazio(userId, trilhaSelecionada)
      setProgressoTrilha(progressoFinal)
      setXp(estadoData?.xp ?? dashboardData?.xp ?? 0)
      setDailyMissions(estadoData?.missaoDiaria || dashboardData?.missaoDiaria || criarMissoesDoDia())
      setCartasUsuario(estadoData?.cartas || dashboardData?.cartas || [])
      setConquistasBauUsuario(estadoData?.conquistasBau || [])
      setMensagem('')
    } finally {
      if (carregamentoIdRef.current === carregamentoId) {
        loadingTimeoutRef.current = window.setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (carregamentoIdRef.current === carregamentoId) {
                setDadosLoading(false)
              }
            })
          })
        }, 420)
      }
    }
  }

  useEffect(() => {
    if (usuario) {
      carregarDados(usuario.id, trilhaId).catch((error) => setMensagem(error.message))
    }
  }, [usuario, trilhaId, quizTrilhaId, tela])

  useEffect(() => () => {
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (cartaFeedbackAnimada || filaCartaFeedback.length === 0) return

    const [proximoFeedback, ...restante] = filaCartaFeedback
    setCartaFeedbackAnimada(proximoFeedback)
    setFilaCartaFeedback(restante)
  }, [cartaFeedbackAnimada, filaCartaFeedback])

  useEffect(() => {
    if (!cartaFeedbackAnimada) return

    const timeout = window.setTimeout(() => setCartaFeedbackAnimada(null), 2700)

    return () => window.clearTimeout(timeout)
  }, [cartaFeedbackAnimada])

  useEffect(() => {
    cartasAutoProcessadasRef.current.clear()
    desbloqueiosProcessadosRef.current.clear()
    setCartaFeedbackAnimada(null)
    setFilaCartaFeedback([])
  }, [usuario?.id])

  useEffect(() => {
    if (!usuario) return

    cartasColecionaveis
      .filter((carta) => cartaGanhaAutomaticamente(carta, dailyMissions))
      .forEach((carta) => {
        if (cartasUsuario.includes(carta.id) || cartasAutoProcessadasRef.current.has(carta.id)) return

        cartasAutoProcessadasRef.current.add(carta.id)
        mostrarCartaFeedback(carta, 'conquistada')
        comprarCartaUsuario(usuario.id, carta.id, 0)
          .then((estado) => {
            setXp(estado.xp)
            setDailyMissions(estado.missaoDiaria)
            setCartasUsuario(estado.cartas)
          })
          .catch((error) => setMensagem(error.message))
      })
  }, [cartasUsuario, dailyMissions.bossDerrotado, dailyMissions.bauAberto, dailyMissions.etapasTrilha, dailyMissions.quizzesCom50, dailyMissions.quizzesPerfeitos, usuario])

  useEffect(() => {
    if (!usuario) return

    cartasColecionaveis
      .filter((carta) => cartaExigeCompra(carta))
      .filter((carta) => cartaEstaDesbloqueada(carta, dailyMissions, Boolean(dailyMissions.bauAberto)))
      .filter((carta) => !cartaDisponivelDesdeInicio(carta))
      .forEach((carta) => {
        const chave = userStorageKey(usuario.id, `carta-desbloqueio-global-v1:${carta.id}`)
        if (cartasUsuario.includes(carta.id) || desbloqueiosProcessadosRef.current.has(carta.id) || localStorage.getItem(chave)) return

        desbloqueiosProcessadosRef.current.add(carta.id)
        localStorage.setItem(chave, '1')
        mostrarCartaFeedback(carta, 'desbloqueada')
      })
  }, [cartasUsuario, dailyMissions.bossDerrotado, dailyMissions.bauAberto, dailyMissions.etapasTrilha, dailyMissions.quizzesCom50, dailyMissions.quizzesPerfeitos, usuario])

  async function autenticar() {
    if (authLoading) return

    try {
      setAuthLoading(true)
      setMensagem('')
      const endpoint = modoCadastro ? '/auth/register' : '/auth/login'
      const payload = modoCadastro
        ? form
        : { email: form.email, senha: form.senha }
      const data = await api<{ usuario: Usuario }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setDadosLoading(true)
      setUsuario(data.usuario)
      salvarSessao(data.usuario)
      setTela('dashboard')
      setMensagem(`Bem-vinda, ${data.usuario.nome}. Sua jornada começou.`)
      await carregarDados(data.usuario.id, trilhaId)
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : 'Não foi possível autenticar.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function lerImagem(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMensagem('Selecione um arquivo de imagem.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const maxSize = 520
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext('2d')
        if (!context) {
          setMensagem('Não foi possível processar a imagem.')
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const compressedImage = canvas.toDataURL('image/jpeg', 0.78)

        setForm((current) => ({ ...current, imagemPerfil: compressedImage }))
        setMensagem('Imagem carregada e otimizada para perfil.')
      }
      image.onerror = () => setMensagem('Não foi possível ler essa imagem.')
      image.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  }

  async function concluirConteudo(conteudoId: string): Promise<Progresso | null> {
    if (!usuario) return null

    const jaEstavaConcluido = progressoTrilha?.conteudosConcluidos.includes(conteudoId) ?? false
    const progressoBase = progressoTrilha?.trilhaId === trilhaId
      ? progressoTrilha
      : progressoVazio(usuario.id, trilhaId)
    const progressoOtimista: Progresso = {
      ...progressoBase,
      conteudosConcluidos: jaEstavaConcluido
        ? progressoBase.conteudosConcluidos
        : [...progressoBase.conteudosConcluidos, conteudoId],
    }

    setProgressoTrilha(progressoOtimista)

    const progressoRemoto = await api<Progresso>('/progresso/concluir-conteudo', {
      method: 'POST',
      body: JSON.stringify({ usuarioId: usuario.id, trilhaId, conteudoId }),
    }).catch(() => null)
    const progressoAtualizado = unirProgressos(progressoOtimista, progressoRemoto) || progressoOtimista

    setProgressoTrilha(progressoAtualizado)

    if (!jaEstavaConcluido) {
      atualizarMissaoDoDia((atual) => ({ ...atual, etapasTrilha: atual.etapasTrilha + 1 }))
      setXp((atual) => atual + 50)
      const conteudo = trilhaAtual?.conteudos.find((item) => item.id === conteudoId)
      registrarAtividade('Etapa concluída', conteudo?.titulo || 'Você concluiu uma etapa da trilha.', 'trilha')
    }

    setDashboard((atual) => {
      if (!atual) return atual

      const conteudosConcluidos = jaEstavaConcluido
        ? atual.conteudosConcluidos
        : Math.min(atual.conteudosConcluidos + 1, atual.totalConteudos)
      const progressoGeral = Math.round((conteudosConcluidos / Math.max(atual.totalConteudos, 1)) * 100)

      return {
        ...atual,
        conteudosConcluidos,
        progressoGeral,
        progressoPorTrilha: atual.progressoPorTrilha.map((item) => {
          if (item.trilhaId !== trilhaId || !trilhaAtual) return item

          return {
            ...item,
            progresso: Math.round((progressoAtualizado.conteudosConcluidos.length / trilhaAtual.conteudos.length) * 100),
          }
        }),
      }
    })

    setMensagem(jaEstavaConcluido ? 'Etapa já estava concluída. Seu XP permanece igual.' : '+50 XP. Etapa concluída. Continue assim!')
    return progressoAtualizado
  }

  async function responderQuiz(respostasOverride = respostas, irParaRecomendacoes = true, percentualManual?: number, xpManual?: number, etapaQuiz = 1) {
    if (!quiz || !usuario) return

    const respostasOrdenadas = quiz.questoes.map((_, index) => respostasOverride[index] ?? -1)
    const resultado = await api<{ taxaAcerto: number; mensagem: string }>(`/quizzes/${quiz.id}/responder`, {
      method: 'POST',
      body: JSON.stringify({ etapa: etapaQuiz, usuarioId: usuario.id, respostas: respostasOrdenadas, xpGanho: xpManual }),
    })

    if ((percentualManual ?? resultado.taxaAcerto) === 100) {
      atualizarMissaoDoDia((atual) => ({ ...atual, quizzesPerfeitos: atual.quizzesPerfeitos + 1 }))
    }
    if ((percentualManual ?? resultado.taxaAcerto) >= 50) {
      atualizarMissaoDoDia((atual) => ({ ...atual, quizzesCom50: (atual.quizzesCom50 || 0) + 1 }))
    }
    const xpGanhoQuiz = xpManual ?? 90
    registrarAtividade('Quiz finalizado', `${percentualManual ?? resultado.taxaAcerto}% de acerto em ${quiz.titulo}.`, 'quiz')
    setMensagem(`+${xpGanhoQuiz} XP. ${percentualManual ?? resultado.taxaAcerto}% de acerto. ${resultado.mensagem}`)
    if (irParaRecomendacoes) {
      setRespostas({})
    }
    await carregarDados(usuario.id, trilhaId)
    if (irParaRecomendacoes) {
      setTela('recomendacoes')
    }
  }

  if (!sessaoCarregada) {
    return (
      <main className="auth-shell auth-loading-shell">
        <AppLoading />
      </main>
    )
  }

  if (!usuario) {
    return (
      <AuthScreen
        autenticar={autenticar}
        carregando={authLoading}
        form={form}
        lerImagem={lerImagem}
        mensagem={mensagem}
        modoCadastro={modoCadastro}
        setForm={setForm}
        setModoCadastro={setModoCadastro}
      />
    )
  }

  return (
    <main className="game-shell">
      <aside className="game-menu">
        <div className="brand">
          <div className="brand-icon"><GraduationCap size={30} /></div>
          <div>
            <strong>Logic Forge</strong>
            <span>Estudar é legal</span>
          </div>
        </div>

        <div className="player-card">
          <Avatar usuario={usuario} />
          <strong>{usuario.nome}</strong>
          <span>{xp} XP acumulados</span>
        </div>

        <nav>
          {menu.map((item) => {
            const Icon = item.icon
            return (
              <button className={tela === item.id ? 'active' : ''} disabled={dadosLoading && tela === item.id} key={item.id} onClick={() => trocarTela(item.id)}>
                <Icon size={20} />
                {item.label}
              </button>
            )
          })}
        </nav>

          <button className="logout" onClick={() => { limparSessao(); setUsuario(null) }}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <section className="game-content">
        {dadosLoading ? (
          <AppLoading />
        ) : (
          <>
        {tela === 'trilhas' && (
          <header className="top-status">
            <div>
              <span className="pill">Trilha ativa</span>
              <h1>{trilhaAtual?.titulo || 'Jornada'}</h1>
            </div>
            <div className="status-items">
              <strong><Flame size={18} /> 3 dias</strong>
              <strong><Star size={18} /> {xp} XP</strong>
              <strong><Medal size={18} /> Nível {Math.max(1, Math.ceil(xp / 200))}</strong>
            </div>
          </header>
        )}

        {mensagem && tela === 'trilhas' && <div className="notice">{mensagem}</div>}

        {tela === 'dashboard' && (
          <DashboardScreen
            dailyMissions={dailyMissions}
            dashboard={dashboard}
            progresso={progressoTrilha}
            recomendacao={recomendacao}
            trilhaAtual={trilhaAtual}
            trilhas={trilhas}
            usuario={usuario}
            xp={xp}
            onTemaCriado={() => carregarDados(usuario.id, trilhaId)}
          />
        )}

        {tela === 'trilhas' && (
          <TrilhasScreen
            concluirConteudo={concluirConteudo}
            setTrilhaId={selecionarTrilha}
            trilhaAtual={trilhaAtual}
            trilhaId={trilhaId}
            trilhas={trilhas}
            progresso={progressoTrilha}
            avisar={setMensagem}
            usuarioId={usuario.id}
            alterarXp={alterarXp}
          />
        )}

        {tela === 'quiz' && (
          <QuizScreen
            quiz={quiz}
            quizTrilhaId={quizTrilhaId}
            responderQuiz={responderQuiz}
            respostas={respostas}
            setQuizTrilhaId={setQuizTrilhaId}
            setRespostas={setRespostas}
            trilhas={trilhas}
            usuarioId={usuario.id}
            usuarioNome={usuario.nome}
            xpAtual={xp}
          />
        )}

        {tela === 'recomendacoes' && (
          <RecomendacoesScreen
            dailyMissions={dailyMissions}
            marcarBossDerrotado={() => {
              atualizarBossUsuario(usuario.id, 'derrotado')
                .then((estado) => {
                  setXp(estado.xp)
                  setDailyMissions(estado.missaoDiaria)
                  setCartasUsuario(estado.cartas)
                  setConquistasBauUsuario(estado.conquistasBau)
                })
                .catch((error) => setMensagem(error.message))
            }}
            marcarBossPerdido={() => {
              atualizarBossUsuario(usuario.id, 'perdido')
                .then((estado) => {
                  setXp(estado.xp)
                  setDailyMissions(estado.missaoDiaria)
                  setCartasUsuario(estado.cartas)
                  setConquistasBauUsuario(estado.conquistasBau)
                })
                .catch((error) => setMensagem(error.message))
            }}
            alterarXp={alterarXp}
            registrarAtividade={registrarAtividade}
            recomendacao={recomendacao}
            setTela={setTela}
            usuario={usuario}
            xp={xp}
            cartasUsuario={cartasUsuario}
            sincronizarEstadoUsuario={sincronizarEstadoUsuario}
            mostrarCartaFeedback={mostrarCartaFeedback}
          />
        )}

        {tela === 'perfil' && (
          <PerfilScreen
            aplicarConquistaBau={aplicarConquistaBau}
            dailyMissions={dailyMissions}
            dashboard={dashboard}
            limparDadosLocais={limparDadosLocais}
            progresso={progressoTrilha}
            trilhas={trilhas}
            usuario={usuario}
            xp={xp}
            cartasUsuario={cartasUsuario}
            conquistasBau={conquistasBauUsuario}
            resetarBancoELocal={resetarBancoELocal}
          />
        )}
          </>
        )}
      </section>

      {cartaFeedbackAnimada && (
        <div className="card-unlock-toast" aria-live="polite">
          <div className="card-unlock-light" />
          <article className={`card-unlock-content rarity-${cartaFeedbackAnimada.carta.raridade} ${cartaFeedbackAnimada.tipo}`}>
            <span><Sparkles size={15} /> {cartaFeedbackAnimada.tipo === 'conquistada' ? 'Carta conquistada' : 'Carta desbloqueada'}</span>
            <img alt={cartaFeedbackAnimada.carta.nome} src={imagemCartaColecionavel(cartaFeedbackAnimada.carta)} />
            <strong>{cartaFeedbackAnimada.carta.nome}</strong>
            <small>{cartaFeedbackAnimada.tipo === 'conquistada' ? cartaFeedbackAnimada.carta.raridade : 'Agora pode comprar'}</small>
          </article>
        </div>
      )}
    </main>
  )
}

function AppLoading() {
  return (
    <section className="app-loading-screen" role="status" aria-live="polite">
      <div className="loading-orb">
        <Sparkles size={30} />
      </div>
      <span className="pill">Carregando</span>
      <h1>Preparando sua jornada</h1>
      <p>Buscando progresso, XP, missões e cartas direto do banco.</p>
      <div className="app-loading-bars">
        <i />
        <i />
        <i />
      </div>
    </section>
  )
}

function criarProgressoPorDashboard(
  usuarioId: string,
  trilhaId: string,
  trilhas: Trilha[],
  dashboard: Dashboard | null,
): Progresso | null {
  const trilha = trilhas.find((item) => item.id === trilhaId)
  const progressoDaTrilha = dashboard?.progressoPorTrilha.find((item) => item.trilhaId === trilhaId)

  if (!trilha || !progressoDaTrilha?.progresso) {
    return null
  }

  const concluidos = Math.round((progressoDaTrilha.progresso / 100) * trilha.conteudos.length)

  return {
    usuarioId,
    trilhaId,
    conteudosConcluidos: trilha.conteudos.slice(0, concluidos).map((conteudo) => conteudo.id),
    quizConcluido: false,
    liberada: true,
  }
}

function unirProgressos(principal?: Progresso | null, secundario?: Progresso | null): Progresso | null {
  const base = principal || secundario
  if (!base) return null

  const conteudosConcluidos = Array.from(new Set([
    ...(principal?.conteudosConcluidos || []),
    ...(secundario?.conteudosConcluidos || []),
  ]))

  return {
    ...base,
    conteudosConcluidos,
    quizConcluido: Boolean(principal?.quizConcluido || secundario?.quizConcluido),
    liberada: principal?.liberada ?? secundario?.liberada ?? true,
  }
}

function hojeLocal() {
  return new Date().toLocaleDateString('en-CA')
}

function criarMissoesDoDia(): DailyMissions {
  return {
    data: hojeLocal(),
    etapasTrilha: 0,
    quizzesPerfeitos: 0,
    quizzesCom50: 0,
    bossDerrotado: false,
    bossPerdido: false,
    bauAberto: false,
  }
}

export default App
