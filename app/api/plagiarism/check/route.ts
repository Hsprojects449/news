import { NextRequest } from "next/server"
import { supabase, hasSupabase } from "@/lib/supabase"
import { compareTextAgainstCorpus, defaultPlagiarismDecision } from "@/lib/textSimilarity"

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabase() || !supabase) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const body = await request.json()
    const title: string = String(body.title || "")
    const content: string = String(body.content || body.description || "")
    const mode: "submission" | "article" = (body.mode === "article" ? "article" : "submission")

    if (!title && !content) {
      return Response.json({ error: "No text provided" }, { status: 400 })
    }

    // Fetch a reasonable slice of existing content to compare against
    const [articlesRes, submissionsRes] = await Promise.all([
      supabase
        .from("articles")
        .select("id,title,description,content,status")
        .order("published_date", { ascending: false })
        .limit(1000),
      supabase
        .from("submissions")
        .select("id,title,description,status")
        .in("status", ["approved", "pending"]) // compare against visible + in-review
        .order("submitted_date", { ascending: false })
        .limit(1000),
    ])

    if (articlesRes.error) {
      console.warn("Plagiarism check: articles fetch error", articlesRes.error)
    }
    if (submissionsRes.error) {
      console.warn("Plagiarism check: submissions fetch error", submissionsRes.error)
    }

    const articles = Array.isArray(articlesRes.data) ? articlesRes.data : []
    const submissions = Array.isArray(submissionsRes.data) ? submissionsRes.data : []

    const corpus = [
      ...articles.map((a) => ({
        id: String(a.id),
        type: 'article' as const,
        title: String(a.title || ''),
        text: String(a.content || a.description || ''),
      })),
      ...submissions.map((s) => ({
        id: String(s.id),
        type: 'submission' as const,
        title: String(s.title || ''),
        text: String(s.description || ''),
      })),
    ]

    // Compare subject against corpus
    const { matches, maxScore } = compareTextAgainstCorpus({ title, content }, corpus, { ngram: 3 })
    const { flagged, threshold } = defaultPlagiarismDecision(maxScore)

    // Only include top few matches in the response
    const topMatches = matches.slice(0, 5)

    return Response.json({
      mode,
      flagged,
      threshold,
      maxScore,
      topMatches,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      }
    })
  } catch (err) {
    console.error("Plagiarism check error:", err)
    return Response.json({ error: "Failed to check plagiarism" }, { status: 500 })
  }
}
