"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import apiClient from "@/lib/apiClient"

interface ContentPage {
  id: string
  title: string
  content: string
}

export default function AdminContentPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [pages, setPages] = useState<ContentPage[]>([])
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData) {
      router.push("/admin/login")
    } else {
      setAdmin(JSON.parse(adminData))
    }
  }, [router])

  const handleSelectPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId)
    if (page) {
      setSelectedPage(pageId)
      setEditContent(page.content)
    }
  }

  useEffect(() => {
    // load initial pages from API with fallbacks
    const ids = ["about", "terms", "privacy"]
    const fetchAll = async () => {
      const results: ContentPage[] = []
      for (const id of ids) {
        try {
          const res = await apiClient.get(`/api/content?id=${id}`)
          if (res && (res as Response).ok) {
            const data = await (res as Response).json()
            results.push({ id: data.id, title: data.title, content: data.content || "" })
          }
        } catch (e) {
          // ignore, fallback below handled by API
        }
      }
      if (results.length === 0) {
        setPages([
          { id: "about", title: "About Us", content: "Your trusted source for news and opportunities." },
          { id: "terms", title: "Terms & Conditions", content: "Please read our terms and conditions carefully." },
          { id: "privacy", title: "Privacy Policy", content: "We respect your privacy and protect your data." },
        ])
      } else {
        setPages(results)
      }
    }
    fetchAll()
  }, [])

  const handleSave = async () => {
    if (!selectedPage) return
    try {
      const page = pages.find(p => p.id === selectedPage)
      if (!page) return
      const res = await apiClient.patch('/api/content', { id: page.id, title: page.title, content: editContent })
      if (!res || !(res as Response).ok) throw new Error('Save failed')
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, content: editContent } : p))
      // eslint-disable-next-line no-alert
      alert('Content updated successfully!')
    } catch (e) {
      console.error('Failed to save content:', e)
      // eslint-disable-next-line no-alert
      alert('Failed to save content')
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <h2 className="text-lg font-bold mb-4">Pages</h2>
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    selectedPage === page.id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="md:col-span-3">
            {selectedPage ? (
              <div className="bg-card rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-6">{pages.find((p) => p.id === selectedPage)?.title}</h2>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={12}
                />
                <div className="mt-6">
                  <Button onClick={handleSave} size="lg">
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg">
                <p className="text-muted-foreground">Select a page to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
