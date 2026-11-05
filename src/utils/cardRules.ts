import { CartaColecionavel } from '../data/cartasColecionaveis'

export type CardMissionStatus = {
  etapasTrilha: number
  quizzesPerfeitos: number
  quizzesCom50?: number
  bossDerrotado: boolean
  bossPerdido: boolean
  bauAberto?: boolean
}

export function cartaEstaDesbloqueada(
  carta: CartaColecionavel,
  dailyMissions: CardMissionStatus,
  bauAbertoHoje: boolean,
) {
  if (cartaDisponivelDesdeInicio(carta)) return true
  return condicaoDaCartaCumprida(carta, dailyMissions, bauAbertoHoje)
}

export function cartaGanhaAutomaticamente(
  carta: CartaColecionavel,
  dailyMissions: CardMissionStatus,
) {
  if (cartaDisponivelDesdeInicio(carta) || cartaExigeCompra(carta)) return false
  return condicaoDaCartaCumprida(carta, dailyMissions, Boolean(dailyMissions.bauAberto))
}

export function cartaExigeCompra(carta: CartaColecionavel) {
  return normalizarTexto(carta.desbloqueio).includes('e compre')
}

export function cartaDisponivelDesdeInicio(carta: CartaColecionavel) {
  return normalizarTexto(carta.desbloqueio).includes('disponivel desde o inicio')
}

function condicaoDaCartaCumprida(carta: CartaColecionavel, dailyMissions: CardMissionStatus, bauAbertoHoje: boolean) {
  const quizzesCom50 = dailyMissions.quizzesCom50 ?? dailyMissions.quizzesPerfeitos

  if (carta.id === 'espada-algoritmica') return dailyMissions.bossDerrotado
  if (carta.id === 'pergaminho-loops') return dailyMissions.quizzesPerfeitos >= 1
  if (carta.id === 'alvo-condicional') return quizzesCom50 >= 1
  if (carta.id === 'pocao-debug') return dailyMissions.quizzesPerfeitos >= 5
  if (carta.id === 'escudo-logico') return dailyMissions.etapasTrilha >= 1
  if (carta.id === 'raio-performance') return dailyMissions.etapasTrilha >= 5
  if (carta.id === 'bau-do-mestre') return bauAbertoHoje || Boolean(dailyMissions.bauAberto)
  return false
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
