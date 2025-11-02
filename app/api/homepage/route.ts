import { NextRequest } from "next/server"
import { getHomepageSettings, updateHomepageSettings } from "@/lib/dbClient"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"

export async function GET(_request: NextRequest) {
  try {
    const settings = await getHomepageSettings()
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error("Homepage GET error:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch settings" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }
    requireAdmin(auth.user)

    const body = await request.json()
    const saved = await updateHomepageSettings(body)
    if (!saved) return Response.json({ error: "Failed to save" }, { status: 500 })
    return new Response(JSON.stringify(saved), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("Homepage PATCH error:", error)
    return Response.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
