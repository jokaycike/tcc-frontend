import { ChangeEvent, useState } from 'react'
import { ChevronRight, Eye, EyeOff, Flame, GraduationCap, LockKeyhole, Star, Trophy, UserRound } from 'lucide-react'

type AuthForm = {
  nome: string
  email: string
  dataNascimento: string
  senha: string
  confirmarSenha: string
  imagemPerfil: string
  objetivo: string
}

type AuthScreenProps = {
  form: AuthForm
  carregando: boolean
  mensagem: string
  modoCadastro: boolean
  autenticar: () => void
  lerImagem: (event: ChangeEvent<HTMLInputElement>) => void
  setForm: (form: AuthForm) => void
  setModoCadastro: (value: boolean | ((current: boolean) => boolean)) => void
}

const objetivosEstudo = [
  'Aprender tecnologia com trilhas personalizadas',
  'Dominar lógica de programação',
  'Melhorar meu desempenho em quizzes',
  'Reforçar conteúdos que tenho dificuldade',
  'Me preparar para desafios de programação',
  'Evoluir em frontend e desenvolvimento web',
  'Aprender no meu ritmo com recomendações',
]

export function AuthScreen({
  form,
  carregando,
  mensagem,
  modoCadastro,
  autenticar,
  lerImagem,
  setForm,
  setModoCadastro,
}: AuthScreenProps) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

  return (
    <main className="auth-page">
      {carregando && (
        <div className="auth-loading" role="status" aria-live="polite">
          <div className="loading-orb">
            <GraduationCap size={38} />
          </div>
          <strong>{modoCadastro ? 'Criando sua conta...' : 'Entrando na jornada...'}</strong>
          <span>Preparando sua trilha personalizada</span>
        </div>
      )}
      <section className="auth-art">
        <div className="mascot">
          <GraduationCap size={58} />
        </div>
        <span className="pill">Logic Forge</span>
        <h1>Forjando futuros programadores</h1>
        <p>Entre para acessar o dashboard, trilhas, quizzes e recomendações personalizadas.</p>
        <div className="auth-stats">
          <strong><Flame size={20} /> Streak</strong>
          <strong><Star size={20} /> XP</strong>
          <strong><Trophy size={20} /> Nível</strong>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-title">
          <LockKeyhole size={22} />
          <div>
            <span>{modoCadastro ? 'Criar conta' : 'Entrar'}</span>
            <h2>{modoCadastro ? 'Novo jogador' : 'Bem-vindo de volta'}</h2>
          </div>
        </div>

        <div className="auth-form">
          {modoCadastro && (
            <input disabled={carregando} required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome" />
          )}
          <input disabled={carregando} required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" />
          {modoCadastro && (
            <input disabled={carregando} required value={form.dataNascimento} onChange={(event) => setForm({ ...form, dataNascimento: event.target.value })} type="date" />
          )}
          <label className="password-field">
            <input disabled={carregando} required value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} placeholder="Senha" type={mostrarSenha ? 'text' : 'password'} />
            <button aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} disabled={carregando} onClick={() => setMostrarSenha((value) => !value)} type="button">
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
          {modoCadastro && (
            <>
              <label className="password-field">
                <input disabled={carregando} required value={form.confirmarSenha} onChange={(event) => setForm({ ...form, confirmarSenha: event.target.value })} placeholder="Confirmar senha" type={mostrarConfirmarSenha ? 'text' : 'password'} />
                <button aria-label={mostrarConfirmarSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} disabled={carregando} onClick={() => setMostrarConfirmarSenha((value) => !value)} type="button">
                  {mostrarConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>
              <select disabled={carregando} required value={form.objetivo} onChange={(event) => setForm({ ...form, objetivo: event.target.value })}>
                <option value="" disabled>Selecione seu objetivo de estudo</option>
                {objetivosEstudo.map((objetivo) => (
                  <option key={objetivo} value={objetivo}>{objetivo}</option>
                ))}
              </select>
              <label className="file-picker">
                <UserRound size={18} />
                <span>{form.imagemPerfil ? 'Imagem selecionada' : 'Imagem de perfil'}</span>
                <input accept="image/*" disabled={carregando} onChange={lerImagem} type="file" />
              </label>
              {form.imagemPerfil && (
                <div className="profile-preview">
                  <img src={form.imagemPerfil} alt="Prévia da imagem de perfil" />
                  <div>
                    <strong>Prévia da foto</strong>
                    <span>Essa versão otimizada será usada no menu e no perfil depois do cadastro.</span>
                  </div>
                </div>
              )}
              <div className="password-rules">
                Cadastro: todos os campos são obrigatórios, incluindo objetivo e imagem. Senha: 8 a 10 caracteres, letra maiúscula, minúscula, número e símbolo.
              </div>
            </>
          )}
        </div>

        {mensagem && <div className="notice">{mensagem}</div>}

        <button className="big-action" disabled={carregando} onClick={autenticar}>
          {carregando ? (modoCadastro ? 'Criando conta...' : 'Entrando...') : (modoCadastro ? 'Cadastrar e jogar' : 'Entrar no jogo')}
          {carregando ? <span className="button-spinner" /> : <ChevronRight size={20} />}
        </button>
        <button className="text-action" disabled={carregando} onClick={() => setModoCadastro((value) => !value)}>
          {modoCadastro ? 'Já tenho conta' : 'Criar cadastro'}
        </button>
      </section>
    </main>
  )
}
