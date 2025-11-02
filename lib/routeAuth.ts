import type { AuthUser } from './auth'

export function isAdmin(user?: AuthUser): boolean {
  // Support both 'admin' and legacy 'super_admin' role values from DB/schema
  return user?.role === 'admin' || user?.role === 'super_admin'
}

export function isEditor(user?: AuthUser): boolean {
  return user?.role === 'editor'
}

export function canManageContent(user?: AuthUser): boolean {
  return isAdmin(user) || isEditor(user)
}

export function isOwner(user?: AuthUser, resourceUserId?: string): boolean {
  return !!user?.id && user.id === resourceUserId
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export function requireAuth(user?: AuthUser): asserts user is AuthUser {
  if (!user) {
    throw new AuthError('Authentication required')
  }
}

export function requireAdmin(user?: AuthUser): void {
  requireAuth(user)
  if (!isAdmin(user)) {
    throw new AuthError('Admin access required', 403)
  }
}