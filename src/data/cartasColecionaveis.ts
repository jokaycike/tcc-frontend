import { BookOpen, Crown, FlaskConical, Gem, Gift, ScrollText, ShieldCheck, Sword, Target, Zap, type LucideIcon } from 'lucide-react'

export type CartaColecionavel = {
  id: string
  nome: string
  raridade: 'lendario' | 'epico' | 'comum' | 'raro'
  custo: number
  poder: string
  descricao: string
  detalhe: string
  habilidade: string
  desbloqueio: string
  icon: LucideIcon
  tema: string
  corBorda?: string
  corSombra?: string
  imagemFallback?: string
}

export const cartasColecionaveis: CartaColecionavel[] = [
  {
    id: 'espada-algoritmica',
    nome: 'Espada Algoritmica',
    raridade: 'epico',
    custo: 180,
    poder: '',
    habilidade: '',
    desbloqueio: 'Derrote o boss do dia',
    descricao: 'Carta épica para quem domina decomposição de problemas.',
    detalhe: 'Corta problemas grandes em passos menores. Representa pensamento computacional: dividir, ordenar e resolver uma parte por vez.',
    icon: Sword,
    tema: 'sword',
    corBorda: '#8b5cf6',
    corSombra: '#8b5cf675',
  },
  {
    id: 'pergaminho-loops',
    nome: 'Pergaminho dos Loops',
    raridade: 'comum',
    custo: 80,
    poder: '',
    habilidade: '',
    desbloqueio: 'Tire 100% em um quiz',
    descricao: 'Carta comum para treinar repetição e padrões.',
    detalhe: 'Reforçar repetições com for e while. Boa para revisar quando usar for, while e como evitar repetições infinitas.',
    icon: ScrollText,
    tema: 'scroll',
    corBorda: '#1cb0f6',
    corSombra: '#1cb0f67a',
  },
  {
    id: 'alvo-condicional',
    nome: 'Alvo Condicional',
    raridade: 'comum',
    custo: 130,
    poder: '',
    habilidade: '',
    desbloqueio: 'Tire no minímo 50% em um quiz e compre com XP',
    descricao: 'Carta rara focada em escolhas e tomada de decisão.',
    detalhe: 'Aumenta precisão em if, else e operadores lógicos. Ajuda a lembrar que condicionais guiam caminhos diferentes no programa.',
    icon: Target,
    tema: 'target',
    corBorda: '#ff0000',
    corSombra: '#ff000073',
  },
  {
    id: 'pocao-debug',
    nome: 'Pocao de Debug',
    raridade: 'epico',
    custo: 75,
    poder: '',
    habilidade: '',
    desbloqueio: 'Complete o combo de fogo e compre com XP.',
    descricao: 'Carta comum para revisar código com calma.',
    detalhe: 'Revela erros simples antes que eles virem problema. Representa a habilidade de observar mensagens de erro, testar hipóteses e corrigir uma coisa por vez.',
    icon: FlaskConical,
    tema: 'potion',
    corBorda: '#1bd529',
    corSombra: '#1bd52973',
  },
  {
    id: 'escudo-logico',
    nome: 'Escudo Logico',
    raridade: 'comum',
    custo: 135,
    poder: '',
    habilidade: '',
    desbloqueio: 'Faça uma etapa de qualquer trilha e compre com XP.',
    descricao: 'Carta rara para fortalecer comparações e condições compostas.',
    detalhe: 'Protege contra pegadinhas de operadores lógicos. Ajuda a revisar AND, OR, NOT e a ordem das decisões dentro de uma condição.',
    icon: ShieldCheck,
    tema: 'shield',
    corBorda: '#8b5cf6',
    corSombra: '#8b5cf675',
  },
  {
    id: 'livro-fundamentos',
    nome: 'Livro dos Fundamentos',
    raridade: 'comum',
    custo: 70,
    poder: '',
    habilidade: '',
    desbloqueio: 'Disponivel desde o inicio.',
    descricao: 'Carta comum para consolidar conceitos essenciais.',
    detalhe: 'Recupera a base antes de partir para desafios maiores. Representa leitura, resumo e revisão dos pontos principais antes da prática.',
    icon: BookOpen,
    tema: 'book',
    corBorda: '#1cb0f6',
    corSombra: '#1cb0f67a',
  },
  {
    id: 'raio-performance',
    nome: 'Raio da Performance',
    raridade: 'raro',
    custo: 190,
    poder: '',
    habilidade: '',
    desbloqueio: 'Complete o estudande dedicado em destaque',
    descricao: 'Carta épica para pensar em desempenho e complexidade.',
    detalhe: 'Acelera a escolha de soluções mais eficientes. Ajuda a comparar soluções, identificar repetições desnecessárias e escolher caminhos mais eficientes.',
    icon: Zap,
    tema: 'bolt',
    corBorda: '#f97316',
    corSombra: '#f9731675',
  },
  {
    id: 'bau-do-mestre',
    nome: 'Bau do Mestre',
    raridade: 'lendario',
    custo: 260,
    poder: '',
    habilidade: '',
    desbloqueio: 'Abra o bau diario e compre com XP.',
    descricao: 'Carta épica para colecionadores que completam missões.',
    detalhe: 'Guarda recompensas raras da jornada de estudos. Representa consistência: estudar, ganhar XP, concluir missões e acumular conquistas.',
    icon: Gift,
    tema: 'chest',
    corBorda: '#d27307',
    corSombra: '#d2730778',
  },
]
