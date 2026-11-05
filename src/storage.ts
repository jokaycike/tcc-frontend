import { Usuario } from './types'

export const SESSION_KEY = 'adaptivelearn:sessao'
export const XP_INICIAL = 0

export function userStorageKey(usuarioId: string, key: string) {
  return `adaptivelearn:${usuarioId}:${key}`
}

export function salvarSessao(usuario: Usuario) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(usuario))
}

export function carregarSessao(): Usuario | null {
  try {
    const salvo = localStorage.getItem(SESSION_KEY)
    return salvo ? JSON.parse(salvo) as Usuario : null
  } catch {
    return null
  }
}

export function limparSessao() {
  localStorage.removeItem(SESSION_KEY)
}
