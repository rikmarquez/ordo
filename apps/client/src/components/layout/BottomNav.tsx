'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, UtensilsCrossed, ShoppingCart, User } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navItems = [
  {
    name: 'Inicio',
    href: '/',
    icon: Home,
  },
  {
    name: 'Menú',
    href: '/menu',
    icon: UtensilsCrossed,
  },
  {
    name: 'Carrito',
    href: '/cart',
    icon: ShoppingCart,
  },
  {
    name: 'Perfil',
    href: '/profile',
    icon: User,
  },
]

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { cartItems } = useStore()
  
  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="flex justify-around max-w-md mx-auto py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isCart = item.href === '/cart'
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 text-xs font-medium transition-colors relative',
                isActive 
                  ? 'text-black' 
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  'h-5 w-5 mb-1',
                  isActive ? 'text-black' : 'text-gray-500'
                )} />
                {isCart && cartItemsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Badge>
                )}
              </div>
              <span className="truncate">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}