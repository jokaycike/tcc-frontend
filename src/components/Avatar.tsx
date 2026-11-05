import { Usuario } from '../types'

export function Avatar({ usuario }: { usuario: Usuario }) {
  if (usuario.imagemPerfil) {
    return <img className="avatar" src={usuario.imagemPerfil} alt={usuario.nome} />
  }

  
  return <div className="avatar avatar-fallback">{usuario.nome.slice(0, 1).toUpperCase()}</div>
}
