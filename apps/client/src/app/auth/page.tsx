'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'
import { trpc } from '@/lib/trpc'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().min(10, 'Teléfono inválido'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function AuthPage() {
  const router = useRouter()
  const { login } = useStore()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      })
      router.push('/')
    },
    onError: (error) => {
      alert('Error al iniciar sesión: ' + error.message)
    },
  })

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      })
      router.push('/')
    },
    onError: (error) => {
      alert('Error al registrarse: ' + error.message)
    },
  })

  const {
    register: registerForm,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerFormRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      // Try NextAuth first
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
      } else {
        // Fallback to direct tRPC call
        await loginMutation.mutateAsync(data)
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await registerMutation.mutateAsync({
        ...data,
        role: 'CUSTOMER', // Default role for new registrations
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout header={<Header title="Autenticación" showBack />} showBottomNav={false}>
      <div className="p-4 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLogin ? (
              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      {...registerForm('email')}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-sm text-red-500">{loginErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...registerForm('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-red-500">{loginErrors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      className="pl-10"
                      {...registerFormRegister('name')}
                    />
                  </div>
                  {registerErrors.name && (
                    <p className="text-sm text-red-500">{registerErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      {...registerFormRegister('email')}
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="text-sm text-red-500">{registerErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+52 55 1234 5678"
                      className="pl-10"
                      {...registerFormRegister('phone')}
                    />
                  </div>
                  {registerErrors.phone && (
                    <p className="text-sm text-red-500">{registerErrors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...registerFormRegister('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {registerErrors.password && (
                    <p className="text-sm text-red-500">{registerErrors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </form>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {isLogin 
                  ? '¿No tienes cuenta? Regístrate' 
                  : '¿Ya tienes cuenta? Inicia sesión'
                }
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center mb-2">
                Para pruebas, puedes usar:
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Email:</strong> demo@restaurant.com</p>
                <p><strong>Contraseña:</strong> demo123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}