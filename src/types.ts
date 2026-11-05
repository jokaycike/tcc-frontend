export type Usuario = {
  id: string
  nome: string
  email: string
  dataNascimento: string
  imagemPerfil?: string
  objetivo: string
}

export type Conteudo = {
  id: string
  titulo: string
  descricao: string
  tipo: 'aula' | 'leitura' | 'exercicio' | 'desafio'
  nivel: 'iniciante' | 'intermediario' | 'avancado'
  tempoMinutos: number
  materialCompleto?: string[]
  videoTitulo?: string
  videoUrl?: string
  pdfTitulo?: string
  pdfUrl?: string
  exemploCodigo?: string
  exemploExplicacao?: string
  quizRapido?: Quiz['questoes']
}

export type Trilha = {
  id: string
  titulo: string
  area: string
  descricao: string
  duracaoHoras: number
  conteudos: Conteudo[]
}

export type Quiz = {
  id: string
  trilhaId: string
  titulo: string
  questoes: {
    id: string
    enunciado: string
    alternativas: string[]
    correta: number
  }[]
}

export type Dashboard = {
  totalTrilhas: number
  totalConteudos: number
  conteudosConcluidos: number
  progressoGeral: number
  quizzesRealizados: number
  mediaAcerto: number
  xp?: number
  atividadesRecentes?: AtividadeRecente[]
  cartas?: string[]
  missaoDiaria?: DailyMissions
  progressoPorTrilha: {
    trilhaId: string
    titulo: string
    progresso: number
    taxaAcerto: number
    status: string
  }[]
}

export type Tela = 'dashboard' | 'trilhas' | 'quiz' | 'recomendacoes' | 'perfil'

export type Recomendacao = {
  taxaAcerto: number
  tipo: 'reforco' | 'pratica' | 'avanco'
  mensagem: string
  conteudos: Trilha['conteudos']
}

export type Progresso = {
  usuarioId: string
  trilhaId: string
  conteudosConcluidos: string[]
  quizConcluido: boolean
  liberada: boolean
}

export type DailyMissions = {
  data: string
  etapasTrilha: number
  quizzesPerfeitos: number
  quizzesCom50?: number
  bossDerrotado: boolean
  bossPerdido: boolean
  bauAberto?: boolean
}

export type AtividadeRecente = {
  id: string
  titulo: string
  detalhe: string
  data?: string
  criadoEm?: string
  tipo: 'trilha' | 'quiz' | 'recompensa' | 'carta' | 'boss'
}

export type BauConquistaTipo = 'complete-student' | 'complete-combo' | 'defeat-boss'

export type BauConquista = {
  id: string
  usuarioId?: string
  tipo: BauConquistaTipo
  titulo: string
  descricao: string
  usado: boolean
  criadoEm: string
}

export type EstadoUsuario = {
  xp: number
  missaoDiaria: DailyMissions
  atividades: AtividadeRecente[]
  cartas: string[]
  conquistasBau: BauConquista[]
}

export type ConfiguracaoIa = {
  iaAtiva: boolean
  atualizadoEm?: string
}

export type ExplicacaoIaParams = {
  tituloConteudo: string
  tema: string
  pergunta?: string
  respostaUsuario?: string
  respostaCorreta?: string
  nivel?: string
}

export type ExplicacaoIa = {
  usouIA: boolean
  explicacao: string
  motivo?: string
}

export type IaMensagem = {
  id: string
  papel: 'usuário' | 'assistente'
  conteudo: string
  acao?: string
  temaId?: string
  criadoEm: string
}

export type IaChatResposta = {
  conversaId: string
  resposta: string
  usouIA: boolean
  temaCriado?: Trilha
  quizCriado?: Quiz
  historico: IaMensagem[]
}
