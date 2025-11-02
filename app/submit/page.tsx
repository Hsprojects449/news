"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react"
import { uploadFile } from "@/lib/uploadHelpers"

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
        setTimeout(() => setSubmitted(false), 5000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to submit. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
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
                placeholder="+1 (555) 000-0000"
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
                className="font-semibold bg-white text-primary hover:bg-gray-100"
              >
                {loading ? "Submitting..." : "Submit Story"}
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
    </div>
  )
}
