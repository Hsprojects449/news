"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react"
import { uploadFile } from "@/lib/uploadHelpers"
import { Spinner } from "@/components/ui/spinner"
import { compareTextAgainstCorpus } from "@/lib/textSimilarity"

export default function SubmitPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    description: "",
  })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [plagiarismOpen, setPlagiarismOpen] = useState(false)
  const [plagiarismInfo, setPlagiarismInfo] = useState<{ maxScore: number; topMatches: Array<{ title: string; type: string; score: number }> } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // For phone field, only allow numbers, spaces, +, and hyphens
    if (name === 'phone') {
      const sanitized = value.replace(/[^\d\s+\-]/g, '')
      setFormData((prev) => ({ ...prev, [name]: sanitized }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      
      // Validate file sizes
      const maxFileSize = 10 * 1024 * 1024 // 10MB
      const invalidFiles = newFiles.filter(file => file.size > maxFileSize)
      if (invalidFiles.length > 0) {
        setError(`Some files exceed the 10MB limit: ${invalidFiles.map(f => f.name).join(", ")}`)
        return
      }
      
      // Generate previews
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      
      setMediaFiles((prev) => [...prev, ...newFiles])
      setMediaPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    // Revoke old preview URL
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.title || !formData.description) {
      setError("All fields are required")
      setLoading(false)
      return
    }

    try {
      // 1) Plagiarism check before any uploads
      try {
        const checkRes = await fetch("/api/plagiarism/check", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'submission',
            title: formData.title,
            content: formData.description,
          })
        })
        if (checkRes.ok) {
          const result = await checkRes.json()
          if (result.flagged) {
            const top = Array.isArray(result.topMatches) ? result.topMatches : []
            setPlagiarismInfo({
              maxScore: result.maxScore,
              topMatches: top.map((m: any) => ({ title: m.title, type: m.type, score: m.score }))
            })
            setPlagiarismOpen(true)
            return
          }
          // Fallback client-side check if server didn't flag but score may still be high
          if (typeof result.maxScore !== 'number' || result.maxScore < 0.6) {
            try {
              const artsRes = await fetch('/api/articles?limit=100&status=published')
              if (artsRes.ok) {
                const data = await artsRes.json()
                const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : [])
                const corpus = items.map((a: any) => ({ id: a.id, type: 'article' as const, title: a.title, text: a.description || a.content || '' }))
                const { matches, maxScore } = compareTextAgainstCorpus({ title: formData.title, content: formData.description }, corpus, { ngram: 3 })
                if (maxScore >= 0.6) {
                  setPlagiarismInfo({ maxScore, topMatches: matches.slice(0, 5).map(m => ({ title: m.title, type: m.type, score: m.score })) })
                  setPlagiarismOpen(true)
                  return
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        // Non-fatal: if check fails, proceed but log
        console.warn('Plagiarism check unavailable:', e)
      }

      // 2) Upload media files after passing plagiarism check
      // Upload media files first
      const uploadedUrls: string[] = []
      for (const file of mediaFiles) {
        const result = await uploadFile(file, 'submissions')
        if (result) {
          uploadedUrls.push(result.url)
        }
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          mediaUrls: uploadedUrls
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setFormData({ name: "", email: "", phone: "", title: "", description: "" })
        mediaPreviews.forEach(url => URL.revokeObjectURL(url))
        setMediaFiles([])
        setMediaPreviews([])
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setTimeout(() => setSubmitted(false), 5000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to submit. Please try again.")
        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Submit Your Story</h1>
          <p className="text-lg opacity-90">Share your news with our community</p>
        </div>
      </section>

      {/* Form Section */}
      <section className="max-w-2xl mx-auto px-4 py-16 w-full">
        <div className="bg-card rounded-lg shadow-md p-8 border border-border">
          {submitted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top duration-300">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-green-900">Submission Received</h3>
                <p className="text-sm text-green-800">
                  Thank you for your submission! Our team will review it and get back to you soon.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top duration-300">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Contact Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 00000 00000"
                pattern="[\d\s+\-]+"
                title="Please enter a valid phone number (numbers, spaces, +, and - only)"
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">News Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter the headline of your story"
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Story Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Write your complete story here..."
                rows={8}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            <div className="border-2 border-dashed border-secondary/50 rounded-lg p-6 bg-secondary/5">
              <label className="block text-sm font-semibold mb-4 flex items-center gap-2">
                <Upload size={18} className="text-secondary" />
                Upload Images or Videos (Optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPG, PNG, GIF, MP4, WebM (Max 10MB per file)
              </p>

              {/* Display uploaded files with previews */}
              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Uploaded Files ({mediaFiles.length}):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {mediaFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group bg-card rounded-lg border border-border overflow-hidden"
                      >
                        {file.type.startsWith('image/') && (
                          <img
                            src={mediaPreviews[idx]}
                            alt={file.name}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        {file.type.startsWith('video/') && (
                          <video
                            src={mediaPreviews[idx]}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="p-2 bg-card/90">
                          <p className="text-xs truncate">{file.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Images and videos help make your story more engaging and increase visibility.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                variant="success"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" /> Submitting...
                  </span>
                ) : (
                  "Submit Story"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setFormData({ name: "", email: "", phone: "", title: "", description: "" })
                  mediaPreviews.forEach(url => URL.revokeObjectURL(url))
                  setMediaFiles([])
                  setMediaPreviews([])
                }}
              >
                Clear
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="font-semibold mb-4">Guidelines for Submission</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Ensure your story is factual and well-researched</li>
              <li>• Avoid plagiarism and respect copyright</li>
              <li>• Include relevant details and sources when applicable</li>
              <li>• Keep your story clear and concise</li>
              <li>• Add images or videos to make your story more engaging</li>
              <li>• Our team will review and contact you within 24-48 hours</li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />

      {/* Plagiarism Warning (public submissions are blocked when flagged) */}
      <AlertDialog open={plagiarismOpen} onOpenChange={setPlagiarismOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Similar content detected</AlertDialogTitle>
            <AlertDialogDescription>
              {plagiarismInfo
                ? `Your story is highly similar to existing content. Similarity score: ${Math.round(plagiarismInfo.maxScore * 100)}%.`
                : `Please revise the content in your own words before submitting.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {plagiarismInfo && (
            <div className="space-y-3 mt-2">
              {plagiarismInfo.topMatches?.length ? (
                <div>
                  <div className="font-semibold mb-1">Top matches:</div>
                  <ul className="list-disc pl-6 space-y-1">
                    {plagiarismInfo.topMatches.map((m, i) => (
                      <li key={i}>
                        <span className="uppercase text-xs bg-muted px-1 py-0.5 rounded mr-2">{m.type}</span>
                        {m.title} — {Math.round(m.score * 100)}%
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>Please revise the content in your own words before submitting.</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPlagiarismOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
