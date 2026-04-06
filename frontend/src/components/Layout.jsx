import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, FileText, Users, ShieldCheck, LogOut, TrendingUp } from 'lucide-react'

const ROLE_BADGE = { ADMIN: 'badge-admin', ANALYST: 'badge-analyst', VIEWER: 'badge-viewer' }

export default function Layout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const nav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  perm: 'dashboard:read' },
    { to: '/records',   icon: FileText,         label: 'Records',    perm: 'records:read' },
    { to: '/users',     icon: Users,             label: 'Users',      perm: 'users:read' },
    { to: '/audit',     icon: ShieldCheck,       label: 'Audit Log',  perm: 'audit:read' },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--bg-1)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', position: 'sticky', top: 0, height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <TrendingUp size={16} color="#0c0e14" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'1rem', letterSpacing:'.02em' }}>
              Ledger
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '.75rem .75rem' }}>
          {nav.filter(n => can(n.perm)).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '.65rem',
              padding: '.6rem .75rem', borderRadius: 'var(--radius)',
              marginBottom: '.2rem',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)', fontSize: '.78rem', fontWeight: 600,
              letterSpacing: '.04em',
              color: isActive ? 'var(--gold)' : 'var(--text-2)',
              background: isActive ? 'var(--gold-glow)' : 'transparent',
              transition: 'all .15s',
            })}>
              <Icon size={15} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.65rem', padding:'.5rem .25rem', marginBottom:'.4rem' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'.75rem', color:'var(--gold)'
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize:'.78rem', fontFamily:'var(--font-display)', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.name}
              </div>
              <span className={`badge ${ROLE_BADGE[user?.role]}`} style={{ marginTop:'.1rem' }}>{user?.role}</span>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }} onClick={handleLogout}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem 2rem 3rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
