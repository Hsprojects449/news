"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface MediaGalleryProps {
  media: MediaItem[]
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (!media || media.length === 0) {
    return null
  }

  const currentMedia = media[currentIndex]

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Main Media Display */}
        <div className="relative rounded-lg overflow-hidden bg-black group">
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={`Media ${currentIndex + 1}`}
              className="w-full h-auto max-h-[600px] object-contain cursor-pointer"
              onClick={() => setIsFullscreen(true)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <video
              key={currentMedia.url}
              src={currentMedia.url}
              controls
              className="w-full h-auto max-h-[600px] object-contain"
              preload="metadata"
            />
          )}

          {/* Navigation Arrows - Show on hover if multiple items */}
          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                onClick={goToPrevious}
              >
                <ChevronLeft size={24} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                onClick={goToNext}
              >
                <ChevronRight size={24} />
              </Button>

              {/* Counter */}
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {media.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {media.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {media.map((item, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                  index === currentIndex
                    ? 'border-primary ring-2 ring-primary'
                    : 'border-transparent hover:border-muted-foreground'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="none"
                  />
                )}
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-black border-y-[4px] border-y-transparent ml-0.5" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && currentMedia.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(false)}
          >
            <X size={24} />
          </Button>

          <img
            src={currentMedia.url}
            alt={`Full size ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            loading="eager"
          />

          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
              >
                <ChevronLeft size={32} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
              >
                <ChevronRight size={32} />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full">
                {currentIndex + 1} / {media.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
