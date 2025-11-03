import { NextRequest } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"
import { getLiveUpdates, getLiveArticles, createLiveUpdate, updateLiveUpdate, deleteLiveUpdate } from "@/lib/dbClient"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('active') === 'true'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Number(limitParam) : undefined
    
    // Fetch both live updates and live articles (optimized - only fetches isLive=true articles)
    const liveUpdates = await getLiveUpdates({ activeOnly, limit })
    const liveArticles = await getLiveArticles(limit)
    
    // Transform live articles to match live updates format
    const transformedArticles = liveArticles.map((article: any) => ({
      id: article.id,
      title: article.title,
      url: `/news/${article.id}`, // Link to the article page
      imageUrl: article.imageUrl || (article.media && article.media[0]?.url) || null,
      isActive: true,
      createdDate: article.publishedDate || article.createdAt,
      type: 'article' // Add type to distinguish from live_updates table entries
    }))
    
    // Merge and sort by date
    const combined = [...liveUpdates, ...transformedArticles]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.createdDate || b.createdAt || 0).getTime()
        return dateB - dateA // Most recent first
      })
    
    // Apply limit if specified
    const final = limit ? combined.slice(0, limit) : combined
    
    return new Response(JSON.stringify(final), {
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
