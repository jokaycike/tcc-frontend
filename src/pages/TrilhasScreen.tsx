import {
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  GraduationCap,
  Heart,
  Lock,
  Menu,
  PartyPopper,
  Send,
  Shield,
  Star,
  Swords,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { gerarExplicacaoIa } from '../services/aiApi'
import { userStorageKey } from '../storage'
import { Progresso, Trilha } from '../types'

type Conteudo = Trilha['conteudos'][number]
type PerguntaRapida = {
  enunciado: string
  alternativas: string[]
  correta: number
}
type MaterialChatMessage = {
  id: string
  papel: 'usuario' | 'assistente'
  conteudo: string
  usouIA?: boolean
}

type BossStatus = 'jogando' | 'venceu' | 'perdeu'
type BossDraft = {
  indiceAtual: number
  respostas: Record<number, number>
  hp: number
  vidas: number
  status: BossStatus
  fala: string
}

type TrilhasScreenProps = {
  trilhas: Trilha[]
  trilhaId: string
  setTrilhaId: (id: string) => void
  trilhaAtual?: Trilha
  concluirConteudo: (id: string) => Promise<Progresso | null>
  progresso: Progresso | null
  avisar: (mensagem: string) => void
  usuarioId: string
  alterarXp?: (valor: number) => Promise<void>
}

export function TrilhasScreen({
  trilhas,
  trilhaId,
  setTrilhaId,
  trilhaAtual,
  concluirConteudo,
  progresso,
  avisar,
  usuarioId,
  alterarXp,
}: TrilhasScreenProps) {
  const [aulaAberta, setAulaAberta] = useState<Conteudo | null>(null)
  const [bossResultados, setBossResultados] = useState<Record<string, BossStatus | null>>({})
  const progressoAtual = progresso?.trilhaId === trilhaId ? progresso : null
  const concluidos = progressoAtual?.conteudosConcluidos || []
  const total = trilhaAtual?.conteudos.length || 0
  const indiceAberto = trilhaAtual?.conteudos.findIndex((conteudo) => !concluidos.includes(conteudo.id))
  const atualIndex = indiceAberto === undefined ? -1 : indiceAberto
  const progressoPercentual = total ? Math.round((concluidos.length / total) * 100) : 0

  useEffect(() => {
    setAulaAberta(null)
  }, [trilhaId])

  useEffect(() => {
    if (!trilhaAtual) return

    const proximosResultados = trilhaAtual.conteudos.reduce<Record<string, BossStatus | null>>((mapa, conteudo) => {
      if (conteudo.tipo === 'desafio') {
        mapa[conteudo.id] = carregarBossResultado(usuarioId, conteudo.id)
      }
      return mapa
    }, {})

    setBossResultados(proximosResultados)
  }, [trilhaAtual, usuarioId])

  function abrirAula(conteudo: Conteudo, estado: 'done' | 'current' | 'locked') {
    if (estado === 'locked') {
      avisar('Etapa bloqueada. Conclua a etapa anterior para liberar.')
      return
    }

    setAulaAberta(conteudo)
  }

  async function finalizarAula(conteudoId: string, fecharAoConcluir = true): Promise<void> {
    const resultado = await concluirConteudo(conteudoId)
    if (fecharAoConcluir && resultado?.conteudosConcluidos.includes(conteudoId)) {
      setAulaAberta(null)
    }
  }

  return (
    <section className="screen">
      <article className="panel trail-panel">
        <div className="panel-heading">
          <div>
            <span className="pill">Mundo de estudos</span>
            <h2>Escolha a trilha</h2>
          </div>
          <select value={trilhaId} onChange={(event) => setTrilhaId(event.target.value)}>
            {trilhas.map((trilha) => <option key={trilha.id} value={trilha.id}>{trilha.titulo}</option>)}
          </select>
        </div>
        <div className="trail-progress">
          <div>
            <strong>{progressoPercentual}% completo</strong>
            <span>{concluidos.length} de {total} etapas finalizadas</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressoPercentual}%` }} />
          </div>
          <p>{textoPosicaoTrilha(trilhaAtual, atualIndex, bossResultados)}</p>
        </div>
        <div className="quest-map">
          {!trilhaAtual && (
            <div className="empty-state">
              Carregando trilhas...
            </div>
          )}
          {trilhaAtual && <TrailPath />}
          {trilhaAtual?.conteudos.map((conteudo, index) => {
            const done = concluidos.includes(conteudo.id)
            const bossResultado = conteudo.tipo === 'desafio' ? bossResultados[conteudo.id] : null
            const current = !done && index === Math.max(atualIndex, 0) && bossResultado !== 'perdeu'
            const locked = !done && !current && bossResultado !== 'perdeu'
            const estado = done ? 'done' : current || bossResultado === 'perdeu' ? 'current' : 'locked'
            const xpEtapa = calcularXp(conteudo.tipo, index)
            const TipoIcon = tipoIcone(conteudo.tipo)

            return (
              <article className={`quest-node ${estado} ${corEtapa(index)} ${bossResultado === 'venceu' ? 'boss-won' : ''} ${bossResultado === 'perdeu' ? 'boss-lost' : ''}`} key={conteudo.id}>
                <button onClick={() => abrirAula(conteudo, estado)} aria-label={`Abrir ${conteudo.titulo}`}>
                  {bossResultado === 'perdeu' ? <X size={32} /> : done ? <Check size={34} /> : locked ? <Lock size={30} /> : index + 1}
                </button>
                <div className="quest-card" onClick={() => abrirAula(conteudo, estado)}>
                  <header>
                    <span className="level-chip">{conteudo.nivel}</span>
                    <span className={`content-type ${conteudo.tipo === 'desafio' ? 'boss' : ''}`}><TipoIcon size={15} /> {conteudo.tipo}</span>
                    <span><Clock3 size={15} /> {conteudo.tempoMinutos} min</span>
                    <strong><Star size={15} /> + {xpEtapa} XP</strong>
                  </header>
                  <h3>{conteudo.titulo}</h3>
                  <p>{conteudo.descricao}</p>
                  {bossResultado === 'perdeu' ? <small>Boss ganhou</small> : bossResultado === 'venceu' ? <small>Boss vencido</small> : current && <small>Voce esta aqui</small>}
                </div>
              </article>
            )
          })}
        </div>
      </article>
      {aulaAberta && (
        <AulaModal
          aula={aulaAberta}
          avisar={avisar}
          fechar={() => setAulaAberta(null)}
          finalizar={(fecharAoConcluir?: boolean) => finalizarAula(aulaAberta.id, fecharAoConcluir)}
          jaConcluida={concluidos.includes(aulaAberta.id)}
          alterarXp={alterarXp}
          aoResultadoBoss={(resultado) => setBossResultados((atual) => ({ ...atual, [aulaAberta.id]: resultado }))}
          tema={trilhaAtual?.titulo || 'Trilha de aprendizagem'}
          usuarioId={progressoAtual?.usuarioId || usuarioId}
        />
      )}
    </section>
  )
}

function AulaModal({ aula, fechar, finalizar, jaConcluida, avisar, alterarXp, aoResultadoBoss, tema, usuarioId }: {
  aula: Conteudo
  avisar: (mensagem: string) => void
  fechar: () => void
  finalizar: (fecharAoConcluir?: boolean) => Promise<void>
  jaConcluida: boolean
  alterarXp?: (valor: number) => Promise<void>
  aoResultadoBoss?: (resultado: BossStatus) => void
  tema: string
  usuarioId: string
}) {
  const TipoIcon = tipoIcone(aula.tipo)
  const xpEtapa = calcularXp(aula.tipo, 0)
  const desafioFinal = aula.tipo === 'desafio'
  const [aba, setAba] = useState<'apresentacao' | 'material' | 'exemplo' | 'quiz'>('apresentacao')
  const [valorInterativo, setValorInterativo] = useState(valorInicialExemplo(aula))
  const [respostasAula, setRespostasAula] = useState<Record<number, number>>(() => carregarRespostasAula(usuarioId, aula.id))
  const [quizTravado, setQuizTravado] = useState(() => jaConcluida && Object.keys(carregarRespostasAula(usuarioId, aula.id)).length > 0)
  const [feedback, setFeedback] = useState(() => quizTravado ? 'Etapa já concluída. Suas respostas ficaram salvas para revisão.' : '')
  const [bossDraft, setBossDraft] = useState<BossDraft>(() => criarBossDraftInicial(usuarioId, aula))
  const [bossAnimacao, setBossAnimacao] = useState<'hit' | 'attack' | 'defeated' | 'lost' | 'exploding' | ''>('')
  const [telaRachando, setTelaRachando] = useState(false)
  const [materialAberto, setMaterialAberto] = useState(false)
  const [duvidaMaterial, setDuvidaMaterial] = useState('')
  const [chatMaterial, setChatMaterial] = useState<MaterialChatMessage[]>([])
  const [chatMaterialAberto, setChatMaterialAberto] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [mostrarRevisaoBoss, setMostrarRevisaoBoss] = useState(false)
  const material = materialDaAula(aula)
  const sugestoesMaterial = duvidasProntasMaterial(aula)
  const exemplo = exemploDaAula(aula, valorInterativo)
  const perguntas = quizDaAula(aula)
  const bossInfo = bossDaTrilha(tema, aula)
  const danoBoss = Math.ceil(100 / Math.max(perguntas.length, 1))
  const perguntasRespondidas = Object.keys(respostasAula).length
  const acertos = perguntas.reduce((total, pergunta, index) => total + (respostasAula[index] === pergunta.correta ? 1 : 0), 0)
  const percentual = Math.round((acertos / perguntas.length) * 100)
  const quizFinalizado = quizTravado || (jaConcluida && perguntasRespondidas === perguntas.length)
  const bossPergunta = perguntas[bossDraft.indiceAtual] || perguntas[0]
  const bossEscolhaAtual = respostasAula[bossDraft.indiceAtual]
  const bossXVisivel = desafioFinal && (bossAnimacao === 'exploding' || (bossDraft.status === 'venceu' && quizTravado))
  const bossFinalizado = desafioFinal && bossDraft.status !== 'jogando'

  useEffect(() => {
    setValorInterativo(valorInicialExemplo(aula))
    setDuvidaMaterial('')
    setChatMaterial([])
    setChatMaterialAberto(false)
    setMostrarRevisaoBoss(false)
    setBossAnimacao('')
    setTelaRachando(false)
    const respostasSalvas = carregarRespostasAula(usuarioId, aula.id)
    const temRespostasSalvas = Object.keys(respostasSalvas).length > 0
    const draftSalvo = criarBossDraftInicial(usuarioId, aula)

    setBossDraft(draftSalvo)

    if (desafioFinal && !jaConcluida && draftSalvo.status !== 'venceu') {
      setRespostasAula(draftSalvo.respostas)
      setQuizTravado(false)
      setFeedback(draftSalvo.status === 'perdeu'
        ? 'O boss venceu este desafio. A tentativa ficou travada em vermelho.'
        : Object.keys(draftSalvo.respostas).length > 0 ? 'Batalha retomada. As respostas ja dadas continuam travadas.' : '')
      return
    }

    if (temRespostasSalvas && jaConcluida) {
      setRespostasAula(respostasSalvas)
      setQuizTravado(true)
      setFeedback('Etapa já concluída. Suas respostas ficaram salvas para revisão.')
    }
  }, [aula, aula.id, usuarioId, desafioFinal, jaConcluida])

  useEffect(() => {
    const respostasSalvas = carregarRespostasAula(usuarioId, aula.id)
    const temRespostasSalvas = Object.keys(respostasSalvas).length > 0

    if (!desafioFinal && !temRespostasSalvas) {
      setRespostasAula({})
      setQuizTravado(false)
      setFeedback('')
    }
  }, [aula.id, usuarioId, desafioFinal])

  async function enviarDuvidaMaterial(event?: FormEvent<HTMLFormElement>, perguntaPronta?: string) {
    event?.preventDefault()
    const pergunta = (perguntaPronta || duvidaMaterial).trim()
    if (!pergunta || iaLoading) return

    setChatMaterial((historico) => [
      ...historico,
      {
        id: `material-user-${Date.now()}`,
        papel: 'usuario',
        conteudo: pergunta,
      },
    ])
    setDuvidaMaterial('')
    try {
      setIaLoading(true)
      const explicacao = await gerarExplicacaoIa({
        tituloConteudo: aula.titulo,
        tema,
        pergunta,
        nivel: aula.nivel,
      })
      const faq = respostaFaqMaterial(aula, pergunta)
      setChatMaterial((historico) => [
        ...historico,
        {
          id: `material-assistant-${Date.now()}`,
          papel: 'assistente',
          conteudo: explicacao.usouIA ? explicacao.explicacao : faq || explicacao.explicacao,
          usouIA: explicacao.usouIA,
        },
      ])
    } catch (error) {
      setChatMaterial((historico) => [
        ...historico,
        {
          id: `material-assistant-error-${Date.now()}`,
          papel: 'assistente',
          conteudo: respostaFaqMaterial(aula, pergunta) || (error instanceof Error ? error.message : 'NÃ£o foi possivel responder agora. Revise o material e tente novamente.'),
          usouIA: false,
        },
      ])
    } finally {
      setIaLoading(false)
    }
  }

  async function responderBoss(alternativaIndex: number) {
    if (!desafioFinal || !bossPergunta || bossDraft.status !== 'jogando' || bossEscolhaAtual !== undefined || quizFinalizado) {
      return
    }

    const acertou = alternativaIndex === bossPergunta.correta
    const proximasRespostas = { ...respostasAula, [bossDraft.indiceAtual]: alternativaIndex }
    const proximoHp = acertou ? Math.max(0, bossDraft.hp - danoBoss) : bossDraft.hp
    const proximasVidas = acertou ? bossDraft.vidas : Math.max(0, bossDraft.vidas - 1)
    const ultimoAtaque = bossDraft.indiceAtual >= perguntas.length - 1
    const proximoStatus: BossStatus = proximoHp <= 0
      ? 'venceu'
      : proximasVidas <= 0 || ultimoAtaque
        ? 'perdeu'
        : 'jogando'
    const proximaFala = acertou
      ? proximoHp <= 0
        ? 'Impossivel... voce quebrou minha defesa logica!'
        : 'Interessante... voce acertou, mas eu ainda estou de pe.'
      : proximasVidas <= 0 || ultimoAtaque
        ? 'Eu avisei. Volte quando dominar melhor este conteudo.'
        : `Ataque bloqueado. Revise ${aula.titulo} antes do proximo golpe.`
    const proximoDraft: BossDraft = {
      ...bossDraft,
      respostas: proximasRespostas,
      hp: proximoHp,
      vidas: proximasVidas,
      status: proximoStatus,
      fala: proximaFala,
    }

    setRespostasAula(proximasRespostas)
    setBossDraft(proximoDraft)
    salvarBossDraft(usuarioId, aula.id, proximoDraft)
    setBossAnimacao(acertou ? 'hit' : 'attack')
    window.setTimeout(() => setBossAnimacao(proximoStatus === 'venceu' ? 'defeated' : proximoStatus === 'perdeu' ? 'lost' : ''), 520)

    if (proximoStatus === 'venceu') {
      setFeedback(`Boss derrotado com ${acertosDoMapa(proximasRespostas, perguntas)}/${perguntas.length} acertos. Ele vai explodir e a etapa sera concluida.`)
      window.setTimeout(() => setBossAnimacao('exploding'), 850)
      window.setTimeout(() => {
        salvarRespostasAula(usuarioId, aula.id, proximasRespostas)
        salvarBossResultado(usuarioId, aula.id, 'venceu')
        salvarBossDraft(usuarioId, aula.id, { ...proximoDraft, status: 'venceu', hp: 0 })
        aoResultadoBoss?.('venceu')
        setQuizTravado(true)
        avisar('Boss explodiu. Desafio final vencido e trilha marcada em verde.')
        finalizar(false)
          .then(() => window.setTimeout(fechar, 650))
          .catch((error) => avisar(error instanceof Error ? error.message : 'Nao foi possivel concluir o desafio.'))
      }, 2600)
      return
    }

    if (proximoStatus === 'perdeu') {
      salvarBossResultado(usuarioId, aula.id, 'perdeu')
      aoResultadoBoss?.('perdeu')
      setTelaRachando(true)
      setFeedback('O boss venceu esta tentativa. Voce perdeu 50 XP e so podera tentar novamente em outro ciclo.')
      avisar('O boss venceu o desafio. -50 XP aplicado. A etapa ficou marcada em vermelho.')
      alterarXp?.(-50).catch((error) => avisar(error instanceof Error ? error.message : 'Nao foi possivel descontar XP.'))
      window.setTimeout(() => {
        setTelaRachando(false)
        fechar()
      }, 1600)
      return
    }

    setFeedback(acertou ? `Golpe certeiro! -${danoBoss} HP no boss.` : 'Voce perdeu 1 energia. O boss contra-atacou.')
  }

  function avancarAtaqueBoss() {
    if (!desafioFinal || bossEscolhaAtual === undefined || bossDraft.status !== 'jogando') return
    const proximoIndice = Math.min(bossDraft.indiceAtual + 1, perguntas.length - 1)
    const proximoDraft = { ...bossDraft, indiceAtual: proximoIndice, fala: bossInfo.falas.ataque }
    setBossDraft(proximoDraft)
    salvarBossDraft(usuarioId, aula.id, proximoDraft)
    setFeedback('')
  }

  function reiniciarBoss() {
    limparBossDraft(usuarioId, aula.id)
    const novoDraft = novoBossDraft()
    setBossDraft(novoDraft)
    setRespostasAula({})
    setQuizTravado(false)
    setBossAnimacao('')
    setFeedback('Nova tentativa iniciada. O boss voltou com 100 HP.')
  }

  async function tentarConcluir() {
    if (perguntasRespondidas < perguntas.length) {
      setAba('quiz')
      setFeedback(`Responda às ${perguntas.length} perguntas antes de concluir a aula.`)
      avisar('Falta responder todo o quiz rápido antes de concluir.')
      return
    }

    if (percentual < 75) {
      setAba('quiz')
      setFeedback(`Você fez ${percentual}%. Para concluir, precisa de pelo menos 75%. Revise e tente novamente.`)
      avisar('A aula ainda não foi concluída. Acerte pelo menos 75% do quiz rápido.')
      return
    }

    salvarRespostasAula(usuarioId, aula.id, respostasAula)
    setQuizTravado(true)
    setFeedback(`Aprovado com ${percentual}%. Etapa concluída e próxima liberada.`)
    await finalizar(false)
  }

  function acaoPrincipal() {
    if (aba === 'quiz' && quizFinalizado) {
      fechar()
      return
    }

    if (aba === 'quiz' && desafioFinal) {
      if (bossDraft.status === 'venceu') {
        fechar()
        return
      }

      if (bossDraft.status === 'perdeu') {
        fechar()
        return
      }

      setFeedback('Derrote o boss respondendo os ataques dentro da arena.')
      return
    }

    if (aba === 'apresentacao') {
      setAba('material')
      return
    }

    if (aba === 'material') {
      setAba('exemplo')
      return
    }

    if (aba === 'exemplo') {
      setAba('quiz')
      return
    }

    tentarConcluir()
  }

  const botaoPrincipal = aba === 'quiz'
    ? quizFinalizado ? 'Fechar revisão' : 'Concluir aula'
    : 'Próximo'

  const botaoPrincipalFinal = aba === 'quiz' && desafioFinal
    ? bossDraft.status === 'perdeu'
      ? 'Fechar batalha'
      : bossDraft.status === 'venceu' || quizFinalizado
        ? 'Fechar batalha'
        : 'Batalha em andamento'
    : botaoPrincipal

  return (
    <div className={`lesson-overlay ${telaRachando ? 'screen-red-close shake' : ''}`}>
      <article className="lesson-modal">
        <button className="lesson-close" onClick={fechar} aria-label="Fechar aula"><X size={20} /></button>
        <header className="lesson-header">
          <div className="lesson-badge"><TipoIcon size={32} /></div>
          <div>
            <span className="pill">{aula.nivel}</span>
            <h2>{aula.titulo}</h2>
            <p><Clock3 size={16} /> {aula.tempoMinutos} min - <Star size={16} /> +{xpEtapa} XP - dificuldade {dificuldade(aula.nivel)}</p>
          </div>
        </header>

        <div className="lesson-tabs">
          <button className={aba === 'apresentacao' ? 'active' : ''} onClick={() => setAba('apresentacao')}>Apresentação</button>
          <button className={aba === 'material' ? 'active' : ''} onClick={() => setAba('material')}>Material</button>
          <button className={aba === 'exemplo' ? 'active' : ''} onClick={() => setAba('exemplo')}>Exemplo interativo</button>
          <button className={aba === 'quiz' ? 'active' : ''} onClick={() => setAba('quiz')}>Quiz rápido</button>
        </div>

        {aba === 'apresentacao' && (
          <section className="lesson-section">
            <h3>Apresentação da etapa</h3>
            <p>{aula.descricao} Nesta etapa, o foco e entender o objetivo do conteúdo, acessar os materiais de apoio, testar um exemplo e responder um mini desafio para liberar a próxima etapa.</p>
            <div className="lesson-checklist">
              <div className='apresentation-etap'>
                <span><CheckCircle2 size={24} /></span>
                <p>Veja a apresentação</p>
              </div>
              <div className='apresentation-etap'>
                <span><BookOpen size={24} /></span>
                <p>Acesse o material</p>
              </div>
              <div className='apresentation-etap'>
                <span><Code2 size={24} /></span>
                <p>Teste o exemplo</p>
              </div>
              <div className='apresentation-etap'>
                <span><Brain size={24} /></span>
                <p>Acerte pelo menos 75%</p>
              </div>
            </div>
          </section>
        )}

        {aba === 'material' && (
          <section className="lesson-section">
            <h3>Material de estudo</h3>
            <p>Use estes materiais como apoio antes do exemplo interativo e do quiz rápido.</p>
            <div className="material-grid">
              <button className="material-card" onClick={() => setMaterialAberto(true)}>
                <BookOpen size={22} />
                <strong>Materia completa</strong>
                <span>Abra o conteúdo escrito completo desta etapa.</span>
              </button>
              <a className="material-card" href={material.videoUrl} target="_blank" rel="noreferrer">
                <Code2 size={22} />
                <strong>Vídeo recomendado</strong>
                <span>{material.videoTitulo}</span>
              </a>
              <a className="material-card" href={material.pdfUrl} target="_blank" rel="noreferrer">
                <BookOpen size={22} />
                <strong>PDF de apoio</strong>
                <span>{material.pdfTitulo}</span>
              </a>
            </div>
            <section className={`lesson-ai-chat-box ${chatMaterialAberto ? 'open' : 'closed'}`}>
              <header>
                <div>
                  <strong><Brain size={18} /> Tire duvidas sobre esta materia</strong>
                  <span>Use as perguntas prontas ou escreva sua propria duvida. Se a IA estiver desligada, usamos duvidas frequentes salvas.</span>
                </div>
                <button className="lesson-ai-toggle" onClick={() => setChatMaterialAberto((aberto) => !aberto)} type="button">
                  {chatMaterialAberto ? 'Fechar chat' : 'Conversar com chat'}
                </button>
              </header>
              {chatMaterialAberto ? (
                <>
              <div className="lesson-ai-suggestions">
                {sugestoesMaterial.map((pergunta) => (
                  <button disabled={iaLoading} key={pergunta} onClick={() => enviarDuvidaMaterial(undefined, pergunta)} type="button">
                    {pergunta}
                  </button>
                ))}
              </div>
              <div className="lesson-ai-chat-history" aria-live="polite">
                {chatMaterial.length > 0 ? chatMaterial.map((mensagem) => (
                  <article className={`lesson-ai-message ${mensagem.papel}`} key={mensagem.id}>
                    <span>{mensagem.papel === 'usuario' ? 'Voce' : mensagem.usouIA ? 'IA Tutor' : 'Duvida frequente'}</span>
                    <p>{mensagem.conteudo}</p>
                  </article>
                )) : (
                  <article className="lesson-ai-message assistente">
                    <span>IA Tutor</span>
                    <p>Escolha uma pergunta pronta ou escreva o que nao ficou claro no material.</p>
                  </article>
                )}
              </div>
              <form className="lesson-ai-chat-form" onSubmit={enviarDuvidaMaterial}>
                <textarea
                  aria-label="Duvida sobre o material"
                  onChange={(event) => setDuvidaMaterial(event.target.value)}
                  placeholder="Ex: explica isso com um exemplo mais simples?"
                  rows={3}
                  value={duvidaMaterial}
                />
                <button disabled={iaLoading || !duvidaMaterial.trim()} type="submit">
                  <Send size={17} />
                  {iaLoading ? 'Respondendo...' : 'Enviar'}
                </button>
              </form>
                </>
              ) : (
                <p className="lesson-ai-closed">Abra o chat quando quiser tirar duvidas sobre esta materia.</p>
              )}
            </section>
          </section>
        )}

        {aba === 'exemplo' && (
          <section className="lesson-code">
            <div>
              <Code2 size={18} />
              <strong>Exemplo interativo</strong>
            </div>
            <pre>{exemplo.codigo}</pre>
            <p>{exemplo.explicacao}</p>
            <label className="interactive-input">
              <span>{exemplo.rotulo}</span>
              <input value={valorInterativo} onChange={(event) => setValorInterativo(event.target.value)} type={exemplo.tipoEntrada} />
            </label>
            <div className={exemplo.aprovado ? 'interactive-result approved' : 'interactive-result blocked'}>
              Resultado: {exemplo.resultado}
            </div>
          </section>
        )}

        {aba === 'quiz' && desafioFinal && (
          <section className={`lesson-section boss-lesson-sectionat ${bossDraft.status === 'perdeu' ? 'boss-lost-state' : ''} ${bossDraft.status === 'venceu' ? 'boss-won-state' : ''}`}>
            <div className="boss-battle-headerat">
              <div>
                <span className={`boss-rankat boss-rankat-${bossInfo.rank.toLowerCase()}`}>{bossInfo.rank}</span>
                <h3>{bossInfo.nome}</h3>
                <p>{bossInfo.descricao}</p>
              </div>
              <div className="boss-energyat">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Heart key={index} size={22} className={index < bossDraft.vidas ? 'alive' : 'lost'} />
                ))}
              </div>
            </div>

            <div className="boss-arenaat">
              <div
                className={`trail-bossat ${bossAnimacao} ${bossDraft.status} ${bossXVisivel ? 'x-fixed' : ''}`}
              >
                {!bossXVisivel && (
                  <>
                    <div className="boss-faceat">
                      <span className="boss-eyeat left" />
                      <span className="boss-eyeat right" />
                      <span className="boss-mouthat" />
                    </div>
                    <Swords size={44} />
                  </>
                )}
                {bossXVisivel && <div className="trail-boss-xmark" aria-hidden="true"><X size={56} /></div> }
                {bossAnimacao === 'exploding' && (
                  <div className="trail-boss-explosion" aria-hidden="true">
                    {Array.from({ length: 20 }).map((_, index) => <span key={index} />)}
                  </div>
                )}
              </div>
              <div className="boss-statsat">
                <div className="boss-hp-rowat">
                  <span>HP do boss</span>
                  <strong>{bossDraft.hp}/100</strong>
                </div>
                <div className="boss-hp-barat">
                  <span style={{ width: `${bossDraft.hp}%` }} />
                </div>
                <p className="boss-speechat">{bossDraft.fala || bossInfo.falas.ataque}</p>
                <div className="boss-tagsat">
                  <span><Shield size={16} /> Energia {bossDraft.vidas}/3</span>
                  <span><Zap size={16} /> Dano por acerto {danoBoss}</span>
                  <span><Trophy size={16} /> Ataque {bossDraft.indiceAtual + 1}/{perguntas.length}</span>
                </div>
              </div>
            </div>

            {bossFinalizado && (
              <article className={`boss-result-cardat ${bossDraft.status === 'venceu' ? 'won' : 'lost'}`}>
                <strong>{bossDraft.status === 'venceu' ? 'Usuario ganhou' : 'Boss ganhou'}</strong>
                <span>{bossDraft.status === 'venceu' ? `Voce acertou ${acertos}/${perguntas.length} ataques e venceu o desafio final.` : `O boss venceu com ${bossDraft.hp}/100 HP restante. Revise os ataques antes do proximo ciclo.`}</span>
              </article>
            )}

            {!bossFinalizado && (
              <article className="boss-questionat">
                <h4>{bossPergunta.enunciado}</h4>
                <div className="mini-options">
                  {bossPergunta.alternativas.map((alternativa, alternativaIndex) => (
                    <button
                      className={classeAlternativa({
                        correta: bossPergunta.correta,
                        escolhida: bossEscolhaAtual,
                        indice: alternativaIndex,
                        quizFinalizado: bossEscolhaAtual !== undefined || bossDraft.status !== 'jogando' || quizFinalizado,
                      })}
                      disabled={bossEscolhaAtual !== undefined || bossDraft.status !== 'jogando' || quizFinalizado}
                      key={alternativa}
                      onClick={() => responderBoss(alternativaIndex)}
                    >
                      {alternativa}
                    </button>
                  ))}
                </div>
              </article>
            )}

            {bossFinalizado && mostrarRevisaoBoss && (
              <section className="boss-review-listat" aria-label="Revisao das perguntas do boss">
                {perguntas.map((pergunta, perguntaIndex) => {
                  const escolha = respostasAula[perguntaIndex]

                  return (
                    <article className="boss-questionat" key={pergunta.enunciado}>
                      <h4>{perguntaIndex + 1}. {pergunta.enunciado}</h4>
                      <div className="mini-options">
                        {pergunta.alternativas.map((alternativa, alternativaIndex) => (
                          <button
                            className={classeAlternativa({
                              correta: pergunta.correta,
                              escolhida: escolha,
                              indice: alternativaIndex,
                              quizFinalizado: true,
                            })}
                            disabled
                            key={alternativa}
                          >
                            {alternativa}
                          </button>
                        ))}
                      </div>
                    </article>
                  )
                })}
              </section>
            )}

            <div className="sob-info-boss">
              {feedback && <div className={bossDraft.status === 'venceu' ? 'lesson-feedback success' : 'lesson-feedback warning'}>{feedback}</div>}
              <div className="boss-actionsat">
                {bossDraft.status === 'jogando' && bossEscolhaAtual !== undefined && bossDraft.indiceAtual < perguntas.length - 1 && (
                  <button onClick={avancarAtaqueBoss}>Proximo ataque</button>
                )}
                {bossFinalizado && (
                  <button className="boss-review-toggleat" onClick={() => setMostrarRevisaoBoss((aberto) => !aberto)} type="button">
                    <Menu size={18} />
                    {mostrarRevisaoBoss ? 'Ocultar perguntas' : 'Ver perguntas'}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {aba === 'quiz' && !desafioFinal && (
          <section className="lesson-section">
            <div className="quiz-header">
              <div>
                <h3>Quiz rápido</h3>
                <p>Acerte pelo menos 75% para concluir a aula.</p>
              </div>
              <strong>{acertos}/{perguntas.length} acertos - {percentual}%</strong>
            </div>
            <div className="lesson-quiz">
              {perguntas.map((pergunta, perguntaIndex) => (
                <article key={pergunta.enunciado}>
                  <h4>{pergunta.enunciado}</h4>
                  <div className="mini-options">
                    {pergunta.alternativas.map((alternativa, alternativaIndex) => (
                      <button
                        className={classeAlternativa({
                          correta: pergunta.correta,
                          escolhida: respostasAula[perguntaIndex],
                          indice: alternativaIndex,
                          quizFinalizado,
                        })}
                        disabled={quizFinalizado}
                        key={alternativa}
                        onClick={() => {
                          if (quizFinalizado) return
                          setRespostasAula({ ...respostasAula, [perguntaIndex]: alternativaIndex })
                        }}
                      >
                        {alternativa}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {feedback && <div className={percentual >= 75 ? 'lesson-feedback success' : 'lesson-feedback warning'}>{feedback}</div>}
          </section>
        )}

        <button className="big-action" onClick={acaoPrincipal}>
          {botaoPrincipalFinal}
          {aba === 'quiz' ? <PartyPopper size={20} /> : <ChevronRight size={20} />}
        </button>

      </article>
      {materialAberto && (
        <div className="material-modal-overlay">
          <article className="material-modal">
            <button className="lesson-close" onClick={() => setMaterialAberto(false)} aria-label="Fechar material"><X size={20} /></button>
            <header className="material-modal-header">
              <span className="pill">Materia completa</span>
              <h2>{aula.titulo}</h2>
              <p>Leia como uma fase de preparo: conceito, estratégia, prática e desbloqueio.</p>
            </header>
            <div className="material-text">
              {material.conteudoCompleto.map((paragrafo, index) => (
                <section className="material-paragraph" key={paragrafo}>
                  <div className="material-marker">
                    {index + 1}
                  </div>
                  <p>{paragrafo}</p>
                </section>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

function TrailPath() {
  return (
    <svg className="quest-path" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
      <path d="M 52 0 C 73 18 28 34 48 51 S 75 78 48 100" />
    </svg>
  )
}

function textoPosicaoTrilha(trilhaAtual: Trilha | undefined, atualIndex: number, bossResultados: Record<string, BossStatus | null>) {
  if (!trilhaAtual) return 'Carregando trilha...'
  if (atualIndex === -1) return 'Trilha concluida'

  const etapaAtual = trilhaAtual.conteudos[Math.max(atualIndex, 0)]
  if (!etapaAtual) return 'Escolha uma etapa'

  const bossResultado = etapaAtual.tipo === 'desafio' ? bossResultados[etapaAtual.id] : null
  if (bossResultado === 'perdeu') return `Boss ganhou: ${etapaAtual.titulo}`
  if (bossResultado === 'venceu') return `Boss vencido: ${etapaAtual.titulo}`

  return `Voce esta aqui: ${etapaAtual.titulo}`
}

function respostasAulaKey(usuarioId: string, aulaId: string) {
  return userStorageKey(usuarioId, `trilha-quiz-rapido:${aulaId}`)
}

function carregarRespostasAula(usuarioId: string, aulaId: string): Record<number, number> {
  try {
    const salvo = localStorage.getItem(respostasAulaKey(usuarioId, aulaId))
    return salvo ? JSON.parse(salvo) as Record<number, number> : {}
  } catch {
    return {}
  }
}

function salvarRespostasAula(usuarioId: string, aulaId: string, respostas: Record<number, number>) {
  localStorage.setItem(respostasAulaKey(usuarioId, aulaId), JSON.stringify(respostas))
}

function bossDraftKey(usuarioId: string, aulaId: string) {
  return userStorageKey(usuarioId, `trilha-boss:${aulaId}`)
}

function bossResultadoKey(usuarioId: string, aulaId: string) {
  return userStorageKey(usuarioId, `trilha-boss-resultado:${aulaId}`)
}

function carregarBossResultado(usuarioId: string, aulaId: string): BossStatus | null {
  const resultado = localStorage.getItem(bossResultadoKey(usuarioId, aulaId))
  return resultado === 'venceu' || resultado === 'perdeu' ? resultado : null
}

function salvarBossResultado(usuarioId: string, aulaId: string, resultado: BossStatus) {
  localStorage.setItem(bossResultadoKey(usuarioId, aulaId), resultado)
}

function novoBossDraft(): BossDraft {
  return {
    indiceAtual: 0,
    respostas: {},
    hp: 100,
    vidas: 3,
    status: 'jogando',
    fala: 'Prepare-se. Eu vou testar se voce realmente dominou esta trilha.',
  }
}

function criarBossDraftInicial(usuarioId: string, aula: Conteudo): BossDraft {
  if (aula.tipo !== 'desafio') return novoBossDraft()

  try {
    const salvo = localStorage.getItem(bossDraftKey(usuarioId, aula.id))
    if (!salvo) return novoBossDraft()
    const draft = JSON.parse(salvo) as Partial<BossDraft>
    return {
      indiceAtual: Number.isInteger(draft.indiceAtual) ? Number(draft.indiceAtual) : 0,
      respostas: draft.respostas || {},
      hp: typeof draft.hp === 'number' ? Math.min(100, Math.max(0, draft.hp)) : 100,
      vidas: typeof draft.vidas === 'number' ? Math.min(3, Math.max(0, draft.vidas)) : 3,
      status: draft.status === 'venceu' || draft.status === 'perdeu' || draft.status === 'jogando' ? draft.status : 'jogando',
      fala: draft.fala || 'Prepare-se. Eu vou testar se voce realmente dominou esta trilha.',
    }
  } catch {
    return novoBossDraft()
  }
}

function salvarBossDraft(usuarioId: string, aulaId: string, draft: BossDraft) {
  localStorage.setItem(bossDraftKey(usuarioId, aulaId), JSON.stringify(draft))
}

function limparBossDraft(usuarioId: string, aulaId: string) {
  localStorage.removeItem(bossDraftKey(usuarioId, aulaId))
}

function acertosDoMapa(respostas: Record<number, number>, perguntas: PerguntaRapida[]) {
  return perguntas.reduce((total, pergunta, index) => total + (respostas[index] === pergunta.correta ? 1 : 0), 0)
}

function bossDaTrilha(tema: string, aula: Conteudo) {
  const base = normalizarTexto(`${tema} ${aula.titulo}`)

  if (base.includes('web')) {
    return {
      nome: 'Arquiteto da Web',
      rank: 'Diamante',
      descricao: 'Mistura HTML, CSS e JavaScript para testar se sua primeira pagina aguenta pressao.',
      falas: {
        ataque: 'Vou quebrar sua interface se voce nao souber ligar estrutura, estilo e interacao.',
      },
    }
  }

  if (base.includes('dados')) {
    return {
      nome: 'Guardiao dos Dados',
      rank: 'Ouro',
      descricao: 'Protege informacoes, tipos e organizacao. So cai com respostas bem estruturadas.',
      falas: {
        ataque: 'Dados soltos nao viram conhecimento. Mostre que voce sabe organiza-los.',
      },
    }
  }

  return {
    nome: 'Guardiao das Decisoes',
    rank: 'Bronze',
    descricao: 'Um boss de logica que cobra algoritmos, variaveis, condicionais e repeticoes.',
    falas: {
      ataque: 'Cada escolha define um caminho. Prove que sua logica esta afiada.',
    },
  }
}

function duvidasProntasMaterial(aula: Conteudo) {
  return [
    `Pode resumir ${aula.titulo}?`,
    'Me de um exemplo simples.',
    'Qual erro comum eu devo evitar?',
    'Como isso aparece em um sistema real?',
  ]
}

function respostaFaqMaterial(aula: Conteudo, pergunta: string) {
  const texto = normalizarTexto(pergunta)

  if (texto.includes('resum')) {
    return `${aula.titulo} trata de ${aula.descricao.toLowerCase()} O ponto principal e entender a ideia antes de tentar decorar respostas. Leia o material, observe o exemplo e tente explicar o conceito com suas palavras.`
  }

  if (texto.includes('exemplo') || texto.includes('simples')) {
    return `Exemplo simples: imagine uma tarefa pequena do dia a dia e divida em passos. Em ${aula.titulo}, o objetivo e reconhecer esses passos, dados ou decisoes e transformar isso em uma solucao organizada.`
  }

  if (texto.includes('erro') || texto.includes('evitar')) {
    return `Um erro comum nesta etapa e pular direto para o quiz sem testar o exemplo. Antes de concluir, altere pequenos valores no exemplo interativo e observe se o resultado muda como voce esperava.`
  }

  if (texto.includes('sistema') || texto.includes('real') || texto.includes('aparece')) {
    return `${aula.titulo} aparece em sistemas quando precisamos transformar uma regra em comportamento. Cadastros, validações, relatórios, telas e quizzes usam esse tipo de raciocinio para funcionar de forma previsivel.`
  }

  return ''
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function classeAlternativa({
  correta,
  escolhida,
  indice,
  quizFinalizado,
}: {
  correta: number
  escolhida?: number
  indice: number
  quizFinalizado: boolean
}) {
  if (!quizFinalizado) {
    return escolhida === indice ? 'selected' : ''
  }

  if (indice === correta) {
    return 'correct'
  }

  if (escolhida === indice && escolhida !== correta) {
    return 'wrong'
  }

  return 'locked'
}

function calcularXp(tipo: Conteudo['tipo'], index: number) {
  if (tipo === 'desafio') return 200
  if (tipo === 'exercicio') return 70 + index * 10
  if (tipo === 'leitura') return 40 + index * 10
  return 50 + index * 10
}

function tipoIcone(tipo: Conteudo['tipo']) {
  if (tipo === 'desafio') return Trophy
  if (tipo === 'exercicio') return Code2
  if (tipo === 'leitura') return BookOpen
  return GraduationCap
}

function dificuldade(nivel: Conteudo['nivel']) {
  if (nivel === 'avancado') return '***'
  if (nivel === 'intermediario') return '**'
  return '*'
}

function corEtapa(index: number) {
  return ['step-blue', 'step-green', 'step-yellow', 'step-pink'][index % 4]
}

function materialDaAula(aula: Conteudo) {
  const material = materiaisLogica[aula.id]
  const termosBusca = encodeURIComponent(`${aula.titulo} programação aula`)

  if (aula.materialCompleto?.length) {
    return {
      materia: aula.descricao || `Material completo de ${aula.titulo}`,
      conteudoCompleto: aula.materialCompleto,
      videoTitulo: aula.videoTitulo || `Vídeo: ${aula.titulo}`,
      videoUrl: aula.videoUrl || `https://www.youtube.com/results?search_query=${termosBusca}`,
      pdfTitulo: aula.pdfTitulo || `PDF: ${aula.titulo}`,
      pdfUrl: aula.pdfUrl || `https://www.google.com/search?q=${termosBusca}+pdf`,
    }
  }

  if (material) {
    return {
      ...material,
      videoUrl: material.videoUrl || `https://www.youtube.com/results?search_query=${termosBusca}`,
      pdfUrl: material.pdfUrl || `https://www.google.com/search?q=${termosBusca}+pdf`,
    }
  }

  return {
    materia: `${aula.descricao} A materia completa aprofunda o conceito, mostra quando usar, principais cuidados e um roteiro de prática para fixar o aprendizado antes do quiz.`,
    conteudoCompleto: [
      `${aula.titulo} e uma etapa pensada para conectar teoria e prática. O objetivo principal e compreender o conceito, reconhecer onde ele aparece em problemas reais e aplicar esse conhecimento com segurança.`,
      `${aula.descricao} Antes de tentar resolver exercícios, observe os termos principais do tema e tente explicar com suas palavras o que cada um significa. Essa leitura inicial ajuda a identificar o que a pergunta realmente está cobrando.`,
      'Na prática, estude em três momentos: primeiro leia o conceito, depois observe um exemplo resolvido e por fim tente alterar pequenas partes do exemplo para prever o resultado. Essa estratégia ajuda a transformar memorização em entendimento.',
      'Ao finalizar o material, volte para o exemplo interativo, teste possibilidades e responda o quiz rápido. A etapa so deve ser concluída quando você conseguir acertar pelo menos 75%, indicando que o conteúdo foi bem fixado.',
    ],
    videoTitulo: `Vídeo: ${aula.titulo}`,
    videoUrl: `https://www.youtube.com/results?search_query=${termosBusca}`,
    pdfTitulo: `PDF: resumo de ${aula.titulo}`,
    pdfUrl: `https://www.google.com/search?q=${termosBusca}+pdf`,
  }
}

