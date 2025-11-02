import { supabase, hasSupabase } from "@/lib/supabase"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin } from "@/lib/routeAuth"

// One-time helper endpoint to ensure required storage buckets exist.
// Requires admin auth. Safe to call multiple times.
export async function POST(request: Request) {
  if (!hasSupabase() || !supabase) {
    return Response.json({ error: "Supabase not configured on server" }, { status: 500 })
  }

  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return Response.json({ error: "Authentication required" }, { status: 401 })
    requireAdmin(auth.user)

  const needed = ["submissions", "articles", "jobs", "pages", "advertisements", "live-updates"]

    const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) throw listErr
    const existingIds = new Set((buckets || []).map((b) => b.id))

    const created: string[] = []
    for (const id of needed) {
      if (!existingIds.has(id)) {
        const { error: createErr } = await supabase.storage.createBucket(id, {
          public: true,
        })
        if (createErr) throw createErr
        created.push(id)
      }
    }

    return Response.json({ ok: true, created, existing: [...existingIds] })
  } catch (err: any) {
    console.error("Storage health endpoint error:", err)
    const msg = err?.message || "Unexpected error"
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Provide read-only status for convenience (also requires admin)
  if (!hasSupabase() || !supabase) {
    return Response.json({ error: "Supabase not configured on server" }, { status: 500 })
  }
  try {
    const auth = await verifyAuth(request)
    if (!auth.success) return Response.json({ error: "Authentication required" }, { status: 401 })
    requireAdmin(auth.user)

    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) throw error
    return Response.json({ ok: true, buckets })
  } catch (err: any) {
    console.error("Storage health GET error:", err)
    return Response.json({ error: err?.message || "Unexpected error" }, { status: 500 })
  }
}
