'use client'

import { useSession } from 'next-auth/react'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'

export function AuthSync() {
  const { data: session, status } = useSession()
  const { syncWithSession } = useStore()

  useEffect(() => {
    if (status !== 'loading') {
      syncWithSession(session)
    }
  }, [session, status, syncWithSession])

  return null
}