function valorInicialExemplo(aula: Conteudo) {
  if (aula.id === 'algoritmos-base') return 'Ana'
  if (aula.id === 'variaveis-operadores') return '20,3'
  if (aula.id === 'condicionais') return '16'
  if (aula.id === 'lacos-repeticao') return '10'
  if (aula.id === 'funcoes-modularizacao') return '70,70,70'
  if (aula.id === 'dados-informacao') return 'Joana,21'
  if (aula.id === 'tipos-dados') return 'Notebook,3500.90'
  if (aula.id === 'organizacao-dados') return 'Ana,Carlos,Maria'
  if (aula.id === 'fluxo-dados') return '10,20'
  if (aula.id === 'desafio-cadastro-alunos') return 'Joana,21,75'
  if (aula.id === 'web-introducao') return 'Ola Mundo'
  if (aula.id === 'html-estrutura') return 'Loja Virtual,Bem-vindo ao sistema'
  if (aula.id === 'css-estilizacao') return 'Meu Site,purple,40'
  if (aula.id === 'javascript-interatividade') return 'Ola usuario!'
  if (aula.id === 'desafio-primeira-pagina') return 'Minha Pagina,Texto alterado!'
  if (aula.exemploCodigo || aula.exemploExplicacao) return `${aula.titulo},3`
  return '16'
}

