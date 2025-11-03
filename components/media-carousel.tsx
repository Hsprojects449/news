"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface MediaCarouselProps {
  media: MediaItem[]
  autoSlide?: boolean
  interval?: number // milliseconds for image slide duration (optional override)
}

export function MediaCarousel({ media, autoSlide = true, interval }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [slideDuration, setSlideDuration] = useState(interval || 5000) // Default 5 seconds
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const currentMedia = media[currentIndex]

  // Fetch settings for carousel duration if not provided via prop
  useEffect(() => {
    if (interval) {
      setSlideDuration(interval)
      return
    }
    
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          console.log('Media Carousel - Settings loaded:', data)
          if (data.newsArticleMediaDuration) {
            const duration = data.newsArticleMediaDuration * 1000
            console.log('Media Carousel - Setting duration to:', duration, 'ms')
            setSlideDuration(duration) // Convert seconds to milliseconds
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    fetchSettings()
  }, [interval])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Handle auto-slide for images
  useEffect(() => {
    if (!autoSlide || media.length <= 1) return

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Only set timer for images, not videos
    if (currentMedia?.type === 'image') {
      timerRef.current = setTimeout(() => {
        goToNext()
      }, slideDuration)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentIndex, autoSlide, slideDuration, media.length, currentMedia?.type])

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentMedia?.type !== 'video') return

    const handlePlay = () => setIsVideoPlaying(true)
    const handlePause = () => setIsVideoPlaying(false)
    const handleEnded = () => {
      setIsVideoPlaying(false)
      if (autoSlide && media.length > 1) {
        goToNext()
      }
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentIndex, currentMedia?.type, autoSlide, media.length])

  if (!media || media.length === 0) return null

  return (
    <div className="relative w-full h-full group">
      {/* Main Media Display */}
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-muted">
        {currentMedia?.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt={`Media ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentMedia?.url}
            className="w-full h-full object-cover"
            controls
            controlsList="nodownload"
            preload="metadata"
          />
        )}

        {/* Navigation Arrows (only show if multiple items) */}
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Counter */}
        {media.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Dot Indicators */}
      {media.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition ${
                index === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
