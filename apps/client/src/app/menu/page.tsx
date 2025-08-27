'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { trpc } from '@/lib/trpc'
import { Plus, Minus } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
  category: string
  isAvailable: boolean
}

const categories = [
  { id: 'todas', name: 'Todas', emoji: '🍽️' },
  { id: 'entradas', name: 'Entradas', emoji: '🥗' },
  { id: 'platos-fuertes', name: 'Platos Fuertes', emoji: '🍖' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🥤' },
  { id: 'postres', name: 'Postres', emoji: '🍰' },
  { id: 'popular', name: 'Populares', emoji: '🔥' },
  { id: 'ofertas', name: 'Ofertas', emoji: '💰' },
]

export default function MenuPage() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || 'todas'
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  
  const { addToCart, cartItems } = useStore()
  const { data: menuItems = [], isLoading } = trpc.menu.getAll.useQuery()

  const getItemQuantityInCart = useCallback((itemId: string) => {
    const cartItem = cartItems.find(item => item.id === itemId)
    return cartItem?.quantity || 0
  }, [cartItems])

  const filteredItems = menuItems.filter(item => 
    selectedCategory === 'todas' || item.category === selectedCategory
  )

  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
    })
  }

  if (isLoading) {
    return (
      <Layout header={<Header title="Menú" showBack />}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout header={<Header title="Menú" showBack />}>
      <div className="pb-4">
        {/* Category Filter */}
        <div className="sticky top-16 bg-white z-30 border-b border-gray-200 px-4 py-3">
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap flex-shrink-0"
              >
                <span className="mr-1">{category.emoji}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay platillos disponibles en esta categoría</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const quantityInCart = getItemQuantityInCart(item.id)
              
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Item Image */}
                      <div className="w-24 h-24 bg-gray-200 flex-shrink-0">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                            🍽️
                          </div>
                        )}
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <div className="text-right">
                            <p className="font-bold text-lg">${item.price}</p>
                            {!item.isAvailable && (
                              <Badge variant="secondary" className="text-xs">
                                No disponible
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                        
                        {/* Add to Cart Controls */}
                        {item.isAvailable && (
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {categories.find(c => c.id === item.category)?.name || item.category}
                            </Badge>
                            
                            <div className="flex items-center space-x-2">
                              {quantityInCart > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {/* Update quantity logic */}}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="font-medium min-w-6 text-center">
                                    {quantityInCart}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddToCart(item)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddToCart(item)}
                                  className="h-8"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Agregar
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </Layout>
  )
}