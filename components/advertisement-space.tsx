"use client"

import { useEffect, useState } from "react"
import { AdvertisementsCarousel } from "./advertisements-carousel"

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface Advertisement {
  id: string
  title?: string
  description?: string
  imageUrl?: string
  media?: MediaItem[]
  link?: string
  position: "left" | "right" | "top" | "bottom"
  displayDuration?: number
  isActive: boolean
}

interface AdvertisementSpaceProps {
  position?: "left" | "right" | "top" | "bottom"
}

export function AdvertisementSpace({ position = "left" }: AdvertisementSpaceProps) {
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch("/api/advertisements")
        if (!response.ok) throw new Error("Failed to fetch")
        const data: Advertisement[] = await response.json()
        
        // Only show left position ads (ignore other positions)
        const activeAds = data.filter(a => a.isActive && a.position === "left")
        console.log(`Advertisement Space (left) - Found ${activeAds.length} active ads`)
        setAds(activeAds)
      } catch (error) {
        console.error("Failed to fetch advertisements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAds()
  }, [position])

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-1.5 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advertisement</span>
        </div>
        <div className="p-4 sm:p-6 min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs sm:text-sm text-muted-foreground">Loading ads...</p>
          </div>
        </div>
      </div>
    )
  }

  if (ads.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-1.5 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advertisement</span>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] flex items-center justify-center bg-gradient-to-br from-muted/20 to-background">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl"></div>
              <div className="relative text-4xl sm:text-6xl lg:text-7xl opacity-40">📢</div>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg sm:text-xl text-foreground">Advertise Here</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                Reach thousands of readers. Contact us to place your ad in this premium space.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                Premium Ad Space Available
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border w-full">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-1.5 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sponsored</span>
      </div>
      <AdvertisementsCarousel advertisements={ads} position="left" />
    </div>
  )
}
