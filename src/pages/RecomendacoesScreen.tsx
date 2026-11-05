import { useEffect, useState } from 'react'
import { BookOpen, Bot, CalendarClock, ChevronLeft, ChevronRight, Crown, Flame, Gift, Heart, Lock, Medal, MessageCircle, ShieldCheck, Sparkles, Star, Sword, Target, X, Zap } from 'lucide-react'
import { imagemCartaColecionavel } from '../data/cardImages'
import { CartaColecionavel, cartasColecionaveis } from '../data/cartasColecionaveis'
import { gerarExplicacaoIa } from '../services/aiApi'
import { abrirBauDiario, buscarEstadoUsuario, comprarCartaUsuario } from '../services/userStateApi'
import { userStorageKey } from '../storage'
import { BauConquista, ExplicacaoIa, Recomendacao, Tela, Usuario } from '../types'
import { CardMissionStatus, cartaExigeCompra, cartaEstaDesbloqueada, cartaGanhaAutomaticamente } from '../utils/cardRules'

type ModalState =
  | { tipo: 'mentor' }
  | { tipo: 'missao'; titulo: string; desc: string; xp: number; detalhe: string; acao: string }
  | { tipo: 'bau'; recompensa: BauConquista }
  | { tipo: 'carta'; carta: CartaColecionavel }
  | { tipo: 'boss' }
  | null

const bossPerguntas = [
  {
    conceito: 'if',
    pergunta: 'Qual estrutura executa um bloco apenas quando uma condição e verdadeira?',
    alternativas: ['while', 'if', 'array', 'function'],
    correta: 1,
  },
  {
    conceito: 'for',
    pergunta: 'Qual laço costuma ser usado quando sabemos a quantidade de repetições?',
    alternativas: ['for', 'switch', 'if', 'return'],
    correta: 0,
  },
  {
    conceito: 'array',
    pergunta: 'Qual estrutura armazena vários valores em uma única variável indexada?',
    alternativas: ['boolean', 'array', 'if', 'comentario'],
    correta: 1,
  },
  {
    conceito: 'function',
    pergunta: 'O que ajuda a reutilizar um bloco de código com nome proprio?',
    alternativas: ['variavel solta', 'erro', 'function', 'tag'],
    correta: 2,
  },
  {
    conceito: 'O(log n)',
    pergunta: 'Qual e a complexidade média da busca binaria em um array ordenado?',
    alternativas: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
    correta: 2,
  },
]

