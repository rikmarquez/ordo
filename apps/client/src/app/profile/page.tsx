'use client'

import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { User, Phone, Mail, MapPin, Clock, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useStore()

  if (!isAuthenticated) {
    return (
      <Layout header={<Header title="Perfil" showBack />}>
        <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
          <User className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            Inicia Sesión
          </h2>
          <p className="text-gray-500 mb-6">
            Accede a tu cuenta para ver tu perfil y pedidos
          </p>
          <Button onClick={() => router.push('/auth')}>
            Iniciar Sesión
          </Button>
        </div>
      </Layout>
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <Layout header={<Header title="Perfil" showBack />}>
      <div className="p-4 space-y-4">
        {/* User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">+52 55 1234 5678</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">Av. Principal 123, Centro</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            onClick={() => router.push('/orders')}
            className="w-full justify-start"
          >
            <Clock className="h-5 w-5 mr-3" />
            Mis Pedidos
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/favorites')}
            className="w-full justify-start"
          >
            <User className="h-5 w-5 mr-3" />
            Favoritos
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push('/settings')}
            className="w-full justify-start"
          >
            <User className="h-5 w-5 mr-3" />
            Configuración
          </Button>
        </div>

        {/* Logout */}
        <div className="pt-4">
          <Button 
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </Layout>
  )
}