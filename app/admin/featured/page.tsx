"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, Plus, GripVertical } from "lucide-react"
import LogoutButton from "@/components/logout-button"

interface Article {
  id: string
  title: string
}

interface FeaturedStory {
  id: string
  articleId: string
  order: number
  isActive: boolean
  addedDate: string
}

export default function FeaturedStoriesPage() {
  const [featured, setFeatured] = useState<FeaturedStory[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const articlesRes = await fetch("/api/articles")
        const articlesData = await articlesRes.json()
        setArticles(articlesData)

        const featured = JSON.parse(localStorage.getItem("featured") || "[]")
        setFeatured(featured)
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddFeatured = () => {
    if (!selectedArticle) return

    const newFeatured: FeaturedStory = {
      id: `fs${Date.now()}`,
      articleId: selectedArticle,
      order: featured.length + 1,
      isActive: true,
      addedDate: new Date().toISOString(),
    }

    const updated = [...featured, newFeatured]
    setFeatured(updated)
    localStorage.setItem("featured", JSON.stringify(updated))
    setSelectedArticle("")
  }

  const handleRemove = (id: string) => {
    const updated = featured.filter((f) => f.id !== id)
    setFeatured(updated)
    localStorage.setItem("featured", JSON.stringify(updated))
  }

  const handleToggle = (id: string) => {
    const updated = featured.map((f) => (f.id === id ? { ...f, isActive: !f.isActive } : f))
    setFeatured(updated)
    localStorage.setItem("featured", JSON.stringify(updated))
  }

  const getArticleTitle = (articleId: string) => {
    return articles.find((a) => a.id === articleId)?.title || "Unknown Article"
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Featured Stories Management</h1>
      </div>

      <Card className="p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Add Featured Story</h2>
        <div className="flex gap-4">
          <select
            value={selectedArticle}
            onChange={(e) => setSelectedArticle(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          >
            <option value="">Select an article...</option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </select>
          <Button onClick={handleAddFeatured} className="gap-2">
            <Plus size={20} />
            Add to Featured
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Current Featured Stories</h2>
        {loading ? (
          <div>Loading...</div>
        ) : featured.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No featured stories yet</Card>
        ) : (
          featured.map((story) => (
            <Card key={story.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <GripVertical size={20} className="text-muted-foreground" />
                <div>
                  <p className="font-semibold">{getArticleTitle(story.articleId)}</p>
                  <p className="text-sm text-muted-foreground">Order: {story.order}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={story.isActive}
                    onChange={() => handleToggle(story.id)}
                    className="w-4 h-4"
                  />
                  Active
                </label>
                <Button variant="destructive" size="sm" onClick={() => handleRemove(story.id)} className="gap-2">
                  <Trash2 size={16} />
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
