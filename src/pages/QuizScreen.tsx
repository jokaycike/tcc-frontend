import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  Lock,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { gerarExplicacaoIa } from '../services/aiApi'
import { userStorageKey } from '../storage'
import { Quiz, Trilha, Usuario } from '../types'

type CartaQuiz = Quiz['questoes'][number] & {
  categoria: string
  raridade: 'comum' | 'raro' | 'lendario'
  xp: number
}

type ResultadoEtapa = {
  percentual: number
  respostas: Record<number, number>
  acertos?: number
  xpGanho?: number
}

type RascunhoEtapa = {
  indiceAtual: number
  respostas: Record<number, number>
  atualizadoEm: string
}

type RankingItem = {
  usuarioId: string
  nome: string
  xp: number
}

type UsuarioRanking = Pick<Usuario, 'id' | 'nome'>

type QuizScreenProps = {
  quiz: Quiz | null
  quizTrilhaId: string
  respostas: Record<number, number>
  trilhas: Trilha[]
  setQuizTrilhaId: (id: string) => void
  setRespostas: (respostas: Record<number, number>) => void
  responderQuiz: (respostasOverride?: Record<number, number>, irParaRecomendacoes?: boolean, percentualManual?: number, xpManual?: number, etapaQuiz?: number) => void | Promise<void>
  usuarioId: string
  usuarioNome: string
  xpAtual: number
}

