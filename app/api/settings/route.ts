import { getHomepageSettings, updateHomepageSettings } from "@/lib/dbClient"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"

export async function GET(request: Request) {
  try {
    const settings = await getHomepageSettings()
    return Response.json(settings)
  } catch (error) {
    console.error("Settings GET error:", error)
    return Response.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication and admin access
    const auth = await verifyAuth(request)
    if (!auth.success) {
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    requireAdmin(auth.user)

    const body = await request.json()
    
    const result = await updateHomepageSettings(body)
    if (!result) {
      return Response.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return Response.json(result)
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("Settings POST error:", error)
    return Response.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
