"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Props {
  id: string
}

export default function AdminArticleEditor({ id }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    category: "",
    author: "",
    imageUrl: "",
    videoUrl: "",
    isFeatured: false,
    isTrending: false,
    isLatest: false,
  })

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/api/articles?id=${id}`)
        if (!res) {
          router.push('/admin')
          return
        }
        if (!res.ok) {
          console.error('Failed to load article', await res.text())
          router.push('/admin')
          return
        }
        const data = await res.json()
        setForm({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          author: data.author || "",
          imageUrl: data.imageUrl || data.image_url || "",
          videoUrl: data.videoUrl || data.video_url || "",
          isFeatured: !!data.isFeatured,
          isTrending: !!data.isTrending,
          isLatest: !!data.isLatest,
        })
      } catch (err) {
        console.error('Error fetching article', err)
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [id, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        title: form.title,
        description: form.description,
        content: form.description,
        category: form.category,
        author: form.author,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
        isFeatured: form.isFeatured,
        isTrending: form.isTrending,
        isLatest: form.isLatest,
      }
      const res = await apiClient.patch(`/api/articles?id=${id}`, body)
      if (!res) return router.push('/admin/login')
      if (!res.ok) {
        console.error('Failed to save article', await res.text())
      } else {
        router.push('/admin/news')
      }
    } catch (err) {
      console.error('Error saving article', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await apiClient.delete(`/api/articles?id=${id}`)
      if (!res) return router.push('/admin/login')
      if (!res.ok) {
        console.error('Failed to delete article', await res.text())
      } else {
        router.push('/admin/news')
      }
    } catch (err) {
      console.error('Error deleting article', err)
    }
  }

  if (loading) return <div>Loading article...</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Article</h1>
      <div className="space-y-4">
        <input className="w-full px-4 py-2 border rounded" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
        <textarea className="w-full px-4 py-2 border rounded" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Content / Description" />
        <input className="w-full px-4 py-2 border rounded" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
        <input className="w-full px-4 py-2 border rounded" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author" />
        <input className="w-full px-4 py-2 border rounded" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL" />
        <input className="w-full px-4 py-2 border rounded" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="Video URL" />
        <div className="flex gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isTrending} onChange={(e) => setForm({ ...form, isTrending: e.target.checked })} /> Trending</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isLatest} onChange={(e) => setForm({ ...form, isLatest: e.target.checked })} /> Latest</label>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>
    </div>
  )
}
