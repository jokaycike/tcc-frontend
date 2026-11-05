const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api'

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(async () => {
      const text = await response.text().catch(() => '')
      const rotaNaoEncontrada = text.includes('Cannot POST') || text.includes('Cannot GET')

      return {
        message: rotaNaoEncontrada
          ? 'Rota da API nao encontrada. Reinicie o backend para carregar as rotas novas.'
          : 'Erro inesperado.',
      }
    })
    throw new Error(error.message || 'Erro inesperado.')
  }

  return response.json()
}
