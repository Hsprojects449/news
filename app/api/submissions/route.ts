import { getSubmissions, createSubmission, updateSubmission, approveSubmission, rejectSubmission } from "@/lib/dbClient"
import { verifyAuth } from "@/lib/auth"
import { requireAdmin, AuthError } from "@/lib/routeAuth"
import { notifyAdminsNewSubmission, notifyUserSubmissionReceived, notifyUserSubmissionStatus } from "@/lib/notify"

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

    // Support optional status filtering and pagination
    const url = new URL(request.url)
    const status = url.searchParams.get("status") || undefined
    const limit = url.searchParams.get("limit")
    const offset = url.searchParams.get("offset")
    
    const filters: any = {}
    if (status) filters.status = status
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)
    
    const result = await getSubmissions(filters)
    return Response.json(result)
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

      console.log('✅ Submission created:', result.id, '- Starting notifications...')

      // Notify admins and user about the new submission (fire-and-forget)
      try {
        await Promise.all([
          notifyAdminsNewSubmission({
            title: result.title,
            name: result.name,
            phone: result.phone,
            email: result.email,
          }),
          notifyUserSubmissionReceived({
            toPhone: result.phone,
            title: result.title,
            name: result.name,
          })
        ])
        console.log('✅ Notifications completed for submission:', result.id)
      } catch (e) {
        console.warn('❌ Notification failed (multipart submission):', e)
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
      
      // Pre-compute media metadata if URLs exist
      let firstVideo: string | null = null
      let firstImage: string | null = null
      let mediaArray: { url: string; type: 'image' | 'video' }[] = []
      
      if (mediaUrls.length > 0) {
        const isVideo = (url: string) => /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(url)
        
        mediaArray = mediaUrls.map(url => {
          const type = isVideo(url) ? 'video' : 'image'
          if (type === 'video' && !firstVideo) firstVideo = url
          if (type === 'image' && !firstImage) firstImage = url
          return { url, type }
        })
        
        // Fallback: if no image found, use first media as image
        if (!firstImage && !firstVideo && mediaUrls[0]) {
          firstImage = mediaUrls[0]
        }
      }

      // Prepare payload in DB column names (snake_case) - single object creation
      const result = await createSubmission({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        title: body.title,
        description: body.description || null,
        image_url: firstImage,
        video_url: firstVideo,
        files: mediaUrls.length ? mediaUrls : null,
        media: mediaUrls.length ? JSON.stringify(mediaArray) : '[]',
        submitted_date: new Date().toISOString(),
        status: 'pending' as const,
        paid_status: 'pending' as const,
        amount: typeof body.amount !== 'undefined' ? body.amount : null,
      })
      
      if (!result) {
        return Response.json({ error: "Failed to create submission" }, { status: 500 })
      }

      console.log('✅ Submission created:', result.id, '- Starting notifications...')

      // Notify admins and user about the new submission (fire-and-forget)
      try {
        await Promise.all([
          notifyAdminsNewSubmission({
            title: result.title,
            name: result.name,
            phone: result.phone,
            email: result.email,
          }),
          notifyUserSubmissionReceived({
            toPhone: result.phone,
            title: result.title,
            name: result.name,
          })
        ])
        console.log('✅ Notifications completed for submission:', result.id)
      } catch (e) {
        console.warn('❌ Notification failed (json submission):', e)
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
          isLatest: body.isLatest,
          isLive: body.isLive
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

    // Notify user on status change (approve/reject) - SMS only
    try {
      if (action === "approve" && (result as any)?.submission) {
        const sub = (result as any).submission
        await notifyUserSubmissionStatus({
          toPhone: sub.phone,
          title: sub.title,
          status: 'approved',
        })
      } else if (action === "reject" && result) {
        const sub = result as any
        await notifyUserSubmissionStatus({
          toPhone: sub.phone,
          title: sub.title,
          status: 'rejected',
          reason: (body && (body as any).reason) || undefined,
        })
      }
    } catch (e) {
      console.warn('User notification failed (status change):', e)
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