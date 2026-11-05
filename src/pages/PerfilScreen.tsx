import { Brain, Flame, ShieldCheck, Swords, Target, Trash2, Trophy } from 'lucide-react'
import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { cartasColecionaveis } from '../data/cartasColecionaveis'
import { atualizarConfiguracaoIa, buscarConfiguracaoIa } from '../services/aiApi'
import { userStorageKey } from '../storage'
import { ConquistasScreen } from './ConquistasScreen'
import { BauConquista, BauConquistaTipo, Dashboard, Progresso, Trilha, Usuario } from '../types'

export function PerfilScreen({
  aplicarConquistaBau,
  dailyMissions,
  dashboard,
  progresso,
  limparDadosLocais,
  resetarBancoELocal,
  trilhas,
  usuario,
  xp,
  cartasUsuario,
  conquistasBau,
}: {
  aplicarConquistaBau: (tipo: BauConquistaTipo) => void
  cartasUsuario: string[]
  conquistasBau: BauConquista[]
  dailyMissions: { quizzesPerfeitos: number; bossDerrotado: boolean }
  dashboard: Dashboard | null
  limparDadosLocais: () => void
  resetarBancoELocal: () => void
  progresso: Progresso | null
  trilhas: Trilha[]
  usuario: Usuario
  xp: number
}) {
  const cartasObtidas = cartasUsuario.length || dashboard?.cartas?.length || 0
  const [progressoObjetivo, setProgressoObjetivo] = useState(() => carregarProgressoObjetivo(usuario.id))
  const [iaAtiva, setIaAtiva] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaMensagem, setIaMensagem] = useState('')
  const progressoSistema = calcularProgressoSistema({
    cartasObtidas,
    dailyMissions,
    dashboard,
    progresso,
    trilhas,
    xp,
  })

  function atualizarProgressoObjetivo(valor: number) {
    setProgressoObjetivo(valor)
    localStorage.setItem(userStorageKey(usuario.id, 'progresso-objetivo'), String(valor))
  }

  useEffect(() => {
    let cancelado = false

    buscarConfiguracaoIa()
      .then((configuracao) => {
        if (!cancelado) setIaAtiva(configuracao.iaAtiva)
      })
      .catch(() => {
        if (!cancelado) setIaMensagem('Nao foi possível carregar a configuração de IA agora.')
      })

    return () => {
      cancelado = true
    }
  }, [])

  async function alternarIa() {
    try {
      setIaLoading(true)
      setIaMensagem('')
      const proximoEstado = !iaAtiva
      const configuracao = await atualizarConfiguracaoIa(proximoEstado)
      setIaAtiva(configuracao.iaAtiva)
      setIaMensagem(configuracao.iaAtiva
        ? 'IA ativada. O sistema podera gerar explicações personalizadas.'
        : 'IA desativada. O sistema usara recomendações e explicações padrao.')
    } catch (error) {
      setIaMensagem(error instanceof Error ? error.message : 'Nao foi possível atualizar a IA.')
    } finally {
      setIaLoading(false)
    }
  }

  return (
    <section className="screen">
      <article className="panel badges">
        <section className="profile-goal-card">
          <div className='grid-profile'>
            <div className="profile-goal-icon">
              <Target size={26} />
            </div>
            <div className="profile-goal-content">
              <span className="pill">Objetivo pessoal</span>
              <h2>{usuario.objetivo || 'Aprender tecnologia com trilhas personalizadas'}</h2>
              <p>Arraste a barra para marcar o quanto você sente que esta perto de chegar nesse objetivo.</p>
            </div>
          </div>
          <div className="goal-progress-stack">
              <div className="goal-progress-block user-goal">
                <div className="goal-progress-label">
                  <span>Sua percepção</span>
                  <strong>{progressoObjetivo}%</strong>
                </div>
                <div className="goal-slider-row">
                  <input
                    aria-label="Progresso do objetivo"
                    max="100"
                    min="0"
                    onChange={(event) => atualizarProgressoObjetivo(Number(event.target.value))}
                    style={{ '--goal-progress': `${progressoObjetivo}%` } as CSSProperties}
                    type="range"
                    value={progressoObjetivo}
                  />
                </div>
              </div>
              <div className="goal-progress-block system-goal">
                <div className="goal-progress-label">
                  <span>Leitura do sistema pelas suas atividades</span>
                  <strong>{progressoSistema}%</strong>
                </div>
                <div className="system-goal-bar" style={{ '--system-goal-progress': `${progressoSistema}%` } as CSSProperties}>
                  <i />
                </div>
                <small>{textoProgressoSistema(progressoSistema)}</small>
              </div>
          </div>
        </section>

        <section className={`profile-ai-card ${iaAtiva ? 'active' : ''}`}>
          <div className="profile-ai-icon">
            <Brain size={24} />
          </div>
          <div>
            <span className="pill">IA tutor</span>
            <h3>{iaAtiva ? 'IA ativada' : 'IA desativada'}</h3>
            <p>{iaAtiva ? 'As explicações personalizadas ficam disponíveis nos pontos educacionais.' : 'O sistema contínua usando regras internas, progresso e dados do banco.'}</p>
            {iaMensagem && <small>{iaMensagem}</small>}
          </div>
          <button className={iaAtiva ? 'on' : ''} disabled={iaLoading} onClick={alternarIa} type="button">
            <span />
            {iaLoading ? 'Salvando...' : iaAtiva ? 'Ligada' : 'Desligada'}
          </button>
        </section>

        <h2>Conquistas</h2>
        <div className="dashboard-achievement-grid profile-achievement-grid">
          <DashboardSquare title="XP total" value={`${xp}`} icon={<Trophy size={24} />} />
          <DashboardSquare title="Cartas" value={`${cartasObtidas}/${cartasColecionaveis.length}`} icon={<ShieldCheck size={24} />} />
          <DashboardSquare title="Boss" value={dailyMissions.bossDerrotado ? '1' : '0'} icon={<Swords size={24} />} />
          <DashboardSquare title="Combo perfeito" value={`${dailyMissions.quizzesPerfeitos}/5`} icon={<Flame size={24} />} />
        </div>
        <ConquistasScreen
          aplicarConquistaBau={aplicarConquistaBau}
          cartasIniciais={cartasUsuario}
          conquistasBauIniciais={conquistasBau}
          embedded
          usuarioId={usuario.id}
        />
        <section className="profile-local-clear">
          <div>
            <span className="pill">Dados locais</span>
            <h3>Limpar dados locais</h3>
            <p>Remove cache deste navegador. Progresso, XP, cartas e missões serão carregados novamente do banco.</p>
          </div>
          <button onClick={limparDadosLocais}>
            <Trash2 size={18} />
            Limpar localStorage
          </button>
          <button className="danger-action" onClick={resetarBancoELocal}>
            <Trash2 size={18} />
            Resetar banco e local
          </button>
        </section>
      </article>
    </section>
  )
}

