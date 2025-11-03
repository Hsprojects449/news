"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Plus, Edit2, Trash2, Loader2 } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { uploadFile, deleteFile } from "@/lib/uploadHelpers"

interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  imageUrl?: string
  applyEmail?: string
  applyUrl?: string
  postedDate: string
  status: string
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    imageUrl: "",
    applyEmail: "",
    applyUrl: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData) {
      router.push("/admin/login")
      return
    }
    setAdmin(JSON.parse(adminData))

    const fetchJobs = async () => {
      try {
        const response = await fetch("/api/jobs")
        if (!response.ok) throw new Error("Failed to fetch jobs")
        const result = await response.json()
        // Handle both old format (array) and new format (object with data/count)
        const jobsData = Array.isArray(result) ? result : (result.data || [])
        setJobs(jobsData)
      } catch (error) {
        console.error("Error fetching jobs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let imageUrl = formData.imageUrl

      // Upload new image if selected
      if (imageFile) {
        // Delete old image if exists and editing
        if (editingId && formData.imageUrl) {
          try {
            const parts = formData.imageUrl.split('/')
            const idx = parts.findIndex(p => p === 'jobs')
            if (idx >= 0) {
              const path = parts.slice(idx + 1).join('/')
              await deleteFile('jobs', path)
            }
          } catch (err) {
            console.warn('Failed to delete old image:', err)
          }
        }
        const result = await uploadFile(imageFile, 'jobs')
        if (result) imageUrl = result.url
      }

      if (editingId) {
        console.log("Updating job with ID:", editingId);
        
        const response = await fetch(`/api/jobs/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('admin') || '{}').token}`
          },
          body: JSON.stringify({
            ...formData,
            ...(imageUrl ? { imageUrl } : {}),
            status: 'active'
          })
        })

        if (!response.ok) throw new Error('Failed to update job')
        
        const updatedJob = await response.json()
        setJobs(prev => prev.map(job => job.id === editingId ? updatedJob : job))
        setEditingId(null)
      } else {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('admin') || '{}').token}`
          },
          body: JSON.stringify({
            ...formData,
            ...(imageUrl ? { imageUrl } : {}),
            status: 'active',
            postedDate: new Date().toISOString()
          })
        })

        if (!response.ok) throw new Error('Failed to create job')
        
        const newJob = await response.json()
        setJobs(prev => [newJob, ...prev])
      }

      setShowForm(false)
      setImageFile(null)
    } catch (error) {
      console.error('Error submitting job:', error)
    } finally {
      setSubmitting(false)
      setFormData({
        title: "",
        company: "",
        location: "",
        description: "",
        imageUrl: "",
        applyEmail: "",
        applyUrl: "",
      })
    }
  }

  const handleEdit = (job: Job) => {
    console.log("Editing job:", job);
    setFormData({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      description: job.description || "",
      imageUrl: job.imageUrl || "",
      applyEmail: job.applyEmail || "",
      applyUrl: job.applyUrl || "",
    })
    setImageFile(null)
    setEditingId(job.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    
    setSubmitting(true)
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('admin') || '{}').token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete job')
      
      setJobs(prev => prev.filter(job => job.id !== id))
    } catch (error) {
      console.error('Error deleting job:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin")
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Add Job Button */}
        <div className="mb-8 flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} size="lg" variant={showForm ? "destructive" : "default"}>
            <Plus size={16} className="mr-2" />
            {showForm ? "Cancel" : "Add New Job"}
          </Button>
        </div>

        {/* Job Form */}
        {showForm && (
          <div className="bg-card rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">{editingId ? "Edit Job" : "Create New Job"}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Job Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Company *</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="e.g., Tech Company Inc."
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Job description and requirements..."
                  rows={6}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  required
                />
              </div>

              <FileUpload
                label="Job Image (Optional)"
                type="image"
                accept="image/*"
                onFileSelect={setImageFile}
                currentUrl={formData.imageUrl}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Apply Email</label>
                  <input
                    type="email"
                    name="applyEmail"
                    value={formData.applyEmail}
                    onChange={handleChange}
                    placeholder="careers@company.com"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Apply URL</label>
                  <input
                    type="url"
                    name="applyUrl"
                    value={formData.applyUrl}
                    onChange={handleChange}
                    placeholder="https://company.com/careers"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={submitting} variant="success">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingId ? "Update Job" : "Create Job"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  disabled={submitting}
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setImageFile(null)
                    setFormData({
                      title: "",
                      company: "",
                      location: "",
                      description: "",
                      imageUrl: "",
                      applyEmail: "",
                      applyUrl: "",
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

          {/* Jobs List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">Active Jobs ({jobs.filter((j) => j.status === "active").length})</h2>
          {loading ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">Loading jobs...</p>
            </div>
          ) : jobs.filter((j) => j.status === "active").length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg">
              <p className="text-muted-foreground">No active jobs. Create one to get started.</p>
            </div>
          ) : (
            jobs
              .filter((j) => j.status === "active")
              .map((job) => (
                <div key={job.id} className="bg-card rounded-lg shadow-md p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {job.imageUrl && (
                      <div className="w-32 h-32 flex-shrink-0">
                        <img
                          src={job.imageUrl}
                          alt={job.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{job.company}</p>
                      <p className="text-sm text-muted-foreground mb-3">{job.location}</p>
                      <p className="text-sm line-clamp-2">{job.description}</p>
                    </div>
                    <div className="flex gap-2 md:flex-shrink-0">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEdit(job)}
                        disabled={submitting}
                      >
                        <Edit2 size={16} className="mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(job.id)}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Trash2 size={16} className="mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}
