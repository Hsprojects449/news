import { compare } from "bcryptjs"
import type { SignOptions } from "jsonwebtoken"
import * as jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

export interface JWTPayload {
  sub: string
  username: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    username: string
    role: string
  }
  error?: string
}

export type AuthUser = AuthResult['user']

export async function verifyPassword(password: string, hash: string) {
  return compare(password, hash)
}

export function signJwt(payload: Record<string, any>, options?: jwt.SignOptions) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d", ...(options || {}) })
}

export function verifyJwt(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (err) {
    return null
  }
}

export async function verifyAuth(request: Request): Promise<AuthResult> {
  try {
    // Get token from Authorization header or cookie
    const token = request.headers.get('Authorization')?.split(' ')[1] ||
                 request.headers.get('Cookie')?.split(';')
                   .find(c => c.trim().startsWith('token='))
                   ?.split('=')[1]

    if (!token) {
      return { success: false, error: 'No token provided' }
    }

    // Verify JWT token
    const payload = verifyJwt(token)
    if (!payload) {
      return { success: false, error: 'Invalid token' }
    }

    return {
      success: true,
      user: {
        id: payload.sub as string,
        username: payload.username as string,
        role: payload.role as string
      }
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { success: false, error: 'Invalid token' }
  }
}
