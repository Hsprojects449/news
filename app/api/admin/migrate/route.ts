import { NextRequest } from "next/server";
import { supabase, hasSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabase() || !supabase) {
      return Response.json({ error: "Database not configured" }, { status: 500 });
    }

    // Test if is_live column exists by trying to query it
    const { data, error } = await supabase
      .from('articles')
      .select('id, is_live')
      .limit(1);

    if (error) {
      return Response.json({ 
        success: false,
        error: error.message,
        instruction: 'Please run this SQL in your Supabase SQL Editor:\n\nALTER TABLE articles ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;'
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: 'is_live column exists in articles table',
      tested: true
    });
  } catch (error) {
    console.error("Migration check error:", error);
    return Response.json({ 
      error: "Migration check failed",
      instruction: 'Please run this SQL in your Supabase SQL Editor:\n\nALTER TABLE articles ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;'
    }, { status: 500 });
  }
}
