import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function fmt(d) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }

export default function AdminDashboard() {
  const [stats, setStats] = useState({ pacientes: 0, pontos: 0, pendentes: 0, resgates: 0 })
  const [recentes, setRecentes] = useState([])
  const [resgatesPend, setResgatesPend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ count: cp }, { data: pts }, { count: pend }, { count: res }, { data: lanc }, { data: resg }] = await Promise.all([
      supabase.from('cs_pacientes').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('cs_pacientes').select('saldo_pontos'),
      supabase.from('cs_lancamentos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('cs_resgates').select('*', { count: 'exact', head: true }).in('status', ['solicitado', 'em_andamento']),
      supabase.from('cs_lancamentos').select('*, cs_pacientes(nome), cs_acoes(nome)').order('created_at', { ascending: false }).limit(8),
      supabase.from('cs_resgates').select('*, cs_pacientes(nome)').in('status', ['solicitado', 'em_andamento']).order('solicitado_em', { ascending: false }).limit(5),
    ])
    const totalPts = (pts || []).reduce((a, p) => a + (p.saldo_pontos || 0), 0)
    setStats({ pacientes: cp || 0, pontos: totalPts, pendentes: pend || 0, resgates: res || 0 })
    setRecentes(lanc || [])
    setResgatesPend(resg || [])
    setLoading(false)
  }

  async function aprovarLancamento(id, pacienteId, pontos) {
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    await supabase.from('cs_lancamentos').update({ status: 'aprovado', validado_por: admin.nome, validado_em: new Date().toISOString() }).eq('id', id)
    await supabase.from('cs_pacientes').update({ saldo_pontos: supabase.rpc ? undefined : undefined }).eq('id', pacienteId)
    await supabase.rpc('incrementar_pontos', { pid: pacienteId, pts: pontos }).catch(async () => {
      const { data: p } = await supabase.from('cs_pacientes').select('saldo_pontos').eq('id', pacienteId).single()
      await supabase.from('cs_pacientes').update({ saldo_pontos: (p?.saldo_pontos || 0) + pontos }).eq('id', pacienteId)
    })
    loadData()
  }

  async function rejeitarLancamento(id) {
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    await supabase.from('cs_lancamentos').update({ status: 'rejeitado', validado_por: admin.nome, validado_em: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  return (
    <AdminLayout page="dashboard" title="Dashboard">
      <div className="admin-header">
        <h1 className="admin-title">Dashboard</h1>
        <button className="btn btn-outline btn-sm" onClick={loadData}>↻ Atualizar</button>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          <div className="metrics">
            <div className="metric"><div className="metric-label">Pacientes ativos</div><div className="metric-value">{stats.pacientes}</div></div>
            <div className="metric"><div className="metric-label">Total de pontos</div><div className="metric-value">{stats.pontos.toLocaleString('pt-BR')}</div><div className="metric-sub">distribuídos</div></div>
            <div className="metric"><div className="metric-label">Pendentes</div><div className="metric-value" style={{ color: stats.pendentes > 0 ? '#D35400' : '#1E8449' }}>{stats.pendentes}</div><div className="metric-sub">aguardando aprovação</div></div>
            <div className="metric"><div className="metric-label">Resgates</div><div className="metric-value" style={{ color: stats.resgates > 0 ? '#1A5276' : '#6b7280' }}>{stats.resgates}</div><div className="metric-sub">em aberto</div></div>
          </div>

          {/* Pendentes de aprovação */}
          {recentes.filter(l => l.status === 'pendente').length > 0 && (
            <div className="card" style={{ borderColor: '#F0B27A', background: '#FEF9F0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#D35400' }}>
                ⏳ Lançamentos pendentes de aprovação
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentes.filter(l => l.status === 'pendente').map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid #F0B27A' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{l.cs_pacientes?.nome}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{l.cs_acoes?.nome || l.observacao} · {fmt(l.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#1E8449', fontSize: '15px' }}>+{l.pontos} pts</span>
                      <button className="btn btn-success btn-sm" onClick={() => aprovarLancamento(l.id, l.paciente_id, l.pontos)}>Aprovar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => rejeitarLancamento(l.id)}>Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resgates pendentes */}
          {resgatesPend.length > 0 && (
            <div className="card" style={{ borderColor: '#85C1E9', background: '#EBF5FB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1A5276' }}>🎁 Resgates em aberto</h3>
                <button className="btn btn-outline btn-sm" onClick={() => window.location.href = '/admin/resgates'}>Ver todos →</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Paciente</th><th>Prêmio</th><th>Pontos</th><th>Status</th><th>Solicitado em</th></tr></thead>
                  <tbody>
                    {resgatesPend.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: '500' }}>{r.cs_pacientes?.nome}</td>
                        <td>{r.premio_nome}</td>
                        <td style={{ fontWeight: '700', color: '#A93226' }}>-{r.pontos_debitados} pts</td>
                        <td><span className={`badge ${r.status === 'solicitado' ? 'badge-amber' : 'badge-blue'}`}>{r.status === 'solicitado' ? 'Solicitado' : 'Em andamento'}</span></td>
                        <td className="text-muted text-sm">{fmt(r.solicitado_em)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Atividade recente */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Atividade recente</h3>
            {recentes.filter(l => l.status !== 'pendente').length === 0 ? (
              <div className="empty">Nenhuma atividade ainda</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Paciente</th><th>Ação</th><th>Pontos</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentes.filter(l => l.status !== 'pendente').map(l => (
                      <tr key={l.id}>
                        <td className="text-sm">{fmt(l.created_at)}</td>
                        <td style={{ fontWeight: '500' }}>{l.cs_pacientes?.nome}</td>
                        <td>{l.cs_acoes?.nome || l.observacao || '—'}</td>
                        <td style={{ fontWeight: '700', color: l.pontos > 0 ? '#1E8449' : '#A93226' }}>{l.pontos > 0 ? '+' : ''}{l.pontos}</td>
                        <td><span className={`badge ${l.status === 'aprovado' ? 'badge-green' : l.status === 'pendente' ? 'badge-amber' : 'badge-red'}`}>{l.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
