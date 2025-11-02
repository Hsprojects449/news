import { supabase, hasSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAvailable = hasSupabase() && !!supabase

    if (!supabaseAvailable) {
      return Response.json({
        ok: true,
        supabase: false,
        canSelectAdmin: null,
        usedFallback: true,
        message: 'Supabase client not configured (missing env)'
      })
    }

    // Try a lightweight select on the admins table
    // `supabase` is typed as SupabaseClient | null; we've already checked availability above,
    // but narrow with a non-null assertion so TypeScript doesn't complain.
    const client = supabase!
    const { data, error } = await client
      .from('admins')
      .select('id')
      .limit(1)

    if (error) {
      return Response.json({
        ok: true,
        supabase: true,
        canSelectAdmin: false,
        usedFallback: false,
        error: error.message || error
      })
    }

    return Response.json({
      ok: true,
      supabase: true,
      canSelectAdmin: Array.isArray(data) ? data.length > 0 : !!data,
      usedFallback: false
    })
  } catch (err) {
    console.error('DB health check error:', err)
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
