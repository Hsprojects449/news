import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'
import type { JWTPayload } from '@/lib/auth'

// Path patterns that require authentication with their allowed methods
const PROTECTED_PATHS: Array<{ path: string; methods: string[] }> = [
  { path: '/api/articles', methods: ['POST', 'PATCH'] },
  { path: '/api/jobs', methods: ['POST', 'PATCH'] },
  { path: '/api/submissions', methods: ['GET', 'PATCH'] },
  { path: '/api/admin', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
]

// Paths that require admin role
const ADMIN_ONLY_PATHS = [
  '/api/admin',
  '/api/articles',  // POST, PATCH require admin
  '/api/submissions/approve',
]

// Public paths with their allowed methods
const PUBLIC_PATHS: Array<{ path: string; methods: string[] }> = [
  { path: '/api/articles', methods: ['GET'] },
  { path: '/api/jobs', methods: ['GET'] },
  { path: '/api/submissions', methods: ['POST'] },
  { path: '/api/admin/login', methods: ['POST'] }, // Login endpoint should be public
  // Health endpoint should be public so monitoring and local checks work without auth
  { path: '/api/_health', methods: ['GET'] }
]

export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname
  const method = request.method

  // Check if the request matches a public path and method
  const publicPath = PUBLIC_PATHS.find(p => pathname.startsWith(p.path) && p.methods.includes(method))
  if (publicPath) {
    return NextResponse.next()
  }

  // Check if path requires protection
  const protectedPath = PROTECTED_PATHS.find(p => pathname.startsWith(p.path) && p.methods.includes(method))
  if (!protectedPath) {
    return NextResponse.next()
  }

  // Get token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyJwt(token)

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  // Check admin-only paths
  const requiresAdmin = ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path))
  if (requiresAdmin && !(payload.role === 'admin' || payload.role === 'super_admin')) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  // Add user info to request headers for route handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-role', payload.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: '/api/:path*',
}