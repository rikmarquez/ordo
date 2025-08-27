'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { trpc, trpcClient } from '@/lib/trpc'
import { AuthSync } from '@/components/auth/AuthSync'

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: any
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <SessionProvider session={session}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthSync />
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  )
}