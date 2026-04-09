import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const { data, error } = await supabase
      .from('cs_equipe')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('senha', senha)
      .eq('ativo', true)
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      setErro('Erro ao conectar. Tente novamente.')
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setErro('E-mail ou senha incorretos')
      setLoading(false)
      return
    }

    const user = data[0]
    localStorage.setItem('cs_admin', JSON.stringify({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    }))
    router.push('/admin/dashboard')
  }

  return (
    <>
      <Head><title>Login — Clube Sorriso Wedent</title></Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A5276 0%, #2E86C1 100%)',
        fontFamily: 'Inter, sans-serif',
        padding: '20px',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>😁</div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A5276', margin: 0 }}>Clube Sorriso</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>Wedent Clínica Odontológica</p>
          </div>

          <form onSubmit={entrar}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                E-mail
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ fontSize: '15px', padding: '12px' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
