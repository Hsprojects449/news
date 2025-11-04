"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, Image as ImageIcon, Video } from "lucide-react"
import { validateFile, getFilePreview, revokeFilePreview } from "@/lib/uploadHelpers"

interface MediaItem {
  file?: File
  url: string
  type: 'image' | 'video'
  isExisting?: boolean
}

interface MultiFileUploadProps {
  label?: string
  accept?: string
  maxSizeMB?: number
  maxFiles?: number
  onFilesChange: (files: File[]) => void
  onMediaChange?: (media: Array<{ url: string; type: 'image' | 'video' }>) => void
  currentMedia?: Array<{ url: string; type: 'image' | 'video' }>
  type?: 'image' | 'video' | 'any'
}

export function MultiFileUpload({
  label = "Upload Files",
  accept = "image/*,video/*",
  maxSizeMB = 10,
  maxFiles = 10,
  onFilesChange,
  onMediaChange,
  currentMedia = [],
  type = 'any'
}: MultiFileUploadProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    currentMedia.filter(m => !m.url.startsWith('blob:')).map(m => ({ ...m, isExisting: true }))
  )
  const [error, setError] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync mediaItems when currentMedia prop changes (e.g., when editing different articles)
  useEffect(() => {
    // Separate incoming server URLs (clean) from any local blob previews.
    const cleanCurrentMedia = currentMedia.filter(m => !m.url.startsWith('blob:'))
    const existingItems = cleanCurrentMedia.map(m => ({ ...m, isExisting: true }))
    console.log('MultiFileUpload: currentMedia changed, clean items:', existingItems)

    // Merge any locally-created blob previews (already in local state) with server-hosted items
    setMediaItems((prev) => {
      const localBlobs = prev.filter(item => item.url && item.url.startsWith('blob:'))
      // Avoid duplicates by URL
      const merged = [
        ...localBlobs,
        ...existingItems.filter(e => !localBlobs.some(b => b.url === e.url)),
      ]
      return merged
    })
    // Don't notify parent of existing media as new files
  }, [currentMedia])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return

    setError("")

    if (mediaItems.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newItems: MediaItem[] = []
    const validFiles: File[] = []

    for (const file of selectedFiles) {
      const validation = validateFile(file, maxSizeMB)
      if (!validation.valid) {
        setError(validation.error || "Invalid file")
        continue
      }

      // Type-specific validation
      if (type === 'image' && !file.type.startsWith('image/')) {
        setError("Please select image files only")
        continue
      }
      if (type === 'video' && !file.type.startsWith('video/')) {
        setError("Please select video files only")
        continue
      }

      const previewUrl = getFilePreview(file)
      newItems.push({
        file,
        url: previewUrl,
        type: file.type.startsWith('image') ? 'image' : 'video'
      })
      validFiles.push(file)
    }

    const updatedItems = [...mediaItems, ...newItems]
    setMediaItems(updatedItems)
    
    // Return only new files (not existing URLs)
    const allFiles = updatedItems.filter(item => item.file && !item.isExisting).map(item => item.file!)
    onFilesChange(allFiles)
    
    // If onMediaChange is provided, also return the full media array (existing + new)
    if (onMediaChange) {
      const allMedia = updatedItems.map(item => ({
        url: item.url,
        type: item.type
      }))
      onMediaChange(allMedia)
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleRemove = (index: number) => {
    const item = mediaItems[index]
    console.log('Removing media item:', { index, item, isExisting: item?.isExisting })
    
    if (item && item.url && item.url.startsWith('blob:')) {
      revokeFilePreview(item.url)
    }
    
    const updatedItems = mediaItems.filter((_, i) => i !== index)
    setMediaItems(updatedItems)
    
    // Return only new files (not existing URLs)
    const allFiles = updatedItems.filter(item => item.file && !item.isExisting).map(item => item.file!)
    onFilesChange(allFiles)
    
    // If onMediaChange is provided, also return the full media array (existing + new)
    if (onMediaChange) {
      const allMedia = updatedItems.map(item => ({
        url: item.url,
        type: item.type
      }))
      console.log('Updated media array after removal:', allMedia)
      onMediaChange(allMedia)
    }
  }

  const handleClearAll = () => {
    mediaItems.forEach(item => {
      if (item.url && item.url.startsWith('blob:')) {
        revokeFilePreview(item.url)
      }
    })
    setMediaItems([])
    setError("")
    onFilesChange([])
    
    // If onMediaChange is provided, also clear the media array
    if (onMediaChange) {
      onMediaChange([])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">{label}</label>
        {mediaItems.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Upload Area */}
      {mediaItems.length < maxFiles && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary transition"
        >
          {type === 'image' ? (
            <ImageIcon size={32} className="text-muted-foreground mb-2" />
          ) : type === 'video' ? (
            <Video size={32} className="text-muted-foreground mb-2" />
          ) : (
            <Upload size={32} className="text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            Click to upload {type === 'any' ? 'images or videos' : `${type}s`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max {maxFiles} files • {maxSizeMB}MB each • {mediaItems.length}/{maxFiles} uploaded
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Preview Grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {mediaItems.map((item, index) => (
            <div key={index} className="relative group">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-input"
                />
              ) : (
                <video
                  src={item.url}
                  className="w-full h-32 object-cover rounded-lg border border-input"
                  muted
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                onClick={() => handleRemove(index)}
              >
                <X size={14} />
              </Button>
              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {item.type === 'video' ? <Video size={12} className="inline" /> : <ImageIcon size={12} className="inline" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
