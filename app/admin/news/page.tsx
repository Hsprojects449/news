"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2, CheckCircle, XCircle, X } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { LogoutButton } from "@/components/logout-button"
import { CATEGORIES } from "@/lib/categories"
import { FileUpload } from "@/components/file-upload"
import { uploadFile, deleteFile } from "@/lib/uploadHelpers"

interface Submission {
  id: string
  name: string
  email: string
  phone: string
  title: string
  description: string
  submittedDate: string
  status: string
}

interface Article {
  id: string
  title: string
  description: string
  category: string
  author: string
  imageUrl?: string
  videoUrl?: string
  isFeatured?: boolean
  isTrending?: boolean
  isLatest?: boolean
}

const ITEMS_PER_PAGE = 5

export default function AdminNewsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [activeTab, setActiveTab] = useState<"articles">("articles")
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
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
  // submission pagination removed - submissions are managed in Submissions Management
  const [articlePage, setArticlePage] = useState(1)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData) {
      router.push("/admin/login")
      return
    }
    
    const init = async () => {
      setAdmin(JSON.parse(adminData))
      try {
        const articlesResponse = await apiClient.get("/api/articles")
        if (articlesResponse && articlesResponse.ok) {
          const data = await articlesResponse.json()
          if (Array.isArray(data)) {
            // Verify each article has a valid ID
            const validArticles = data.filter(article => article && article.id)
            if (validArticles.length !== data.length) {
              console.warn(`Some articles are missing IDs. Found ${validArticles.length} valid articles out of ${data.length}`)
            }
            setArticles(validArticles)
          } else {
            console.error("Articles data is not an array:", data)
            setArticles([])
          }
        } else {
          console.error("Failed to fetch articles: Server response not OK")
          setArticles([])
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error)
        setArticles([])
      }
      
      setLoading(false)
    }
    
    init()
  }, [router])

  // Pending submissions are now handled in the Submissions Management screen

  const handleImageFileSelect = (file: File | null) => {
    setImageFile(file)
  }

  const handleVideoFileSelect = (file: File | null) => {
    setVideoFile(file)
  }

  const handleAddArticle = async () => {
    if (formData.title && formData.description && formData.category) {
      try {
          setUploading(true)
          
          // Upload files if selected
          let imageUrl = formData.imageUrl
          let videoUrl = formData.videoUrl
          
          if (imageFile) {
            const result = await uploadFile(imageFile, 'articles')
            if (result) imageUrl = result.url
          }
          
          if (videoFile) {
            const result = await uploadFile(videoFile, 'articles')
            if (result) videoUrl = result.url
          }
          
          // Create a cleaned version of the data with only defined values
          const articleData = {
            title: formData.title,
            description: formData.description,
            content: formData.description,
            category: formData.category,
            author: formData.author || "Admin",
            // Only include optional fields if they have values
            ...(imageUrl ? { imageUrl } : {}),
            ...(videoUrl ? { videoUrl } : {}),
            ...(formData.isFeatured ? { isFeatured: true } : {}),
            ...(formData.isTrending ? { isTrending: true } : {}),
            ...(formData.isLatest ? { isLatest: true } : {})
          }

          const response = await apiClient.post("/api/articles", articleData)
        
          if (!response) {
            console.error('No response received from server')
            return
          }

          if (response.ok) {
            const newArticle = await response.json()
            if (newArticle && newArticle.id) { // Ensure the response includes an ID
              setArticles(prevArticles => [...prevArticles, newArticle])
              setFormData({
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
              setImageFile(null)
              setVideoFile(null)
              setShowAddForm(false)
            } else {
              console.error('Invalid response from server: Missing article ID')
            }
          } else {
            try {
              const errorData = await response.text()
              console.error('Failed to add article:', errorData)
            } catch (e) {
              console.error('Failed to add article: Server returned status', response.status)
            }
          }
      } catch (error) {
        console.error('Failed to add article:', error)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleEditArticle = (id: string) => {
    const article = articles.find((a) => a.id === id)
    if (article) {
      // Ensure optional fields are normalized to the form's expected types
      setFormData({
        title: article.title,
        description: article.description,
        category: article.category,
        author: article.author,
        imageUrl: article.imageUrl || "",
        videoUrl: article.videoUrl || "",
        isFeatured: !!article.isFeatured,
        isTrending: !!article.isTrending,
        isLatest: !!article.isLatest,
      })
      setImageFile(null)
      setVideoFile(null)
      setEditingId(id)
      setShowAddForm(true)
    }
  }

  const handleUpdateArticle = async () => {
    if (editingId && formData.title && formData.description && formData.category) {
      try {
        setUploading(true)
        
        // Upload new files if selected
        let imageUrl = formData.imageUrl
        let videoUrl = formData.videoUrl
        
        if (imageFile) {
          // Delete old image if exists
          if (formData.imageUrl) {
            try {
              const pathParts = formData.imageUrl.split('/')
              const path = pathParts.slice(pathParts.indexOf('articles')).join('/')
              await deleteFile('articles', path)
            } catch (err) {
              console.warn('Failed to delete old image:', err)
            }
          }
          const result = await uploadFile(imageFile, 'articles')
          if (result) imageUrl = result.url
        }
        
        if (videoFile) {
          // Delete old video if exists
          if (formData.videoUrl) {
            try {
              const pathParts = formData.videoUrl.split('/')
              const path = pathParts.slice(pathParts.indexOf('articles')).join('/')
              await deleteFile('articles', path)
            } catch (err) {
              console.warn('Failed to delete old video:', err)
            }
          }
          const result = await uploadFile(videoFile, 'articles')
          if (result) videoUrl = result.url
        }
        
        // Map client form fields to server-expected fields
        const updateData = {
          title: formData.title,
          description: formData.description,
          content: formData.description,
          category: formData.category,
          author: formData.author || "Admin",
          ...(imageUrl ? { imageUrl } : {}),
          ...(videoUrl ? { videoUrl } : {}),
          ...(formData.isFeatured ? { isFeatured: true } : {}),
          ...(formData.isTrending ? { isTrending: true } : {}),
          ...(formData.isLatest ? { isLatest: true } : {})
        }

        const response = await apiClient.patch(`/api/articles?id=${editingId}`, updateData)
        if (!response) {
          console.error('No response received from server when updating article')
          return
        }
        if (response.ok) {
          const updatedArticle = await response.json()
          setArticles(prev => prev.map((a) => (a.id === editingId ? updatedArticle : a)))
          setFormData({
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
          setImageFile(null)
          setVideoFile(null)
          setEditingId(null)
          setShowAddForm(false)
        } else {
          try {
            const err = await response.text()
            console.error('Failed to update article:', err)
          } catch (e) {
            console.error('Failed to update article: Server returned status', response.status)
          }
        }
      } catch (error) {
        console.error('Failed to update article:', error)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleDeleteArticle = async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/articles?id=${id}`)
      if (response && response.ok) {
        setArticles(prev => prev.filter((a) => a.id !== id))
      } else if (response) {
        try {
          const err = await response.text()
          console.error('Failed to delete article:', err)
        } catch (e) {
          console.error('Failed to delete article: status', response.status)
        }
      }
    } catch (error) {
      console.error('Failed to delete article:', error)
    }
  }

  const handleToggleTag = async (id: string, tag: "isFeatured" | "isTrending" | "isLatest") => {
    try {
      const article = articles.find(a => a.id === id)
      if (article) {
        const updateBody: any = { [tag]: !article[tag] }
        const response = await apiClient.patch(`/api/articles?id=${id}`, updateBody)
        if (response && response.ok) {
          setArticles(prev => prev.map((a) => (a.id === id ? { ...a, [tag]: !a[tag] } : a)))
        } else if (response) {
          try {
            const err = await response.text()
            console.error('Failed to toggle tag:', err)
          } catch (e) {
            console.error('Failed to toggle tag: status', response.status)
          }
        }
      }
    } catch (error) {
      console.error('Failed to update article tag:', error)
    }
  }

  const calculateArticlesPagination = () => {
    const start = (articlePage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return {
      paginatedArticles: articles.slice(start, end),
      articlePages: Math.ceil(articles.length / ITEMS_PER_PAGE)
    }
  }
  const { paginatedArticles, articlePages } = calculateArticlesPagination()

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Only Published Articles tab and content */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => {
              setActiveTab("articles")
              setArticlePage(1)
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === "articles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Published Articles ({articles.length})
          </button>
        </div>

        {/* Articles Tab */}
        {activeTab === "articles" && (
          <div className="space-y-4">
            <div className="mb-6">
              <Button onClick={() => setShowAddForm(!showAddForm)} className="font-semibold">
                <Plus size={16} className="mr-2" />
                Add New Article
              </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
              <div className="bg-card rounded-lg shadow-md p-6 mb-6 border-2 border-primary">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{editingId ? "Edit Article" : "Add New Article"}</h3>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingId(null)
                      setFormData({
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
                      setImageFile(null)
                      setVideoFile(null)
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={4}
                  />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <FileUpload
                    label="Article Image"
                    type="image"
                    accept="image/*"
                    onFileSelect={handleImageFileSelect}
                    currentUrl={formData.imageUrl}
                  />
                  <FileUpload
                    label="Article Video (Optional)"
                    type="video"
                    accept="video/*"
                    onFileSelect={handleVideoFileSelect}
                    currentUrl={formData.videoUrl}
                  />
                  <div className="space-y-2 p-4 bg-primary/5 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured || false}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="font-semibold">Mark as Featured Story</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isTrending || false}
                        onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="font-semibold">Mark as Trending</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isLatest || false}
                        onChange={(e) => setFormData({ ...formData, isLatest: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="font-semibold">Mark as Latest News</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={editingId ? handleUpdateArticle : handleAddArticle}
                      className="flex-1 font-semibold"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : editingId ? "Update Article" : "Add Article"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingId(null)
                        setFormData({
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
                        setImageFile(null)
                        setVideoFile(null)
                      }}
                      className="flex-1"
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {paginatedArticles.filter(article => article && article.id).map((article) => (
              <div key={article.id} className="bg-card rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {(article.imageUrl || article.videoUrl) && (
                    <div className="w-32 h-32 flex-shrink-0">
                      {article.imageUrl && (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                      {article.videoUrl && !article.imageUrl && (
                        <video
                          src={article.videoUrl}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Category: {article.category}</p>
                    <p className="text-sm text-muted-foreground mb-2">Author: {article.author}</p>
                    <p className="text-sm line-clamp-2">{article.description}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {article.isFeatured && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                          Featured
                        </span>
                      )}
                      {article.isTrending && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                          Trending
                        </span>
                      )}
                      {article.isLatest && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-shrink-0">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditArticle(article.id)}>
                        <Edit2 size={16} className="mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteArticle(article.id)}>
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={article.isFeatured ? "default" : "outline"}
                        onClick={() => handleToggleTag(article.id, "isFeatured")}
                        className="text-xs"
                      >
                        Featured
                      </Button>
                      <Button
                        size="sm"
                        variant={article.isTrending ? "default" : "outline"}
                        onClick={() => handleToggleTag(article.id, "isTrending")}
                        className="text-xs"
                      >
                        Trending
                      </Button>
                      <Button
                        size="sm"
                        variant={article.isLatest ? "default" : "outline"}
                        onClick={() => handleToggleTag(article.id, "isLatest")}
                        className="text-xs"
                      >
                        Latest
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {articlePages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setArticlePage((p) => Math.max(1, p - 1))}
                  disabled={articlePage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: articlePages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={articlePage === page ? "default" : "outline"}
                      onClick={() => setArticlePage(page)}
                      size="sm"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setArticlePage((p) => Math.min(articlePages, p + 1))}
                  disabled={articlePage === articlePages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
