import { getSubmissions, createSubmission, updateSubmission, approveSubmission, rejectSubmission } from "@/lib/dbClient"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"

export async function GET(request: Request) {
  try {
    // Log incoming auth header for debugging
    try {
      const authHeader = request.headers.get('authorization')
      console.log('Submissions GET - Authorization header:', authHeader)
    } catch (e) {
      console.log('Submissions GET - could not read Authorization header')
    }

    // Verify authentication and admin access
    const auth = await verifyAuth(request)
    if (!auth.success) {
      console.warn('Submissions GET - auth failed:', auth.error)
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    requireAdmin(auth.user)

    // Support optional status filtering. Default to returning all submissions.
    const url = new URL(request.url)
    const status = url.searchParams.get("status") || undefined
    const submissions = await (status ? getSubmissions({ status }) : getSubmissions())
    return Response.json(submissions)
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("Submissions GET error:", error)
    return Response.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}

// POST remains public - anyone can submit
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // Accept both multipart (legacy) and JSON (current flow with pre-uploaded media)
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const submissionData = JSON.parse(formData.get("data") as string)
      const files = formData.getAll("files") as File[]

      if (!submissionData.name || !submissionData.title) {
        return Response.json({ error: "Name and title are required" }, { status: 400 })
      }

      const result = await createSubmission({
        ...submissionData,
        status: "pending",
        submitted_date: new Date().toISOString(),
        paid_status: "pending",
        amount: (submissionData.amount ?? null)
      }, files)

      if (!result) {
        return Response.json({ error: "Failed to create submission" }, { status: 500 })
      }
      return Response.json(result, { status: 201 })
    }

    // JSON body: expects fields directly and optional mediaUrls: string[] already uploaded to storage
    if (contentType.includes('application/json')) {
      const body = await request.json()

      if (!body.name || !body.title) {
        return Response.json({ error: "Name and title are required" }, { status: 400 })
      }

      const mediaUrls: string[] = Array.isArray(body.mediaUrls) ? body.mediaUrls : []
      // Naive file-type detection from extension
      const isVideo = (url: string) => /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(url)
      const isImage = (url: string) => /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(url)

      const firstVideo = mediaUrls.find(isVideo) || null
      const firstImage = mediaUrls.find(isImage) || (firstVideo ? null : mediaUrls[0] || null)

      // Prepare payload in DB column names (snake_case)
      const submissionRow = {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        title: body.title,
        description: body.description || null,
        image_url: firstImage || null,
        video_url: firstVideo || null,
        // Optionally keep all URLs for later review/reference
        files: mediaUrls.length ? mediaUrls : null,
        submitted_date: new Date().toISOString(),
        status: 'pending' as const,
        paid_status: 'pending' as const,
        amount: typeof body.amount !== 'undefined' ? body.amount : null,
      }

      const result = await createSubmission(submissionRow)
      if (!result) {
        return Response.json({ error: "Failed to create submission" }, { status: 500 })
      }
      return Response.json(result, { status: 201 })
    }

    return Response.json({ error: 'Unsupported Content-Type' }, { status: 415 })
  } catch (error) {
    console.error("Submissions POST error:", error)
    return Response.json({ error: "Failed to create submission" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    // Log auth header for easier debugging
    try {
      const authHeader = request.headers.get('authorization')
      console.log('Submissions PATCH - Authorization header:', authHeader)
    } catch (e) {
      console.log('Submissions PATCH - could not read Authorization header')
    }

    // Verify authentication and admin access
    const auth = await verifyAuth(request)
    if (!auth.success) {
      console.warn('Submissions PATCH - auth failed:', auth.error)
      return Response.json({ error: "Authentication required" }, { status: 401 })
    }

    requireAdmin(auth.user)

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    const action = url.searchParams.get("action")
    
    if (!id) {
      return Response.json({ error: "Submission ID is required" }, { status: 400 })
    }

    const body = await request.json()
    let result

    switch (action) {
      case "approve":
        result = await approveSubmission(id, {
          category: body.category,
          isFeatured: body.isFeatured,
          isTrending: body.isTrending,
          isLatest: body.isLatest
        })
        break
      case "reject":
        result = await rejectSubmission(id, body.reason)
        break
      default:
        result = await updateSubmission(id, body)
    }

    if (!result) {
      return Response.json({ error: "Operation failed" }, { status: 404 })
    }

    return Response.json(result)
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error("Submissions PATCH error:", error)
    return Response.json({ error: "Failed to update submission" }, { status: 500 })
  }
}