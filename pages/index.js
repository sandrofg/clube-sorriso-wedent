export const dynamic = "force-dynamic"
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Home() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function formatCPF(v) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
      .replace(/(\d{3})(\d{3})/, '$1.$2')
      .replace(/(\d{3})/, '$1')
  }

  async function handleConsulta(e) {
    e.preventDefault()
    const raw = cpf.replace(/\D/g, '')
    if (raw.length < 11) { setError('CPF inválido — digite os 11 dígitos'); return }
    setError(''); setLoading(true)
    router.push(`/paciente/${raw}`)
  }

  return (
    <>
      <Head><title>Clube Sorriso Wedent</title></Head>
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A5276 0%,#21618C 50%,#1A5276 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{marginBottom:'32px',textAlign:'center'}}>
          <div style={{fontSize:'14px',color:'rgba(255,255,255,.7)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Wedent Clínica Odontológica</div>
          <h1 style={{fontSize:'36px',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>Clube Sorriso</h1>
          <p style={{color:'rgba(255,255,255,.75)',fontSize:'15px'}}>Seu programa de pontos e recompensas</p>
        </div>

        <div style={{background:'#fff',borderRadius:'20px',padding:'36px',width:'100%',maxWidth:'420px',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
          <h2 style={{fontSize:'20px',fontWeight:'700',color:'#1A5276',marginBottom:'6px'}}>Consultar meu saldo</h2>
          <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'24px'}}>Digite seu CPF para ver seus pontos e prêmios disponíveis</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleConsulta}>
            <div className="form-group">
              <label className="form-label">Seu CPF</label>
              <input
                className="form-input"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                style={{fontSize:'18px',letterSpacing:'1px',textAlign:'center',padding:'14px'}}
              />
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Consultando...' : 'Ver meus pontos'}
            </button>
          </form>

          <div style={{marginTop:'24px',paddingTop:'20px',borderTop:'1px solid #e8ecf0',textAlign:'center'}}>
            <p style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px'}}>É da equipe Wedent?</p>
            <a href="/admin" style={{fontSize:'13px',color:'#1A5276',fontWeight:'500'}}>Acessar painel administrativo →</a>
          </div>
        </div>

        <div style={{marginTop:'32px',display:'flex',gap:'32px',textAlign:'center'}}>
          {[['17','Prêmios no catálogo'],['4','Níveis de recompensa'],['0%','Custo para participar']].map(([n,l]) => (
            <div key={l}>
              <div style={{fontSize:'24px',fontWeight:'800',color:'#fff'}}>{n}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,.7)',marginTop:'2px'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