function carregarProgressoObjetivo(usuarioId: string) {
  const salvo = localStorage.getItem(userStorageKey(usuarioId, 'progresso-objetivo'))
  const progresso = Number(salvo)

  if (Number.isNaN(progresso)) {
    return 0
  }

  return Math.min(100, Math.max(0, progresso))
}

function calcularProgressoSistema({
  cartasObtidas,
  dailyMissions,
  dashboard,
  progresso,
  trilhas,
  xp,
}: {
  cartasObtidas: number
  dailyMissions: { quizzesPerfeitos: number; bossDerrotado: boolean }
  dashboard: Dashboard | null
  progresso: Progresso | null
  trilhas: Trilha[]
  xp: number
}) {
  const totalConteudos = dashboard?.totalConteudos || trilhas.reduce((total, trilha) => total + trilha.conteudos.length, 0) || 1
  const concluidos = dashboard?.conteudosConcluidos ?? progresso?.conteudosConcluidos.length ?? 0
  const progressoTrilhas = Math.min(1, concluidos / Math.max(totalConteudos, 1))
  const desempenhoQuiz = Math.min(1, (dashboard?.mediaAcerto ?? 0) / 100)
  const xpNormalizado = Math.min(1, xp / 1000)
  const colecao = Math.min(1, cartasObtidas / Math.max(cartasColecionaveis.length, 1))
  const missoes = Math.min(1, ((dailyMissions.quizzesPerfeitos / 5) + (dailyMissions.bossDerrotado ? 1 : 0)) / 2)

  return Math.round(
    (progressoTrilhas * 40)
    + (desempenhoQuiz * 20)
    + (xpNormalizado * 20)
    + (colecao * 10)
    + (missoes * 10),
  )
}

function textoProgressoSistema(progresso: number) {
  if (progresso >= 80) return 'O sistema entende que você está muito perto do objetivo. Continue mantendo consistência.'
  if (progresso >= 50) return 'O sistema ve uma boa evolução. Foque em concluir etapas e manter quizzes com alto acerto.'
  if (progresso >= 25) return 'O sistema percebe progresso inicial. O melhor caminho e estudar trilhas e treinar mais quizzes.'
  return 'O sistema ainda tem poucos sinais. Comece concluíndo etapas, quizzes e missões para medir melhor sua evolução.'
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
