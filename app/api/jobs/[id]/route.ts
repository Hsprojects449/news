import { updateJob, deleteJob } from "@/lib/dbClient"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    console.log("Job Update - ID:", id);
    
    if (!id) {
      return Response.json(
        { error: "Job ID is required" },
        { status: 400 }
      )
    }

    const updates = await request.json()
    console.log("Job Update - Updates:", updates);
    
    // Validate required fields if being updated
    if (updates.title === "" || updates.company === "") {
      return Response.json(
        { error: "Title and company are required" },
        { status: 400 }
      )
    }

    const result = await updateJob(id, updates)
    
    if (!result) {
      return Response.json(
        { error: "Job not found or update failed" },
        { status: 404 }
      )
    }

    return Response.json(result)
  } catch (error) {
    console.error("Jobs PATCH error:", error)
    return Response.json(
      { error: "Failed to update job" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    console.log("DELETE /api/jobs/[id] - ID:", id);
    
    if (!id) {
      return Response.json(
        { error: "Job ID is required" },
        { status: 400 }
      )
    }

    const result = await deleteJob(id)
    
    if (!result) {
      return Response.json(
        { error: "Job not found or delete failed" },
        { status: 404 }
      )
    }

    return Response.json(result)
  } catch (error) {
    console.error("Jobs DELETE error:", error)
    return Response.json(
      { error: "Failed to delete job" },
      { status: 500 }
    )
  }
}