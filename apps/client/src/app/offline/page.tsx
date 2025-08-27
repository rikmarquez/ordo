import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <Layout header={<Header title="Sin Conexión" />}>
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
        <WifiOff className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          Sin Conexión a Internet
        </h2>
        <p className="text-gray-500 mb-6">
          Por favor verifica tu conexión a internet e inténtalo de nuevo
        </p>
        
        <Card className="w-full max-w-sm mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Mientras tanto puedes:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Revisar tu carrito (si hay elementos guardados)</li>
              <li>• Consultar información del restaurante</li>
              <li>• Planear tu próximo pedido</li>
            </ul>
          </CardContent>
        </Card>
        
        <Button onClick={handleRefresh} className="w-full max-w-sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de Nuevo
        </Button>
      </div>
    </Layout>
  )
}