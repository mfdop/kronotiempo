import { NavLink, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

// ─── Tab bar icons ───────────────────────────────────────────────────────────
// One system for all four: 24px grid, 1.8 stroke, round caps/joins.
// Inactive = outline in tertiary tone. Active = granate outline + soft
// granate duotone fill on the main shape.
const GRANATE = '#7B1F3A'
const MUTED   = '#A08888'
const TINT    = 'rgba(123,31,58,0.16)'

function TabIcon({ active, children }: { active: boolean; children: (fill: string) => ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden
         stroke={active ? GRANATE : MUTED} strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      {children(active ? TINT : 'none')}
    </svg>
  )
}

const tabs = [
  {
    to: '/animales',
    label: 'Animales',
    // Horse head in profile with mane
    icon: (active: boolean) => (
      <TabIcon active={active}>
        {fill => (
          <>
            <path fill={fill}
                  d="M18.6 21C18.9 16.4 18.3 12.4 16.3 9.2L16.5 3.4L13.7 6.1C11.4 6.5 9.3 7.9 7.9 10L4.5 14.5C3.9 15.3 4.2 16.4 5.1 16.8L6.4 17.5C7.2 17.9 8.2 17.6 8.7 16.9L9.9 15.3C11.1 15.6 12.3 15.3 13.2 14.6L11.7 21Z" />
            <path d="M17.4 7.4L19.6 9.1M18.6 11.2L20.6 12.6M19.2 15L21 16.1" />
            <circle cx="11.6" cy="10.2" r="0.95" fill={active ? GRANATE : MUTED} stroke="none" />
          </>
        )}
      </TabIcon>
    ),
  },
  {
    to: '/parcelas',
    label: 'Parcelas',
    // Fenced meadow
    icon: (active: boolean) => (
      <TabIcon active={active}>
        {fill => (
          <>
            <path fill={fill} d="M5.5 20V9.2L7.3 7L9.1 9.2V20Z" />
            <path fill={fill} d="M14.9 20V9.2L16.7 7L18.5 9.2V20Z" />
            <path d="M9.1 11.8H14.9M9.1 15.8H14.9M2.5 11.8H5.5M2.5 15.8H5.5M18.5 11.8H21.5M18.5 15.8H21.5" />
            <path d="M2.5 20H21.5" />
            <path d="M11.2 20L10.6 18.6M12.8 20L13.4 18.6" strokeWidth="1.4" />
          </>
        )}
      </TabIcon>
    ),
  },
  {
    to: '/clientes',
    label: 'Clientes',
    // Two people
    icon: (active: boolean) => (
      <TabIcon active={active}>
        {fill => (
          <>
            <path d="M15.2 4.6A3 3 0 0 1 15.2 10.6M17.6 14C19.6 14.6 21 16.4 21 18.8" />
            <circle cx="9.5" cy="7.8" r="3.4" fill={fill} />
            <path fill={fill} d="M3 19.4C3 16 5.9 13.6 9.5 13.6C13.1 13.6 16 16 16 19.4Z" />
          </>
        )}
      </TabIcon>
    ),
  },
  {
    to: '/agenda',
    label: 'Agenda',
    // Calendar with check
    icon: (active: boolean) => (
      <TabIcon active={active}>
        {fill => (
          <>
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" fill={fill} />
            <path d="M3.5 10H20.5M8 3V6.6M16 3V6.6" />
            <path d="M9 15.2L11.1 17.2L15.2 13" strokeWidth="2" />
          </>
        )}
      </TabIcon>
    ),
  },
]

export default function AppLayout() {
  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto" style={{ background: '#F7F3EE' }}>
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
              className="flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-1.5 px-1"
            >
              {({ isActive }) => (
                <>
                  <div className="h-8 w-14 rounded-full flex items-center justify-center transition-all duration-200"
                       style={{
                         background: isActive ? '#F5E8EC' : 'transparent',
                         transform: isActive ? 'scale(1)' : 'scale(0.96)',
                       }}>
                    {tab.icon(isActive)}
                  </div>
                  <span className="text-[10.5px] transition-colors"
                        style={{ color: isActive ? GRANATE : MUTED, fontWeight: isActive ? 700 : 500 }}>
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
