import { NavLink, Outlet, useNavigate } from 'react-router'
import { useSession, useSignOut } from '../api/session.js'
import { AiNotice } from './AiNotice.js'

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/to-archive', label: 'To Archive' },
  { to: '/to-respond', label: 'To Respond' },
  { to: '/to-read', label: 'To Read' },
  { to: '/settings', label: 'Settings' },
  { to: '/activity', label: 'Activity log' },
]

export const Layout = () => {
  const { data: session } = useSession()
  const signOut = useSignOut()
  const navigate = useNavigate()

  const handleSignOut = async (): Promise<void> => {
    await signOut()
    await navigate('/sign-in')
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">EmailManager</span>
        <nav className="app-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="account">
          {session ? <span data-testid="signed-in-email">{session.email}</span> : null}
          <button type="button" className="link-button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <AiNotice />
      </footer>
    </div>
  )
}
