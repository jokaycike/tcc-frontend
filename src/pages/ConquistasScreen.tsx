import { ChevronLeft, ChevronRight, Crown, Gift, ShieldCheck, Sparkles, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { iconeConquistaBau } from '../data/bauConquistas'
import { imagemCartaColecionavel } from '../data/cardImages'
import { CartaColecionavel, cartasColecionaveis } from '../data/cartasColecionaveis'
import { buscarEstadoUsuario, comprarCartaUsuario, usarConquistaBauUsuario } from '../services/userStateApi'
import { BauConquista, BauConquistaTipo } from '../types'

export function ConquistasScreen({
  aplicarConquistaBau,
  cartasIniciais = [],
  conquistasBauIniciais = [],
  embedded = false,
  usuarioId,
}: {
  aplicarConquistaBau: (tipo: BauConquistaTipo) => void
  cartasIniciais?: string[]
  conquistasBauIniciais?: BauConquista[]
  embedded?: boolean
  usuarioId: string
}) {
  const [cartaAberta, setCartaAberta] = useState<CartaColecionavel | null>(null)
  const [conquistasBau, setConquistasBau] = useState<BauConquista[]>(conquistasBauIniciais)
  const [conquistadas, setConquistadas] = useState<string[]>(cartasIniciais)
  const [cartaConquistaAnimada, setCartaConquistaAnimada] = useState<CartaColecionavel | null>(null)
  const [indiceBau, setIndiceBau] = useState(0)
  const [carregando, setCarregando] = useState(!embedded)
  const cartasObtidas = cartasColecionaveis.filter((carta) => conquistadas.includes(carta.id))
  const conquistasBauVisiveis = conquistasBau.slice(indiceBau, indiceBau + 4)
  const podeVoltarBau = indiceBau > 0
  const podeAvancarBau = indiceBau + 4 < conquistasBau.length
  const porRaridade = {
    lendario: cartasObtidas.filter((carta) => carta.raridade === 'lendario'),
    epico: cartasObtidas.filter((carta) => carta.raridade === 'epico'),
    raro: cartasObtidas.filter((carta) => carta.raridade === 'raro'),
    comum: cartasObtidas.filter((carta) => carta.raridade === 'comum'),
  }

  useEffect(() => {
    setConquistasBau(conquistasBauIniciais)
    setConquistadas(cartasIniciais)
  }, [cartasIniciais, conquistasBauIniciais])

  useEffect(() => {
    let ativo = true
    setCarregando(!embedded)

    buscarEstadoUsuario(usuarioId)
      .then((estado) => {
        if (!ativo) return
        setConquistasBau(estado.conquistasBau)
        setConquistadas(estado.cartas)
      })
      .catch(() => {
        if (!ativo) return
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [usuarioId])

  async function usarConquistaBau(conquista: BauConquista) {
    if (conquista.usado) return

    const estado = await usarConquistaBauUsuario(usuarioId, conquista.id, conquista.tipo)
    aplicarConquistaBau(conquista.tipo)
    setConquistasBau(estado.conquistasBau)
    const cartaDoBau = sortearCartaDoBau(estado.cartas)

    if (cartaDoBau) {
      setCartaConquistaAnimada(cartaDoBau)
      window.setTimeout(() => setCartaConquistaAnimada(null), 2600)
      const estadoComCarta = await comprarCartaUsuario(usuarioId, cartaDoBau.id, 0)
      setConquistadas(estadoComCarta.cartas)
      return
    }

    setConquistadas(estado.cartas)
  }

  return (
    <section className={`${embedded ? 'embedded-collection' : 'screen'} collection-page`}>
      {!embedded && (
        <header className="recommendations-title">
          <span className="pill">Galeria de cartas</span>
          <h1>Conquistas</h1>
          <p>Veja as cartas que você já comprou com XP e acompanhe sua coleção por raridade.</p>
        </header>
      )}

      {carregando ? (
        <section className="page-inline-loading" role="status" aria-live="polite">
          <div className="loading-orb"><Sparkles size={24} /></div>
          <strong>Carregando conquistas</strong>
          <span>Buscando cartas e baus do banco.</span>
        </section>
      ) : (
        <>

      <section className="collection-group daily-chest-achievements">
        <header>
          <div>
            <h2>Conquistas baú diário</h2>
            <p>Recompensas que saem do baú. Use uma vez para completar missões do dia.</p>
          </div>
          <span>{conquistasBau.length} conquista(s)</span>
        </header>

        {conquistasBau.length === 0 ? (
          <article className="empty-chest-achievements">
            <Gift size={34} />
            <strong>Nenhuma conquista do baú ainda</strong>
            <p>Abra o baú diário em Recomendações para ganhar uma recompensa usável.</p>
          </article>
        ) : (
          <div className="chest-carousel">
            <button
              aria-label="Voltar conquistas do baú"
              className="chest-carousel-arrow"
              disabled={!podeVoltarBau}
              onClick={() => setIndiceBau((atual) => Math.max(0, atual - 1))}
            >
              <ChevronLeft size={22} />
            </button>

            <div className="chest-reward-window">
              {conquistasBauVisiveis.map((conquista) => {
                const Icon = iconeConquistaBau(conquista.tipo)

                return (
                  <article className={`chest-reward-card ${conquista.usado ? 'used' : ''}`} key={conquista.id}>
                    <div className="chest-reward-icon"><Icon size={30} /></div>
                    <strong>{conquista.titulo}</strong>
                    <p>{conquista.descricao}</p>
                    <button disabled={conquista.usado} onClick={() => usarConquistaBau(conquista)}>
                      {conquista.usado ? 'Usada' : 'Usar'}
                    </button>
                  </article>
                )
              })}
            </div>

            <button
              aria-label="Avançar conquistas do baú"
              className="chest-carousel-arrow"
              disabled={!podeAvancarBau}
              onClick={() => setIndiceBau((atual) => Math.min(conquistasBau.length - 4, atual + 1))}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}
      </section>

      <article className="panel collection-summary">
        <strong><Sparkles size={18} /> {cartasObtidas.length}/{cartasColecionaveis.length} cartas conquistadas</strong>
        <span><Crown size={16} /> Lendarias: {porRaridade.lendario.length}</span>
        <span><Crown size={16} /> Epicas: {porRaridade.epico.length}</span>
        <span><ShieldCheck size={16} /> Raras: {porRaridade.raro.length}</span>
        <span><Star size={16} /> Comuns: {porRaridade.comum.length}</span>
      </article>

      {cartasObtidas.length === 0 ? (
        <article className="panel empty-collection">
          <h2>Nenhuma carta conquistada ainda</h2>
          <p>Compre cartas na tela de Recomendações para elas aparecerem aqui.</p>
        </article>
      ) : (
        <div className="collection-groups">
          {(['lendario', 'epico', 'raro', 'comum'] as const).map((raridade) => (
            <section className="collection-group" key={raridade}>
              <header>
                <h2>{raridade}</h2>
                <span>{porRaridade[raridade].length} carta(s)</span>
              </header>
              <div className="collection-grid">
                {porRaridade[raridade].map((carta) => {
                  return (
                    <button
                      className={`recommended-card collectible-card mini-card collection-card rarity-${carta.raridade} owned`}
                      key={carta.id}
                      onClick={() => setCartaAberta(carta)}
                      style={estiloCarta(carta)}
                    >
                      <div className={`card-art ${carta.tema} image-only`}>
                        <img alt={carta.nome} src={imagemCartaColecionavel(carta)} />
                      </div>
                      <span className={`rarity-label rarity-${carta.raridade}`}>{carta.raridade}</span>
                      <small>Conquistada</small>
                      <h3>{carta.nome}</h3>
                      <footer>
                        <strong><Star size={13} /> {carta.custo} XP</strong>
                      </footer>
                      <b className="collection-view-cta">Ver carta</b>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

        </>
      )}

      {cartaAberta && (
        <div className="recommendation-modal-overlay" role="dialog" aria-modal="true">
          <article className="recommendation-modal">
            <button className="modal-close" onClick={() => setCartaAberta(null)} aria-label="Fechar carta"><X size={20} /></button>
            <span className={`loot-chip rarity-label rarity-${cartaAberta.raridade}`}>Carta {cartaAberta.raridade}</span>
            <div className="card-shop-layout">
              <div className={`card-preview ${cartaAberta.tema} rarity-${cartaAberta.raridade}`}>
                <img alt={cartaAberta.nome} src={imagemCartaColecionavel(cartaAberta)} />
                <strong>{cartaAberta.nome}</strong>
              </div>
              <div>
                <h2>{cartaAberta.nome}</h2>
                <p>{cartaAberta.descricao}</p>
                <div className="card-detail-grid">
                  <span className={`rarity-label rarity-${cartaAberta.raridade}`}><Crown size={15} /> {cartaAberta.raridade}</span>
                  <span><Star size={15} /> {cartaAberta.custo} XP</span>
                  <span><ShieldCheck size={15} /> Conquistada</span>
                </div>
                <p className="card-lore">{cartaAberta.detalhe}</p>
              </div>
            </div>
          </article>
        </div>
      )}

      {cartaConquistaAnimada && (
        <div className="card-unlock-toast" aria-live="polite">
          <div className="card-unlock-light" />
          <article className={`card-unlock-content rarity-${cartaConquistaAnimada.raridade}`}>
            <span><Sparkles size={15} /> Carta do bau</span>
            <img alt={cartaConquistaAnimada.nome} src={imagemCartaColecionavel(cartaConquistaAnimada)} />
            <strong>{cartaConquistaAnimada.nome}</strong>
            <small>{cartaConquistaAnimada.raridade}</small>
          </article>
        </div>
      )}
    </section>
  )
}

function sortearCartaDoBau(cartasJaObtidas: string[]) {
  const disponiveis = cartasColecionaveis.filter((carta) => !cartasJaObtidas.includes(carta.id))

  if (disponiveis.length === 0) return null

  return disponiveis[Math.floor(Math.random() * disponiveis.length)]
}

function estiloCarta(carta: CartaColecionavel) {
  return {
    ...(carta.corBorda ? { borderColor: carta.corBorda } : {}),
    ...(carta.corSombra ? { boxShadow: `0 7px 0 ${carta.corSombra}` } : {}),
  }
}

