'use client'

import { useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { Clock, MapPin, Star, Phone } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { restaurant, setRestaurant } = useStore()
  const { data: restaurantData, isLoading } = trpc.restaurant.getById.useQuery(
    { id: '1' }, // Demo restaurant ID
    { enabled: !restaurant }
  )

  useEffect(() => {
    if (restaurantData && !restaurant) {
      setRestaurant({
        id: restaurantData.id,
        name: restaurantData.name,
        description: restaurantData.description || '',
        imageUrl: restaurantData.imageUrl || '',
        address: restaurantData.address || '',
        phone: restaurantData.phone || '',
      })
    }
  }, [restaurantData, restaurant, setRestaurant])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </Layout>
    )
  }

  const currentRestaurant = restaurant || {
    id: '1',
    name: 'Restaurante Demo',
    description: 'El mejor sabor de la ciudad',
    address: 'Av. Principal 123, Centro',
    phone: '+52 55 1234 5678',
  }

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Restaurant Hero */}
        <Card className="overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-orange-500 to-red-500">
            <div className="absolute inset-0 bg-black bg-opacity-20" />
            <div className="absolute bottom-4 left-4 text-white">
              <h1 className="text-2xl font-bold">{currentRestaurant.name}</h1>
              <p className="text-sm opacity-90">{currentRestaurant.description}</p>
            </div>
          </div>
        </Card>

        {/* Restaurant Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{currentRestaurant.address}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{currentRestaurant.phone}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Lun - Dom: 9:00 AM - 10:00 PM</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">4.8</span>
              <span className="text-gray-600">(120+ reseñas)</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/menu')}
            className="w-full h-12 text-lg"
          >
            Ver Menú Completo
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => router.push('/menu?category=popular')}
              className="h-12"
            >
              🔥 Populares
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/menu?category=ofertas')}
              className="h-12"
            >
              💰 Ofertas
            </Button>
          </div>
        </div>

        {/* Featured Categories */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Categorías Destacadas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="bg-gray-100 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => router.push('/menu?category=entradas')}
              >
                <div className="text-2xl mb-2">🥗</div>
                <p className="text-sm font-medium">Entradas</p>
              </div>
              <div 
                className="bg-gray-100 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => router.push('/menu?category=platos-fuertes')}
              >
                <div className="text-2xl mb-2">🍖</div>
                <p className="text-sm font-medium">Platos Fuertes</p>
              </div>
              <div 
                className="bg-gray-100 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => router.push('/menu?category=bebidas')}
              >
                <div className="text-2xl mb-2">🥤</div>
                <p className="text-sm font-medium">Bebidas</p>
              </div>
              <div 
                className="bg-gray-100 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => router.push('/menu?category=postres')}
              >
                <div className="text-2xl mb-2">🍰</div>
                <p className="text-sm font-medium">Postres</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
