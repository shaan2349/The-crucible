import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col bg-parchment-100">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md">
          <Outlet />
        </div>
      </div>
      <TabBar />
    </div>
  )
}
