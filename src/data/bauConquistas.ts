import { BookOpen, Flame, Target, type LucideIcon } from 'lucide-react'

export type BauConquistaTipo = 'complete-student' | 'complete-combo' | 'defeat-boss'

export type BauConquista = {
  id: string
  tipo: BauConquistaTipo
  titulo: string
  descricao: string
  usado: boolean
  criadoEm: string
}

export function iconeConquistaBau(tipo: BauConquistaTipo): LucideIcon {
  if (tipo === 'complete-student') return BookOpen
  if (tipo === 'complete-combo') return Flame
  return Target
}
