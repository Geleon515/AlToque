import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppNavbar from './AppNavbar'
import SidebarClient from './SidebarClient'
import SidebarWorker from './SidebarWorker'
import WorkerVerificationBanner from './WorkerVerificationBanner'

interface Props {
  role: 'client' | 'worker'
}

export default function AppLayout({ role }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeSidebar = () => setMobileOpen(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNavbar
        role={role}
        onMenuToggle={() => setMobileOpen(prev => !prev)}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] w-[180px] bg-white border-r border-[#E5E7EB] z-20 transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {role === 'client'
          ? <SidebarClient onNavigate={closeSidebar} />
          : <SidebarWorker onNavigate={closeSidebar} />
        }
      </aside>

      {/* Main content */}
      <main className="pt-16 md:pl-[180px] min-h-screen">
        <div className="p-8">
          {role === 'worker' && <WorkerVerificationBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
