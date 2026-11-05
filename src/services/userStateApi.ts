import { api } from '../api'
import { BauConquistaTipo, EstadoUsuario } from '../types'

export function buscarEstadoUsuario(usuarioId: string) {
  return api<EstadoUsuario>(`/usuarios/${usuarioId}/estado`)
}

export function alterarXpUsuario(usuarioId: string, valor: number) {
  return api<{ xp: number }>(`/usuarios/${usuarioId}/xp`, {
    method: 'POST',
    body: JSON.stringify({ valor }),
  })
}

export function comprarCartaUsuario(usuarioId: string, cartaId: string, custo: number) {
  return api<EstadoUsuario>(`/usuarios/${usuarioId}/cartas`, {
    method: 'POST',
    body: JSON.stringify({ cartaId, custo }),
  })
}

export function abrirBauDiario(usuarioId: string) {
  return api<EstadoUsuario>(`/usuarios/${usuarioId}/bau-diario/abrir`, {
    method: 'POST',
  })
}

export function usarConquistaBauUsuario(usuarioId: string, conquistaId: string, tipo: BauConquistaTipo) {
  return api<EstadoUsuario>(`/usuarios/${usuarioId}/conquistas-bau/usar`, {
    method: 'POST',
    body: JSON.stringify({ conquistaId, tipo }),
  })
}

export function atualizarBossUsuario(usuarioId: string, resultado: 'derrotado' | 'perdido') {
  return api<EstadoUsuario>(`/usuarios/${usuarioId}/boss`, {
    method: 'POST',
    body: JSON.stringify({ resultado }),
  })
}

export function resetarDadosUsuario(usuarioId: string) {
  return api<{ message: string }>(`/usuarios/${usuarioId}/reset`, {
    method: 'DELETE',
  })
}
