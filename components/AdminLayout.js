import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const MENU = [
  { key: 'dashboard',   label: 'Dashboard',       icon: '📊', href: '/admin/dashboard' },
  { key: 'pacientes',   label: 'Pacientes',        icon: '👤', href: '/admin/pacientes' },
  { key: 'acoes',       label: 'Ações',            icon: '⚡', href: '/admin/acoes' },
  { key: 'premios',     label: 'Prêmios',          icon: '🎁', href: '/admin/premios' },
  { key: 'lancamentos', label: 'Lançar Pontos',    icon: '⭐', href: '/admin/lancamentos' },
  { key: 'resgates',    label: 'Resgates',         icon: '🔄', href: '/admin/resgates' },
]

export default function AdminLayout({ children, page, title }) {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    const a = localStorage.getItem('cs_admin')
    if (!a) { router.push('/admin'); return }
    setAdmin(JSON.parse(a))
  }, [])

  function logout() {
    localStorage.removeItem('cs_admin')
    router.push('/admin')
  }

  if (!admin) return null

  return (
    <>
      <Head><title>{title || 'Admin'} — Clube Sorriso Wedent</title></Head>
      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-text">Clube Sorriso</div>
            <div className="sidebar-logo-sub">Wedent Clínica Odontológica</div>
          </div>
          <nav className="sidebar-nav">
            {MENU.map(m => (
              <button
                key={m.key}
                className={`sidebar-link${page === m.key ? ' active' : ''}`}
                onClick={() => router.push(m.href)}
              >
                <span className="sidebar-icon">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '4px' }}>Logado como</div>
            <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500', marginBottom: '10px' }}>{admin.nome}</div>
            <button className="sidebar-link" style={{ color: 'rgba(255,255,255,.6)', padding: '8px 0' }} onClick={logout}>
              <span className="sidebar-icon">🚪</span> Sair
            </button>
          </div>
        </aside>
        <main className="admin-main">
          <div className="admin-content">{children}</div>
        </main>
      </div>
    </>
  )
}