export function RecomendacoesScreen({
  dailyMissions,
  alterarXp,
  marcarBossDerrotado,
  marcarBossPerdido,
  registrarAtividade,
  recomendacao,
  setTela,
  usuario,
  xp,
  cartasUsuario,
  sincronizarEstadoUsuario,
  mostrarCartaFeedback,
}: {
  dailyMissions: CardMissionStatus
  alterarXp: (valor: number) => void
  marcarBossDerrotado: () => void
  marcarBossPerdido: () => void
  registrarAtividade: (titulo: string, detalhe: string, tipo: 'trilha' | 'quiz' | 'recompensa' | 'carta' | 'boss') => void
  recomendacao: Recomendacao | null
  setTela: (tela: Tela) => void
  usuario: Usuario
  xp: number
  cartasUsuario: string[]
  sincronizarEstadoUsuario: () => Promise<void>
  mostrarCartaFeedback: (carta: CartaColecionavel, tipo: 'conquistada' | 'desbloqueada') => void
}) {
  const [modal, setModal] = useState<ModalState>(null)
  const [bossIndex, setBossIndex] = useState(0)
  const [bossHp, setBossHp] = useState(100)
  const [bossVidas, setBossVidas] = useState(3)
  const [bossEscolha, setBossEscolha] = useState<number | null>(null)
  const [bossResultado, setBossResultado] = useState<'jogando' | 'venceu' | 'perdeu'>('jogando')
  const [bossHit, setBossHit] = useState(false)
  const [bossShake, setBossShake] = useState(false)
  const [bossClicks, setBossClicks] = useState(0)
  const [bossExplodindo, setBossExplodindo] = useState(false)
  const [bossRindo, setBossRindo] = useState(false)
  const [diagnosticoIa, setDiagnosticoIa] = useState<ExplicacaoIa | null>(null)
  const [diagnosticoLoading, setDiagnosticoLoading] = useState(false)
  const [cartasConquistadas, setCartasConquistadas] = useState<string[]>(() => carregarCartasConquistadas(usuario.id))
  const [xpCartas, setXpCartas] = useState(() => carregarXpCartas(usuario.id, xp))
  const [cartaAtiva, setCartaAtiva] = useState(() => carregarCartaDoDia(usuario.id, cartasColecionaveis.length))
  const [bauAbertoHoje, setBauAbertoHoje] = useState(() => carregarStatusBauDiario(usuario.id))
  const nome = usuario.nome.split(' ')[0] || 'estudante'
  const perguntaBoss = bossPerguntas[bossIndex]
  const etapasMeta = 5
  const comboMeta = 5
  const estudanteCompleto = dailyMissions.etapasTrilha >= etapasMeta
  const comboCompleto = dailyMissions.quizzesPerfeitos >= comboMeta
  const bossCompleto = dailyMissions.bossDerrotado
  const bossPerdido = dailyMissions.bossPerdido
  const cartaModal = modal?.tipo === 'carta' ? modal.carta : null
  const cartaComprada = cartaModal ? cartasConquistadas.includes(cartaModal.id) : false
  const cartaModalDesbloqueada = cartaModal ? cartaEstaDesbloqueada(cartaModal, dailyMissions, bauAbertoHoje) : false
  const cartaModalGanhaSemCompra = cartaModal ? cartaGanhaAutomaticamente(cartaModal, dailyMissions) : false
  const cartasVisiveis = Array.from({ length: 4 }).map((_, index) => {
    const cartaIndex = (cartaAtiva + index) % cartasColecionaveis.length
    return cartasColecionaveis[cartaIndex]
  })

  const focoRecomendado = recomendacao?.conteudos?.[0]?.titulo || definirFocoPadrao(dailyMissions)
  const diagnosticoPadrao = montarDiagnosticoPadrao({
    foco: focoRecomendado,
    etapas: dailyMissions.etapasTrilha,
    quizzesPerfeitos: dailyMissions.quizzesPerfeitos,
    bossDerrotado: dailyMissions.bossDerrotado,
    bossPerdido: dailyMissions.bossPerdido,
    recomendacao: recomendacao?.mensagem,
  })

  useEffect(() => {
    setCartasConquistadas(cartasUsuario)
    setXpCartas(xp)
    setBauAbertoHoje(Boolean(dailyMissions.bauAberto))
  }, [cartasUsuario, dailyMissions.bauAberto, xp])

  useEffect(() => {
    buscarEstadoUsuario(usuario.id)
      .then((estado) => {
        setCartasConquistadas(estado.cartas)
        setXpCartas(estado.xp)
        setBauAbertoHoje(Boolean(estado.missaoDiaria.bauAberto))
      })
      .catch(() => setXpCartas(xp))
  }, [usuario.id, xp])

  const abrirBau = async () => {
    if (bauAbertoHoje) return

    const estado = await abrirBauDiario(usuario.id)
    const recompensa = estado.conquistasBau[0]
    setBauAbertoHoje(true)
    await sincronizarEstadoUsuario()
    setModal({ tipo: 'bau', recompensa })
  }

  const abrirDiagnosticoIa = async () => {
    setModal({ tipo: 'mentor' })

    if (diagnosticoIa || diagnosticoLoading) return

    try {
      setDiagnosticoLoading(true)
      const explicacao = await gerarExplicacaoIa({
        tituloConteudo: 'Diagnostico de estudos do aluno',
        tema: 'Missões diárias, trilhas e quizzes gamificados',
        nivel: 'iniciante',
        pergunta: [
          `Nome do aluno: ${nome}.`,
          `Foco recomendado: ${focoRecomendado}.`,
          `Etapas de trilha feitas na quinzena: ${dailyMissions.etapasTrilha}/5.`,
          `Quizzes perfeitos feitos na semana: ${dailyMissions.quizzesPerfeitos}/5.`,
          `Boss diário: ${dailyMissions.bossDerrotado ? 'derrotado' : dailyMissions.bossPerdido ? 'perdido' : 'pendente'}.`,
          recomendacao?.mensagem ? `Mensagem adaptativa atual: ${recomendacao.mensagem}.` : '',
          'Diga em texto direto o que o aluno precisa melhorar, por onde deve começar agora e qual ação curta executar em seguida. Não sugira cartas colecionaveis.',
        ].filter(Boolean).join(' '),
      })
      setDiagnosticoIa(explicacao)
    } catch (error) {
      setDiagnosticoIa({
        usouIA: false,
        explicacao: error instanceof Error ? error.message : diagnosticoPadrao,
      })
    } finally {
      setDiagnosticoLoading(false)
    }
  }

  const abrirBoss = () => {
    if (bossCompleto || bossPerdido) return

    setBossIndex(0)
    setBossHp(100)
    setBossVidas(3)
    setBossEscolha(null)
    setBossResultado('jogando')
    setBossHit(false)
    setBossShake(false)
    setBossClicks(0)
    setBossExplodindo(false)
    setBossRindo(false)
    setModal({ tipo: 'boss' })
  }

  const encerrarBossPerdido = () => {
    setBossResultado('perdeu')
    setBossRindo(true)
    setBossShake(true)

    window.setTimeout(() => {
      marcarBossPerdido()
      setBossShake(false)
      setBossRindo(false)
      setModal(null)
    }, 1900)
  }

  const responderBoss = (indice: number) => {
    if (bossResultado !== 'jogando' || bossEscolha !== null) return

    setBossEscolha(indice)
    const acertou = indice === perguntaBoss.correta

    if (acertou) {
      const novoHp = Math.max(0, bossHp - 20)
      setBossHp(novoHp)
      setBossHit(true)
      window.setTimeout(() => setBossHit(false), 450)

      window.setTimeout(() => {
        if (novoHp <= 20) {
          setBossResultado('venceu')
          return
        }

        if (bossIndex === bossPerguntas.length - 1) {
          encerrarBossPerdido()
          return
        }

        setBossIndex((atual) => atual + 1)
        setBossEscolha(null)
      }, 650)
      return
    }

    const novasVidas = bossVidas - 1
    setBossVidas(novasVidas)
    setBossShake(true)
    window.setTimeout(() => setBossShake(false), 430)

    window.setTimeout(() => {
      if (novasVidas <= 0) {
        encerrarBossPerdido()
        return
      }

      if (bossIndex < bossPerguntas.length - 1) {
        setBossIndex((atual) => atual + 1)
      } else {
        encerrarBossPerdido()
        return
      }
      setBossEscolha(null)
    }, 650)
  }

  const missoes = [
    {
      icon: BookOpen,
      titulo: 'Estudante dedicado',
      desc: 'Complete 5 etapas na quinzena',
      xp: 50,
      progress: Math.min(100, (dailyMissions.etapasTrilha / etapasMeta) * 100),
      count: `${Math.min(dailyMissions.etapasTrilha, etapasMeta)}/${etapasMeta}`,
      detalhe: 'Complete 5 etapas dentro da quinzena. A melhor jogada agora e continuar a trilha ativa.',
      acao: 'Ir para aula recomendada',
      completo: estudanteCompleto,
      onAction: () => setTela('trilhas'),
    },
    {
      icon: Flame,
      titulo: 'Combo de fogo',
      desc: 'Feche 5 quizzes com 100% na semana',
      xp: 80,
      progress: Math.min(100, (dailyMissions.quizzesPerfeitos / comboMeta) * 100),
      count: `${Math.min(dailyMissions.quizzesPerfeitos, comboMeta)}/${comboMeta}`,
      detalhe: 'So contam quizzes perfeitos da semana: 100% de acerto. Cada perfeito aumenta o fogo do combo.',
      acao: 'Treinar combo',
      completo: comboCompleto,
      fire: true,
      onAction: () => setTela('quiz'),
    },
      {
        icon: Target,
        titulo: 'Cacador de bosses',
        desc: bossPerdido ? 'O boss saiu rindo porque venceu hoje. Tente de novo amanha.' : 'Derrote 1 boss esta semana',
        xp: 200,
        progress: bossCompleto ? 100 : 0,
        count: `${bossCompleto ? 1 : 0}/1`,
        detalhe: 'O boss so recebe dano quando voce acerta perguntas. Para vencer, deixe ele com 20 HP ou menos.',
        acao: bossCompleto ? 'Derrotado' : bossPerdido ? 'Perdeu hoje' : 'Enfrentar',
        boss: true,
        perdido: bossPerdido,
        completo: bossCompleto,
        onAction: abrirBoss,
      },
  ]

  function clicarBossFinal() {
    if (bossResultado !== 'venceu') return

    const proximo = bossClicks + 1
    setBossClicks(proximo)
    setBossHit(true)
    window.setTimeout(() => setBossHit(false), 240)

      if (proximo >= 5) {
        setBossExplodindo(true)
        setBossShake(true)
        window.setTimeout(() => {
          marcarBossDerrotado()
          setBossShake(false)
          setModal(null)
          setBossExplodindo(false)
        }, 1500)
      }
  }

  async function comprarCarta(carta: CartaColecionavel) {
    if (cartasConquistadas.includes(carta.id) || xpCartas < carta.custo || !cartaEstaDesbloqueada(carta, dailyMissions, bauAbertoHoje)) return

    mostrarCartaFeedback(carta, 'conquistada')
    const estado = await comprarCartaUsuario(usuario.id, carta.id, carta.custo)
    setCartasConquistadas(estado.cartas)
    setXpCartas(estado.xp)
    await sincronizarEstadoUsuario()
  }

  function trocarCarta(direcao: number) {
    setCartaAtiva((atual) => (atual + direcao + cartasColecionaveis.length) % cartasColecionaveis.length)
  }

  return (
    <section className="screen recommendations-page">
      <header className="recommendations-title">
        <span className="pill">Central de missoes</span>
        <h1>Missões pra você</h1>
        <p>Tudo aqui e montado pela IA com base no seu desempenho. Atualiza todo dia.</p>
      </header>

      <article className="recommendation-mentor" onClick={abrirDiagnosticoIa}>
        <div className="mentor-icon">
          <Bot size={32} />
          <Sparkles size={16} className="mentor-spark" />
        </div>
        <div>
          <span className="mentor-chip"><Sparkles size={13} /> IA Tutor</span>
          <h2>Olá, {nome}</h2>
          <p>{diagnosticoPadrao}</p>
          <div className="mentor-actions">
            <button onClick={(event) => { event.stopPropagation(); abrirDiagnosticoIa() }}><Zap size={15} /> Ver diagnostico</button>
            <button onClick={(event) => event.stopPropagation()}>Mais tarde</button>
          </div>
        </div>
      </article>

      <div className="mission-layout">
        <article className="missions-panel">
          <header>
            <div>
              <span className="mission-chip">Missões</span>
              <h2>Suas missões</h2>
            </div>
            <small><CalendarClock size={14} /> Renova em <strong>12h 34min</strong></small>
          </header>
          {missoes.map((missao) => {
            const Icon = missao.icon

            return (
                <article
                  className={`mission-item ${missao.fire ? 'fire-mission' : ''} ${missao.boss ? 'boss-mission' : ''} ${missao.perdido ? 'lost-mission' : ''} ${missao.completo ? 'completed' : ''}`}
                  key={missao.titulo}
                >
                <div className={`mission-icon ${missao.fire ? 'fire-icon' : ''}`}><Icon size={22} /></div>
                <div>
                  <strong>{missao.titulo}</strong>
                  <p>{missao.desc}</p>
                  <div className="mission-progress-row">
                    <span className="mission-progress"><i style={{ width: `${missao.progress}%` }} /></span>
                    <button
                      className="mission-action"
                        disabled={missao.completo || missao.perdido}
                      onClick={() => missao.boss ? abrirBoss() : missao.onAction()}
                    >
                      {missao.boss ? missao.acao : missao.completo ? 'Feita' : 'Fazer'}
                    </button>
                  </div>
                </div>
                <em><Star size={13} /> +{missao.xp}</em>
                <small>{missao.count}</small>
              </article>
            )
          })}
        </article>

        <article className={`daily-reward ${bauAbertoHoje ? 'inactive' : ''}`}>
          <div className="reward-glints"><Sparkles size={14} /><Sparkles size={12} /></div>
          <span className="mission-chip">Recompensa diaria</span>
          <button className="gift-bubble" aria-label="Abrir bau diario" disabled={bauAbertoHoje} onClick={abrirBau}>
            <Gift size={46} />
          </button>
          <h2>{bauAbertoHoje ? 'Baú do dia ja aberto' : 'Baú do dia disponível!'}</h2>
          <p>{bauAbertoHoje ? 'Volte amanhã para uma nova conquista diária.' : 'Abra 1x por dia para ganhar uma conquista usável.'}</p>
          <button className="open-gift" disabled={bauAbertoHoje} onClick={abrirBau}><Sparkles size={15} /> {bauAbertoHoje ? 'Já aberto' : 'Abrir baú'}</button>
        </article>
      </div>

      <section className="recommended-loot">
        <header>
          <div>
            <span className="loot-chip">Loot do dia</span>
            <h2>Carta do dia</h2>
            <p>Todo dia uma carta aleatória entra em destaque. Navegue para ver outras opções.</p>
          </div>
          <button><Star size={14} /> XP para cartas: {xpCartas}</button>
        </header>
        <div className="daily-card-carousel">
          <button className="carousel-arrow" onClick={() => trocarCarta(-1)} aria-label="Carta anterior">
            <ChevronLeft size={22} />
          </button>
          <div className="daily-card-window">
            {cartasVisiveis.map((carta, index) => {
              const Icon = carta.icon
              const conquistada = cartasConquistadas.includes(carta.id)
              const desbloqueada = cartaEstaDesbloqueada(carta, dailyMissions, bauAbertoHoje)
              const ganhaSemComprar = cartaGanhaAutomaticamente(carta, dailyMissions) || (desbloqueada && !cartaExigeCompra(carta))

              return (
                <article
                  className={`recommended-card mini-card rarity-${carta.raridade} ${conquistada ? 'owned' : ''} ${desbloqueada ? '' : 'locked-card'}`}
                  key={`${carta.id}-${index}`}
                  onClick={() => setModal({ tipo: 'carta', carta })}
                  style={estiloCarta(carta)}
                >
                  <div className={`card-art ${carta.tema} ${conquistada ? 'image-only' : ''}`}>
                    {conquistada ? <img alt={carta.nome} src={imagemCartaColecionavel(carta)} /> : desbloqueada ? <Icon size={38} /> : <LockIcon />}
                  </div>
                  <span className={`rarity-label rarity-${carta.raridade}`}>{carta.raridade}</span>
                  <small>{index === 0 ? 'Carta do dia' : conquistada ? 'Conquistada' : desbloqueada ? 'Disponivel' : 'Bloqueada'}</small>
                  <h3>{carta.nome}</h3>
                  <footer>
                    <strong><Star size={13} /> {carta.custo} XP</strong>
                  </footer>
                  <button onClick={(event) => { event.stopPropagation(); setModal({ tipo: 'carta', carta }) }}>
                    <Sparkles size={15} /> {conquistada || ganhaSemComprar ? 'Recuperar' : desbloqueada ? 'Comprar' : 'Ver missao'}
                  </button>
                </article>
              )
            })}
          </div>
          <button className="carousel-arrow" onClick={() => trocarCarta(1)} aria-label="Proxima carta">
            <ChevronRight size={22} />
          </button>
          <div className="carousel-dots">
            {cartasColecionaveis.map((carta, index) => (
              <button
                aria-label={`Ver ${carta.nome}`}
                className={index === cartaAtiva ? 'active' : ''}
                key={carta.id}
                onClick={() => setCartaAtiva(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {modal && modal.tipo !== 'boss' && (
        <div className="recommendation-modal-overlay" role="dialog" aria-modal="true">
          <article className={`recommendation-modal ${modal.tipo === 'bau' ? 'chest-open-modal' : ''}`}>
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar modal"><X size={20} /></button>

            {modal.tipo === 'mentor' && (
              <>
                <span className="mentor-chip"><MessageCircle size={14} /> IA Tutor</span>
                <h2>O que você precisa melhorar agora</h2>
                <p>{diagnosticoLoading ? 'Analisando seu progresso, missões e recomendações...' : diagnosticoIa?.explicacao || diagnosticoPadrao}</p>
                <div className="mentor-chat">
                  <strong>{nome}, foco recomendado: {focoRecomendado}</strong>
                  <span>{diagnosticoIa?.usouIA ? 'Diagnostico gerado pela IA tutor.' : 'Diagnostico padrão do sistema, baseado nas suas atividades.'}</span>
                </div>
                <div className="modal-actions">
                  <button onClick={() => setTela('trilhas')}><Zap size={16} /> Revisar foco</button>
                  <button onClick={() => setModal(null)}>Agora nao</button>
                </div>
              </>
            )}

            {modal.tipo === 'missao' && (
              <>
                <span className="mission-chip">Missao diaria</span>
                <h2>{modal.titulo}</h2>
                <p>{modal.detalhe}</p>
                <div className="mission-modal-reward">
                  <Star size={18} /> Recompensa ao concluir: +{modal.xp} XP
                </div>
                <div className="modal-actions">
                  <button><ChevronRight size={16} /> {modal.acao}</button>
                  <button onClick={() => setModal(null)}>Voltar</button>
                </div>
              </>
            )}

            {modal.tipo === 'bau' && (
              <>
                <span className="mission-chip">Baú aberto</span>
                <div className="daily-prize"><Gift size={58} /></div>
                <h2>{modal.recompensa.titulo}</h2>
                <p>{modal.recompensa.descricao} Ela foi enviada para Perfil, na área Conquistas baú diário.</p>
                <div className="modal-actions">
                  <button onClick={() => setModal(null)}>Guardar recompensa</button>
                </div>
              </>
            )}

            {modal.tipo === 'carta' && (
              <>
                <span className={`loot-chip rarity-label rarity-${modal.carta.raridade}`}>Carta {modal.carta.raridade}</span>
                  <div className="card-shop-layout">
                    <div className={`card-preview ${modal.carta.tema} rarity-${modal.carta.raridade}`}>
                    <img alt={modal.carta.nome} src={imagemCartaColecionavel(modal.carta)} />
                    <strong>{modal.carta.nome}</strong>
                  </div>
                  <div>
                    <h2>{modal.carta.nome}</h2>
                    <p>{modal.carta.descricao}</p>
                    <div className="card-detail-grid">
                      <span className={`rarity-label rarity-${modal.carta.raridade}`}><Crown size={15} /> {modal.carta.raridade}</span>
                      <span><Star size={15} /> {modal.carta.custo} XP</span>
                      <span><ShieldCheck size={15} /> {cartaComprada || cartaModalGanhaSemCompra ? 'Na colecao' : cartaModalDesbloqueada ? 'Liberada' : 'Bloqueada'}</span>
                    </div>
                    <p className="card-lore">{modal.carta.detalhe}</p>
                    <div className="card-ability-box">
                      <small>Desbloqueio: {modal.carta.desbloqueio}</small>
                    </div>
                  </div>
                </div>
                <section className="achievements-panel">
                  <header>
                    <h3>Conquistas</h3>
                    <span>{cartasConquistadas.length}/{cartasColecionaveis.length} cartas</span>
                  </header>
                  <div className="achievement-cards">
                    {cartasColecionaveis.map((carta) => {
                      const Icon = carta.icon
                      const obtida = cartasConquistadas.includes(carta.id)

                      return (
                        <button
                          className={`achievement-card ${obtida ? 'owned' : 'locked'} rarity-${carta.raridade}`}
                          key={carta.id}
                          onClick={() => setModal({ tipo: 'carta', carta })}
                          style={obtida ? estiloCarta(carta) : undefined}
                        >
                          <Icon size={24} />
                          <strong>{carta.nome}</strong>
                          <span className={obtida ? `rarity-label rarity-${carta.raridade}` : ''}>{obtida ? carta.raridade : 'Bloqueada'}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
                <div className="modal-actions">
                  <button disabled={cartaComprada || cartaModalGanhaSemCompra || xpCartas < modal.carta.custo || !cartaModalDesbloqueada} onClick={() => comprarCarta(modal.carta)}>
                    <Sparkles size={16} /> {cartaComprada || cartaModalGanhaSemCompra ? 'Recuperar' : !cartaModalDesbloqueada ? 'Missao bloqueada' : xpCartas < modal.carta.custo ? 'XP insuficiente' : 'Comprar carta'}
                  </button>
                  <button onClick={() => setModal(null)}>Voltar</button>
                </div>
              </>
            )}
          </article>
        </div>
      )}

      {modal?.tipo === 'boss' && (
        <div className={`recommendation-modal-overlay boss-overlay ${bossShake ? 'shake' : ''}`} role="dialog" aria-modal="true">
          <article className="recommendation-modal boss-modal">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Fechar boss"><X size={20} /></button>
            <span className="boss-chip"><Sword size={14} /> Caçador de bosses</span>
            <h2>Acabe com o boss dos conceitos</h2>
            <p>Acerte 5 conceitos. Cada acerto tira 20 HP. Se errar, perde uma vida.</p>

            <div className="boss-arena">
              <div className="boss-status">
                <span>HP do boss</span>
                <strong>{bossHp}/100</strong>
                <div className="boss-hp"><i style={{ width: `${bossHp}%` }} /></div>
                <div className="boss-lives">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Heart key={index} size={18} fill={index < bossVidas ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>

              <button
                className={`boss-avatar ${bossHit ? 'hit' : ''} ${bossResultado === 'venceu' ? 'finish-click' : ''} ${bossRindo ? 'laughing' : ''} ${bossClicks >= 4 ? 'almost-exploding' : ''} ${bossExplodindo ? 'exploding' : ''}`}
                disabled={bossResultado !== 'venceu'}
                onClick={clicarBossFinal}
                type="button"
              >
                {bossExplodindo && (
                  <div className="boss-explosion" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => <span key={index} />)}
                  </div>
                )}
                <div className="boss-horns" />
                <div>
                  <div className="boss-brows"><i /><i /></div>
                  <div className="boss-eyes"><i /><i /></div>
                </div>
                <div className="boss-mouth" />
              </button>

              <div className="boss-question">
                {bossResultado === 'jogando' ? (
                  <>
                    <small>Pergunta {bossIndex + 1}/5</small>
                    <h3>{perguntaBoss.pergunta}</h3>
                    <div className="boss-options">
                      {perguntaBoss.alternativas.map((alternativa, indice) => {
                        const escolhida = bossEscolha === indice
                        const correta = perguntaBoss.correta === indice
                        return (
                          <button
                            className={`${escolhida ? 'selected' : ''} ${bossEscolha !== null && correta ? 'correct' : ''} ${escolhida && !correta ? 'wrong' : ''}`}
                            key={alternativa}
                            onClick={() => responderBoss(indice)}
                          >
                            {alternativa}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="boss-end">
                    <h3>{bossResultado === 'venceu' ? 'Boss sem defesa!' : 'O boss venceu hoje'}</h3>
                    <p>{bossResultado === 'venceu' ? bossExplodindo ? 'Explosão ativada! Salvando a vitória...' : `Clique no boss mais ${Math.max(0, 5 - bossClicks)} vezes para ele explodir e marcar a missão do dia.` : 'Derrota registrada. Veja o card da missão.'}</p>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      )}

    </section>
  )
}

function carregarCartasConquistadas(usuarioId: string): string[] {
  void usuarioId
  return []
}

function definirFocoPadrao(dailyMissions: CardMissionStatus) {
  if (dailyMissions.etapasTrilha < 5) return 'trilha ativa'
  if (dailyMissions.quizzesPerfeitos < 5) return 'quizzes com 100% de acerto'
  if (!dailyMissions.bossDerrotado) return dailyMissions.bossPerdido ? 'revisão antes do próximo boss' : 'boss diário'
  return 'manter consistência diária'
}

function montarDiagnosticoPadrao({
  foco,
  etapas,
  quizzesPerfeitos,
  bossDerrotado,
  bossPerdido,
  recomendacao,
}: {
  foco: string
  etapas: number
  quizzesPerfeitos: number
  bossDerrotado: boolean
  bossPerdido: boolean
  recomendacao?: string
}) {
  if (recomendacao) return recomendacao

  if (etapas < 5) {
    return `Você parece precisar fortalecer ${foco}. Começe concluindo mais uma etapa da trilha nesta quinzena para manter ritmo e liberar novos conteudos.`
  }

  if (quizzesPerfeitos < 5) {
    return `Seu próximo ponto de melhoria e precisao nos quizzes. Treine ate fechar respostas perfeitas, porque isso mostra dominio real do conteúdo.`
  }

  if (bossPerdido) {
    return 'O boss venceu hoje, então o melhor caminho e revisar os conceitos que apareceram na batalha antes de tentar novamente amanha.'
  }

  if (!bossDerrotado) {
    return `Você ja avançou bem hoje. Agora foque em ${foco}: enfrente o boss para testar se consegue aplicar os conceitos sob pressão.`
  }

  return 'Seu desempenho do dia esta forte. Mantenha a sequência revisando pontos fracos e preparando o proxímo desafio.'
}

function estiloCarta(carta: CartaColecionavel) {
  return {
    ...(carta.corBorda ? { borderColor: carta.corBorda } : {}),
    ...(carta.corSombra ? { boxShadow: `0 7px 0 ${carta.corSombra}` } : {}),
  }
}

function LockIcon() {
  return <Lock size={38} />
}

function carregarXpCartas(usuarioId: string, xpAtual: number) {
  void usuarioId
  return xpAtual
}

function calcularXpDisponivelParaCartas(usuarioId: string, xpAtual: number) {
  return Math.max(0, xpAtual)
}

function carregarCartaDoDia(usuarioId: string, totalCartas: number) {
  const hoje = new Date().toLocaleDateString('en-CA')

  try {
    const salvo = localStorage.getItem(userStorageKey(usuarioId, 'carta-do-dia'))
    const cartaDoDia = salvo ? JSON.parse(salvo) as { data: string; index: number } : null

    if (cartaDoDia?.data === hoje && cartaDoDia.index >= 0 && cartaDoDia.index < totalCartas) {
      return cartaDoDia.index
    }
  } catch {
    // segue para gerar uma carta nova do dia
  }

  const index = Math.floor(Math.random() * totalCartas)
  localStorage.setItem(userStorageKey(usuarioId, 'carta-do-dia'), JSON.stringify({ data: hoje, index }))
  return index
}

function carregarStatusBauDiario(usuarioId: string) {
  void usuarioId
  return false
}

