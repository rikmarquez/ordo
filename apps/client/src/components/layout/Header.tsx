'use client'

import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, User, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title?: string
  showBack?: boolean
  showCart?: boolean
  showProfile?: boolean
}

export function Header({ 
  title = 'Ordo', 
  showBack = false, 
  showCart = true, 
  showProfile = true 
}: HeaderProps) {
  const router = useRouter()
  const { cartItems, restaurant, isAuthenticated } = useStore()
  
  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          {showBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900">
              {restaurant?.name || title}
            </h1>
            {restaurant?.address && (
              <p className="text-xs text-gray-500 truncate max-w-48">
                {restaurant.address}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {showProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(isAuthenticated ? '/profile' : '/auth')}
              className="p-2"
            >
              <User className="h-5 w-5" />
            </Button>
          )}
          
          {showCart && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/cart')}
              className="p-2 relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}