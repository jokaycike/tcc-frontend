import { api } from '../api'
import { ConfiguracaoIa, ExplicacaoIa, ExplicacaoIaParams, IaChatResposta } from '../types'

export function buscarConfiguracaoIa() {
  return api<ConfiguracaoIa>('/configuracoes/ia')
}

export function atualizarConfiguracaoIa(iaAtiva: boolean) {
  return api<ConfiguracaoIa>('/configuracoes/ia', {
    method: 'PATCH',
    body: JSON.stringify({ iaAtiva }),
  })
}

export function gerarExplicacaoIa(params: ExplicacaoIaParams) {
  return api<ExplicacaoIa>('/ia/explicar', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function buscarHistoricoIa(usuarioId: string) {
  return api<Pick<IaChatResposta, 'conversaId' | 'historico'>>(`/ia/chat/${usuarioId}`)
}

export function enviarMensagemIa(params: { usuarioId: string; mensagem: string; contexto?: Record<string, unknown> }) {
  return api<IaChatResposta>('/ia/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
