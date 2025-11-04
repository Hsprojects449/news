"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Edit2, Loader2 } from "lucide-react"
import LogoutButton from "@/components/logout-button"
import { FileUpload } from "@/components/file-upload"
import { uploadFile, deleteFile } from "@/lib/uploadHelpers"

interface Advertisement {
  id: string
  title: string
  description: string
  imageUrl?: string
  link?: string
  position: "left" // Only left position supported
  displayDuration?: number
  isActive: boolean
  createdDate: string
}

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<Advertisement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    imageUrl: string
    link: string
    position: Advertisement['position']
    displayDuration: number
  }>({
    title: "",
    description: "",
    imageUrl: "",
    link: "",
    position: "left",
    displayDuration: 5,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch("/api/advertisements")
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setAds(data)
      } catch (error) {
        console.error("Failed to fetch ads:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAds()
  }, [])

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) return

    try {
      setSubmitting(true)
      let imageUrl = formData.imageUrl

      // If new image selected, upload to advertisements bucket
      if (imageFile) {
        // delete old image if editing and exists
        if (editingId && formData.imageUrl) {
          try {
            const parts = formData.imageUrl.split('/')
            const idx = parts.findIndex(p => p === 'advertisements')
            if (idx >= 0) {
              const path = parts.slice(idx + 1).join('/')
              await deleteFile('advertisements', path)
            }
          } catch (e) {
            console.warn('Could not delete previous ad image:', e)
          }
        }
        const uploaded = await uploadFile(imageFile, 'advertisements')
        if (uploaded) imageUrl = uploaded.url
      }

      if (editingId) {
        const response = await fetch(`/api/advertisements/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, imageUrl }),
        })
        if (!response.ok) throw new Error("Failed to update")
        const updated = await response.json()
        setAds(ads.map(ad => ad.id === editingId ? updated : ad))
        setEditingId(null)
      } else {
        const response = await fetch("/api/advertisements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, imageUrl }),
        })
        if (!response.ok) throw new Error("Failed to create")
        const newAd = await response.json()
        setAds([...ads, newAd])
      }
      
      setFormData({ title: "", description: "", imageUrl: "", link: "", position: "left", displayDuration: 5 })
      setImageFile(null)
      setShowForm(false)
    } catch (error) {
      console.error("Failed to submit ad:", error)
      // TODO: Add error handling UI
    } finally {
      setSubmitting(false)
    }

    setFormData({ title: "", description: "", imageUrl: "", link: "", position: "left", displayDuration: 5 })
    setShowForm(false)
  }

  const handleEdit = (ad: Advertisement) => {
    setFormData({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl || "",
      link: ad.link || "",
      position: ad.position,
      displayDuration: ad.displayDuration || 5,
    })
    setEditingId(ad.id)
    setShowForm(true)
    // Scroll to top for editing interface
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/advertisements/${id}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete")
      setAds(ads.filter(ad => ad.id !== id))
    } catch (error) {
      console.error("Failed to delete ad:", error)
      // TODO: Add error handling UI
    }
  }

  const handleToggle = async (id: string) => {
    try {
      const ad = ads.find(a => a.id === id)
      if (!ad) return

      const response = await fetch(`/api/advertisements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.isActive })
      })
      if (!response.ok) throw new Error("Failed to toggle")
      const updated = await response.json()
      setAds(ads.map(a => a.id === id ? updated : a))
    } catch (error) {
      console.error("Failed to toggle ad:", error)
      // TODO: Add error handling UI
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">


        <div className="mb-8 flex justify-end">
          <Button onClick={() => {
            if (showForm) {
              // Cancel - close form and reset state
              setShowForm(false)
              setEditingId(null)
              setFormData({
                title: "",
                description: "",
                imageUrl: "",
                link: "",
                position: "left",
                displayDuration: 5,
              })
              setImageFile(null)
            } else {
              // Add new - open form in create mode
              setEditingId(null)
              setFormData({
                title: "",
                description: "",
                imageUrl: "",
                link: "",
                position: "left",
                displayDuration: 5,
              })
              setImageFile(null)
              setShowForm(true)
              // Scroll to top for creating interface
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }} className="gap-2" variant={showForm ? "destructive" : "default"}>
            <Plus size={20} />
            {showForm ? "Cancel" : "Add Advertisement"}
          </Button>
        </div>

        {showForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">{editingId ? "Edit" : "Create"} Advertisement</h2>
            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
              <FileUpload
                label="Advertisement Image"
                type="image"
                accept="image/*"
                onFileSelect={setImageFile}
                currentUrl={formData.imageUrl}
              />
              <Input
                placeholder="Link URL"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="left">Left Sidebar (Mobile & Desktop)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Advertisements appear in the left sidebar on both mobile and desktop versions.
              </p>
              <div className="space-y-2">
                <label htmlFor="displayDuration" className="text-sm font-medium">
                  Display Duration (seconds)
                </label>
                <Input
                  id="displayDuration"
                  type="number"
                  min="1"
                  max="60"
                  placeholder="5"
                  value={formData.displayDuration}
                  onChange={(e) => setFormData({ ...formData, displayDuration: parseInt(e.target.value) || 5 })}
                />
                <p className="text-xs text-muted-foreground">
                  How long this ad should display before switching (1-60 seconds)
                </p>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={submitting} variant="success">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{editingId ? "Update" : "Create"} Advertisement</>
                )}
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : ads.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No advertisements yet</Card>
          ) : (
            ads.map((ad) => (
              <Card key={ad.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{ad.title}</h3>
                    <p className="text-muted-foreground">{ad.description}</p>
                    <p className="text-sm text-muted-foreground mt-2">Position: {ad.position}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={ad.isActive}
                        onChange={() => handleToggle(ad.id)}
                        className="w-4 h-4"
                      />
                      Active
                    </label>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ad)} className="gap-2">
                      <Edit2 size={16} />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(ad.id)} className="gap-2">
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