export function QuizScreen({ quiz, quizTrilhaId, respostas, trilhas, setQuizTrilhaId, setRespostas, responderQuiz, usuarioId, usuarioNome, xpAtual }: QuizScreenProps) {
  const cartas = useMemo(() => montarBaralhoQuiz(quiz), [quiz])
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [etapaSelecionada, setEtapaSelecionada] = useState<number | null>(null)
  const [resultadosEtapas, setResultadosEtapas] = useState<Record<number, ResultadoEtapa>>({})
  const [rascunhosEtapas, setRascunhosEtapas] = useState<Record<number, RascunhoEtapa>>({})
  const [modoRevisao, setModoRevisao] = useState(false)
  const [explicacaoAberta, setExplicacaoAberta] = useState(false)
  const [explicacaoTexto, setExplicacaoTexto] = useState('')
  const [explicacaoUsouIa, setExplicacaoUsouIa] = useState(false)
  const [explicacaoLoading, setExplicacaoLoading] = useState(false)
  const [combo, setCombo] = useState(0)
  const [finalizado, setFinalizado] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'acerto' | 'erro'; texto: string } | null>(null)
  const [usuariosRanking, setUsuariosRanking] = useState<UsuarioRanking[]>([])
  const [rankingVersao, setRankingVersao] = useState(0)
  const [resultadosLoading, setResultadosLoading] = useState(true)
  const [usuariosLoading, setUsuariosLoading] = useState(true)
  const cartaAtual = cartas[indiceAtual]
  const temaAtual = trilhas.find((trilha) => trilha.id === quizTrilhaId)?.titulo || quiz?.titulo || 'Tema do quiz'
  const acertos = cartas.reduce((total, carta, index) => total + (respostas[index] === carta.correta ? 1 : 0), 0)
  const erros = cartas.reduce((total, carta, index) => total + (respostas[index] !== undefined && respostas[index] !== carta.correta ? 1 : 0), 0)
  const vidas = Math.max(0, 3 - erros)
  const xpGanho = cartas.reduce((total, carta, index) => total + (respostas[index] === carta.correta ? carta.xp : 0), 0)
  const precisao = cartas.length ? Math.round((acertos / cartas.length) * 100) : 0
  const escolhaAtual = respostas[indiceAtual]

  useEffect(() => {
    let ativo = true

    setEtapaSelecionada(null)
    resetarBatalha()
    setResultadosEtapas({})
    setRascunhosEtapas(quiz?.id ? carregarRascunhosQuiz(usuarioId, quiz.id) : {})

    if (!quiz?.id) {
      setResultadosLoading(false)
      return () => {
        ativo = false
      }
    }

    setResultadosLoading(true)
    if (quiz?.id) {
      api<QuizBattleResultadoApi[]>(`/quizzes/${quiz.id}/resultados?usuarioId=${usuarioId}`)
        .then((resultados) => {
          if (ativo) setResultadosEtapas(mapearResultadosApi(resultados))
        })
        .catch(() => {
          if (ativo) setResultadosEtapas({})
        })
        .finally(() => {
          if (ativo) setResultadosLoading(false)
        })
    }

    return () => {
      ativo = false
    }
  }, [quiz?.id, usuarioId])

  useEffect(() => {
    let ativo = true

    setUsuariosLoading(true)
    api<UsuarioRanking[]>('/usuarios')
      .then((usuarios) => {
        if (ativo) setUsuariosRanking(usuarios)
      })
      .catch(() => {
        if (ativo) setUsuariosRanking([])
      })
      .finally(() => {
        if (ativo) setUsuariosLoading(false)
      })

    return () => {
      ativo = false
    }
  }, [])

  function limparExplicacao() {
    setExplicacaoAberta(false)
    setExplicacaoTexto('')
    setExplicacaoUsouIa(false)
    setExplicacaoLoading(false)
  }

  function resetarBatalha() {
    setIndiceAtual(0)
    setCombo(0)
    setFinalizado(false)
    setFeedback(null)
    setModoRevisao(false)
    limparExplicacao()
    setRespostas({})
  }

  function iniciarEtapa(numero: number) {
    const resultadoSalvo = resultadosEtapas[numero]
    const rascunho = rascunhosEtapas[numero]

    setEtapaSelecionada(numero)
    resetarBatalha()
    if (resultadoSalvo) {
      setModoRevisao(true)
      setRespostas(resultadoSalvo.respostas)
      return
    }

    if (rascunho) {
      setIndiceAtual(Math.min(rascunho.indiceAtual, Math.max(cartas.length - 1, 0)))
      setRespostas(rascunho.respostas)
    }
  }

  function voltarParaEtapas() {
    setEtapaSelecionada(null)
    resetarBatalha()
  }

  function trocarTemaQuiz(id: string) {
    setQuizTrilhaId(id)
    setEtapaSelecionada(null)
    resetarBatalha()
  }

  function salvarResultadoEtapa(respostasFinais: Record<number, number>) {
    if (!quiz || etapaSelecionada === null) return

    const acertosFinais = cartas.reduce((total, carta, index) => total + (respostasFinais[index] === carta.correta ? 1 : 0), 0)
    const percentualFinal = cartas.length ? Math.round((acertosFinais / cartas.length) * 100) : 0
    const xpFinal = cartas.reduce((total, carta, index) => total + (respostasFinais[index] === carta.correta ? carta.xp : 0), 0)
    const novosResultados = {
      ...resultadosEtapas,
      [etapaSelecionada]: {
        acertos: acertosFinais,
        percentual: percentualFinal,
        respostas: respostasFinais,
        xpGanho: xpFinal,
      },
    }

    setResultadosEtapas(novosResultados)
    removerRascunhoEtapa(etapaSelecionada)
  }

  function salvarRascunhoEtapa(indice: number, respostasParciais: Record<number, number>) {
    if (!quiz || etapaSelecionada === null || modoRevisao) return

    const rascunhosAtualizados = {
      ...rascunhosEtapas,
      [etapaSelecionada]: {
        atualizadoEm: new Date().toISOString(),
        indiceAtual: indice,
        respostas: respostasParciais,
      },
    }

    setRascunhosEtapas(rascunhosAtualizados)
    salvarRascunhosQuiz(usuarioId, quiz.id, rascunhosAtualizados)
  }

  function removerRascunhoEtapa(numero: number) {
    if (!quiz) return

    const rascunhosAtualizados = { ...rascunhosEtapas }
    delete rascunhosAtualizados[numero]
    setRascunhosEtapas(rascunhosAtualizados)
    salvarRascunhosQuiz(usuarioId, quiz.id, rascunhosAtualizados)
  }

  async function escolherResposta(alternativaIndex: number) {
    if (!cartaAtual || escolhaAtual !== undefined || finalizado) return

    const acertou = alternativaIndex === cartaAtual.correta
    const novasRespostas = { ...respostas, [indiceAtual]: alternativaIndex }
    const novoCombo = acertou ? combo + 1 : 0
    const novasVidas = acertou ? vidas : Math.max(0, vidas - 1)
    const acertosFinais = cartas.reduce((total, carta, index) => total + (novasRespostas[index] === carta.correta ? 1 : 0), 0)
    const percentualFinal = cartas.length ? Math.round((acertosFinais / cartas.length) * 100) : 0
    const xpFinal = cartas.reduce((total, carta, index) => total + (novasRespostas[index] === carta.correta ? carta.xp : 0), 0)

    setRespostas(novasRespostas)
    setCombo(novoCombo)
    setFeedback({
      tipo: acertou ? 'acerto' : 'erro',
      texto: acertou ? `+${cartaAtual.xp} XP - Carta ${cartaAtual.raridade}!` : 'Errou! Você perdeu uma vida.',
    })

    if (indiceAtual === cartas.length - 1 || novasVidas === 0) {
      salvarResultadoEtapa(novasRespostas)
      setFinalizado(true)
      await responderQuiz(novasRespostas, false, percentualFinal, xpFinal, etapaSelecionada || 1)
      setRankingVersao((versao) => versao + 1)
      return
    }

    salvarRascunhoEtapa(indiceAtual, novasRespostas)
  }

  function proximaCarta() {
    if (indiceAtual < cartas.length - 1) {
      const proximoIndice = indiceAtual + 1
      setIndiceAtual(proximoIndice)
      salvarRascunhoEtapa(proximoIndice, respostas)
      setFeedback(null)
      limparExplicacao()
    } else {
      setFinalizado(true)
    }
  }

  function cartaAnterior() {
    if (indiceAtual > 0) {
      setIndiceAtual((atual) => atual - 1)
      setFeedback(null)
      limparExplicacao()
    }
  }

  function verRankingDaRevisao() {
    setModoRevisao(false)
    setFinalizado(true)
    setFeedback(null)
    limparExplicacao()
  }

  async function alternarExplicacaoResposta() {
    if (!cartaAtual) return

    if (explicacaoAberta) {
      setExplicacaoAberta(false)
      return
    }

    const respostaUsuario = escolhaAtual !== undefined ? cartaAtual.alternativas[escolhaAtual] : undefined
    const fallback = explicarResposta(cartaAtual, respostaUsuario)

    setExplicacaoAberta(true)
    setExplicacaoTexto(fallback)
    setExplicacaoUsouIa(false)
    setExplicacaoLoading(true)

    try {
      const resposta = await gerarExplicacaoIa({
        tituloConteudo: `Quiz Card Battle - ${temaAtual}`,
        tema: temaAtual,
        pergunta: cartaAtual.enunciado,
        respostaUsuario,
        respostaCorreta: cartaAtual.alternativas[cartaAtual.correta],
        nivel: cartaAtual.raridade,
      })
      setExplicacaoTexto(resposta.explicacao || fallback)
      setExplicacaoUsouIa(Boolean(resposta.usouIA))
    } catch {
      setExplicacaoTexto(fallback)
      setExplicacaoUsouIa(false)
    } finally {
      setExplicacaoLoading(false)
    }
  }

  if (!quiz || !cartaAtual) {
    return (
      <section className="screen">
        <article className="panel">
          <span className="pill">Card Battle</span>
          <h2>Quiz Card Battle</h2>
          <p>Selecione uma trilha com quiz para iniciar a batalha.</p>
        </article>
      </section>
    )
  }

  if (etapaSelecionada === null) {
    return (
      <section className="screen quiz-battle-screen">
        <header className="quiz-season-header top-status-quiz">
          <div>
            <span className="battle-pill"><Swords  size={13} /> Card Battle</span>
            <h2>Quiz Card Battle</h2>
            <p>Lanca 10 etapas de 15 em 15 dias, trazendo quizzes gamificados por quinzena.</p>
          </div>
          <label className="quiz-theme-selector">
            <span>Tema do battle</span>
            <select value={quizTrilhaId} onChange={(event) => trocarTemaQuiz(event.target.value)}>
              {trilhas.map((trilha) => (
                <option key={trilha.id} value={trilha.id}>{trilha.titulo}</option>
              ))}
            </select>
          </label>
        </header>

        <article className={`quiz-season-panel ${resultadosLoading || usuariosLoading ? 'soft-loading' : ''}`}>
          {(resultadosLoading || usuariosLoading) && (
            <div className="panel-soft-loader" role="status" aria-live="polite">
              <Sparkles size={18} />
              Atualizando etapas salvas...
            </div>
          )}
          <div className="quiz-theme-current">
            <span className="battle-pill"><Target size={13} /> Tema atual</span>
            <strong>{temaAtual}</strong>
          </div>
          <div className="season-legend">
            <span><i className="not-started" /> Azul: ainda nao feito</span>
            <span><i className="low" /> Vermelho: 0% a 49%</span>
            <span><i className="mid" /> Amarelo: 50% a 79%</span>
            <span><i className="high" /> Verde: 80% a 100%</span>
          </div>
          <div className="season-grid" aria-label="Etapas quinzenais do quiz">
            {Array.from({ length: 10 }).map((_, index) => {
              const etapa = index + 1
              const resultado = resultadosEtapas[etapa]
              const rascunho = rascunhosEtapas[etapa]
              const percentual = resultado?.percentual
              const respostasRascunho = rascunho ? Object.keys(rascunho.respostas).length : 0
              const progressoRascunho = cartas.length ? Math.round((respostasRascunho / cartas.length) * 100) : 0

              return (
                <button className={`season-tile ${classeResultado(percentual)} ${rascunho && percentual === undefined ? 'in-progress' : ''}`} key={etapa} onClick={() => iniciarEtapa(etapa)}>
                  <strong>{etapa}</strong>
                  <span>{percentual === undefined ? rascunho ? `Em andamento ${respostasRascunho}/${cartas.length}` : `Quiz ${etapa}` : `${percentual}% de acerto`}</span>
                  {rascunho && percentual === undefined && (
                    <div className="season-tile-progress" aria-label={`${progressoRascunho}% concluido`}>
                      <i style={{ width: `${progressoRascunho}%` }} />
                    </div>
                  )}
                </button>
              )
            })}
            <button className="season-tile locked" disabled>
              <Lock size={24} />
              <span>Em breve</span>
            </button>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className={`screen quiz-battle-screen ${feedback?.tipo === 'acerto' ? 'celebrating' : ''}`}>
      <article className="battle-header">
        {feedback && (
          <div className={`battle-toast ${feedback.tipo}`}>
            {feedback.tipo === 'acerto' ? <CheckCircle2 size={18} /> : <X size={18} />}
            {feedback.texto}
          </div>
        )}
        <div>
          <button className="battle-back" onClick={voltarParaEtapas}>
            <ChevronRight className="left" size={16} /> Escolher outra etapa
          </button>
          <span className="battle-pill"><Swords size={13} /> Card Battle</span>
          <h2>Quiz Card Battle</h2>
          <p>
            {modoRevisao
              ? `Revisão da etapa ${etapaSelecionada} em ${temaAtual}: veja o que você marcou e qual era a resposta correta.`
              : `Etapa ${etapaSelecionada} de ${temaAtual}. Vire as cartas, escolha sabiamente.`}
          </p>
        </div>
        <div className="battle-stats">
          <strong>{Array.from({ length: 3 }).map((_, index) => <Heart key={index} size={19} className={index < vidas ? 'live' : 'lost'} />)}</strong>
          <strong><Flame size={17} /> Combo {combo}</strong>
          <strong><Star size={17} /> {xpAtual} XP</strong>
        </div>
        <div className="battle-progress" aria-label="Progresso da batalha">
          {cartas.map((carta, index) => {
            const respondida = respostas[index] !== undefined
            const acertou = respostas[index] === carta.correta
            return <span className={index === indiceAtual ? 'active' : respondida ? acertou ? 'right' : 'wrong' : ''} key={carta.id} />
          })}
        </div>
      </article>

      {feedback?.tipo === 'acerto' && (
        <div className="confetti-rain" aria-hidden="true">
          {Array.from({ length: 42 }).map((_, index) => (
            <span
              key={index}
              style={{
                '--x': `${(index * 19) % 100}%`,
                '--delay': `${(index % 9) * 35}ms`,
                '--drift': `${(index % 2 === 0 ? 1 : -1) * (18 + (index % 7) * 8)}px`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      {!finalizado && !modoRevisao ? (
        <>
          <article className={`battle-card ${cartaAtual.raridade === 'lendario' ? 'legendary' : ''}`}>
            <header>
              <div className={`card-rarity ${cartaAtual.raridade}`}>
                {cartaAtual.raridade === 'lendario' ? <Crown size={22} /> : cartaAtual.raridade === 'raro' ? <Zap size={22} /> : <Sparkles size={22} />}
              </div>
              <div>
                <span>{cartaAtual.raridade} - {cartaAtual.categoria}</span>
                <strong>+{cartaAtual.xp} XP</strong>
              </div>
              <em>Carta {indiceAtual + 1}/{cartas.length}</em>
            </header>
            <h3>{cartaAtual.enunciado}</h3>
            <div className="battle-options">
              {cartaAtual.alternativas.map((alternativa, alternativaIndex) => {
                const respondida = escolhaAtual !== undefined
                const correta = alternativaIndex === cartaAtual.correta
                const escolhida = escolhaAtual === alternativaIndex
                const classe = respondida && correta ? 'correct' : respondida && escolhida ? 'wrong' : ''

                return (
                  <button className={classe} disabled={respondida} key={alternativa} onClick={() => escolherResposta(alternativaIndex)}>
                    <span>{respondida && correta ? <Check size={18} /> : respondida && escolhida ? <X size={18} /> : String.fromCharCode(65 + alternativaIndex)}</span>
                    {alternativa}
                  </button>
                )
              })}
            </div>
            {escolhaAtual !== undefined && (
              <>
                <button className="ai-explain" onClick={alternarExplicacaoResposta}>
                  <Bot size={17} /> IA explica a resposta
                </button>
                {explicacaoAberta && (
                  <div className="ai-explanation">
                    <strong>Resposta certa: {cartaAtual.alternativas[cartaAtual.correta]}</strong>
                    <small>{explicacaoLoading ? 'Gerando explicacao...' : explicacaoUsouIa ? 'Gerado pela IA Tutor' : 'Explicacao padrao do sistema'}</small>
                    <p>{explicacaoLoading ? 'A IA Tutor esta preparando uma explicacao para essa resposta.' : explicacaoTexto || explicarResposta(cartaAtual, escolhaAtual !== undefined ? cartaAtual.alternativas[escolhaAtual] : undefined)}</p>
                  </div>
                )}
              </>
            )}
          </article>

          <div className="battle-nav">
            <button onClick={voltarParaEtapas}><ChevronRight className="left" size={16} /> Etapas</button>
            <span>{indiceAtual + 1} / {cartas.length} - responda para avancar</span>
            <button onClick={proximaCarta} disabled={escolhaAtual === undefined}>
              {indiceAtual === cartas.length - 1 ? 'Finalizar' : 'Proxima'} <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : modoRevisao ? (
        <>
          <article className={`battle-card review ${cartaAtual.raridade === 'lendario' ? 'legendary' : ''}`}>
            <header>
              <div className={`card-rarity ${cartaAtual.raridade}`}>
                {cartaAtual.raridade === 'lendario' ? <Crown size={22} /> : cartaAtual.raridade === 'raro' ? <Zap size={22} /> : <Sparkles size={22} />}
              </div>
              <div>
                <span>{cartaAtual.raridade} - {cartaAtual.categoria}</span>
                <strong>Revisao fixa</strong>
              </div>
              <em>Carta {indiceAtual + 1}/{cartas.length}</em>
            </header>
            <h3>{cartaAtual.enunciado}</h3>
            <div className="battle-options">
              {cartaAtual.alternativas.map((alternativa, alternativaIndex) => {
                const correta = alternativaIndex === cartaAtual.correta
                const escolhida = escolhaAtual === alternativaIndex
                const classe = correta ? 'correct' : escolhida ? 'wrong' : ''

                return (
                  <button className={classe} key={alternativa} disabled>
                    <span>{correta ? <Check size={18} /> : escolhida ? <X size={18} /> : String.fromCharCode(65 + alternativaIndex)}</span>
                    {alternativa}
                  </button>
                )
              })}
            </div>
            <button className="ai-explain" onClick={alternarExplicacaoResposta}>
              <Bot size={17} /> IA explica a resposta
            </button>
            {explicacaoAberta && (
              <div className="ai-explanation">
                <strong>Resposta certa: {cartaAtual.alternativas[cartaAtual.correta]}</strong>
                <small>{explicacaoLoading ? 'Gerando explicacao...' : explicacaoUsouIa ? 'Gerado pela IA Tutor' : 'Explicacao padrao do sistema'}</small>
                <p>{explicacaoLoading ? 'A IA Tutor esta preparando uma explicacao para essa resposta.' : explicacaoTexto || explicarResposta(cartaAtual, escolhaAtual !== undefined ? cartaAtual.alternativas[escolhaAtual] : undefined)}</p>
              </div>
            )}
          </article>

          <div className="battle-nav">
            <button onClick={cartaAnterior} disabled={indiceAtual === 0}><ChevronRight className="left" size={16} /> Anterior</button>
            <span>{indiceAtual + 1} / {cartas.length} - revisao bloqueada para edicao</span>
            <button onClick={indiceAtual === cartas.length - 1 ? verRankingDaRevisao : proximaCarta}>
              {indiceAtual === cartas.length - 1 ? 'Ver ranking' : 'Proxima'} <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <article className="battle-result">
          <div className="result-card">
            <div className="result-trophy"><Trophy size={36} /></div>
            <span>Batalha encerrada</span>
            <h3>{precisao >= 75 ? 'Bom!' : 'Tente novamente'}</h3>
            <div className="result-metrics">
              <strong><Target size={18} /> {acertos}/{cartas.length}<small>Acertos</small></strong>
              <strong><Star size={18} /> {xpGanho}<small>XP ganho</small></strong>
              <strong><Zap size={18} /> {precisao}%<small>Precisao</small></strong>
            </div>
            <p>Vidas restantes: {vidas}/3</p>
          </div>
          <RankingQuiz
            etapaSelecionada={etapaSelecionada}
            quizId={quiz.id}
            usuarioId={usuarioId}
            usuarioNome={usuarioNome}
            versao={rankingVersao}
            usuarios={usuariosRanking}
          />
          <div className="battle-actions">
            <button onClick={voltarParaEtapas}><RotateCcw size={17} /> Jogar nova etapa</button>
            <button onClick={voltarParaEtapas}><Share2 size={17} /> Escolher etapa</button>
          </div>
        </article>
      )}
    </section>
  )
}

function RankingQuiz({
  etapaSelecionada,
  quizId,
  usuarioId,
  usuarioNome,
  versao,
  usuarios,
}: {
  etapaSelecionada: number
  quizId: string
  usuarioId: string
  usuarioNome: string
  versao: number
  usuarios: UsuarioRanking[]
}) {
  const [rankingBanco, setRankingBanco] = useState<RankingItem[]>([])
  const ranking = rankingBanco
  const posicao = ranking.findIndex((item) => item.usuarioId === usuarioId) + 1

  useEffect(() => {
    let ativo = true

    api<RankingItem[]>(`/quizzes/${quizId}/ranking?etapa=${etapaSelecionada}`)
      .then((ranking) => {
        if (ativo) setRankingBanco(ranking)
      })
      .catch(() => {
        if (ativo) setRankingBanco([])
      })

    return () => {
      ativo = false
    }
  }, [etapaSelecionada, quizId, versao])

  return (
    <div className="ranking-card">
      <header>
        <strong><Trophy size={16} /> Ranking semanal</strong>
        <span>Sua posicao: #{posicao || '-'}</span>
      </header>
      {ranking.map((item, index) => (
        <div className={item.usuarioId === usuarioId ? 'me' : ''} key={item.usuarioId}>
          <span>{index + 1}</span>
          <strong>
            {item.usuarioId === usuarioId ? (
              <>
                {item.nome} <small className="ranking-you">Voce</small>
              </>
            ) : item.nome}
          </strong>
          <em>{item.xp} XP</em>
        </div>
      ))}
      {ranking.length === 0 && (
        <p className="ranking-empty">Nenhum usuario cadastrado jogou esta etapa ainda.</p>
      )}
    </div>
  )
}

function montarBaralhoQuiz(quiz: Quiz | null): CartaQuiz[] {
  if (!quiz) return []

  const extrasPorTrilha: Record<string, Quiz['questoes']> = {
    'logica-programacao': [
      {
        id: 'extra-logica-1',
        enunciado: 'Qual operador normalmente representa igualdade em uma condição?',
        alternativas: ['=', '==', '!=', '>='],
        correta: 1,
      },
      {
        id: 'extra-logica-2',
        enunciado: 'Quando usamos uma função, o principal objetivo e:',
        alternativas: ['Repetir código sem organizar', 'Dividir e reutilizar uma solução', 'Apagar variáveis', 'Trocar a cor da tela'],
        correta: 1,
      },
      {
        id: 'boss-logica',
        enunciado: 'BOSS: Qual a complexidade de busca em um array ordenado usando busca binária?',
        alternativas: ['O(n)', 'O(n^2)', 'O(log n)', 'O(1)'],
        correta: 2,
      },
    ],
    'desenvolvimento-web': [
      {
        id: 'extra-web-1',
        enunciado: 'Qual recurso do CSS ajuda a distribuir itens em linhas e colunas?',
        alternativas: ['Grid', 'SQL', 'Token', 'Commit'],
        correta: 0,
      },
      {
        id: 'extra-web-2',
        enunciado: 'Em uma API, uma resposta em JSON costuma representar:',
        alternativas: ['Uma imagem vetorial', 'Dados estruturados', 'Um arquivo de fonte', 'Uma senha salva'],
        correta: 1,
      },
      {
        id: 'boss-web',
        enunciado: 'BOSS: No React, qual hook e usado para guardar estado local?',
        alternativas: ['useRoute', 'useState', 'useClass', 'useTable'],
        correta: 1,
      },
    ],
    'banco-dados-conceitos': [
      {
        id: 'extra-dados-1',
        enunciado: 'Qual indicador mostra quanto da trilha ja foi terminado?',
        alternativas: ['Progresso', 'Senha', 'Endereco IP', 'Fonte'],
        correta: 0,
      },
      {
        id: 'extra-dados-2',
        enunciado: 'Uma recomendação de reforço aparece melhor quando:',
        alternativas: ['O desempenho está baixo', 'Tudo foi concluído', 'Não ha dados', 'A tela está vazia'],
        correta: 0,
      },
      {
        id: 'boss-dados',
        enunciado: 'BOSS: Qual dado ajuda mais a adaptar uma trilha de aprendizagem?',
        alternativas: ['Cor favorita', 'Taxa de acerto', 'Tamanho da tela', 'Nome do arquivo'],
        correta: 1,
      },
    ],
  }

  const base = [...quiz.questoes, ...(extrasPorTrilha[quiz.trilhaId] || [])].slice(0, 6)

  return base.map((questao, index) => ({
    ...questao,
    categoria: index === base.length - 1 ? 'boss' : index % 2 === 0 ? 'logica' : 'fluxo',
    raridade: index === base.length - 1 ? 'lendario' : index % 3 === 2 ? 'raro' : 'comum',
    xp: index === base.length - 1 ? 120 : index % 3 === 2 ? 35 : 20,
  }))
}

type QuizBattleResultadoApi = {
  etapa: number
  percentual: number
  respostas: number[]
  acertos: number
  xpGanho: number
}

function mapearResultadosApi(resultados: QuizBattleResultadoApi[]): Record<number, ResultadoEtapa> {
  return Object.fromEntries(resultados.map((resultado) => [
    resultado.etapa,
    {
      acertos: resultado.acertos,
      percentual: resultado.percentual,
      respostas: Object.fromEntries(resultado.respostas.map((resposta, index) => [index, resposta])),
      xpGanho: resultado.xpGanho,
    },
  ]))
}

function carregarRascunhosQuiz(usuarioId: string, quizId: string): Record<number, RascunhoEtapa> {
  try {
    const salvo = localStorage.getItem(userStorageKey(usuarioId, `quiz-rascunhos:${quizId}`))
    return salvo ? JSON.parse(salvo) as Record<number, RascunhoEtapa> : {}
  } catch {
    return {}
  }
}

function salvarRascunhosQuiz(usuarioId: string, quizId: string, rascunhos: Record<number, RascunhoEtapa>) {
  const chave = userStorageKey(usuarioId, `quiz-rascunhos:${quizId}`)

  if (Object.keys(rascunhos).length === 0) {
    localStorage.removeItem(chave)
    return
  }

  localStorage.setItem(chave, JSON.stringify(rascunhos))
}

function classeResultado(resultado?: number) {
  if (resultado === undefined) return 'not-started'
  if (resultado < 50) return 'low'
  if (resultado < 80) return 'mid'
  return 'high'
}

function explicarResposta(carta: CartaQuiz, respostaUsuario?: string) {
  const resposta = carta.alternativas[carta.correta]
  const trechoUsuario = respostaUsuario && respostaUsuario !== resposta ? ` Sua escolha foi "${respostaUsuario}", entao compare as duas ideias com calma.` : ''

  return `A alternativa "${resposta}" resolve melhor a pergunta porque combina diretamente com o conceito cobrado no enunciado.${trechoUsuario} Observe a palavra-chave da pergunta: ela indica o comportamento esperado naquele tipo de problema.`
}
