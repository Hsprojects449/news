import { getActiveJobs, createJob } from "@/lib/dbClient"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const title = url.searchParams.get('title') || undefined
    const location = url.searchParams.get('location') || undefined
    const jobs = await getActiveJobs({ title, location })
    return new Response(JSON.stringify(jobs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error("Jobs GET error:", error)
    return Response.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const job = await request.json()
    
    if (!job.title || !job.company) {
      return Response.json({ error: "Title and company are required" }, { status: 400 })
    }

    const result = await createJob({
      ...job,
      status: "active",
      posted_date: new Date().toISOString()
    })

    if (!result) {
      return Response.json({ error: "Failed to create job" }, { status: 500 })
    }

    return Response.json(result, { status: 201 })
  } catch (error) {
    console.error("Jobs POST error:", error)
    return Response.json({ error: "Failed to create job" }, { status: 500 })
  }
}