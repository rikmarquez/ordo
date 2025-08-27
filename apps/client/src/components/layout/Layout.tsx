interface LayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  showBottomNav?: boolean
}

import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function Layout({ 
  children, 
  header, 
  showBottomNav = true 
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {header || <Header />}
      
      <main className={showBottomNav ? 'pb-16' : ''}>
        <div className="max-w-md mx-auto bg-white min-h-screen">
          {children}
        </div>
      </main>
      
      {showBottomNav && <BottomNav />}
    </div>
  )
}