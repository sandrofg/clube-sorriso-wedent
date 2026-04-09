import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

function fmt(d) { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const STATUS_MAP = {
  solicitado: { label: 'Solicitado', cls: 'badge-amber', next: 'em_andamento', nextLabel: 'Iniciar atendimento' },
  em_andamento: { label: 'Em andamento', cls: 'badge-blue', next: 'entregue', nextLabel: 'Marcar como entregue' },
  entregue: { label: 'Entregue', cls: 'badge-green', next: null, nextLabel: null },
  cancelado: { label: 'Cancelado', cls: 'badge-red', next: null, nextLabel: null },
}

export default function AdminResgates() {
  const [resgates, setResgates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('abertos')
  const [salvando, setSalvando] = useState(null)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => { loadResgates() }, [])

  async function loadResgates() {
    setLoading(true)
    const { data } = await supabase
      .from('cs_resgates')
      .select('*, cs_pacientes(nome, cpf, saldo_pontos, telefone)')
      .order('solicitado_em', { ascending: false })
    setResgates(data || [])
    setLoading(false)
  }

  async function avancarStatus(r) {
    const prox = STATUS_MAP[r.status]?.next
    if (!prox) return
    setSalvando(r.id)
    const admin = JSON.parse(localStorage.getItem('cs_admin') || '{}')
    const update = { status: prox, atendido_por: admin.nome }
    if (prox === 'entregue') {
      update.entregue_em = new Date().toISOString()
      // Debitar pontos do saldo e registrar lançamento
      const { data: pac } = await supabase.from('cs_pacientes').select('saldo_pontos').eq('id', r.paciente_id).single()
      const novoSaldo = Math.max(0, (pac?.saldo_pontos || 0) - r.pontos_debitados)
      await supabase.from('cs_pacientes').update({ saldo_pontos: novoSaldo }).eq('id', r.paciente_id)
      await supabase.from('cs_lancamentos').insert({
        paciente_id: r.paciente_id,
        pontos: -r.pontos_debitados,
        tipo: 'resgate',
        status: 'aprovado',
        observacao: `Resgate: ${r.premio_nome}`,
        validado_por: admin.nome,
        validado_em: new Date().toISOString(),
        created_by: admin.nome,
      })
    }
    await supabase.from('cs_resgates').update(update).eq('id', r.id)
    setSucesso(prox === 'entregue' ? `Resgate entregue! ${r.pontos_debitados} pts debitados de ${r.cs_pacientes?.nome}` : 'Status atualizado')
    setTimeout(() => setSucesso(''), 4000)
    setSalvando(null)
    loadResgates()
  }

  async function cancelar(r) {
    if (!confirm(`Cancelar resgate de "${r.premio_nome}" para ${r.cs_pacientes?.nome}?`)) return
    await supabase.from('cs_resgates').update({ status: 'cancelado' }).eq('id', r.id)
    loadResgates()
  }

  const filtrados = resgates.filter(r => {
    if (filtro === 'abertos') return ['solicitado', 'em_andamento'].includes(r.status)
    if (filtro === 'entregues') return r.status === 'entregue'
    if (filtro === 'cancelados') return r.status === 'cancelado'
    return true
  })

  const counts = {
    abertos: resgates.filter(r => ['solicitado', 'em_andamento'].includes(r.status)).length,
    entregues: resgates.filter(r => r.status === 'entregue').length,
    cancelados: resgates.filter(r => r.status === 'cancelado').length,
  }

  return (
    <AdminLayout page="resgates" title="Resgates">
      <div className="admin-header">
        <h1 className="admin-title">Resgates</h1>
      </div>

      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <div className="metrics" style={{ marginBottom: '20px' }}>
        <div className="metric"><div className="metric-label">Em aberto</div><div className="metric-value" style={{ color: counts.abertos > 0 ? '#D35400' : '#6b7280' }}>{counts.abertos}</div></div>
        <div className="metric"><div className="metric-label">Entregues</div><div className="metric-value" style={{ color: '#1E8449' }}>{counts.entregues}</div></div>
        <div className="metric"><div className="metric-label">Cancelados</div><div className="metric-value" style={{ color: '#6b7280' }}>{counts.cancelados}</div></div>
        <div className="metric"><div className="metric-label">Total</div><div className="metric-value">{resgates.length}</div></div>
      </div>

      <div className="tabs">
        {[['abertos', `Em aberto (${counts.abertos})`], ['entregues', `Entregues (${counts.entregues})`], ['cancelados', 'Cancelados'], ['todos', 'Todos']].map(([k, l]) => (
          <button key={k} className={`tab${filtro === k ? ' active' : ''}`} onClick={() => setFiltro(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="spinner" /> : filtrados.length === 0 ? (
          <div className="empty">Nenhum resgate {filtro === 'abertos' ? 'em aberto' : filtro}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtrados.map(r => {
              const sm = STATUS_MAP[r.status]
              const tel = r.cs_pacientes?.telefone
              return (
                <div key={r.id} style={{ border: '1px solid #e8ecf0', borderRadius: '10px', padding: '16px', background: r.status === 'solicitado' ? '#FEF9F0' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{r.premio_nome}</span>
                        <span className={`badge ${sm.cls}`}>{sm.label}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151', marginBottom: '2px' }}>
                        <strong>{r.cs_pacientes?.nome}</strong>
                        {tel && <> · <a href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer" style={{ color: '#1E8449' }}>WhatsApp</a></>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Solicitado em {fmt(r.solicitado_em)} · <span style={{ fontWeight: '600', color: '#A93226' }}>{r.pontos_debitados} pts a debitar</span>
                        {r.observacao && ` · Obs: ${r.observacao}`}
                        {r.atendido_por && ` · Atendido por: ${r.atendido_por}`}
                        {r.entregue_em && ` · Entregue em: ${fmt(r.entregue_em)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {sm.next && (
                        <button className={`btn btn-sm ${sm.next === 'entregue' ? 'btn-success' : 'btn-primary'}`} onClick={() => avancarStatus(r)} disabled={salvando === r.id}>
                          {salvando === r.id ? '...' : sm.nextLabel}
                        </button>
                      )}
                      {['solicitado', 'em_andamento'].includes(r.status) && (
                        <button className="btn btn-outline btn-sm" onClick={() => cancelar(r)}>Cancelar</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
