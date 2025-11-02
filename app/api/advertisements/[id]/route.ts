import { updateAdvertisement, deleteAdvertisement } from "@/lib/dbClient"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    console.log("PATCH /api/advertisements/[id] - ID:", id);
    
    if (!id) {
      return Response.json(
        { error: "Advertisement ID is required" },
        { status: 400 }
      )
    }

    const updates = await request.json()
    console.log("PATCH /api/advertisements/[id] - Updates:", updates);

    const result = await updateAdvertisement(id, updates)
    
    if (!result) {
      return Response.json(
        { error: "Advertisement not found or update failed" },
        { status: 404 }
      )
    }

    return Response.json(result)
  } catch (error) {
    console.error("Advertisements PATCH error:", error)
    return Response.json(
      { error: "Failed to update advertisement" },
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
    console.log("DELETE /api/advertisements/[id] - ID:", id);
    
    if (!id) {
      return Response.json(
        { error: "Advertisement ID is required" },
        { status: 400 }
      )
    }

    const result = await deleteAdvertisement(id)
    
    if (!result) {
      return Response.json(
        { error: "Advertisement not found or delete failed" },
        { status: 404 }
      )
    }

    return Response.json(result)
  } catch (error) {
    console.error("Advertisements DELETE error:", error)
    return Response.json(
      { error: "Failed to delete advertisement" },
      { status: 500 }
    )
  }
}