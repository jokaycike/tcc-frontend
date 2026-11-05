import {
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  Medal,
  Route,
  ShieldCheck,
  Star,
  Swords,
  Trophy,
  Bot,
  BookOpen,
  Gift,
  Sparkles,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { cartasColecionaveis } from '../data/cartasColecionaveis'
import { buscarHistoricoIa, enviarMensagemIa, gerarExplicacaoIa } from '../services/aiApi'
import { AtividadeRecente, Dashboard, IaMensagem, Progresso, Recomendacao, Trilha, Usuario } from '../types'

type DailyMissions = {
  data: string
  etapasTrilha: number
  quizzesPerfeitos: number
  bossDerrotado: boolean
}

type DashboardScreenProps = {
  dashboard: Dashboard | null
  dailyMissions: DailyMissions
  progresso: Progresso | null
  recomendacao: Recomendacao | null
  trilhaAtual?: Trilha
  trilhas: Trilha[]
  usuario: Usuario
  xp: number
  onTemaCriado?: () => Promise<void> | void
}

export function DashboardScreen({
  dashboard,
  dailyMissions,
  progresso,
  recomendacao,
  trilhaAtual,
  trilhas,
  usuario,
  xp,
  onTemaCriado,
}: DashboardScreenProps) {
  const nivel = Math.max(1, Math.floor(xp / 200) + 1)
  const xpNivelAtual = (nivel - 1) * 200
  const xpProximoNivel = nivel * 200
  const xpNoNivel = xp - xpNivelAtual
  const faltaXp = Math.max(0, xpProximoNivel - xp)
  const progressoNivel = Math.min(100, Math.round((xpNoNivel / 200) * 100))
  const totalEtapas = trilhaAtual?.conteudos.length || dashboard?.totalConteudos || 0
  const etapasConcluidas = progresso?.conteudosConcluidos.length ?? dashboard?.conteudosConcluidos ?? 0
  const progressoTrilhaAtual = totalEtapas ? Math.round((etapasConcluidas / totalEtapas) * 100) : dashboard?.progressoGeral ?? 0
  const cartasObtidas = dashboard?.cartas?.length || 0
  const atividades = dashboard?.atividadesRecentes || []
  const focoEstudo = calcularFocoEstudo(dashboard, recomendacao, trilhaAtual, progresso)
  const rankAluno = calcularRankAluno(xp)
  const objetivoSistema = calcularObjetivoSistema({
    cartasObtidas,
    dailyMissions,
    dashboard,
    progressoTrilhaAtual,
    xp,
  })
  const [analiseIa, setAnaliseIa] = useState('')
  const [analiseUsouIa, setAnaliseUsouIa] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [chatHistorico, setChatHistorico] = useState<IaMensagem[]>([])
  const [chatMensagem, setChatMensagem] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)

  useEffect(() => {
    let ativo = true

    buscarHistoricoIa(usuario.id)
      .then((resposta) => {
        if (ativo) setChatHistorico(resposta.historico || [])
      })
      .catch(() => {
        if (ativo) setChatHistorico([])
      })

    return () => {
      ativo = false
    }
  }, [usuario.id])

  async function gerarAnaliseDashboard() {
    try {
      setIaLoading(true)
      const resposta = await gerarExplicacaoIa({
        tituloConteudo: 'Análise do dashboard do aluno',
        tema: 'Aprendizagem adaptativa gamificada',
        nivel: 'iniciante',
        pergunta: [
          `Aluno: ${usuario.nome}.`,
          `Objetivo: ${usuario.objetivo}.`,
          `XP atual: ${xp}. Nível: ${nivel}.`,
          `Progresso geral: ${dashboard?.progressoGeral ?? progressoTrilhaAtual}%.`,
          `Média de acerto: ${dashboard?.mediaAcerto ?? 0}%.`,
          `Conteúdos concluídos: ${dashboard?.conteudosConcluidos ?? etapasConcluidas}/${dashboard?.totalConteudos ?? totalEtapas}.`,
          `Quizzes realizados: ${dashboard?.quizzesRealizados ?? 0}.`,
          `Foco calculado pelo sistema: ${focoEstudo.titulo}. ${focoEstudo.descricao}`,
          'Explique o que esse aluno precisa melhorar agora, qual tema revisar e qual próximo passo curto executar. Não diga que e uma base futura.',
        ].join(' '),
      })

      setAnaliseIa(resposta.explicacao)
      setAnaliseUsouIa(resposta.usouIA)
    } catch (error) {
      setAnaliseUsouIa(false)
      setAnaliseIa(error instanceof Error ? error.message : montarAnalisePadraoDashboard(focoEstudo))
    } finally {
      setIaLoading(false)
    }
  }

  async function enviarChat(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const mensagem = chatMensagem.trim()

    if (!mensagem || chatLoading) return

    try {
      setChatLoading(true)
      const resposta = await enviarMensagemIa({
        usuarioId: usuario.id,
        mensagem,
        contexto: {
          nome: usuario.nome,
          objetivo: usuario.objetivo,
          xp,
          nivel,
          mediaAcerto: dashboard?.mediaAcerto ?? 0,
          progressoGeral: dashboard?.progressoGeral ?? progressoTrilhaAtual,
        },
      })

      setChatHistorico(resposta.historico || [])
      setChatMensagem('')

      if (resposta.temaCriado) {
        await onTemaCriado?.()
      }
    } catch (error) {
      const texto = error instanceof Error
        ? error.message
        : 'Não foi possível conversar com a IA agora. Verifique se o backend foi reiniciado com as rotas novas.'
      setChatHistorico((historico) => [
        ...historico,
        {
          id: `erro-${Date.now()}`,
          papel: 'assistente',
          conteudo: texto,
          criadoEm: new Date().toISOString(),
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <section className="screen dashboard-game">
      <header className="dashboard-hero">
        <div className="dashboard-player">
          <Avatar usuario={usuario} />
          <div>
            <span className="pill">Central da jornada</span>
            <h1>Olá, {primeiroNome(usuario.nome)}</h1>
            <p>Você está no nível {nivel}. Falta {faltaXp} XP para o próximo nível.</p>
          </div>
        </div>

        <div className="dashboard-status">
          <strong><Medal size={18} /> {rankAluno.nome}</strong>
          <strong><Star size={18} /> {xp} XP</strong>
          <strong><Flame size={18} /> 3 dias</strong>
        </div>

        <div className="level-bar" aria-label="Progresso do nível">
          <div>
            <span>Nível {nivel}</span>
            <span>Nível {nivel + 1}</span>
          </div>
          <i style={{ width: `${progressoNivel}%` }} />
        </div>
      </header>

      <div className="dashboard-overview-grid">
        <DashboardSquare title="Progresso geral" value={`${dashboard?.progressoGeral ?? progressoTrilhaAtual}%`} icon={<BarChart3 size={24} />} />
        <DashboardSquare title="Média de acerto" value={`${dashboard?.mediaAcerto ?? 0}%`} icon={<Brain size={24} />} />
        <DashboardSquare title="Conteúdos" value={`${dashboard?.conteudosConcluidos ?? etapasConcluidas}/${dashboard?.totalConteudos ?? totalEtapas}`} icon={<CheckCircle2 size={24} />} />
        <DashboardSquare title="Quizzes" value={String(dashboard?.quizzesRealizados ?? 0)} icon={<Route size={24} />} />
      </div>

      <article className="dashboard-objective-strip">
        <div>
          <span className="pill">Objetivo inteligente</span>
          <h2>{usuario.objetivo}</h2>
          <p>{objetivoSistema.texto}</p>
        </div>
        <div className="objective-system-meter">
          <strong>{objetivoSistema.percentual}%</strong>
          <span>Sistema estima sua proximidade</span>
          <div className="progress-track"><i style={{ width: `${objetivoSistema.percentual}%` }} /></div>
        </div>
      </article>

      <div className="dashboard-content-grid">
        <article className="panel dashboard-ia-placeholder">
          <div>
          <div className="dashboard-card-icon"><Bot size={24} /></div>
            <span className="pill pill-ia"><Sparkles size={13} />IA Tutor</span>
            <h2>IA para seus estudos</h2>

            <section className="dashboard-ai-suggestion">
              <span className="ai-section-label"><Sparkles size={13} />Sugestão com base nos seus estudos</span>
              <p>{analiseIa || montarAnalisePadraoDashboard(focoEstudo)}</p>
              <strong>{analiseUsouIa ? 'Gerado pela IA Tutor' : 'Análise padrao do sistema'}: {focoEstudo.indicador}</strong>
              <button className="dashboard-ia-action" disabled={iaLoading} onClick={gerarAnaliseDashboard} type="button">
                <Sparkles size={16} />
                {iaLoading ? 'Analisando...' : 'Gerar análise com IA'}
              </button>
            </section>

            <section className={`dashboard-ai-chat ${chatAberto ? 'open' : 'closed'}`}>
              <div className="ai-chat-panel-header">
                <span className="ai-section-label"><Sparkles size={13} />Chat para conversar e criar novos estudos</span>
                <button className="ai-chat-toggle" onClick={() => setChatAberto((aberto) => !aberto)} type="button">
                  {chatAberto ? 'Fechar chat' : 'Conversar com IA'}
                </button>
              </div>
              {chatAberto ? (
                <>
              <div className="ai-chat-history" aria-live="polite">
                {chatHistorico.length > 0 ? chatHistorico.slice(-6).map((mensagem) => (
                  <article className={`ai-message ${mensagem.papel}`} key={mensagem.id}>
                    <span>{mensagem.papel === 'usuário' ? 'Você' : 'IA Tutor'}</span>
                    <p>{mensagem.conteudo}</p>
                  </article>
                )) : (
                  <article className="ai-message assistente">
                    <span>IA Tutor</span>
                    <p>Me conte o que você quer estudar. Exemplo: "quero estudar mais sobre UI UX". Eu posso criar uma nova trilha com material e quiz e salvar para reutilizar depois.</p>
                  </article>
                )}
              </div>

              <form className="ai-chat-form" onSubmit={enviarChat}>
                <textarea
                  aria-label="Mensagem para a IA Tutor"
                  onChange={(event) => setChatMensagem(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault()
                      enviarChat()
                    }
                  }}
                  placeholder="Ex: quero estudar mais sobre UI UX"
                  rows={3}
                  value={chatMensagem}
                />
                <button disabled={chatLoading || !chatMensagem.trim()} type="submit">
                  {chatLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
              <small className="ai-chat-hint">Quando um tema novo for criado, ele aparece em Trilhas e no Quiz Card Battle.</small>
                </>
              ) : (
                <p className="ai-chat-closed">Abra o chat quando quiser tirar duvidas ou pedir um novo tema de estudo.</p>
              )}
            </section>
          </div>
        </article>

      </div>

      <div className="dashboard-lower-grid clean">
        <article className="panel trail-summary-card">
          <header>
            <div>
              <span className="pill">Trilhas resumidas</span>
              <h2>Seu progresso por área</h2>
            </div>
          </header>
          <div className="trail-summary-grid compact">
            {trilhas.map((trilha) => {
              const itemDashboard = dashboard?.progressoPorTrilha.find((item) => item.trilhaId === trilha.id)
              const progressoItem = itemDashboard?.progresso ?? (trilha.id === trilhaAtual?.id ? progressoTrilhaAtual : 0)

              return (
                <div className="trail-summary-item" key={trilha.id}>
                  <strong>{trilha.titulo}</strong>
                  <small>{progressoItem}% completo</small>
                  <div className="progress-track"><span style={{ width: `${progressoItem}%` }} /></div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel">
          <span className="pill">Atividade recente</span>
          <h2>Últimas coisas feitas</h2>
          <div className="activity-list">
            {atividades.length > 0 ? atividades.map((atividade) => (
              <article className={`activity-item ${atividade.tipo}`} key={atividade.id}>
                <div>{iconeAtividade(atividade.tipo)}</div>
                <section>
                  <strong>{atividade.titulo}</strong>
                  <span>{atividade.detalhe}</span>
                </section>
                <small>{formatarDataAtividade(atividade.criadoEm || atividade.data)}</small>
              </article>
            )) : (
              <article className="activity-item empty">
                <div><BookOpen size={20} /></div>
                <section>
                  <strong>Nenhuma atividade registrada ainda</strong>
                  <span>Quando você concluir aulas, quizzes, cartas ou recompensas, elas vão aparecer aqui.</span>
                </section>
              </article>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function DashboardSquare({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <article className="dashboard-square">
      <div>{icon}</div>
      <strong>{value}</strong>
      <span>{title}</span>
    </article>
  )
}

function primeiroNome(nome: string) {
  return nome.trim().split(' ')[0] || nome
}

function calcularRankAluno(xp: number) {
  if (xp >= 3000) return { nome: 'Lendário', cor: '#f97316' }
  if (xp >= 2200) return { nome: 'Mestre', cor: '#7c3aed' }
  if (xp >= 1500) return { nome: 'Diamante', cor: '#1cb0f6' }
  if (xp >= 950) return { nome: 'Platina', cor: '#38bdf8' }
  if (xp >= 500) return { nome: 'Ouro', cor: '#facc15' }
  if (xp >= 200) return { nome: 'Prata', cor: '#94a3b8' }
  return { nome: 'Bronze', cor: '#b45309' }
}

function calcularObjetivoSistema({
  cartasObtidas,
  dailyMissions,
  dashboard,
  progressoTrilhaAtual,
  xp,
}: {
  cartasObtidas: number
  dailyMissions: DailyMissions
  dashboard: Dashboard | null
  progressoTrilhaAtual: number
  xp: number
}) {
  const progresso = dashboard?.progressoGeral ?? progressoTrilhaAtual
  const media = dashboard?.mediaAcerto ?? 0
  const conteudos = dashboard?.totalConteudos ? (dashboard.conteudosConcluidos / dashboard.totalConteudos) * 100 : progresso
  const missoes = Math.min(100, (dailyMissions.etapasTrilha / 5) * 35 + (dailyMissions.quizzesPerfeitos / 5) * 35 + (dailyMissions.bossDerrotado ? 30 : 0))
  const colecao = Math.min(100, (cartasObtidas / cartasColecionaveis.length) * 100)
  const xpScore = Math.min(100, xp / 12)
  const percentual = Math.round((progresso * 0.28) + (media * 0.24) + (conteudos * 0.18) + (missoes * 0.16) + (colecao * 0.08) + (xpScore * 0.06))
  const pontoFraco = media > 0 && media < 70 ? 'melhorar a precisão nos quizzes' : progresso < 60 ? 'avançar mais conteúdos da trilha' : 'manter consistência em desafios e missões'

  return {
    percentual: Math.min(100, Math.max(0, percentual)),
    texto: `Com base em progresso, acertos, missões, cartas e XP, o sistema entende que seu próximo foco é ${pontoFraco}. Essa barra sobe conforme você conclui conteúdos, acerta quizzes e mantém a rotina de estudo.`,
  }
}

function calcularFocoEstudo(
  dashboard: Dashboard | null,
  recomendacao: Recomendacao | null,
  trilhaAtual?: Trilha,
  progresso?: Progresso | null,
) {
  const trilhaMaisFraca = dashboard?.progressoPorTrilha
    .slice()
    .sort((a, b) => (a.taxaAcerto + a.progresso) - (b.taxaAcerto + b.progresso))[0]
  const proximaEtapa = trilhaAtual?.conteudos.find((conteudo) => !progresso?.conteudosConcluidos.includes(conteudo.id))
  const conteudoRecomendado = recomendacao?.conteudos[0]

  if ((dashboard?.mediaAcerto ?? 0) > 0 && (dashboard?.mediaAcerto ?? 0) < 70) {
    return {
      titulo: `Você parece estar com mais dificuldade em ${conteudoRecomendado?.titulo || trilhaMaisFraca?.titulo || 'fundamentos'}`,
      descricao: `Revise os estudos de ${conteudoRecomendado?.titulo || trilhaMaisFraca?.titulo || 'fundamentos'} e foque em praticar antes de avançar.`,
      indicador: `Média atual: ${dashboard?.mediaAcerto ?? 0}% de acerto`,
      progresso: dashboard?.mediaAcerto ?? 0,
    }
  }

  if (trilhaMaisFraca && trilhaMaisFraca.progresso < 60) {
    return {
      titulo: `Você parece estar com mais dificuldade em ${trilhaMaisFraca.titulo}`,
      descricao: `Revise os estudos de ${trilhaMaisFraca.titulo} e foque em concluir as próximas etapas dessa trilha.`,
      indicador: `Progresso atual nessa área: ${trilhaMaisFraca.progresso}%`,
      progresso: trilhaMaisFraca.progresso,
    }
  }

  return {
    titulo: `Seu foco agora pode ser ${conteudoRecomendado?.titulo || proximaEtapa?.titulo || 'prática com quiz'}`,
    descricao: `Seu desenvolvimento geral está equilibrado. Revise os estudos de ${conteudoRecomendado?.titulo || proximaEtapa?.titulo || 'quiz e exercicios'} e mantenha a prática.`,
    indicador: `Trilha atual: ${trilhaAtual?.titulo || 'em andamento'}`,
    progresso: Math.max(12, trilhaMaisFraca?.progresso ?? dashboard?.progressoGeral ?? 0),
  }
}

function montarAnalisePadraoDashboard(focoEstudo: ReturnType<typeof calcularFocoEstudo>) {
  return `${focoEstudo.titulo}. ${focoEstudo.descricao} Próximo passo: revise esse tema e faça uma atividade curta para válidar se o conceito ficou claro.`
}

function formatarDataAtividade(data?: string) {
  if (!data) return 'agora'

  const date = new Date(data)

  if (Number.isNaN(date.getTime())) {
    return 'agora'
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

function iconeAtividade(tipo: AtividadeRecente['tipo']) {
  const props = { size: 20 }

  if (tipo === 'trilha') return <BookOpen {...props} />
  if (tipo === 'quiz') return <Brain {...props} />
  if (tipo === 'recompensa') return <Gift {...props} />
  if (tipo === 'carta') return <ShieldCheck {...props} />
  return <Swords {...props} />
}
