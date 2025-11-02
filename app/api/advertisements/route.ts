import { getAdvertisements, createAdvertisement } from "@/lib/dbClient"
import { NextRequest } from "next/server"

export async function GET() {
  try {
    const ads = await getAdvertisements()
    return Response.json(ads)
  } catch (error) {
    console.error("Advertisements GET error:", error)
    return Response.json({ error: "Failed to fetch advertisements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ad = await request.json()
    
    if (!ad.title || !ad.description || !ad.position) {
      return Response.json(
        { error: "Title, description, and position are required" },
        { status: 400 }
      )
    }

    const result = await createAdvertisement(ad)
    if (!result) {
      return Response.json({ error: "Failed to create advertisement" }, { status: 500 })
    }

    return Response.json(result, { status: 201 })
  } catch (error) {
    console.error("Advertisements POST error:", error)
    return Response.json({ error: "Failed to create advertisement" }, { status: 500 })
  }
}