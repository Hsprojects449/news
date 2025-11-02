"use client"

import { useEffect, useState } from "react"

interface Advertisement {
  id: string
  title: string
  description: string
  imageUrl?: string
  link?: string
  position: "left" | "right" | "top" | "bottom"
  isActive: boolean
}

interface AdvertisementSpaceProps {
  position?: "left" | "right" | "top" | "bottom"
}

export function AdvertisementSpace({ position = "left" }: AdvertisementSpaceProps) {
  const [ad, setAd] = useState<Advertisement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const response = await fetch("/api/advertisements")
        if (!response.ok) throw new Error("Failed to fetch")
        const data: Advertisement[] = await response.json()
        
        // Find an active ad for the specified position
        const activeAd = data.find(a => a.isActive && a.position === position)
        setAd(activeAd || null)
      } catch (error) {
        console.error("Failed to fetch advertisement:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAd()
  }, [position])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-6 border-2 border-dashed border-muted-foreground/30 animate-pulse min-h-96">
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!ad) {
    return (
      <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-6 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-50">📢</div>
          <h3 className="font-bold text-lg mb-2">Advertisement Space</h3>
          <p className="text-sm text-muted-foreground">Your ad could be here</p>
        </div>
      </div>
    )
  }

  return (
    <a 
      href={ad.link || '#'} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105"
    >
      {ad.imageUrl ? (
        <div className="relative aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="object-cover w-full h-full"
          />
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 min-h-96 flex items-center justify-center">
          <div className="text-center">
            <h3 className="font-bold text-xl mb-3">{ad.title}</h3>
            <p className="text-sm opacity-90">{ad.description}</p>
          </div>
        </div>
      )}
    </a>
  )
}
