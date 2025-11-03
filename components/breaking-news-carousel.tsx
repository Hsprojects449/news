"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Zap } from "lucide-react"
import Link from "next/link"

interface BreakingNewsItem {
  id: string
  title: string
  image?: string
  category?: string
  url?: string | null
  type?: string
}

export function BreakingNewsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<BreakingNewsItem[]>([])
  const [autoPlay, setAutoPlay] = useState(true)
  const [slideDuration, setSlideDuration] = useState(5000) // Default 5 seconds

  // Fetch settings for carousel duration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          console.log('Breaking News Carousel - Settings loaded:', data)
          if (data.breakingNewsDuration) {
            const duration = data.breakingNewsDuration * 1000
            console.log('Breaking News Carousel - Setting duration to:', duration, 'ms')
            setSlideDuration(duration) // Convert seconds to milliseconds
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    // Fetch live updates (active only)
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live-updates?active=true&limit=10', { cache: 'no-store' })
        if (res.ok) {
          const data: Array<{ id: string; title: string; url?: string | null; imageUrl?: string | null; type?: string }> = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const mapped: BreakingNewsItem[] = data.map((u, i) => ({
              id: u.id || String(i),
              title: u.title,
              url: u.url ?? null,
              type: u.type || 'live-update',
              // Prefer uploaded image if provided; fall back to a default placeholder
              image: u.imageUrl || "/ai-technology-announcement.jpg",
              category: "Live",
            }))
            setItems(mapped)
            setCurrentIndex(0)
          } else {
            setItems([])
          }
        }
      } catch (e) {
        // keep empty
        console.error('Failed to load live updates for BreakingNewsCarousel:', e)
      }
    }
    fetchLive()
  }, [])

  useEffect(() => {
    if (!autoPlay) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, slideDuration)

    return () => clearInterval(interval)
  }, [autoPlay, items.length, slideDuration])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
    setAutoPlay(false)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
    setAutoPlay(false)
  }

  if (items.length === 0) return null
  const current = items[currentIndex]

  return (
    <section className="bg-gradient-to-r from-destructive via-destructive/95 to-destructive/90 text-destructive-foreground py-6 overflow-hidden shadow-2xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Zap size={24} className="animate-pulse text-yellow-300" />
            <span className="font-bold text-lg">LIVE UPDATES</span>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 md:p-6">
            {/* Image Slider */}
            <div className="relative h-56 md:h-64 rounded-lg overflow-hidden group">
              <img
                src={current?.image || "/placeholder.svg"}
                alt={current.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="eager"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

              {/* Navigation Buttons */}
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 z-10"
              >
                <ChevronRight size={20} />
              </button>

              {/* Category Badge */}
              <div className="absolute bottom-4 left-4">
                <span className="bg-secondary text-black px-3 py-1 rounded-full text-sm font-semibold">
                  {current?.category || 'Live'}
                </span>
              </div>

              {/* Indicators */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx)
                      setAutoPlay(false)
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? "bg-white w-6" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="space-y-4">
                <div className="min-h-16 overflow-hidden">
                  <div className="transition-all duration-500 ease-in-out">
                    {current?.url ? (
                      // Check if it's an internal article link
                      current.type === 'article' || current.url.startsWith('/news/') ? (
                        <Link
                          href={current.url}
                          className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-tight break-words hover:underline"
                        >
                          {current.title}
                        </Link>
                      ) : (
                        <a
                          href={current.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-tight break-words hover:underline"
                        >
                          {current.title}
                        </a>
                      )
                    ) : (
                      <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-tight break-words">
                        {current.title}
                      </h3>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {items.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx)
                        setAutoPlay(false)
                      }}
                      className={`h-1 transition-all duration-300 ${
                        idx === currentIndex ? "bg-white w-12" : "bg-white/40 w-6"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
