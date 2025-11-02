import { NextRequest } from "next/server"
import { getPageById, upsertPage } from "@/lib/dbClient"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 })
    const page = await getPageById(id)
    if (!page) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', Pragma: 'no-cache', Expires: '0' } })
    return new Response(JSON.stringify(page), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', Pragma: 'no-cache', Expires: '0' } })
  } catch (error) {
    console.error("Content GET error:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch content" }), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
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
    if (!body?.id || !body?.title) {
      return Response.json({ error: "Missing id or title" }, { status: 400 })
    }

    const saved = await upsertPage({ id: body.id, title: body.title, content: body.content || "" })
    if (!saved) return new Response(JSON.stringify({ error: "Failed to save" }), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
    return new Response(JSON.stringify(saved), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', Pragma: 'no-cache', Expires: '0' } })
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status, headers: { 'Content-Type': 'application/json' } })
    }
    console.error("Content PATCH error:", error)
    return new Response(JSON.stringify({ error: "Failed to update content" }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
