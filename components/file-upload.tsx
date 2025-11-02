"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, Image as ImageIcon, Video } from "lucide-react"
import { validateFile, getFilePreview, revokeFilePreview } from "@/lib/uploadHelpers"

interface FileUploadProps {
  label?: string
  accept?: string
  maxSizeMB?: number
  onFileSelect: (file: File | null) => void
  currentUrl?: string | null
  type?: 'image' | 'video' | 'any'
}

export function FileUpload({
  label = "Upload File",
  accept = "image/*,video/*",
  maxSizeMB = 10,
  onFileSelect,
  currentUrl,
  type = 'any'
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError("")

    const validation = validateFile(selectedFile, maxSizeMB)
    if (!validation.valid) {
      setError(validation.error || "Invalid file")
      return
    }

    // Type-specific validation
    if (type === 'image' && !selectedFile.type.startsWith('image/')) {
      setError("Please select an image file")
      return
    }
    if (type === 'video' && !selectedFile.type.startsWith('video/')) {
      setError("Please select a video file")
      return
    }

    setFile(selectedFile)
    const previewUrl = getFilePreview(selectedFile)
    if (preview && preview.startsWith('blob:')) {
      revokeFilePreview(preview)
    }
    setPreview(previewUrl)
    onFileSelect(selectedFile)
  }

  const handleClear = () => {
    if (preview && preview.startsWith('blob:')) {
      revokeFilePreview(preview)
    }
    setPreview(null)
    setFile(null)
    setError("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
    onFileSelect(null)
  }

  const fileType = file?.type || (currentUrl?.includes('video') ? 'video' : 'image')
  const isImage = fileType.startsWith('image')
  const isVideo = fileType.startsWith('video')

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      
      {preview ? (
        <div className="relative inline-block">
          {isImage && (
            <img
              src={preview}
              alt="Preview"
              className="max-w-xs max-h-48 rounded-lg border border-input object-cover"
            />
          )}
          {isVideo && (
            <video
              src={preview}
              className="max-w-xs max-h-48 rounded-lg border border-input"
              controls
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleClear}
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
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
            Click to upload {type === 'any' ? 'image or video' : type}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Max size: {maxSizeMB}MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
