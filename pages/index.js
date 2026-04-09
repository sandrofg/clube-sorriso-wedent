import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

function mascararCPF(v) {
  v = v.replace(/\D/g, '')
  if (v.length > 3) v = v.slice(0, 3) + '.' + v.slice(3)
  if (v.length > 7) v = v.slice(0, 7) + '.' + v.slice(7)
  if (v.length > 11) v = v.slice(0, 11) + '-' + v.slice(11)
  return v.slice(0, 14)
}

function mascararTel(v) {
  v = v.replace(/\D/g, '')
  if (v.length > 0) v = '(' + v
  if (v.length > 3) v = v.slice(0, 3) + ') ' + v.slice(3)
  if (v.length > 10) v = v.slice(0, 10) + '-' + v.slice(10)
  return v.slice(0, 15)
}

function limparNum(v) { return v.replace(/\D/g, '') }

export default function Home() {
  const router = useRouter()
  const [aba, setAba] = useState('consultar')

  // CONSULTAR
  const [cpfConsulta, setCpfConsulta] = useState('')
  const [loadingConsulta, setLoadingConsulta] = useState(false)
  const [erroConsulta, setErroConsulta] = useState('')

  // CADASTRO
  const [cpfCad, setCpfCad] = useState('')
  const [checkandoCPF, setCheckandoCPF] = useState(false)
  const [statusCPF, setStatusCPF] = useState(null) // null | 'cadastrado' | 'livre'
  const [nomeCadastrado, setNomeCadastrado] = useState('')
  const [form, setForm] = useState({ nome: '', dataNasc: '', telefone: '', email: '' })
  const [loadingCad, setLoadingCad] = useState(false)
  const [erroCad, setErroCad] = useState('')
  const [sucesso, setSucesso] = useState(false)

  // Verificar CPF ao completar 11 dígitos
  useEffect(() => {
    const cpfLimpo = limparNum(cpfCad)
    if (cpfLimpo.length === 11) {
      verificarCPF(cpfLimpo)
    } else {
      setStatusCPF(null)
      setNomeCadastrado('')
    }
  }, [cpfCad])

  async function verificarCPF(cpfLimpo) {
    setCheckandoCPF(true)
    setStatusCPF(null)
    try {
      const { data } = await supabase
        .from('cs_pacientes')
        .select('id, nome')
        .eq('cpf', cpfLimpo)
        .eq('ativo', true)
        .single()

      if (data) {
        setStatusCPF('cadastrado')
        setNomeCadastrado(data.nome)
        setForm(f => ({ ...f, nome: data.nome }))
      } else {
        setStatusCPF('livre')
      }
    } catch {
      setStatusCPF('livre')
    } finally {
      setCheckandoCPF(false)
    }
  }

  async function handleConsultar(e) {
    e.preventDefault()
    const cpf = limparNum(cpfConsulta)
    if (cpf.length < 11) { setErroConsulta('CPF inválido. Digite os 11 dígitos.'); return }
    setLoadingConsulta(true)
    setErroConsulta('')
    const { data } = await supabase
      .from('cs_pacientes')
      .select('id, nome')
      .eq('cpf', cpf)
      .eq('ativo', true)
      .single()
    setLoadingConsulta(false)
    if (!data) { setErroConsulta('CPF não encontrado. Verifique os dados ou cadastre-se na aba ao lado.'); return }
    router.push(`/paciente/${cpf}`)
  }

  async function handleCadastrar(e) {
    e.preventDefault()
    setErroCad('')
    const cpf = limparNum(cpfCad)
    if (cpf.length < 11) { setErroCad('CPF inválido.'); return }
    if (!form.nome.trim()) { setErroCad('Nome é obrigatório.'); return }
    if (!form.dataNasc) { setErroCad('Data de nascimento é obrigatória.'); return }
    const tel = limparNum(form.telefone)
    if (tel.length < 10) { setErroCad('Telefone inválido.'); return }

    setLoadingCad(true)
    const telFormatado = '55' + tel.replace(/^0/, '')

    const { error } = await supabase.from('cs_pacientes').insert({
      nome: form.nome.trim(),
      cpf: cpf,
      data_nascimento: form.dataNasc,
      telefone: telFormatado,
      email: form.email.trim() || null,
      saldo_pontos: 0,
      ativo: true,
      clinica: 'wedent'
    })

    setLoadingCad(false)
    if (error) {
      if (error.code === '23505') setErroCad('Este CPF já está cadastrado.')
      else setErroCad('Erro ao cadastrar. Tente novamente.')
      return
    }
    setSucesso(true)
    setTimeout(() => router.push(`/paciente/${cpf}`), 2000)
  }

  return (
    <>
      <Head><title>Clube Sorriso Wedent</title></Head>
      <div className="page-center">
        {/* LOGO */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Wedent Clínica Odontológica
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>Clube Sorriso</h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: '15px' }}>Seu programa de pontos e recompensas</p>
        </div>

        {/* CARD */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

          {/* ABAS */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '4px', gap: '4px', marginBottom: '24px' }}>
            {[['consultar', 'Consultar saldo'], ['cadastrar', 'Quero participar']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setAba(key); setErroConsulta(''); setErroCad(''); setSucesso(false) }}
                style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: '7px', fontWeight: '500', fontSize: '13px',
                  cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit',
                  background: aba === key ? '#fff' : 'transparent',
                  color: aba === key ? '#1A5276' : '#6b7280',
                  boxShadow: aba === key ? '0 1px 8px rgba(0,0,0,.08)' : 'none'
                }}
              >{label}</button>
            ))}
          </div>

          {/* ABA CONSULTAR */}
          {aba === 'consultar' && (
            <form onSubmit={handleConsultar}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A5276', marginBottom: '4px' }}>Consultar meu saldo</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Digite seu CPF para ver seus pontos e prêmios disponíveis</p>

              {erroConsulta && <div className="alert-erro">{erroConsulta}</div>}

              <div className="form-group">
                <label className="form-label">Seu CPF</label>
                <input
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={cpfConsulta}
                  onChange={e => setCpfConsulta(mascararCPF(e.target.value))}
                  style={{ fontSize: '18px', letterSpacing: '1px', textAlign: 'center', padding: '14px' }}
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="off"
                />
              </div>

              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loadingConsulta}>
                {loadingConsulta ? 'Buscando...' : 'Ver meus pontos'}
              </button>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e8ecf0', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Ainda não participa?</p>
                <button type="button" onClick={() => setAba('cadastrar')} style={{ background: 'none', border: 'none', color: '#1A5276', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                  Cadastre-se gratuitamente →
                </button>
              </div>
            </form>
          )}

          {/* ABA CADASTRAR */}
          {aba === 'cadastrar' && !sucesso && (
            <form onSubmit={handleCadastrar}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A5276', marginBottom: '4px' }}>Quero participar</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Cadastro gratuito — acumule pontos e ganhe prêmios!</p>

              {erroCad && <div className="alert-erro">{erroCad}</div>}

              {/* CPF — PRIMEIRO CAMPO */}
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="000.000.000-00"
                    value={cpfCad}
                    onChange={e => { setCpfCad(mascararCPF(e.target.value)); setStatusCPF(null) }}
                    inputMode="numeric"
                    maxLength={14}
                    autoComplete="off"
                    style={{ paddingRight: '40px' }}
                  />
                  {checkandoCPF && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>⏳</span>
                  )}
                  {statusCPF === 'cadastrado' && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>✅</span>
                  )}
                  {statusCPF === 'livre' && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🟢</span>
                  )}
                </div>
              </div>

              {/* JÁ CADASTRADO */}
              {statusCPF === 'cadastrado' && (
                <div style={{ background: '#e8f5e9', border: '1.5px solid #a5d6a7', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                  <p style={{ color: '#2e7d32', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                    Olá, {nomeCadastrado}! 👋
                  </p>
                  <p style={{ color: '#388e3c', fontSize: '13px', marginBottom: '10px' }}>
                    Você já está cadastrado no Clube Sorriso!
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/paciente/${limparNum(cpfCad)}`)}
                    className="btn btn-primary btn-full"
                    style={{ background: '#2e7d32' }}
                  >
                    Ver meu saldo e prêmios →
                  </button>
                </div>
              )}

              {/* FORMULÁRIO COMPLETO — só aparece se CPF está livre */}
              {statusCPF === 'livre' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nome completo *</label>
                    <input
                      className="form-input"
                      placeholder="Seu nome completo"
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      autoComplete="name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data de nascimento *</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.dataNasc}
                      onChange={e => setForm(f => ({ ...f, dataNasc: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefone com DDD *</label>
                    <input
                      className="form-input"
                      placeholder="(43) 99999-9999"
                      value={form.telefone}
                      onChange={e => setForm(f => ({ ...f, telefone: mascararTel(e.target.value) }))}
                      inputMode="numeric"
                      maxLength={15}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      E-mail <span style={{ color: '#9ca3af', fontWeight: '400' }}>(opcional)</span>
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>

                  <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginBottom: '12px' }}>
                    Ao se cadastrar, você concorda com o regulamento do Clube Sorriso Wedent.
                  </p>

                  <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loadingCad}>
                    {loadingCad ? 'Cadastrando...' : 'Criar minha conta grátis'}
                  </button>
                </>
              )}

              {/* ESTADO INICIAL — CPF ainda não foi digitado */}
              {!statusCPF && !checkandoCPF && limparNum(cpfCad).length < 11 && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#0369a1', textAlign: 'center' }}>
                  Digite seu CPF acima para começar
                </div>
              )}

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button type="button" onClick={() => setAba('consultar')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                  ← Já sou cadastrado
                </button>
              </div>
            </form>
          )}

          {/* SUCESSO */}
          {aba === 'cadastrar' && sucesso && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1A5276', marginBottom: '8px' }}>Cadastro realizado!</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Bem-vindo ao Clube Sorriso Wedent! Redirecionando para seus pontos...</p>
            </div>
          )}
        </div>

        {/* STATS */}
        <div style={{ marginTop: '28px', display: 'flex', gap: '32px', textAlign: 'center' }}>
          {[['17', 'Prêmios no catálogo'], ['4', 'Níveis de recompensa'], ['0%', 'Custo para participar']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>{num}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.7)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/admin" style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>Acesso da equipe →</a>
        </div>
      </div>

      <style jsx>{`
        .page-center {
          min-height: 100vh;
          background: linear-gradient(135deg, #1A5276 0%, #21618C 50%, #1A5276 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .alert-erro {
          background: #fff0f0;
          color: #c0392b;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 14px;
          border-left: 3px solid #c0392b;
        }
      `}</style>
    </>
  )
}
