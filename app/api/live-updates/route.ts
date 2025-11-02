import { NextRequest } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"
import { getLiveUpdates, createLiveUpdate, updateLiveUpdate, deleteLiveUpdate } from "@/lib/dbClient"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('active') === 'true'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Number(limitParam) : undefined
    const data = await getLiveUpdates({ activeOnly, limit })
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('LiveUpdates GET error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch live updates' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return Response.json({ error: 'Authentication required' }, { status: 401 })
    requireAdmin(auth.user)

  const body = await request.json()
  if (!body.title) return Response.json({ error: 'Title is required' }, { status: 400 })
  const created = await createLiveUpdate({ title: body.title, url: body.url ?? null, imageUrl: body.imageUrl ?? null, isActive: body.isActive })
    if (!created) return Response.json({ error: 'Failed to create' }, { status: 500 })
    return Response.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('LiveUpdates POST error:', error)
    return Response.json({ error: 'Failed to create live update' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return Response.json({ error: 'Authentication required' }, { status: 401 })
    requireAdmin(auth.user)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'ID is required' }, { status: 400 })
  const body = await request.json()
  const updated = await updateLiveUpdate(id, { title: body.title, url: body.url, imageUrl: body.imageUrl, isActive: body.isActive })
    if (!updated) return Response.json({ error: 'Update failed' }, { status: 404 })
    return Response.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('LiveUpdates PATCH error:', error)
    return Response.json({ error: 'Failed to update live update' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return Response.json({ error: 'Authentication required' }, { status: 401 })
    requireAdmin(auth.user)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'ID is required' }, { status: 400 })
    const deleted = await deleteLiveUpdate(id)
    if (!deleted) return Response.json({ error: 'Delete failed' }, { status: 404 })
    return Response.json(deleted)
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('LiveUpdates DELETE error:', error)
    return Response.json({ error: 'Failed to delete live update' }, { status: 500 })
  }
}
