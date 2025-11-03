"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, Power, PowerOff, Loader2 } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/file-upload"
import { uploadFile, deleteFile } from "@/lib/uploadHelpers"
import { LoadingScreen } from "@/components/loading-screen"

interface LiveUpdate {
  id: string
  title: string
  url?: string | null
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
}

export default function LiveUpdatesPage() {
  const router = useRouter()
  const [updates, setUpdates] = useState<LiveUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: "", url: "" })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchUpdates = async () => {
    try {
      const res = await apiClient.get('/api/live-updates')
      if (res && (res as Response).ok) {
        const data = await (res as Response).json()
        setUpdates(data)
      }
    } catch (error) {
      console.error('Failed to fetch live updates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUpdates()
  }, [])

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required' })
      return
    }

    try {
      setSubmitting(true)
      let imageUrl: string | null = null

      if (imageFile) {
        // If editing and existing image, try delete
        if (editingId) {
          const current = updates.find(u => u.id === editingId)
          if (current?.imageUrl) {
            try {
              const parts = current.imageUrl.split('/')
              const idx = parts.findIndex(p => p === 'live-updates')
              if (idx >= 0) {
                const path = parts.slice(idx + 1).join('/')
                await deleteFile('live-updates', path)
              }
            } catch (e) {
              console.warn('Could not delete previous live update image:', e)
            }
          }
        }
        const uploaded = await uploadFile(imageFile, 'live-updates')
        imageUrl = uploaded?.url || null
      }

      const payload = {
        title: formData.title,
        url: formData.url || null,
        ...(imageUrl ? { imageUrl } : {}),
        isActive: true,
      }

      const res = editingId
        ? await apiClient.patch(`/api/live-updates?id=${editingId}`, payload)
        : await apiClient.post('/api/live-updates', payload)

      if (!res || (res as Response).status === 401) {
        toast({ title: 'Session expired', description: 'Please sign in again.' })
        router.push('/admin/login')
        return
      }

      if (!(res as Response).ok) {
        throw new Error('Save failed')
      }

      toast({ title: 'Saved', description: 'Live update saved successfully.' })
      setShowDialog(false)
      setFormData({ title: '', url: '' })
      setImageFile(null)
      setEditingId(null)
      fetchUpdates()
    } catch (error) {
      console.error('Save failed:', error)
      toast({ title: 'Error', description: 'Failed to save live update.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await apiClient.patch(`/api/live-updates?id=${id}`, { isActive: !currentStatus })
      if (!res || (res as Response).status === 401) {
        toast({ title: 'Session expired', description: 'Please sign in again.' })
        router.push('/admin/login')
        return
      }
      if (!(res as Response).ok) throw new Error('Toggle failed')
      toast({ title: 'Updated', description: 'Status changed.' })
      fetchUpdates()
    } catch (error) {
      console.error('Toggle failed:', error)
      toast({ title: 'Error', description: 'Failed to toggle status.' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return
    try {
      const res = await apiClient.delete(`/api/live-updates?id=${id}`)
      if (!res || (res as Response).status === 401) {
        toast({ title: 'Session expired', description: 'Please sign in again.' })
        router.push('/admin/login')
        return
      }
      if (!(res as Response).ok) throw new Error('Delete failed')
      toast({ title: 'Deleted', description: 'Live update deleted.' })
      fetchUpdates()
    } catch (error) {
      console.error('Delete failed:', error)
      toast({ title: 'Error', description: 'Failed to delete.' })
    }
  }

  const openEdit = (update: LiveUpdate) => {
    setEditingId(update.id)
    setFormData({ title: update.title, url: update.url || '' })
    setImageFile(null)
    setShowDialog(true)
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData({ title: '', url: '' })
    setShowDialog(true)
  }

  if (loading) return <LoadingScreen message="Loading live updates..." />

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Live Updates Management</h1>
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            Add Update
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary/10 border-b">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Title</th>
                  <th className="px-6 py-4 text-left font-semibold">URL</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Created</th>
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {updates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No live updates yet. Click "Add Update" to create one.
                    </td>
                  </tr>
                ) : (
                  updates.map((update) => (
                    <tr key={update.id} className="border-b hover:bg-background/50">
                      <td className="px-6 py-4 max-w-xs truncate">{update.title}</td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        {update.url ? (
                          <a href={update.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {update.url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            update.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {update.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(update.id, update.isActive)}
                            className="p-2 rounded hover:bg-muted"
                            title={update.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {update.isActive ? (
                              <PowerOff size={18} className="text-orange-600" />
                            ) : (
                              <Power size={18} className="text-green-600" />
                            )}
                          </button>
                          <button
                            onClick={() => openEdit(update)}
                            className="p-2 rounded hover:bg-muted"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(update.id)}
                            className="p-2 rounded hover:bg-muted"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <h2 className="text-2xl font-bold mb-4">{editingId ? 'Edit' : 'Create'} Live Update</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Breaking news or event"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">URL (optional)</label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <FileUpload
                label="Optional Image"
                type="image"
                accept="image/*"
                onFileSelect={setImageFile}
                currentUrl={editingId ? updates.find(u => u.id === editingId)?.imageUrl || undefined : undefined}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="destructive" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={submitting} variant="success">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
