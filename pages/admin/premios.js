import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

const NIVEIS = {
  1: { label: 'Nível 1 — Entrada',        color: '#4B5563', bg: '#F9FAFB' },
  2: { label: 'Nível 2 — Intermediário',  color: '#1A5276', bg: '#EBF5FB' },
  3: { label: 'Nível 3 — Avançado',       color: '#7D3C98', bg: '#F5EEF8' },
  4: { label: 'Nível 4 — Troféu',         color: '#B7950B', bg: '#FEFCE8' },
}

const FORM_VAZIO = {
  nome: '',
  nivel: 1,
  pontos_necessarios: '',
  descricao: '',
  foto_url: '',
  custo_clinica: '',
  ativo: true,
}

export default function AdminPremios() {
  const [premios, setPremios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState(0)
  const [modal, setModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => { loadPremios() }, [])

  async function loadPremios() {
    setLoading(true)
    const { data } = await supabase
      .from('cs_premios')
      .select('*')
      .order('nivel')
      .order('pontos_necessarios')
    setPremios(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditandoId(p.id)
    setForm({
      nome: p.nome || '',
      nivel: p.nivel || 1,
      pontos_necessarios: p.pontos_necessarios || '',
      descricao: p.descricao || '',
      foto_url: p.foto_url || '',
      custo_clinica: p.custo_clinica || '',
      ativo: p.ativo !== false,
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

  async function handleUploadFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErro('A foto deve ter no máximo 5MB')
      return
    }

    setUploading(true)
    setErro('')

    // Gerar nome único para o arquivo
    const ext = file.name.split('.').pop()
    const nomeArquivo = `premio_${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('premios-fotos')
      .upload(nomeArquivo, file, { upsert: true })

    if (error) {
      setErro('Erro ao enviar foto: ' + error.message)
      setUploading(false)
      return
    }

    // Pegar URL pública
    const { data: urlData } = supabase.storage
      .from('premios-fotos')
      .getPublicUrl(nomeArquivo)

    setForm(f => ({ ...f, foto_url: urlData.publicUrl }))
    setUploading(false)
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    if (!form.pontos_necessarios) { setErro('Informe os pontos necessários'); return }
    setSaving(true); setErro('')

    const payload = {
      nome: form.nome.trim(),
      nivel: Number(form.nivel),
      pontos_necessarios: Number(form.pontos_necessarios),
      descricao: form.descricao.trim() || null,
      foto_url: form.foto_url.trim() || null,
      custo_clinica: form.custo_clinica ? Number(form.custo_clinica) : null,
      ativo: form.ativo,
    }

    let error
    if (editandoId) {
      ;({ error } = await supabase.from('cs_premios').update(payload).eq('id', editandoId))
    } else {
      ;({ error } = await supabase.from('cs_premios').insert(payload))
    }

    setSaving(false)
    if (error) { setErro(error.message); return }

    setSucesso(editandoId ? 'Prêmio atualizado com sucesso!' : 'Prêmio adicionado com sucesso!')
    setTimeout(() => setSucesso(''), 3500)
    fecharModal()
    loadPremios()
  }

  async function toggleAtivo(p) {
    await supabase.from('cs_premios').update({ ativo: !p.ativo }).eq('id', p.id)
    loadPremios()
  }

  const premiosFiltrados = filtroNivel > 0
    ? premios.filter(p => p.nivel === filtroNivel)
    : premios

  return (
    <AdminLayout page="premios" title="Prêmios">
      <div className="admin-header">
        <h1 className="admin-title">Prêmios</h1>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Adicionar prêmio</button>
      </div>

      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      {/* Filtro por nível */}
      <div className="tabs" style={{ marginBottom: '28px' }}>
        <button className={`tab${filtroNivel === 0 ? ' active' : ''}`} onClick={() => setFiltroNivel(0)}>
          Todos ({premios.length})
        </button>
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            className={`tab${filtroNivel === n ? ' active' : ''}`}
            onClick={() => setFiltroNivel(n)}
          >
            Nível {n} ({premios.filter(p => p.nivel === n).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div>
          {[1, 2, 3, 4].map(n => {
            if (filtroNivel > 0 && filtroNivel !== n) return null
            const grupo = premiosFiltrados.filter(p => p.nivel === n)
            const info = NIVEIS[n]

            return (
              <div key={n} style={{ marginBottom: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: info.color, margin: 0 }}>
                    {info.label}
                  </h2>
                  <span style={{
                    background: info.bg, color: info.color,
                    border: `1px solid ${info.color}30`,
                    borderRadius: '999px', padding: '2px 12px',
                    fontSize: '12px', fontWeight: '500',
                  }}>
                    {grupo.length} prêmio{grupo.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {grupo.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', padding: '28px' }}>
                    Nenhum prêmio cadastrado neste nível
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                    {grupo.map(p => (
                      <div key={p.id} className="card" style={{ opacity: p.ativo ? 1 : 0.55, position: 'relative', padding: '0 0 16px' }}>
                        {!p.ativo && (
                          <div style={{
                            position: 'absolute', top: '10px', right: '10px',
                            background: '#6b7280', color: '#fff',
                            fontSize: '10px', borderRadius: '999px',
                            padding: '2px 10px', zIndex: 1,
                          }}>Inativo</div>
                        )}
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome}
                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                            onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '100px', background: info.bg,
                            borderRadius: '12px 12px 0 0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px',
                          }}>🏆</div>
                        )}
                        <div style={{ padding: '14px 16px 0' }}>
                          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{p.nome}</div>
                          {p.descricao && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' }}>
                              {p.descricao}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <span style={{ fontWeight: '700', fontSize: '20px', color: info.color }}>{p.pontos_necessarios} pts</span>
                            {p.custo_clinica != null && (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Custo: R$ {Number(p.custo_clinica).toFixed(2)}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-sm"
                              style={{ flex: 1, background: '#EBF5FB', color: '#1A5276', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontWeight: '500' }}
                              onClick={() => abrirEditar(p)}>✏️ Editar</button>
                            <button className="btn btn-sm"
                              style={{ flex: 1, background: p.ativo ? '#FEF2F2' : '#D5F5E3', color: p.ativo ? '#DC2626' : '#1E8449', border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontWeight: '500' }}
                              onClick={() => toggleAtivo(p)}>
                              {p.ativo ? '⊘ Desativar' : '✓ Ativar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ==================== MODAL ==================== */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            width: '100%', maxWidth: '500px',
            maxHeight: '92vh', overflowY: 'auto',
            padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                {editandoId ? 'Editar prêmio' : 'Novo prêmio'}
              </h2>
              <button onClick={fecharModal}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            {erro && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{erro}</div>}

            {/* Nome */}
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" placeholder="Ex: Limpeza dental grátis"
                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>

            {/* Nível + Pontos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nível *</label>
                <select className="form-select" value={form.nivel}
                  onChange={e => setForm({ ...form, nivel: Number(e.target.value) })}>
                  <option value={1}>Nível 1 — Entrada</option>
                  <option value={2}>Nível 2 — Intermediário</option>
                  <option value={3}>Nível 3 — Avançado</option>
                  <option value={4}>Nível 4 — Troféu</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pontos necessários *</label>
                <input className="form-input" type="number" min="1" placeholder="Ex: 100"
                  value={form.pontos_necessarios}
                  onChange={e => setForm({ ...form, pontos_necessarios: e.target.value })} />
              </div>
            </div>

            {/* Descrição */}
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input" rows={3} placeholder="Descreva o prêmio para o paciente..."
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                style={{ resize: 'vertical' }} />
            </div>

            {/* Upload de foto */}
            <div className="form-group">
              <label className="form-label">Foto do prêmio</label>

              {/* Preview da imagem atual */}
              {form.foto_url && (
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <img src={form.foto_url} alt="preview"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e8ecf0' }}
                    onError={e => { e.target.style.display = 'none' }} />
                  <button
                    onClick={() => setForm(f => ({ ...f, foto_url: '' }))}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: '28px', height: '28px', cursor: 'pointer',
                      fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                </div>
              )}

              {/* Botão de upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleUploadFoto}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #cbd5e0',
                  borderRadius: '10px',
                  background: uploading ? '#f9fafb' : '#fff',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  color: '#4B5563',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = '#1A5276')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#cbd5e0')}
              >
                {uploading ? (
                  <>⏳ Enviando foto...</>
                ) : form.foto_url ? (
                  <>📷 Trocar foto</>
                ) : (
                  <>📷 Escolher foto do computador</>
                )}
              </button>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                JPG, PNG, WEBP ou GIF · Máximo 5MB
              </div>
            </div>

            {/* Custo */}
            <div className="form-group">
              <label className="form-label">Custo para a clínica (R$)</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Ex: 50.00"
                value={form.custo_clinica}
                onChange={e => setForm({ ...form, custo_clinica: e.target.value })} />
            </div>

            {/* Ativo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <input type="checkbox" id="modal-ativo" checked={form.ativo}
                onChange={e => setForm({ ...form, ativo: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1A5276' }} />
              <label htmlFor="modal-ativo" style={{ fontSize: '14px', cursor: 'pointer', color: '#374151' }}>
                Prêmio ativo (disponível para resgate)
              </label>
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={salvar} disabled={saving || uploading}>
                {saving ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Adicionar prêmio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
