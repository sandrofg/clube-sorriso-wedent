import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const LIMITE_TIPOS = [
  { value: 'ilimitado', label: 'Ilimitado' },
  { value: 'por_periodo', label: 'Por período' },
]

const PERIODOS = [
  { value: 'dia',  label: 'Por dia' },
  { value: 'semana', label: 'Por semana' },
  { value: 'mes',  label: 'Por mês' },
  { value: 'ano',  label: 'Por ano' },
]

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  pontos: '',
  limite_tipo: 'ilimitado',
  limite_periodo: 'mes',
  limite_qtd: '',
  ativo: true,
}

export default function AdminAcoes() {
  const [acoes, setAcoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // id da ação a deletar
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => { loadAcoes() }, [])

  async function loadAcoes() {
    setLoading(true)
    const { data } = await supabase
      .from('cs_acoes')
      .select('*')
      .order('nome')
    setAcoes(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
    setModal(true)
  }

  function abrirEditar(a) {
    setEditandoId(a.id)
    setForm({
      nome: a.nome || '',
      descricao: a.descricao || '',
      pontos: a.pontos || '',
      limite_tipo: a.limite_tipo || 'ilimitado',
      limite_periodo: a.limite_periodo || 'mes',
      limite_qtd: a.limite_qtd || '',
      ativo: a.ativo !== false,
    })
    setErro('')
    setModal(true)
  }

  function fecharModal() {
    setModal(false)
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    if (!form.pontos || Number(form.pontos) <= 0) { setErro('Informe os pontos (deve ser maior que zero)'); return }
    if (form.limite_tipo === 'por_periodo' && (!form.limite_qtd || Number(form.limite_qtd) <= 0)) {
      setErro('Informe a quantidade máxima do limite'); return
    }

    setSaving(true); setErro('')

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      pontos: Number(form.pontos),
      limite_tipo: form.limite_tipo,
      limite_periodo: form.limite_tipo === 'por_periodo' ? form.limite_periodo : null,
      limite_qtd: form.limite_tipo === 'por_periodo' ? Number(form.limite_qtd) : null,
      ativo: form.ativo,
    }

    let error
    if (editandoId) {
      ;({ error } = await supabase.from('cs_acoes').update(payload).eq('id', editandoId))
    } else {
      ;({ error } = await supabase.from('cs_acoes').insert(payload))
    }

    setSaving(false)
    if (error) { setErro(error.message); return }

    setSucesso(editandoId ? 'Ação atualizada com sucesso!' : 'Ação criada com sucesso!')
    setTimeout(() => setSucesso(''), 3500)
    fecharModal()
    loadAcoes()
  }

  async function toggleAtivo(a) {
    await supabase.from('cs_acoes').update({ ativo: !a.ativo }).eq('id', a.id)
    loadAcoes()
  }

  async function deletar(id) {
    const { error } = await supabase.from('cs_acoes').delete().eq('id', id)
    if (error) {
      setSucesso('')
      setErro('Erro ao excluir: ' + error.message)
      setTimeout(() => setErro(''), 4000)
    } else {
      setSucesso('Ação excluída com sucesso!')
      setTimeout(() => setSucesso(''), 3500)
    }
    setConfirmDelete(null)
    loadAcoes()
  }

  const ativasCount = acoes.filter(a => a.ativo).length
  const inativasCount = acoes.filter(a => !a.ativo).length

  function labelLimite(a) {
    if (a.limite_tipo === 'ilimitado') return 'Ilimitado'
    const periodo = PERIODOS.find(p => p.value === a.limite_periodo)
    return `${a.limite_qtd}x ${periodo?.label || a.limite_periodo}`
  }

  return (
    <AdminLayout page="acoes" title="Ações">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Ações Pontuáveis</h1>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            {ativasCount} ativa{ativasCount !== 1 ? 's' : ''} · {inativasCount} inativa{inativasCount !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Nova ação</button>
      </div>

      {sucesso && <div className="alert alert-success">{sucesso}</div>}
      {erro && !modal && <div className="alert alert-error">{erro}</div>}

      {loading ? (
        <div className="spinner" />
      ) : acoes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
          Nenhuma ação cadastrada ainda.
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ação</th>
                  <th style={{ textAlign: 'center' }}>Pontos</th>
                  <th>Limite</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map(a => (
                  <tr key={a.id} style={{ opacity: a.ativo ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{a.nome}</div>
                      {a.descricao && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{a.descricao}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: '700', fontSize: '18px', color: '#1A5276',
                        background: '#EBF5FB', borderRadius: '8px',
                        padding: '4px 12px', display: 'inline-block',
                      }}>
                        +{a.pontos}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '12px', fontWeight: '500',
                        background: a.limite_tipo === 'ilimitado' ? '#D5F5E3' : '#FEF9C3',
                        color: a.limite_tipo === 'ilimitado' ? '#1E8449' : '#92400E',
                        borderRadius: '999px', padding: '3px 10px',
                      }}>
                        {labelLimite(a)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: '500',
                        background: a.ativo ? '#D5F5E3' : '#F3F4F6',
                        color: a.ativo ? '#1E8449' : '#6b7280',
                        borderRadius: '999px', padding: '3px 12px',
                      }}>
                        {a.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {/* Editar */}
                        <button
                          className="btn btn-sm"
                          style={{ background: '#EBF5FB', color: '#1A5276', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '500' }}
                          onClick={() => abrirEditar(a)}
                        >
                          ✏️ Editar
                        </button>
                        {/* Ativar/Desativar */}
                        <button
                          className="btn btn-sm"
                          style={{
                            background: a.ativo ? '#FEF9C3' : '#D5F5E3',
                            color: a.ativo ? '#92400E' : '#1E8449',
                            border: 'none', cursor: 'pointer', borderRadius: '8px',
                            padding: '6px 12px', fontSize: '12px', fontWeight: '500',
                          }}
                          onClick={() => toggleAtivo(a)}
                        >
                          {a.ativo ? '⊘ Pausar' : '✓ Ativar'}
                        </button>
                        {/* Excluir */}
                        <button
                          className="btn btn-sm"
                          style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '500' }}
                          onClick={() => setConfirmDelete(a)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDITAR / CRIAR ==================== */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            width: '100%', maxWidth: '480px',
            maxHeight: '92vh', overflowY: 'auto', padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                {editandoId ? 'Editar ação' : 'Nova ação'}
              </h2>
              <button onClick={fecharModal}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            {erro && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{erro}</div>}

            {/* Nome */}
            <div className="form-group">
              <label className="form-label">Nome da ação *</label>
              <input className="form-input" placeholder="Ex: Indicação fechada"
                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>

            {/* Descrição */}
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input" rows={2}
                placeholder="Explique quando esta ação se aplica..."
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>

            {/* Pontos */}
            <div className="form-group">
              <label className="form-label">Pontos concedidos *</label>
              <input className="form-input" type="number" min="1" placeholder="Ex: 40"
                value={form.pontos} onChange={e => setForm({ ...form, pontos: e.target.value })} />
            </div>

            {/* Limite */}
            <div className="form-group">
              <label className="form-label">Tipo de limite</label>
              <select className="form-select" value={form.limite_tipo}
                onChange={e => setForm({ ...form, limite_tipo: e.target.value })}>
                {LIMITE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {form.limite_tipo === 'por_periodo' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Período</label>
                  <select className="form-select" value={form.limite_periodo}
                    onChange={e => setForm({ ...form, limite_periodo: e.target.value })}>
                    {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd. máxima *</label>
                  <input className="form-input" type="number" min="1" placeholder="Ex: 3"
                    value={form.limite_qtd}
                    onChange={e => setForm({ ...form, limite_qtd: e.target.value })} />
                </div>
              </div>
            )}

            {/* Preview do limite */}
            {form.limite_tipo === 'por_periodo' && form.limite_qtd && (
              <div style={{ background: '#FEF9C3', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400E' }}>
                📌 Cada paciente poderá ganhar esta ação no máximo <strong>{form.limite_qtd}x {PERIODOS.find(p => p.value === form.limite_periodo)?.label?.toLowerCase()}</strong>
              </div>
            )}

            {/* Ativo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <input type="checkbox" id="acao-ativo" checked={form.ativo}
                onChange={e => setForm({ ...form, ativo: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1A5276' }} />
              <label htmlFor="acao-ativo" style={{ fontSize: '14px', cursor: 'pointer', color: '#374151' }}>
                Ação ativa (disponível para lançamentos)
              </label>
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar ação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CONFIRMAR EXCLUSÃO ==================== */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            width: '100%', maxWidth: '400px', padding: '28px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>Excluir ação?</h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Você está prestes a excluir a ação<br />
                <strong style={{ color: '#111' }}>"{confirmDelete.nome}"</strong>.<br />
                <span style={{ color: '#DC2626', fontSize: '13px' }}>Esta ação não pode ser desfeita.</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                onClick={() => deletar(confirmDelete.id)}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
