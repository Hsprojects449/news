import { verifyPassword, signJwt } from "@/lib/auth"
import { getAdminByUsername } from "@/lib/dbClient"
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.warn('[DEBUG] Login endpoint hit')
    const { username, password } = await request.json()

    console.warn('[DEBUG] Looking up admin:', username)
    const admin = await getAdminByUsername(username)
    console.warn('[DEBUG] Admin lookup result:', { found: !!admin, hasPassword: !!admin?.password })

    if (!admin || !admin.password) {
      console.warn('[DEBUG] Admin validation failed:', { admin: !!admin, hasPassword: !!admin?.password })
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    console.warn('[DEBUG] Verifying password')
    const ok = await verifyPassword(password, admin.password)
    console.warn('[DEBUG] Password verification result:', ok)
    
    if (!ok) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Use standard JWT `sub` claim for the user id so verify/consumers can read payload.sub
    const token = signJwt({ sub: admin.id, username: admin.username, role: admin.role })

    console.warn('[DEBUG] Login successful:', username)
    return NextResponse.json({
      success: true,
      admin: { id: admin.id, username: admin.username, role: admin.role },
      token,
    })
  } catch (error) {
    console.error('[DEBUG] Login error:', error)
    return NextResponse.json({ success: false, message: "Server error during login" }, { status: 500 })
  }
}