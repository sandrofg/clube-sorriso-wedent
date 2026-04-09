import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

const NIVEL_LABEL = ['','Nível 1 — Entrada','Nível 2 — Intermediário','Nível 3 — Avançado','Nível 4 — Troféu']
const NIVEL_CLS = ['','nivel-1','nivel-2','nivel-3','nivel-4']

function formatCPF(v){ return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') }
function formatDate(d){ return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) }

export default function PacienteDashboard() {
  const router = useRouter()
  const { cpf } = router.query
  const [paciente, setPaciente] = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  const [premios, setPremios] = useState([])
  const [resgates, setResgates] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('saldo')
  const [error, setError] = useState('')
  const [resgateSel, setResgateSel] = useState(null)
  const [resgateObs, setResgateObs] = useState('')
  const [resgateSending, setResgateSending] = useState(false)
  const [resgateSuccess, setResgateSuccess] = useState(false)

  useEffect(() => {
    if (!cpf) return
    loadData()
  }, [cpf])

  async function loadData() {
    setLoading(true)
    const [{ data: pac }, { data: lanc }, { data: prem }, { data: res }] = await Promise.all([
      supabase.from('cs_pacientes').select('*').eq('cpf', cpf).single(),
      supabase.from('cs_lancamentos').select('*, cs_acoes(nome)').eq('paciente_id', '').order('created_at', { ascending: false }),
      supabase.from('cs_premios').select('*').eq('ativo', true).order('pontos_necessarios'),
      supabase.from('cs_resgates').select('*').order('solicitado_em', { ascending: false }),
    ])
    if (!pac) { setError('CPF não encontrado. Verifique com a recepção da Wedent.'); setLoading(false); return }
    setPaciente(pac)
    const lancFiltered = await supabase.from('cs_lancamentos').select('*, cs_acoes(nome)').eq('paciente_id', pac.id).order('created_at', { ascending: false })
    setLancamentos(lancFiltered.data || [])
    const resFiltered = await supabase.from('cs_resgates').select('*').eq('paciente_id', pac.id).order('solicitado_em', { ascending: false })
    setResgates(resFiltered.data || [])
    setPremios(prem || [])
    setLoading(false)
  }

  async function solicitarResgate() {
    if (!resgateSel) return
    setResgateSending(true)
    const { error } = await supabase.from('cs_resgates').insert({
      paciente_id: paciente.id,
      premio_id: resgateSel.id,
      premio_nome: resgateSel.nome,
      pontos_debitados: resgateSel.pontos_necessarios,
      observacao: resgateObs,
      status: 'solicitado'
    })
    if (!error) {
      setResgateSuccess(true)
      setResgateSel(null)
      setResgateObs('')
      setTimeout(() => setResgateSuccess(false), 4000)
    }
    setResgateSending(false)
  }

  if (loading) return <div className="page"><div className="spinner"/></div>
  if (error) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',padding:'20px'}}>
      <div className="alert alert-error" style={{maxWidth:'400px'}}>{error}</div>
      <button className="btn btn-outline" onClick={() => router.push('/')}>← Voltar</button>
    </div>
  )

  const saldo = paciente.saldo_pontos
  const premiosAtingíveis = premios.filter(p => p.pontos_necessarios <= saldo)
  const proximo = premios.find(p => p.pontos_necessarios > saldo)

  return (
    <>
      <Head><title>Clube Sorriso — {paciente.nome}</title></Head>
      <div className="page">
        <div className="header">
          <div>
            <div className="header-logo">Clube Sorriso Wedent</div>
            <div className="header-sub">Olá, {paciente.nome.split(' ')[0]}!</div>
          </div>
          <button className="nav-btn" onClick={() => router.push('/')}>← Voltar</button>
        </div>

        <div className="container" style={{padding:'24px 20px',flex:1}}>
          {/* Hero de pontos */}
          <div className="points-hero">
            <div className="points-number">{saldo.toLocaleString('pt-BR')}</div>
            <div className="points-label">pontos acumulados</div>
            {proximo && (
              <div style={{marginTop:'16px',background:'rgba(255,255,255,.15)',borderRadius:'10px',padding:'10px 16px',fontSize:'13px'}}>
                Faltam <strong>{(proximo.pontos_necessarios - saldo).toLocaleString('pt-BR')} pts</strong> para o próximo prêmio: <strong>{proximo.nome}</strong>
              </div>
            )}
          </div>

          {resgateSuccess && <div className="alert alert-success">Solicitação de resgate enviada! A equipe Wedent entrará em contato em até 48h.</div>}

          {/* Tabs */}
          <div className="tabs">
            {[['saldo','Meus Pontos'],['historico','Histórico'],['catalogo','Catálogo'],['resgates','Meus Resgates']].map(([k,l]) => (
              <button key={k} className={`tab${tab===k?' active':''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {/* Tab: Saldo */}
          {tab === 'saldo' && (
            <div>
              <div className="metrics">
                <div className="metric"><div className="metric-label">Saldo atual</div><div className="metric-value">{saldo}</div><div className="metric-sub">pontos</div></div>
                <div className="metric"><div className="metric-label">Prêmios atingíveis</div><div className="metric-value">{premiosAtingíveis.length}</div><div className="metric-sub">disponíveis agora</div></div>
                <div className="metric"><div className="metric-label">Lançamentos</div><div className="metric-value">{lancamentos.filter(l=>l.status==='aprovado').length}</div><div className="metric-sub">aprovados</div></div>
                <div className="metric"><div className="metric-label">Resgates</div><div className="metric-value">{resgates.length}</div><div className="metric-sub">realizados</div></div>
              </div>

              <div className="card">
                <h3 style={{fontSize:'15px',fontWeight:'600',marginBottom:'4px',color:'#1A5276'}}>Como ganhar pontos</h3>
                <p className="text-muted" style={{marginBottom:'16px'}}>Realize essas ações e acumule pontos para trocar por prêmios incríveis</p>
                <div style={{display:'grid',gap:'8px'}}>
                  {[
                    ['Indicar alguém que fecha tratamento','40 pts','Ilimitado'],
                    ['Indicação cadastrada (só a avaliação)','6 pts','Ilimitado'],
                    ['Depoimento em vídeo aprovado','30 pts','1x/trimestre'],
                    ['Avaliação 5★ no Google','20 pts','1x total'],
                    ['Check-up semestral realizado','16 pts','2x/ano'],
                    ['Compartilhar post nos stories','5 pts','1x/semana'],
                    ['Aniversário do paciente','10 pts','1x/ano'],
                  ].map(([a,p,l]) => (
                    <div key={a} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#f8f9fb',borderRadius:'8px'}}>
                      <span style={{fontSize:'13px',color:'#374151'}}>{a}</span>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0,marginLeft:'12px'}}>
                        <span style={{fontWeight:'700',color:'#1E8449',fontSize:'14px'}}>{p}</span>
                        <span className="badge badge-gray">{l}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Histórico */}
          {tab === 'historico' && (
            <div className="card">
              {lancamentos.length === 0 ? (
                <div className="empty">Nenhum lançamento ainda.<br/>Comece indicando amigos para ganhar pontos!</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Data</th><th>Ação</th><th>Pontos</th><th>Status</th><th>Validado por</th></tr></thead>
                    <tbody>
                      {lancamentos.map(l => (
                        <tr key={l.id}>
                          <td className="text-sm">{formatDate(l.created_at)}</td>
                          <td>{l.cs_acoes?.nome || l.observacao || '—'}</td>
                          <td style={{fontWeight:'700',color: l.pontos>0?'#1E8449':'#A93226'}}>{l.pontos>0?'+':''}{l.pontos} pts</td>
                          <td>
                            <span className={`badge ${l.status==='aprovado'?'badge-green':l.status==='pendente'?'badge-amber':'badge-red'}`}>
                              {l.status==='aprovado'?'Aprovado':l.status==='pendente'?'Pendente':'Rejeitado'}
                            </span>
                          </td>
                          <td className="text-muted">{l.validado_por||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Catálogo */}
          {tab === 'catalogo' && (
            <div>
              {resgateSel && (
                <div className="card" style={{borderColor:'#1E8449',background:'#f8fffe'}}>
                  <h3 style={{fontSize:'15px',fontWeight:'600',marginBottom:'4px',color:'#1E8449'}}>Solicitar resgate: {resgateSel.nome}</h3>
                  <p className="text-muted mb-16">Serão debitados <strong>{resgateSel.pontos_necessarios} pontos</strong> do seu saldo. A equipe Wedent entrará em contato em até 48h.</p>
                  <div className="form-group">
                    <label className="form-label">Observação (opcional)</label>
                    <input className="form-input" placeholder="Ex: prefiro receber no WhatsApp" value={resgateObs} onChange={e=>setResgateObs(e.target.value)}/>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button className="btn btn-success" onClick={solicitarResgate} disabled={resgateSending}>{resgateSending?'Enviando...':'Confirmar solicitação'}</button>
                    <button className="btn btn-outline" onClick={()=>setResgateSel(null)}>Cancelar</button>
                  </div>
                </div>
              )}
              {[1,2,3,4].map(nv => {
                const pvs = premios.filter(p=>p.nivel===nv)
                return (
                  <div key={nv} style={{marginBottom:'24px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                      <span className={`badge ${NIVEL_CLS[nv]}`}>{NIVEL_LABEL[nv]}</span>
                    </div>
                    <div className="prizes-grid">
                      {pvs.map(p => {
                        const ok = p.pontos_necessarios <= saldo
                        return (
                          <div key={p.id} className={`prize-card${ok?' reachable':''}`}>
                            <div className="prize-name">{p.nome}</div>
                            <div className="prize-pts">{p.pontos_necessarios} <span className="prize-pts-label">pts</span></div>
                            <div style={{fontSize:'11px',color:'#6b7280',marginTop:'4px'}}>{p.modelo} · {p.limite_resgate}</div>
                            {ok ? (
                              <button className="btn btn-success btn-sm btn-full" style={{marginTop:'10px'}} onClick={()=>{setResgateSel(p);setTab('catalogo');window.scrollTo({top:0,behavior:'smooth'})}}>
                                Resgatar
                              </button>
                            ) : (
                              <div style={{marginTop:'10px',fontSize:'11px',color:'#6b7280'}}>Faltam {p.pontos_necessarios - saldo} pts</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tab: Resgates */}
          {tab === 'resgates' && (
            <div className="card">
              {resgates.length === 0 ? (
                <div className="empty">Você ainda não fez nenhum resgate.<br/>Explore o catálogo e troque seus pontos!</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Data</th><th>Prêmio</th><th>Pontos</th><th>Status</th><th>Entregue em</th></tr></thead>
                    <tbody>
                      {resgates.map(r => (
                        <tr key={r.id}>
                          <td className="text-sm">{formatDate(r.solicitado_em)}</td>
                          <td style={{fontWeight:'500'}}>{r.premio_nome}</td>
                          <td style={{fontWeight:'700',color:'#A93226'}}>-{r.pontos_debitados} pts</td>
                          <td>
                            <span className={`badge ${r.status==='entregue'?'badge-green':r.status==='em_andamento'?'badge-blue':r.status==='cancelado'?'badge-red':'badge-amber'}`}>
                              {r.status==='entregue'?'Entregue':r.status==='em_andamento'?'Em andamento':r.status==='cancelado'?'Cancelado':'Solicitado'}
                            </span>
                          </td>
                          <td className="text-muted">{r.entregue_em ? formatDate(r.entregue_em) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
