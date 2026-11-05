import { ReactNode } from 'react'

export function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  )
}
