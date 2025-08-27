'use client'

import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const router = useRouter()
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    getCartTotal,
    restaurant 
  } = useStore()

  const total = getCartTotal()
  const deliveryFee = 25
  const finalTotal = total + deliveryFee

  if (cartItems.length === 0) {
    return (
      <Layout header={<Header title="Carrito" showBack />}>
        <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-500 mb-6">
            Agrega algunos platillos deliciosos desde el menú
          </p>
          <Button onClick={() => router.push('/menu')}>
            Ver Menú
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout header={<Header title="Carrito" showBack />}>
      <div className="p-4 pb-24">
        {/* Restaurant Info */}
        {restaurant && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold">{restaurant.name}</h3>
              <p className="text-sm text-gray-600">{restaurant.address}</p>
            </CardContent>
          </Card>
        )}

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  {/* Item Image */}
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl rounded-lg">
                        🍽️
                      </div>
                    )}
                  </div>
                  
                  {/* Item Details */}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-lg font-semibold">${item.price}</p>
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-medium min-w-6 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cartItems.length} artículos)</span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Costo de envío</span>
              <span>${deliveryFee}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${finalTotal}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/checkout')}
            className="w-full h-12 text-lg"
          >
            Continuar al Pago - ${finalTotal}
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/menu')}
              className="flex-1"
            >
              Seguir Comprando
            </Button>
            <Button
              variant="outline"
              onClick={clearCart}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              Limpiar Carrito
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}