function exemploDaAula(aula: Conteudo, valor: string) {
  if (aula.exemploCodigo || aula.exemploExplicacao) {
    const [focoTexto, prioridadeTexto] = valor.split(',')
    const foco = focoTexto?.trim() || aula.titulo
    const prioridade = Math.max(1, Math.min(Number(prioridadeTexto?.trim()) || 3, 5))
    const acao = prioridade >= 3 ? 'praticar agora' : 'revisar conceito'
    const codigoBase = aula.exemploCodigo || `const foco = "${foco}";\nconst prioridade = ${prioridade};\nconst acao = prioridade >= 3 ? "praticar agora" : "revisar conceito";\nconsole.log(\`${foco}: ${acao}\`);`
    const codigo = codigoBase
      .replace(/const foco = ".*?";/, `const foco = "${foco}";`)
      .replace(/const prioridade = \d+;/, `const prioridade = ${prioridade};`)

    return {
      aprovado: prioridade >= 3,
      codigo,
      explicacao: `${aula.exemploExplicacao || `Este exemplo conecta o tema ${aula.titulo} com uma situacao simples de estudo.`} Teste uma palavra-chave e uma prioridade de 1 a 5 para ver a recomendacao mudar.`,
      resultado: `${foco}: ${acao}`,
      rotulo: 'Digite foco e prioridade (1 a 5)',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.exemploCodigo || aula.exemploExplicacao) {
    const entrada = valor.trim() || aula.titulo

    return {
      aprovado: true,
      codigo: aula.exemploCodigo || `const tema = "${entrada}";\nconsole.log(tema);`,
      explicacao: aula.exemploExplicacao || `Este exemplo conecta o tema ${aula.titulo} com uma situação simples de estudo.`,
      resultado: entrada,
      rotulo: 'Teste uma palavra-chave',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'algoritmos-base') {
    const nome = valor.trim() || 'Ana'
    return {
      aprovado: true,
      codigo: `string nome = "${nome}";\n\nConsole.WriteLine("Olá, " + nome);`,
      explicacao: 'A variável nome armazena um texto. Depois, o Console.WriteLine exibe a mensagem usando esse valor.',
      resultado: `Olá, ${nome}`,
      rotulo: 'Troque o nome',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'variaveis-operadores') {
    const [numero1Texto, numero2Texto] = valor.split(',')
    const numero1 = Number(numero1Texto) || 0
    const numero2 = Number(numero2Texto) || 0

    return {
      aprovado: true,
      codigo: `int numero1 = ${numero1};\nint numero2 = ${numero2};\n\nint resultado = numero1 + numero2;\n\nConsole.WriteLine(resultado);`,
      explicacao: 'O programa soma os dois valores armazenados nas variáveis e mostra o resultado.',
      resultado: String(numero1 + numero2),
      rotulo: 'Digite dois números separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'condicionais') {
    const idade = Number(valor) || 0

    return {
      aprovado: idade >= 18,
      codigo: `int idade = ${idade};\n\nif (idade >= 18)\n{\n    Console.WriteLine("Maior de idade");\n}\nelse\n{\n    Console.WriteLine("Menor de idade");\n}`,
      explicacao: 'O if verifica se a idade e maior ou igual a 18. Se for falso, o programa executa o bloco else.',
      resultado: idade >= 18 ? 'Maior de idade' : 'Menor de idade',
      rotulo: 'Teste uma idade',
      tipoEntrada: 'number' as const,
    }
  }

  if (aula.id === 'lacos-repeticao') {
    const limite = Math.max(1, Math.min(Number(valor) || 10, 100))
    const resultado = Array.from({ length: limite }, (_, index) => index + 1).join(' ')

    return {
      aprovado: true,
      codigo: `for(int i = 1; i <= ${limite}; i++)\n{\n    Console.WriteLine(i);\n}`,
      explicacao: 'O programa começa no número 1 e repete até chegar ao limite escolhido. A cada repetição, i aumenta. (límite do exemplo 100)',
      resultado,
      rotulo: 'Até qual número o for deve contar?',
      tipoEntrada: 'number' as const,
    }
  }

  if (aula.id === 'funcoes-modularizacao') {
    const notas = valor.split(',').map((nota) => Number(nota.trim())).filter((nota) => !Number.isNaN(nota))
    const lista = notas.length ? notas : [70, 70, 70]
    const soma = lista.reduce((total, nota) => total + nota, 0)
    const media = Math.round(soma / lista.length)
    const aprovados = lista.filter((nota) => nota >= 60).length
    const reprovados = lista.length - aprovados

    return {
      aprovado: media >= 60,
      codigo: `int quantidade = ${lista.length};\nint soma = 0;\n\nfor(int i = 1; i <= quantidade; i++)\n{\n    int nota = ${lista[0]};\n    soma += nota;\n}\n\ndouble media = soma / quantidade;\nConsole.WriteLine(media);`,
      explicacao: 'O desafio junta variáveis, operadores, condicionáis e repetição para análisar notas de uma turma.',
      resultado: `Media ${media} - ${aprovados} aprovados - ${reprovados} reprovados`,
      rotulo: 'Digite notas separadas por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'dados-informacao') {
    const [nomeTexto, idadeTexto] = valor.split(',')
    const nome = nomeTexto?.trim() || 'Joana'
    const idade = Number(idadeTexto?.trim()) || 21

    return {
      aprovado: true,
      codigo: `string nome = "${nome}";\nint idade = ${idade};\n\nConsole.WriteLine(nome);\nConsole.WriteLine(idade);`,
      explicacao: 'O sistema armazena dois dados: um texto e um número. Depois, essas informações são exibidas na tela.',
      resultado: `${nome}\n${idade}`,
      rotulo: 'Digite nome e idade separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'tipos-dados') {
    const [produtoTexto, precoTexto] = valor.split(',')
    const produto = produtoTexto?.trim() || 'Notebook'
    const preco = Number(precoTexto?.trim()) || 3500.90

    return {
      aprovado: true,
      codigo: `string produto = "${produto}";\ndouble preco = ${preco.toFixed(2)};\n\nConsole.WriteLine(produto);\nConsole.WriteLine(preco);`,
      explicacao: 'O exemplo usa string para texto e double para número decimal, mostrando como cada tipo guarda um formato diferente de dado.',
      resultado: `${produto}\n${preco.toFixed(2)}`,
      rotulo: 'Digite produto e preço separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'organizacao-dados') {
    const nomes = valor.split(',').map((nome) => nome.trim()).filter(Boolean)
    const lista = nomes.length ? nomes : ['Ana', 'Carlos', 'Maria']

    return {
      aprovado: true,
      codigo: `string[] nomes = { ${lista.map((nome) => `"${nome}"`).join(', ')} };\n\nConsole.WriteLine(nomes[0]);`,
      explicacao: 'O vetor organiza vários nomes em uma unica estrutura. A posição 0 representa o primeiro elemento da lista.',
      resultado: lista[0],
      rotulo: 'Digite nomes separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'fluxo-dados') {
    const [numero1Texto, numero2Texto] = valor.split(',')
    const numero1 = Number(numero1Texto?.trim()) || 0
    const numero2 = Number(numero2Texto?.trim()) || 0
    const soma = numero1 + numero2

    return {
      aprovado: true,
      codigo: `int numero1 = ${numero1};\nint numero2 = ${numero2};\n\nint soma = numero1 + numero2;\n\nConsole.WriteLine(soma);`,
      explicacao: 'Os números representam a entrada, a soma representa o processamento e o Console.WriteLine mostra a saída.',
      resultado: String(soma),
      rotulo: 'Digite dois números separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'desafio-cadastro-alunos') {
    const [nomeTexto, idadeTexto, notaTexto] = valor.split(',')
    const nome = nomeTexto?.trim() || 'Joana'
    const idade = Number(idadeTexto?.trim()) || 21
    const nota = Number(notaTexto?.trim()) || 75
    const situacao = nota >= 60 ? 'Aprovado' : 'Reprovado'

    return {
      aprovado: nota >= 60,
      codigo: `string nome = "${nome}";\nint idade = ${idade};\ndouble nota = ${nota};\n\nif(nota >= 60)\n{\n    Console.WriteLine("Aprovado");\n}\nelse\n{\n    Console.WriteLine("Reprovado");\n}`,
      explicacao: 'O desafio junta tipos de dados, variáveis, entrada, saída e condicional para decidir a situação final do aluno.',
      resultado: `${nome} - ${idade} anos - nota ${nota} - ${situacao}`,
      rotulo: 'Digite nome, idade e nota separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'web-introducao') {
    const titulo = valor.trim() || 'Olá Mundo'

    return {
      aprovado: true,
      codigo: `<h1>${titulo}</h1>\n<button>Clique aqui</button>`,
      explicacao: 'O HTML cria elementos visuais na página. A tag h1 cria um titulo e button cria um botão clicável.',
      resultado: `Titulo: ${titulo}\nBotao: Clique aqui`,
      rotulo: 'Troque o título da página',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'html-estrutura') {
    const [tituloTexto, paragrafoTexto] = valor.split(',')
    const titulo = tituloTexto?.trim() || 'Loja Virtual'
    const paragrafo = paragrafoTexto?.trim() || 'Bem-vindo ao sistema'

    return {
      aprovado: true,
      codigo: `<h1>${titulo}</h1>\n<p>${paragrafo}</p>\n<button>Comprar</button>`,
      explicacao: 'O código cria uma estrutura simples com título, texto e botão, que são elementos comuns em páginas web.',
      resultado: `${titulo}\n${paragrafo}\n[Comprar]`,
      rotulo: 'Digite título e parágrafo separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'css-estilizacao') {
    const [tituloTexto, corTexto, tamanhoTexto] = valor.split(',')
    const titulo = tituloTexto?.trim() || 'Meu Site'
    const cor = corTexto?.trim() || 'purple'
    const tamanho = Number(tamanhoTexto?.trim()) || 40

    return {
      aprovado: true,
      codigo: `<h1 class="titulo">${titulo}</h1>\n\n.titulo{\n   color: ${cor};\n   font-size: ${tamanho}px;\n}`,
      explicacao: 'O CSS altera a cor e o tamanho do título usando a classe título.',
      resultado: `${titulo} - cor ${cor} - fonte ${tamanho}px`,
      rotulo: 'Digite título, cor e tamanho separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'javascript-interatividade') {
    const mensagem = valor.trim() || 'Olá usuário!'

    return {
      aprovado: true,
      codigo: `<button onclick="mensagem()">Clique</button>\n\nfunction mensagem(){\n   alert("${mensagem}");\n}`,
      explicacao: 'Quando o botão e clicado, a função mensagem e executada e exibe um alerta para o usuário.',
      resultado: `Alerta: ${mensagem}`,
      rotulo: 'Digite a mensagem do alerta',
      tipoEntrada: 'text' as const,
    }
  }

  if (aula.id === 'desafio-primeira-pagina') {
    const [tituloInicialTexto, tituloFinalTexto] = valor.split(',')
    const tituloInicial = tituloInicialTexto?.trim() || 'Minha Página'
    const tituloFinal = tituloFinalTexto?.trim() || 'Texto alterado!'

    return {
      aprovado: true,
      codigo: `<h1 id="titulo">${tituloInicial}</h1>\n\n<button onclick="alterarTexto()">Clique aqui</button>\n\nh1{\n   color: blue;\n}\n\nfunction alterarTexto(){\n   document.getElementById("titulo").innerText = "${tituloFinal}";\n}`,
      explicacao: 'O desafio junta HTML para estrutura, CSS para visual e JavaScript para alterar o texto quando o botão e clicado.',
      resultado: `Antes: ${tituloInicial}\nDepois do clique: ${tituloFinal}`,
      rotulo: 'Digite título inicial e texto final separados por vírgula',
      tipoEntrada: 'text' as const,
    }
  }

  return exemploDaAula({ ...aula, id: 'condicionais' }, valor)
}

function quizDaAula(aula: Conteudo): PerguntaRapida[] {
  if (aula.quizRapido?.length) {
    return aula.quizRapido.slice(0, 4).map((questao) => ({
      enunciado: questao.enunciado,
      alternativas: questao.alternativas,
      correta: questao.correta,
    }))
  }

  return quizzesLogica[aula.id] || [
    {
      enunciado: 'Para liberar a próxima etapa, você precisa:',
      alternativas: ['Abrir o menu', 'Apenas ler o título', 'Concluir com pelo menos 75%', 'Trocar a trilha'],
      correta: 2,
    },
    {
      enunciado: 'Se você acertar 3 de 4 perguntas, o resultado da aula será:',
      alternativas: ['Reprovada', 'Concluída', 'Bloqueada', 'Zerada'],
      correta: 1,
    },
    {
      enunciado: 'O material ajuda principalmente a:',
      alternativas: ['Pular conteúdo', 'Entender antes de praticar', 'Apagar progresso', 'Bloquear etapa'],
      correta: 1,
    },
    {
      enunciado: 'A prática interativa serve para:',
      alternativas: ['Testar possibilidades', 'Sair do sistema', 'Mudar de perfil', 'Ignorar o quiz'],
      correta: 0,
    },
  ]
}

const materiaisLogica: Record<string, {
  materia: string
  conteudoCompleto: string[]
  videoTitulo: string
  videoUrl: string
  pdfTitulo: string
  pdfUrl: string
}> = {
  'algoritmos-base': {
    materia: 'Introdução aos algoritmos e resolução de problemas',
    conteudoCompleto: [
      'Algoritmos e pensamento computacional representam a base da programação. Antes mesmo de aprender uma linguagem específica, e importante desenvolver a capacidade de analisar problemas e pensar em soluções organizadas.',
      'Um algoritmo e uma sequência lógica de passos utilizada para resolver um problema ou executar uma tarefa. No cotidiano, utilizamos algoritmos constantemente sem perceber. Quando seguimos uma receita de bolo, um tutorial de montagem ou até mesmo o caminho para chegar em algum lugar, estamos executando uma sequência organizada de ações.',
      'Na computação, os algoritmos são utilizados para orientar o computador sobre exatamente o que deve ser feito. Como computadores não possuem interpretação humana, cada passo precisa ser descrito de forma clara e objetiva.',
      'O pensamento computacional ajuda justamente nisso: decompor problemas complexos em pequenas partes mais simples. Em vez de tentar resolver tudo de uma vez, o problema e dividido em etapas menores, facilitando o entendimento e a construção da solução.',
      'Outro ponto importante e reconhecer padrões. Muitos problemas possuem estruturas parecidas, então aprender a identificar padrões ajuda a reutilizar soluções já conhecidas. Além disso, o pensamento computacional também envolve abstração, ou seja, focar apenas nas informações realmente importantes para resolver o problema.',
      'Por exemplo, imagine um sistema de cadastro de alunos. Antes de programar, e necessário pensar: quais dados serão armazenados, como o usuário irá preencher essas informações, se o sistema deve validar algum dado e o que acontece se um campo ficar vazio.',
      'Na programação, algoritmos podem ser representados em linguagem natural, fluxogramas, pseudocódigo ou código em linguagem de programação.',
      'Exemplo simples em linguagem natural: ler a idade do usuario, verificar se a idade e maior ou igual a 18 e mostrar Maior de idade ou Menor de idade. Perceba que existe uma sequência logica e organizada.',
      'Aprender algoritmos e importante porque praticamente todo software funciona baseado em lógica. Jogos, aplicativos, sites, sistemas bancários e redes sociais utilizam algoritmos constantemente para processar informações e tomar decisões.',
    ],
    videoTitulo: 'Vídeo: O que são algoritmos e pensamento computacional?',
    videoUrl: '',
    pdfTitulo: 'PDF: Introdução aos algoritmos',
    pdfUrl: '',
  },
  'variaveis-operadores': {
    materia: 'Guardando informações e realizando operações',
    conteudoCompleto: [
      'As variáveis são utilizadas para armazenar informações dentro de um programa. Elas funcionam como pequenas caixas onde valores podem ser guardados temporariamente enquanto o sistema está sendo executado.',
      'Esses valores podem ser numeros inteiros, números decimais, textos ou valores verdadeiros e falsos. Cada variável possui um nome e um tipo.',
      'Exemplo: int idade = 20. Nesse caso, int representa o tipo inteiro, idade e o nome da variável e 20 e o valor armazenado.',
      'Outro exemplo e string nome = "Joana". Aqui temos uma variável do tipo texto.',
      'As variáveis são importantes porque permitem que o programa trabalhe com informações dinaâmicas. Em vez de deixar valores fixos no código, o sistema pode armazenar dados digitados pelo usuário.',
      'Além das variáveis, os operadores permitem manipular esses valores. Os operadores matemáticos são + para soma, - para subtração, * para multiplicação e / para divisão.',
      'Também existem operadores relacionais, como ==, !=, >, <, >= e <=. Eles são usados para comparações.',
      'Os operadores lógicos permitem combinar condições: && significa E, || significa OU e ! significa NAO.',
      'Esses conceitos aparecem constantemente em login de usuários, cálculo de notas, sistemas financeiros, jogos e aplicativos de cadastro. Dominar variáveis e operadores e fundamental para continuar aprendendo programação.',
    ],
    videoTitulo: 'Vídeo: Variáveis, tipos de dados e operadores',
    videoUrl: '',
    pdfTitulo: 'PDF: Variáveis e operadores',
    pdfUrl: '',
  },
  condicionais: {
    materia: 'Controlando decisões no programa',
    conteudoCompleto: [
      'As estruturas condicionais permitem que o programa tome decisões de acordo com determinadas condições.',
      'Em muitos sistemas, nem sempre o mesmo caminho será executado. O comportamento depende das informações fornecidas pelo usuário ou dos dados processados pelo sistema.',
      'Podemos usar condicionais para verificar se um usuário pode acessar o sistema, conferir se uma nota foi suficiente para aprovação, validar uma compra ou determinar se um cliente e maior de idade.',
      'Para isso utilizamos estruturas como if, else e else if. O if significa se.',
      'Exemplo: if (idade >= 18) { Console.WriteLine("Maior de idade"); }. Nesse caso, a mensagem só será exibida se a condição for verdadeira.',
      'O else representa o caminho contrário. Se a condição do if for falsa, o bloco else sera executado.',
      'Também existe o else if, utilizado para múltiplas condições, como aprovado, recuperação ou reprovado dependendo da nota.',
      'As condicionais tornam o sistema inteligente, permitindo respostas diferentes dependendo da situação.',
      'Essas estruturas são extremamente utilizadas em sistemas bancários, aplicativos, jogos, sistemas de login e plataformas educacionais.',
    ],
    videoTitulo: 'Vídeo: Estruturas condicionais com if, else e else if',
    videoUrl: '',
    pdfTitulo: 'PDF: Condicionais',
    pdfUrl: '',
  },
  'lacos-repeticao': {
    materia: 'Automatizando tarefas repetitivas',
    conteudoCompleto: [
      'Os laços de repetição são estruturas utilizadas para executar um bloco de código várias vezes. Em vez de escrever o mesmo comando repetidamente, podemos utilizar repetições para automatizar processos.',
      'Essas estruturas são extremamente importantes porque muitos programas precisam realizar tarefas repetitivas constantemente.',
      'Exemplos do dia a dia incluem mostrar uma lista de produtos, contar números, processar vários alunos, ler informações digitadas pelo usuário e exibir mensagens repetidas.',
      'Sem os laços de repetição, seria necessário escrever o mesmo código diversas vezes, deixando o sistema maior, mais difícil de manter e mais sujeito a erros.',
      'As principais estruturas de repetição são for, while e do while.',
      'O for e geralmente utilizado quando sabemos exatamente quantas vezes a repetição acontecera. Exemplo: for(int i = 1; i <= 5; i++) { Console.WriteLine(i); }.',
      'O while executa enquanto a condicao for verdadeira. Ele e muito utilizado quando não sabemos exatamente quantas repetições serão necessárias.',
      'O do while garante que o código execute pelo menos uma vez, mesmo que a condição seja falsa depois.',
      'Os laços aparecem em jogos, sistemas financeiros, redes sociais, aplicativos de mensagens e plataformas de estudo.',
      'E necessário tomar cuidado para não criar loops infinitos. Isso acontece quando a condição nunca fica falsa.',
    ],
    videoTitulo: 'Vídeo: Estruturas de repetição com for, while e do while',
    videoUrl: '',
    pdfTitulo: 'PDF: Laços de repetição',
    pdfUrl: '',
  },
  'funcoes-modularizacao': {
    materia: 'Desafio Final - Controle de notas da turma',
    conteudoCompleto: [
      'Agora que você aprendeu variáveis, operadores, condicionais e repetições, chegou o momento de juntar todos esses conceitos em um único exercício.',
      'Imagine que você precisa criar um sistema simples para analisar as notas de uma turma.',
      'O programa deve perguntar quantas notas serão digitadas, ler todas as notas usando repetição, calcular a média da turma e mostrar a média final, a quantidade de aprovados e a quantidade de reprovados.',
      'Considere aprovado quando a nota for maior ou igual a 60. Reprovado ocorre quando a nota for menor que 60.',
      'Exemplo inicial: int quantidade = 3; int soma = 0; for(int i = 1; i <= quantidade; i++) { int nota = 70; soma += nota; } Console.WriteLine(soma);',
      'Nesse exemplo, o laco for executa várias vezes, cada repetição representa uma nota e a variável soma acumula os valores.',
      'Depois disso, a média pode ser calculada com double média = soma / quantidade.',
      'Esse desafio une a lógica central da trilha: guardar informações, operar valores, repetir a leitura de dados e tomar decisões com condicionais.',
    ],
    videoTitulo: 'Vídeo: Desafio de notas com repetição e condicionais',
    videoUrl: '',
    pdfTitulo: 'PDF: Desafio controle de notas',
    pdfUrl: '',
  },
  'dados-informacao': {
    materia: 'Entendendo o que são dados e informações',
    conteudoCompleto: [
      'Os dados estão presentes em praticamente tudo ao nosso redor. Quando utilizamos redes sociais, aplicativos bancários, sistemas escolares ou até jogos, estamos constantemente criando, armazenando e utilizando dados.',
      'Na computação, dados representam valores brutos que ainda não possuem um significado completo. Eles podem ser números, textos, imagens, datas ou qualquer informação registrada digitalmente.',
      'Exemplos de dados incluem nome de uma pessoa, idade, CPF, nota de um aluno e valor de uma compra.',
      'Quando esses dados sao organizados e interpretados, eles se transformam em informação. Dado: 75. Informação: o aluno foi aprovado com nota 75.',
      'Os sistemas utilizam dados constantemente para armazenar cadastros, controlar vendas, registrar acessos, gerenciar usuários e criar relatórios.',
      'Imagine um aplicativo de delivery. Ele precisa armazenar nome do cliente, endereço, produtos pedidos, valor da compra e status da entrega.',
      'Outro ponto fundamental e entender que os dados precisam ser organizados corretamente. Quando existe muita informação desorganizada, torna-se difícil encontrar ou analisar o que realmente importa.',
      'E por isso que áreas como banco de dados e ciência de dados são tão importantes atualmente.',
      'Empresas utilizam dados para entender clientes, melhorar produtos, fazer previsões, identificar padrões e tomar decisões.',
      'Hoje os dados são considerados extremamente valiosos, sendo chamados de o novo petróleo digital.',
    ],
    videoTitulo: 'Vídeo: O que são dados e informações?',
    videoUrl: '',
    pdfTitulo: 'PDF: Dados e informações',
    pdfUrl: '',
  },
  'tipos-dados': {
    materia: 'Conhecendo os principais tipos de dados',
    conteudoCompleto: [
      'Os programas precisam armazenar diferentes tipos de informações. Algumas representam números, outras textos, datas ou valores lógicos.',
      'Por isso existem os tipos de dados. Cada tipo define o que pode ser armazenado, como o valor será utilizado e quanto espaço será ocupado na memória.',
      'Inteiros, representados por int, armazenam números sem casas decimais. Exemplo: int idade = 20.',
      'Decimais, representados por double, armazenam números com casas decimais. Exemplo: double altura = 1.75.',
      'Texto, representado por string, armazena palavras, frases e caracteres. Exemplo: string nome = "Carlos".',
      'Booleano, representado por bool, armazena apenas true ou false, sendo muito utilizado em verificações.',
      'Imagine um sistema bancário: nome usa string, saldo usa double, idade usa int e conta ativa usa bool.',
      'Cada informação precisa utilizar o tipo correto. Se utilizarmos tipos inadequados, podem ocorrer erros, falhas no sistema e resultados incorretos.',
      'Escolher corretamente o tipo de dado e uma das bases do desenvolvimento de software.',
    ],
    videoTitulo: 'Vídeo: Tipos de dados na programação',
    videoUrl: '',
    pdfTitulo: 'PDF: Tipos de dados',
    pdfUrl: '',
  },
  'organizacao-dados': {
    materia: 'Organizando dados de forma eficiente',
    conteudoCompleto: [
      'Conforme os sistemas crescem, a quantidade de dados também aumenta. Por isso e necessário organizar essas informações corretamente.',
      'A estruturação de dados permite facilitar buscas, melhorar desempenho, evitar duplicidade e organizar informações relacionadas.',
      'Um exemplo simples e uma tabela de alunos com ID, nome e nota. Essa organização facilita encontrar informações, atualizar registros e gerar relatórios.',
      'Em programação, também utilizamos estruturas como vetores, listas, matrizes e objetos.',
      'Exemplo de vetor: int[] notas = {70, 80, 90}. O vetor permite armazenar vários valores do mesmo tipo em uma única variável.',
      'Estruturar dados corretamente e essencial para bancos de dados, sistemas empresariais, jogos, aplicativos e inteligência artificial.',
      'Quando os dados estão bem-organizados, o sistema consegue consultar, comparar, atualizar e analisar informações com muito mais facilidade.',
    ],
    videoTitulo: 'Vídeo: Organização e estruturação de dados',
    videoUrl: '',
    pdfTitulo: 'PDF: Estruturacao de dados',
    pdfUrl: '',
  },
  'fluxo-dados': {
    materia: 'O fluxo das informações no sistema',
    conteudoCompleto: [
      'Todo sistema funciona baseado em três etapas principais: entrada de dados, processamento e saída de dados.',
      'Entrada e o momento em que o sistema recebe informações, como usuário digitando login, cadastro de produtos ou informações de formulário.',
      'Exemplo de entrada: string nome = Console.ReadLine().',
      'Processamento e quando o sistema analisa e manipula os dados recebidos. Exemplo: int soma = 10 + 5.',
      'Saida e a exibição do resultado para o usuário. Exemplo: Console.WriteLine("Resultado").',
      'Imagine um sistema de notas: a entrada e a nota digitada, o processamento calcula a média e a saída mostra aprovado ou reprovado.',
      'Esse fluxo aparece em praticamente qualquer software existente, de aplicativos simples a sistemas empresariais complexos.',
    ],
    videoTitulo: 'Vídeo: Entrada, processamento e saída de dados',
    videoUrl: '',
    pdfTitulo: 'PDF: Fluxo de dados',
    pdfUrl: '',
  },
  'desafio-cadastro-alunos': {
    materia: 'Desafio Final - Cadastro inteligente de alunos',
    conteudoCompleto: [
      'Agora você irá juntar todos os conceitos aprendidos na trilha.',
      'Crie um sistema simples que receba o nome do aluno, receba a idade, receba a nota final e informe nome, idade, nota e situação final.',
      'Considere que nota maior ou igual a 60 significa aprovado, enquanto nota menor que 60 significa reprovado.',
      'Exemplo inicial: string nome = "Joana"; int idade = 21; double nota = 75; if(nota >= 60) { Console.WriteLine("Aprovado"); } else { Console.WriteLine("Reprovado"); }',
      'Nesse desafio você utilizara tipos de dados, variáveis, entrada e saída, condicionais e organização de informações.',
      'Esse e um exemplo muito próximo de sistemas reais utilizados em escolas e plataformas educacionais.',
    ],
    videoTitulo: 'Vídeo: Desafio de cadastro de alunos',
    videoUrl: '',
    pdfTitulo: 'PDF: Desafio cadastro inteligente',
    pdfUrl: '',
  },
  'web-introducao': {
    materia: 'Como funcionam os sites e aplicações web',
    conteudoCompleto: [
      'O desenvolvimento web e a área responsável pela criação de sites, sistemas online e aplicações acessadas através da internet.',
      'Hoje praticamente tudo utiliza tecnologias web: redes sociais, sistemas bancários, plataformas de estudo, lojas virtuais, aplicativos de delivery e streaming de vídeos.',
      'Quando acessamos um site, várias tecnologias trabalham juntas para exibir as informações corretamente.',
      'O desenvolvimento web normalmente e dividido em duas áreas principais: front-end e back-end.',
      'O front-end representa a parte visual do sistema, ou seja, aquilo que o usuário vê e interage, como botões, menus, formulários, cards, telas e animações.',
      'As principais tecnologias utilizadas no front-end são HTML, CSS e JavaScript.',
      'O back-end representa a parte responsável pelas regras de negócio e processamento das informações, como cadastro de usuários, login, banco de dados, pagamentos, APIs e validações.',
      'Quando o usuário acessa um site, o navegador faz uma requisição, o servidor processa o pedido, o sistema retorna os dados e o navegador exibe a página.',
      'HTML estrutura a página, CSS define estilo e aparência, e JavaScript cria interatividade e comportamento.',
      'O desenvolvimento web está presente em Netflix, YouTube, Instagram, sistemas escolares e plataformas empresariais.',
    ],
    videoTitulo: 'Vídeo: Introdução ao desenvolvimento web',
    videoUrl: '',
    pdfTitulo: 'PDF: Introdução ao desenvolvimento web',
    pdfUrl: '',
  },
  'html-estrutura': {
    materia: 'Criando estruturas de páginas web',
    conteudoCompleto: [
      'O HTML, HyperText Markup Language, e a linguagem utilizada para estruturar páginas web.',
      'Ele define títulos, textos, botões, imagens, links, formulários e listas.',
      'O HTML funciona através de tags. Por exemplo, <h1>Título</h1> representa um título principal.',
      'Toda página HTML possui uma estrutura inicial com doctype, html, head, title e body.',
      'Tags de título como h1 e h2 organizam a hierarquia do conteúdo.',
      'A tag p cria parágrafos, button cria botões, img exibe imagens e a cria links.',
      'O HTML e essencial porque organiza o conteúdo, define estrutura, permite acessibilidade e facilita navegação.',
      'Sem HTML, páginas web nao existiriam visualmente da forma que conhecemos.',
    ],
    videoTitulo: 'Vídeo: Estruturando páginas com HTML',
    videoUrl: '',
    pdfTitulo: 'PDF: Estruturação com HTML',
    pdfUrl: '',
  },
  'css-estilizacao': {
    materia: 'Melhorando o visual das páginas',
    conteudoCompleto: [
      'O CSS, Cascading Style Sheets, e utilizado para estilizar páginas web.',
      'Com ele e possível alterar cores, mudar tamanhos, criar animações, organizar layouts e adicionar responsividade.',
      'Sem CSS, os sites seriam extremamente simples visualmente.',
      'Um exemplo básico e h1 { color: blue; }, que deixa o título azul.',
      'Também podemos estilizar botões com background-color, color, bordas e espaçamentos.',
      'O CSS permite centralizar elementos, criar grids, trabalhar com flexbox e ajustar espancamentos.',
      'Hoje os sites precisam funcionar em computadores, celulares e tablets. O CSS ajuda a adaptar a interface para diferentes tamanhos de tela.',
      'Empresas utilizam CSS para melhorar experiencia do usuário, criar interfaces modernas e tornar sistemas mais intuitivos.',
    ],
    videoTitulo: 'Vídeo: Introdução ao CSS',
    videoUrl: '',
    pdfTitulo: 'PDF: Estilização com CSS',
    pdfUrl: '',
  },
  'javascript-interatividade': {
    materia: 'Tornando páginas dinâmicas',
    conteudoCompleto: [
      'O JavaScript e a linguagem responsável pela interatividade das páginas web.',
      'Com JavaScript podemos detectar cliques, alterar elementos, criar animações, validar formulários, consumir APIs e atualizar informações em tempo real.',
      'Hoje praticamente todo site moderno utiliza JavaScript.',
      'Um exemplo simples e alert("Olá usuário!"), que faz o navegador exibir uma mensagem na tela.',
      'Eventos representam ações do usuário, como clique, digitação, scroll e movimento do mouse.',
      'O JavaScript consegue modificar a página dinamicamente, por exemplo alterando o texto de um elemento pelo id.',
      'JavaScript está presente em redes sociais, jogos online, dashboards, sistemas empresariais e plataformas de streaming.',
      'Frameworks populares como React, Vue e Angular usam JavaScript como base para construir interfaces modernas.',
    ],
    videoTitulo: 'Vídeo: Introdução ao JavaScript',
    videoUrl: '',
    pdfTitulo: 'PDF: JavaScript e interatividade',
    pdfUrl: '',
  },
  'desafio-primeira-página': {
    materia: 'Desafio Final - Criando sua primeira página web',
    conteudoCompleto: [
      'Agora voce devera criar uma página simples utilizando HTML, CSS e JavaScript.',
      'A pagina deve conter um título, um botão, um texto estilizado e uma interação ao clicar no botão.',
      'Exemplo inicial: <h1 id="título">Minha Página</h1> e um botão chamando a função alterar Texto.',
      'No CSS, o h1 pode receber color: blue para mudar a aparência visual.',
      'No JavaScript, a função alterarTexto pode usar document.getElementById("titulo").innerText = "Texto alterado!".',
      'Nesse desafio voce utiliza HTML para estrutura, CSS para visual e JavaScript para interatividade.',
      'Esses três conceitos formam a base do desenvolvimento web moderno.',
    ],
    videoTitulo: 'Vídeo: Desafio primeira página web',
    videoUrl: '',
    pdfTitulo: 'PDF: Desafio primeira página web',
    pdfUrl: '',
  },
}

const quizzesLogica: Record<string, PerguntaRapida[]> = {
  'algoritmos-base': [
    { enunciado: 'O que é um algoritmo?', alternativas: ['Um tipo de monitor', 'Uma linguagem visual', 'Uma sequência lógica de passos', 'Um navegador'], correta: 2 },
    { enunciado: 'O pensamento computacional ajuda a:', alternativas: ['Trocar peças do computador', 'Formatar o sistema', 'Resolver problemas de forma organizada', 'Aumentar memória RAM'], correta: 2 },
    { enunciado: 'Qual destes e um exemplo de algoritmo?', alternativas: ['Uma imagem', 'Um teclado', 'Uma receita de bolo', 'Um mouse'], correta: 2 },
    { enunciado: 'O computador executa:', alternativas: ['O que o programador imaginou', 'O que parece correto', 'Exatamente o que foi programado', 'Apenas comandos visuais'], correta: 2 },
  ],
  'variaveis-operadores': [
    { enunciado: 'Uma variável serve para:', alternativas: ['Criar internet', 'Mostrar imagens', 'Armazenar informações', 'Desligar o computador'], correta: 2 },
    { enunciado: 'Qual operador representa multiplicação?', alternativas: ['*', '/', '+', '-'], correta: 0 },
    { enunciado: 'O tipo string armazena:', alternativas: ['Valores booleanos', 'Números inteiros', 'Textos', 'Operadores'], correta: 2 },
    { enunciado: 'Qual operador significa maior ou igual?', alternativas: ['<=', '==', '<', '>='], correta: 3 },
  ],
  condicionais: [
    { enunciado: 'O if serve para:', alternativas: ['Repetir código', 'Criar variáveis', 'Verificar condições', 'Fechar o programa'], correta: 2 },
    { enunciado: 'O else executa quando:', alternativas: ['A condição e verdadeira', 'O sistema trava', 'A condição e falsa', 'O programa inicia'], correta: 2 },
    { enunciado: 'Qual estrutura permite múltiplas verificações?', alternativas: ['while', 'for', 'Console', 'else if'], correta: 3 },
    { enunciado: 'Qual será o resultado para nota = 70?', alternativas: ['Recuperação', 'Reprovado', 'Aprovado', 'Nenhum resultado'], correta: 2 },
  ],
  'lacos-repeticao': [
    { enunciado: 'O for e utilizado para:', alternativas: ['Criar imagens', 'Declarar classes', 'Repetir ações', 'Encerrar o sistema'], correta: 2 },
    { enunciado: 'O while executa:', alternativas: ['Apenas uma vez', 'Apenas com números', 'Enquanto a condição for verdadeira', 'Apenas em jogos'], correta: 2 },
    { enunciado: 'Qual estrutura garante pelo menos uma execução?', alternativas: ['if', 'for', 'do while', 'else'], correta: 2 },
    { enunciado: 'O que pode causar um loop infinito?', alternativas: ['Muitas variáveis', 'Poucos operadores', 'Uma condição que nunca fica falsa', 'Um texto muito grande'], correta: 2 },
  ],
  'funcoes-modularizacao': [
    { enunciado: 'Qual estrutura e mais indicada para ler várias notas?', alternativas: ['if', 'else', 'for', 'string'], correta: 2 },
    { enunciado: 'O operador += serve para:', alternativas: ['Subtrair valores', 'Comparar números', 'Somar e armazenar', 'Dividir números'], correta: 2 },
    { enunciado: 'Se a média for 75:', alternativas: ['Reprovado', 'Recuperação', 'Aprovado', 'Sem resultado'], correta: 2 },
    { enunciado: 'Qual conceito e utilizado para decidir aprovado ou reprovado?', alternativas: ['Repetição', 'Variável', 'Operador matemático', 'Condicional if'], correta: 3 },
  ],
  'dados-informacao': [
    { enunciado: 'O que é um dado?', alternativas: ['Um computador', 'Uma linguagem', 'Um valor armazenado', 'Um monitor'], correta: 2 },
    { enunciado: 'Informação e:', alternativas: ['Um erro do sistema', 'Apenas números', 'Dados interpretados com contexto', 'Um aplicativo'], correta: 2 },
    { enunciado: 'Qual destes e um dado?', alternativas: ['Aprovação final', 'Sistema operacional', 'Nome de um usuário', 'Internet'], correta: 2 },
    { enunciado: 'Os dados são utilizados para:', alternativas: ['Apenas jogos', 'Apenas redes sociais', 'Diversos sistemas e aplicações', 'Apenas aplicativos bancários'], correta: 2 },
  ],
  'tipos-dados': [
    { enunciado: 'O tipo int armazena:', alternativas: ['Textos', 'Valores lógicos', 'Números inteiros', 'Datas'], correta: 2 },
    { enunciado: 'O tipo string e utilizado para:', alternativas: ['Operadores', 'Comparações', 'Textos', 'Loops'], correta: 2 },
    { enunciado: 'Qual tipo armazena verdadeiro ou falso?', alternativas: ['int', 'double', 'string', 'bool'], correta: 3 },
    { enunciado: 'Qual tipo seria ideal para armazenar altura?', alternativas: ['bool', 'string', 'int', 'double'], correta: 3 },
  ],
  'organizacao-dados': [
    { enunciado: 'Estruturar dados ajuda a:', alternativas: ['Diminuir internet', 'Criar imagens', 'Organizar informações', 'Desligar o computador'], correta: 2 },
    { enunciado: 'Vetores armazenam:', alternativas: ['Apenas imagens', 'Apenas textos', 'Vários valores', 'Apenas números'], correta: 2 },
    { enunciado: 'Qual posição representa o primeiro elemento?', alternativas: ['1', '2', '0', '10'], correta: 2 },
    { enunciado: 'Dados organizados facilitam:', alternativas: ['Erros', 'Lentidão', 'Buscas e analises', 'Falhas no sistema'], correta: 2 },
  ],
  'fluxo-dados': [
    { enunciado: 'A entrada de dados representa:', alternativas: ['Mostrar resultado', 'Encerrar sistema', 'Receber informações', 'Limpar memoria'], correta: 2 },
    { enunciado: 'O processamento:', alternativas: ['Apenas exibe dados', 'Apenas ler dados', 'Manipula informações', 'Fecha programas'], correta: 2 },
    { enunciado: 'A saída de dados:', alternativas: ['Remove arquivos', 'Reinicia o sistema', 'Exibe resultados', 'Instala programas'], correta: 2 },
    { enunciado: 'Qual etapa calcula informações?', alternativas: ['Entrada', 'Saida', 'Processamento', 'Instalação'], correta: 2 },
  ],
  'desafio-cadastro-alunos': [
    { enunciado: 'Qual tipo e ideal para armazenar nome?', alternativas: ['int', 'bool', 'double', 'string'], correta: 3 },
    { enunciado: 'Qual estrutura decide aprovado ou reprovado?', alternativas: ['for', 'while', 'vetor', 'if/else'], correta: 3 },
    { enunciado: 'A nota 80 representa:', alternativas: ['Reprovado', 'Sem resultado', 'Aprovado', 'Erro'], correta: 2 },
    { enunciado: 'Qual etapa mostra o resultado ao usuário?', alternativas: ['Entrada', 'Processamento', 'Variável', 'Saida de dados'], correta: 3 },
  ],
  'web-introducao': [
    { enunciado: 'O front-end representa:', alternativas: ['Banco de dados', 'Servidor', 'Parte visual do sistema', 'Hospedagem'], correta: 2 },
    { enunciado: 'O back-end e responsável por:', alternativas: ['Apenas cores', 'Apenas imagens', 'Regras e processamento', 'Apenas animações'], correta: 2 },
    { enunciado: 'Qual tecnologia estrutura páginas web?', alternativas: ['CSS', 'JavaScript', 'HTML', 'SQL'], correta: 2 },
    { enunciado: 'O CSS e utilizado para:', alternativas: ['Banco de dados', 'Logica do servidor', 'Estilização visual', 'Hospedagem'], correta: 2 },
  ],
  'html-estrutura': [
    { enunciado: 'O HTML serve para:', alternativas: ['Estilizar páginas', 'Processar banco de dados', 'Estruturar páginas web', 'Criar APIs'], correta: 2 },
    { enunciado: 'Qual tag cria um botão?', alternativas: ['<p>', '<h1>', '<img>', '<button>'], correta: 3 },
    { enunciado: 'Qual tag cria links?', alternativas: ['<text>', '<nav>', '<img>', '<a>'], correta: 3 },
    { enunciado: 'O <p> representa:', alternativas: ['Imagem', 'Botão', 'Paragrafo', 'Formulário'], correta: 2 },
  ],
  'css-estilizacao': [
    { enunciado: 'O CSS e utilizado para:', alternativas: ['Criar banco de dados', 'Processar APIs', 'Estilizar páginas', 'Hospedar sites'], correta: 2 },
    { enunciado: 'Qual propriedade altera cor do texto?', alternativas: ['width', 'padding', 'margin', 'color'], correta: 3 },
    { enunciado: 'O CSS ajuda na:', alternativas: ['Exclusão do HTML', 'Instalação de sistemas', 'Responsividade', 'Criação de servidores'], correta: 2 },
    { enunciado: 'Qual propriedade altera tamanho do texto?', alternativas: ['border', 'display', 'color', 'font-size'], correta: 3 },
  ],
  'javascript-interatividade': [
    { enunciado: 'O JavaScript e utilizado para:', alternativas: ['Hospedar sites', 'Criar banco de dados', 'Tornar páginas interativas', 'Criar sistemas operacionais'], correta: 2 },
    { enunciado: 'Eventos representam:', alternativas: ['Tipos de CSS', 'Estruturas HTML', 'Ações do usuário', 'Bancos de dados'], correta: 2 },
    { enunciado: 'Qual evento detecta clique?', alternativas: ['hover', 'load', 'scroll', 'click'], correta: 3 },
    { enunciado: 'Framework muito utilizado com JavaScript:', alternativas: ['SQL', 'MySQL', 'Docker', 'React'], correta: 3 },
  ],
  'desafio-primeira-pagina': [
    { enunciado: 'O HTML e responsável por:', alternativas: ['Estilo', 'Logica do servidor', 'Estrutura da página', 'Banco de dados'], correta: 2 },
    { enunciado: 'O CSS altera:', alternativas: ['Servidores', 'APIs', 'Aparência visual', 'Hospedagem'], correta: 2 },
    { enunciado: 'O JavaScript adiciona:', alternativas: ['Banco de dados', 'Hospedagem', 'Estruturas SQL', 'Interatividade'], correta: 3 },
    { enunciado: 'Qual tecnologia executa ações ao clicar em botões?', alternativas: ['HTML', 'CSS', 'Bootstrap', 'JavaScript'], correta: 3 },
  ],
}
