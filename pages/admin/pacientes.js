import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function formatCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
    .replace(/(\d{3})(\d{3})/, '$1.$2')
    .replace(/(\d{3})/, '$1')
}

function formatTel(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    .replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    .replace(/(\d{2})(\d+)/, '($1) $2')
}

const EMPTY = { nome: '', cpf: '', telefone: '', email: '', data_nascimento: '' }

export default function AdminPacientes() {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [lancsPac, setLancsPac] = useState([])

  useEffect(() => { loadPacientes() }, [])

  async function loadPacientes() {
    setLoading(true)
    const { data } = await supabase.from('cs_pacientes').select('*').order('nome')
    setPacientes(data || [])
    setLoading(false)
  }

  async function abrirDetalhe(p) {
    setDetalhe(p)
    const { data } = await supabase.from('cs_lancamentos').select('*, cs_acoes(nome)').eq('paciente_id', p.id).order('created_at', { ascending: false }).limit(20)
    setLancsPac(data || [])
  }

  function abrirModal(p = null) {
    setErro('')
    if (p) { setForm({ nome: p.nome, cpf: formatCPF(p.cpf), telefone: p.telefone || '', email: p.email || '', data_nascimento: p.data_nascimento || '' }); setEditId(p.id) }
    else { setForm(EMPTY); setEditId(null) }
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim() || !form.cpf) { setErro('Nome e CPF são obrigatórios'); return }
    const cpfRaw = form.cpf.replace(/\D/g, '')
    if (cpfRaw.length < 11) { setErro('CPF inválido'); return }
    setSaving(true); setErro('')
    const payload = { nome: form.nome.trim(), cpf: cpfRaw, telefone: form.telefone.replace(/\D/g, '') || null, email: form.email || null, data_nascimento: form.data_nascimento || null }
    const { error } = editId
      ? await supabase.from('cs_pacientes').update(payload).eq('id', editId)
      : await supabase.from('cs_pacientes').insert(payload)
    if (error) { setErro(error.message.includes('unique') ? 'CPF já cadastrado' : error.message); setSaving(false); return }
    setSucesso(editId ? 'Paciente atualizado!' : 'Paciente cadastrado!'); setModal(false)
    setTimeout(() => setSucesso(''), 3000); loadPacientes(); setSaving(false)
  }

  async function ajustarPontos(pacienteId, pontos, obs) {
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    await supabase.from('cs_lancamentos').insert({ paciente_id: pacienteId, pontos, tipo: 'ajuste', status: 'aprovado', observacao: obs, validado_por: admin.nome, validado_em: new Date().toISOString(), created_by: admin.nome })
    const { data: p } = await supabase.from('cs_pacientes').select('saldo_pontos').eq('id', pacienteId).single()
    await supabase.from('cs_pacientes').update({ saldo_pontos: Math.max(0, (p?.saldo_pontos || 0) + pontos) }).eq('id', pacienteId)
    loadPacientes()
    if (detalhe?.id === pacienteId) abrirDetalhe({ ...detalhe, saldo_pontos: Math.max(0, (detalhe.saldo_pontos || 0) + pontos) })
  }

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf.includes(busca.replace(/\D/g, '')) ||
    (p.telefone || '').includes(busca.replace(/\D/g, ''))
  )

  return (
    <AdminLayout page="pacientes" title="Pacientes">
      {/* Detalhe do paciente */}
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e8ecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{detalhe.nome}</h2>
                <div className="text-muted">CPF: {formatCPF(detalhe.cpf)} · Tel: {detalhe.telefone ? formatTel(detalhe.telefone) : '—'}</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setDetalhe(null)}>✕ Fechar</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="metrics" style={{ marginBottom: '20px' }}>
                <div className="metric"><div className="metric-label">Saldo</div><div className="metric-value">{detalhe.saldo_pontos}</div><div className="metric-sub">pontos</div></div>
                <div className="metric"><div className="metric-label">Lançamentos</div><div className="metric-value">{lancsPac.length}</div></div>
              </div>
              <AjusteRapido onAjustar={(pts, obs) => ajustarPontos(detalhe.id, pts, obs)} />
              <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', margin: '16px 0 8px' }}>Histórico</h4>
              {lancsPac.length === 0 ? <div className="empty">Sem lançamentos</div> : (
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e8ecf0', color: '#6b7280' }}>Data</th><th>Ação</th><th>Pts</th><th>Status</th></tr></thead>
                  <tbody>
                    {lancsPac.map(l => (
                      <tr key={l.id}>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f2f5' }}>{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f2f5' }}>{l.cs_acoes?.nome || l.observacao || '—'}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f2f5', fontWeight: '700', color: l.pontos > 0 ? '#1E8449' : '#A93226' }}>{l.pontos > 0 ? '+' : ''}{l.pontos}</td>
                        <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f2f5' }}><span className={`badge ${l.status === 'aprovado' ? 'badge-green' : l.status === 'pendente' ? 'badge-amber' : 'badge-red'}`}>{l.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8ecf0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>{editId ? 'Editar paciente' : 'Novo paciente'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              {erro && <div className="alert alert-error">{erro}</div>}
              <div className="form-group"><label className="form-label">Nome completo *</label><input className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do paciente" /></div>
              <div className="form-group"><label className="form-label">CPF *</label><input className="form-input" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" /></div>
              <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: formatTel(e.target.value) }))} placeholder="(43) 99999-9999" /></div>
              <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
              <div className="form-group"><label className="form-label">Data de nascimento</label><input className="form-input" type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-header">
        <h1 className="admin-title">Pacientes</h1>
        <button className="btn btn-primary btn-sm" onClick={() => abrirModal()}>+ Novo paciente</button>
      </div>

      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <div className="card">
        <input className="form-input" placeholder="Buscar por nome, CPF ou telefone..." value={busca} onChange={e => setBusca(e.target.value)} style={{ marginBottom: '16px' }} />
        {loading ? <div className="spinner" /> : filtrados.length === 0 ? (
          <div className="empty">{busca ? 'Nenhum resultado encontrado' : 'Nenhum paciente cadastrado ainda'}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th style={{ textAlign: 'center' }}>Saldo</th><th>Ações</th></tr></thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.nome}</td>
                    <td className="text-muted">{formatCPF(p.cpf)}</td>
                    <td className="text-muted">{p.telefone ? formatTel(p.telefone) : '—'}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ fontWeight: '700', color: '#1A5276', fontSize: '15px' }}>{p.saldo_pontos}</span><span className="text-muted text-xs"> pts</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirDetalhe(p)}>Detalhes</button>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirModal(p)}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function AjusteRapido({ onAjustar }) {
  const [pts, setPts] = useState('')
  const [obs, setObs] = useState('')
  const [tipo, setTipo] = useState('ganho')
  function confirmar() {
    const n = parseInt(pts)
    if (!n || n <= 0) return
    onAjustar(tipo === 'ganho' ? n : -n, obs || `Ajuste manual (${tipo})`)
    setPts(''); setObs('')
  }
  return (
    <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '14px', border: '1px solid #e8ecf0' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>Ajuste manual de pontos</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '130px' }}>
          <option value="ganho">+ Adicionar</option>
          <option value="debito">- Debitar</option>
        </select>
        <input className="form-input" type="number" placeholder="Pontos" value={pts} onChange={e => setPts(e.target.value)} style={{ width: '100px' }} />
        <input className="form-input" placeholder="Motivo (opcional)" value={obs} onChange={e => setObs(e.target.value)} style={{ flex: 1, minWidth: '120px' }} />
        <button className="btn btn-primary btn-sm" onClick={confirmar} style={{ alignSelf: 'stretch' }}>Confirmar</button>
      </div>
    </div>
  )
}
