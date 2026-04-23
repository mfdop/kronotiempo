import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  {
    to: '/animales',
    label: 'Animales',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke={active ? '#7B1F3A' : '#A08888'} strokeWidth="2" strokeLinecap="round">
        <ellipse cx="12" cy="8" rx="5" ry="5"/>
        <path d="M3 20c1.5-2 3.5-3 5-2s3 2 4 1 2.5-2 4-1 3 1 4 2"/>
      </svg>
    ),
  },
  {
    to: '/parcelas',
    label: 'Parcelas',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke={active ? '#7B1F3A' : '#A08888'} strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke={active ? '#7B1F3A' : '#A08888'} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"/>
      </svg>
    ),
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke={active ? '#7B1F3A' : '#A08888'} strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
]

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto" style={{ background: '#F7F3EE' }}>
      {/* Main content — scrollable */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="safe-bottom shrink-0"
           style={{ background: '#FFFFFF', borderTop: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1"
            >
              {({ isActive }) => (
                <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                       style={{ background: isActive ? '#F5E8EC' : 'transparent' }}>
                    {tab.icon(isActive)}
                  </div>
                  <span className="text-[10px] font-medium transition-colors"
                        style={{ color: isActive ? '#7B1F3A' : '#A08888' }}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
