import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import Credits from './Credits.jsx'
import Toaster from '../notifications/Toaster.jsx'
import { NotificationsProvider } from '../../context/NotificationsContext.jsx'

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <NotificationsProvider>
      <div className="min-h-full">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          <footer className="border-t border-black/5 px-4 py-4 text-center sm:px-6">
            <Credits />
          </footer>
        </div>
        <Toaster />
      </div>
    </NotificationsProvider>
  )
}