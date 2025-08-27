import { createTRPCReact } from '@trpc/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { getSession } from 'next-auth/react'

type AppRouter = any // Temporary type until proper API type export is available

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/trpc',
      headers: async () => {
        // Try to get NextAuth session first
        try {
          const session = await getSession()
          if (session?.user) {
            return {
              Authorization: `Bearer ${(session as any).accessToken || 'nextauth-session'}`,
            }
          }
        } catch (error) {
          // Fallback to localStorage token for direct tRPC calls
        }

        // Fallback to localStorage for custom auth
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token')
          return token ? { Authorization: `Bearer ${token}` } : {}
        }

        return {}
      },
    }),
  ],
})