"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  displayDuration?: number // in seconds
  isActive: boolean
}

interface AdvertisementsCarouselProps {
  advertisements: Advertisement[]
  position?: 'left' | 'right' | 'top' | 'bottom'
}

export function AdvertisementsCarousel({ advertisements, position = 'right' }: AdvertisementsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState(5) // Default 5 seconds
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeAds = advertisements.filter(ad => ad.isActive)
  
  // Fetch settings for default ad duration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          console.log('Advertisements Carousel - Settings loaded:', data)
          if (data.advertisementDuration) {
            console.log('Advertisements Carousel - Setting default duration to:', data.advertisementDuration, 'seconds')
            setDefaultDuration(data.advertisementDuration)
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    fetchSettings()
  }, [])
  
  // Get current ad
  const currentAd = activeAds[currentIndex]
  
  // Get all media for current ad (combine legacy imageUrl and media array)
  const getAllMedia = (ad: Advertisement): MediaItem[] => {
    const mediaItems: MediaItem[] = []
    
    // Add media array items first
    if (ad.media && Array.isArray(ad.media)) {
      mediaItems.push(...ad.media)
    } else if (ad.imageUrl) {
      // Only add legacy imageUrl if no media array
      mediaItems.push({ url: ad.imageUrl, type: 'image' })
    }
    
    return mediaItems
  }

  const currentMedia = currentAd ? getAllMedia(currentAd) : []
  const currentMediaItem = currentMedia[currentMediaIndex]
  
  // Auto-rotate through ads and media items
  useEffect(() => {
    if (!currentAd || isPaused || isVideoPlaying) return
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Only auto-advance for images, not videos (videos advance on 'ended' event)
    if (currentMediaItem?.type === 'image') {
      const duration = (currentAd.displayDuration || defaultDuration) * 1000 // Convert seconds to milliseconds
      
      timerRef.current = setTimeout(() => {
        // If current ad has multiple media, cycle through them
        if (currentMedia.length > 1) {
          setCurrentMediaIndex((prev) => {
            const nextIndex = (prev + 1) % currentMedia.length
            // If we've cycled through all media, move to next ad
            if (nextIndex === 0 && activeAds.length > 1) {
              setCurrentIndex((prevAd) => (prevAd + 1) % activeAds.length)
            }
            return nextIndex
          })
        } else {
          // Single media item, just move to next ad
          if (activeAds.length > 1) {
            setCurrentIndex((prev) => (prev + 1) % activeAds.length)
            setCurrentMediaIndex(0)
          }
        }
      }, duration)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentMediaIndex, currentAd, isPaused, currentMedia.length, activeAds.length, currentMediaItem?.type, isVideoPlaying, defaultDuration])

  // Handle video playback events
  useEffect(() => {
    const video = videoRef.current
    if (!video || currentMediaItem?.type !== 'video') return

    const handlePlay = () => setIsVideoPlaying(true)
    const handlePause = () => setIsVideoPlaying(false)
    const handleEnded = () => {
      setIsVideoPlaying(false)
      // Move to next media item or next ad when video ends
      setCurrentMediaIndex((prev) => {
        const nextIndex = (prev + 1) % currentMedia.length
        // If we've cycled through all media, move to next ad
        if (nextIndex === 0 && activeAds.length > 1) {
          setCurrentIndex((prevAd) => (prevAd + 1) % activeAds.length)
        }
        return nextIndex
      })
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [currentMediaIndex, currentMediaItem?.type, currentMedia.length, activeAds.length])

  const goToNext = () => {
    if (activeAds.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activeAds.length)
      setCurrentMediaIndex(0)
    }
  }

  const goToPrevious = () => {
    if (activeAds.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length)
      setCurrentMediaIndex(0)
    }
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setCurrentMediaIndex(0)
  }

  if (activeAds.length === 0) {
    return null
  }

  const handleAdClick = () => {
    if (currentAd?.link) {
      window.open(currentAd.link, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="relative bg-background group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ad Content */}
      <div
        className={`relative overflow-hidden ${currentAd?.link ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
        onClick={handleAdClick}
      >
        {currentMediaItem ? (
          <div className="relative">
            {currentMediaItem.type === 'image' ? (
              <img
                src={currentMediaItem.url}
                alt={currentAd?.title || 'Advertisement'}
                className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <video
                ref={videoRef}
                src={currentMediaItem.url}
                className="w-full h-[400px] object-cover"
                autoPlay
                muted={false}
                controls
                playsInline
                controlsList="nodownload"
                preload="metadata"
              />
            )}
            {/* Subtle overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
        ) : (
          <div className="w-full h-[400px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <p className="text-muted-foreground">No media available</p>
          </div>
        )}

        {/* Ad Info Overlay with better design */}
        {(currentAd?.title || currentAd?.description) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-5">
            {currentAd.title && (
              <h3 className="text-white font-bold text-xl mb-2 drop-shadow-lg">{currentAd.title}</h3>
            )}
            {currentAd.description && (
              <p className="text-white/95 text-sm line-clamp-2 drop-shadow-md mb-2">{currentAd.description}</p>
            )}
            {currentAd.link && (
              <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
                <span>Learn More</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Pause indicator */}
        {isPaused && activeAds.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Navigation Controls - Only show if multiple ads */}
      {activeAds.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-10 w-10 p-0"
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
          >
            <ChevronLeft size={20} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-10 w-10 p-0"
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
          >
            <ChevronRight size={20} />
          </Button>

          {/* Dots Indicator with better styling */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {activeAds.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                }}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex 
                    ? 'bg-white w-6 h-2' 
                    : 'bg-white/50 hover:bg-white/70 w-2 h-2'
                }`}
                aria-label={`Go to ad ${index + 1}`}
              />
            ))}
          </div>

          {/* Media Dots - Show if current ad has multiple media */}
          {currentMedia.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
              {currentMedia.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentMediaIndex(index)
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentMediaIndex ? 'bg-white w-4 h-1.5' : 'bg-white/50 hover:bg-white/70 w-1.5 h-1.5'
                  }`}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Ad counter */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full text-white text-xs font-medium">
            {currentIndex + 1} / {activeAds.length}
          </div>
        </>
      )}
    </div>
  )
}
