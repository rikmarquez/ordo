import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Protected routes that require authentication
    const protectedRoutes = ['/profile', '/orders', '/checkout']
    
    // Admin routes that require admin role
    const adminRoutes = ['/admin']

    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !token) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Redirect to home if accessing admin route without admin role
    if (isAdminRoute && token?.role !== 'ADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Allow the request to continue
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow access to check in middleware function above
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons).*)',
  ],
}