import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function formatCPF(v) { return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') }
function fmt(d) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function AdminLancamentos() {
  const [acoes, setAcoes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [busca, setBusca] = useState('')
  const [pacSel, setPacSel] = useState(null)
  const [acaoSel, setAcaoSel] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [tab, setTab] = useState('lancar')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: a }, { data: p }, { data: pend }] = await Promise.all([
      supabase.from('cs_acoes').select('*').eq('ativo', true).order('nome'),
      supabase.from('cs_pacientes').select('id,nome,cpf,saldo_pontos').eq('ativo', true).order('nome'),
      supabase.from('cs_lancamentos').select('*, cs_pacientes(nome,cpf), cs_acoes(nome)').eq('status', 'pendente').order('created_at', { ascending: false }),
    ])
    setAcoes(a || [])
    setPacientes(p || [])
    setPendentes(pend || [])
    setLoading(false)
  }

  const pacFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf.includes(busca.replace(/\D/g, ''))
  )

  const acaoObj = acoes.find(a => a.id === acaoSel)

  async function lancar() {
    if (!pacSel || !acaoSel) { setErro('Selecione paciente e ação'); return }
    setSaving(true); setErro('')
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    const { error } = await supabase.from('cs_lancamentos').insert({
      paciente_id: pacSel.id,
      acao_id: acaoSel,
      pontos: acaoObj.pontos,
      tipo: 'ganho',
      status: 'pendente',
      observacao: obs || null,
      created_by: admin.nome,
    })
    if (error) { setErro(error.message); setSaving(false); return }
    setSucesso(`Lançamento criado para ${pacSel.nome} — aguardando aprovação`)
    setTimeout(() => setSucesso(''), 4000)
    setPacSel(null); setBusca(''); setAcaoSel(''); setObs('')
    loadData(); setSaving(false)
  }

  async function aprovar(l) {
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    await supabase.from('cs_lancamentos').update({ status: 'aprovado', validado_por: admin.nome, validado_em: new Date().toISOString() }).eq('id', l.id)
    const { data: p } = await supabase.from('cs_pacientes').select('saldo_pontos').eq('id', l.paciente_id).single()
    await supabase.from('cs_pacientes').update({ saldo_pontos: (p?.saldo_pontos || 0) + l.pontos }).eq('id', l.paciente_id)
    loadData()
  }

  async function rejeitar(id) {
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    await supabase.from('cs_lancamentos').update({ status: 'rejeitado', validado_por: admin.nome, validado_em: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  return (
    <AdminLayout page="lancamentos" title="Lançar Pontos">
      <div className="admin-header">
        <h1 className="admin-title">Lançar Pontos</h1>
        {pendentes.length > 0 && <span className="badge badge-amber">{pendentes.length} pendente(s)</span>}
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'lancar' ? ' active' : ''}`} onClick={() => setTab('lancar')}>Novo lançamento</button>
        <button className={`tab${tab === 'pendentes' ? ' active' : ''}`} onClick={() => setTab('pendentes')}>
          Aprovar pendentes {pendentes.length > 0 && `(${pendentes.length})`}
        </button>
      </div>

      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      {erro && <div className="alert alert-error">{erro}</div>}

      {tab === 'lancar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Selecionar paciente */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>1. Selecionar paciente</h3>
            <input className="form-input" placeholder="Buscar por nome ou CPF..." value={busca} onChange={e => { setBusca(e.target.value); if (pacSel) setPacSel(null) }} style={{ marginBottom: '12px' }} />
            {pacSel ? (
              <div style={{ background: '#D5F5E3', borderRadius: '10px', padding: '14px', border: '1px solid #82E0AA' }}>
                <div style={{ fontWeight: '600', color: '#1E8449', marginBottom: '2px' }}>✓ {pacSel.nome}</div>
                <div style={{ fontSize: '12px', color: '#1E8449' }}>CPF: {formatCPF(pacSel.cpf)} · Saldo: {pacSel.saldo_pontos} pts</div>
                <button style={{ background: 'none', border: 'none', color: '#1E8449', fontSize: '12px', cursor: 'pointer', marginTop: '6px', textDecoration: 'underline' }} onClick={() => { setPacSel(null); setBusca('') }}>Trocar paciente</button>
              </div>
            ) : busca.length > 0 ? (
              <div style={{ border: '1px solid #e8ecf0', borderRadius: '10px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                {pacFiltrados.length === 0 ? <div className="empty" style={{ padding: '20px' }}>Nenhum resultado</div> : pacFiltrados.map(p => (
                  <div key={p.id} onClick={() => { setPacSel(p); setBusca(p.nome) }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div><div style={{ fontWeight: '500', fontSize: '14px' }}>{p.nome}</div><div style={{ fontSize: '12px', color: '#6b7280' }}>{formatCPF(p.cpf)}</div></div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A5276' }}>{p.saldo_pontos} pts</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', padding: '20px' }}>Digite para buscar um paciente</div>}
          </div>

          {/* Selecionar ação e lançar */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>2. Selecionar ação</h3>
            <div className="form-group">
              <select className="form-select" value={acaoSel} onChange={e => setAcaoSel(e.target.value)}>
                <option value="">Selecione a ação pontuável...</option>
                {acoes.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.pontos} pts)</option>)}
              </select>
            </div>
            {acaoObj && (
              <div style={{ background: '#EBF5FB', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #85C1E9' }}>
                <div style={{ fontWeight: '600', fontSize: '22px', color: '#1A5276' }}>+{acaoObj.pontos} pontos</div>
                <div style={{ fontSize: '12px', color: '#1A5276', marginTop: '4px' }}>Limite: {acaoObj.limite_tipo === 'ilimitado' ? 'Ilimitado' : `${acaoObj.limite_qtd}x/${acaoObj.limite_periodo}`}</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Observação (opcional)</label>
              <input className="form-input" placeholder="Ex: indicou Maria Silva" value={obs} onChange={e => setObs(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full" onClick={lancar} disabled={saving || !pacSel || !acaoSel}>
              {saving ? 'Lançando...' : `Lançar ${acaoObj ? `+${acaoObj.pontos} pts` : 'pontos'}`}
            </button>
            <div className="alert alert-info" style={{ marginTop: '12px', marginBottom: 0 }}>
              Lançamentos são criados como <strong>pendentes</strong> e precisam ser aprovados na aba ao lado.
            </div>
          </div>
        </div>
      )}

      {tab === 'pendentes' && (
        <div className="card">
          {loading ? <div className="spinner" /> : pendentes.length === 0 ? (
            <div className="empty">Nenhum lançamento pendente — tudo em dia!</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Paciente</th><th>Ação</th><th style={{ textAlign: 'center' }}>Pontos</th><th>Por</th><th>Aprovação</th></tr></thead>
                <tbody>
                  {pendentes.map(l => (
                    <tr key={l.id}>
                      <td className="text-sm">{fmt(l.created_at)}</td>
                      <td style={{ fontWeight: '500' }}>{l.cs_pacientes?.nome}<div style={{ fontSize: '11px', color: '#6b7280' }}>{formatCPF(l.cs_pacientes?.cpf || '')}</div></td>
                      <td>{l.cs_acoes?.nome || '—'}{l.observacao && <div style={{ fontSize: '11px', color: '#6b7280' }}>{l.observacao}</div>}</td>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#1E8449', fontSize: '16px' }}>+{l.pontos}</td>
                      <td className="text-muted text-sm">{l.created_by || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-success btn-sm" onClick={() => aprovar(l)}>✓ Aprovar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejeitar(l.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
