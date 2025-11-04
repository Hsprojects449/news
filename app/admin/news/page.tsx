"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Plus, Edit2, Trash2, CheckCircle, XCircle, X, Eye } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { LogoutButton } from "@/components/logout-button"
import { CATEGORIES } from "@/lib/categories"
import { FileUpload } from "@/components/file-upload"
import { MultiFileUpload } from "@/components/multi-file-upload"
import { MediaGallery } from "@/components/media-gallery"
import { uploadFile, deleteFile } from "@/lib/uploadHelpers"
import { LoadingScreen } from "@/components/loading-screen"
import { compareTextAgainstCorpus } from "@/lib/textSimilarity"

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
  media?: Array<{ url: string; type: 'image' | 'video' }>
  views?: number
  isFeatured?: boolean
  isTrending?: boolean
  isLatest?: boolean
  isLive?: boolean
}

const ITEMS_PER_PAGE = 5

export default function AdminNewsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [totalArticles, setTotalArticles] = useState(0)
  const [activeTab, setActiveTab] = useState<"articles">("articles")
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fileUploadKey, setFileUploadKey] = useState(0)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    author: "",
    imageUrl: "",
    videoUrl: "",
    media: [] as Array<{ url: string; type: 'image' | 'video' }>,
    isFeatured: false,
    isTrending: false,
    isLatest: false,
    isLive: false,
  })
  const [articlePage, setArticlePage] = useState(1)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [plagiarismOpen, setPlagiarismOpen] = useState(false)
  const [plagiarismInfo, setPlagiarismInfo] = useState<{ maxScore: number; topMatches: Array<{ title: string; type: string; score: number }> } | null>(null)
  const [pendingAction, setPendingAction] = useState<null | (() => Promise<void>)>(null)
  const pendingActionRef = useRef<null | (() => Promise<void>)>(null)
  const updateInProgressRef = useRef(false)
  const addInProgressRef = useRef(false)
  const plagiarismDialogActiveRef = useRef(false)
  const pendingActionType = useRef<'add' | 'update' | null>(null)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData) {
      router.push("/admin/login")
      return
    }
    
    const init = async () => {
      setAdmin(JSON.parse(adminData))
      await fetchArticles()
      setLoading(false)
    }
    
    init()
  }, [router])
  
  // Separate function to fetch articles with pagination
  const fetchArticles = async (page: number = articlePage) => {
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE
      const articlesResponse = await apiClient.get(
        `/api/articles?limit=${ITEMS_PER_PAGE}&offset=${offset}`
      )
      if (articlesResponse && articlesResponse.ok) {
        const result = await articlesResponse.json()
        if (result.data && Array.isArray(result.data)) {
          const validArticles = result.data.filter((article: Article) => article && article.id)
          if (validArticles.length !== result.data.length) {
            console.warn(`Some articles are missing IDs. Found ${validArticles.length} valid articles out of ${result.data.length}`)
          }
          setArticles(validArticles)
          setTotalArticles(result.count || 0)
        } else {
          console.error("Articles data is not in expected format:", result)
          setArticles([])
          setTotalArticles(0)
        }
      } else {
        console.error("Failed to fetch articles: Server response not OK")
        setArticles([])
        setTotalArticles(0)
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error)
      setArticles([])
      setTotalArticles(0)
    }
  }
  
  // Re-fetch when page changes
  useEffect(() => {
    if (admin) {
      fetchArticles(articlePage)
    }
  }, [articlePage])

  // Pending submissions are now handled in the Submissions Management screen

  const handleMediaFilesChange = (files: File[]) => {
    setMediaFiles(files)
  }

  const handleMediaChange = (media: Array<{ url: string; type: 'image' | 'video' }>) => {

    setFormData(prev => ({ ...prev, media }))
  }

  const doAddArticle = async () => {
    if (uploading || addInProgressRef.current) {
      return
    }
    if (plagiarismDialogActiveRef.current) {
      console.warn('doAddArticle called during plagiarism dialog - should only come from Proceed button')
    }
    addInProgressRef.current = true
    setUploading(true)
    try {
      // Upload multiple media files
      const media: Array<{ url: string; type: 'image' | 'video' }> = []
      for (const file of mediaFiles) {
        const result = await uploadFile(file, 'articles')
        if (result) {
          media.push({ url: result.url, type: file.type.startsWith('image') ? 'image' : 'video' })
        }
      }

      const firstImage = media.find(m => m.type === 'image')
      const firstVideo = media.find(m => m.type === 'video')

      const articleData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        author: formData.author || "Admin",
        media,
        ...(firstImage ? { imageUrl: firstImage.url } : {}),
        ...(firstVideo ? { videoUrl: firstVideo.url } : {}),
        ...(formData.isFeatured ? { isFeatured: true } : {}),
        ...(formData.isTrending ? { isTrending: true } : {}),
        ...(formData.isLatest ? { isLatest: true } : {}),
        ...(formData.isLive ? { isLive: true } : {}),
      }

      const response = await apiClient.post("/api/articles", articleData)
      if (!response) {
        console.error('No response received from server')
        return
      }
      if (response.ok) {
        const newArticle = await response.json()
        if (newArticle && newArticle.id) {
          await fetchArticles()
          setFormData({
            title: "",
            description: "",
            category: "",
            author: "",
            imageUrl: "",
            videoUrl: "",
            media: [],
            isFeatured: false,
            isTrending: false,
            isLatest: false,
            isLive: false,
          })
          setMediaFiles([])
          setFileUploadKey(prev => prev + 1)
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
      addInProgressRef.current = false
    }
  }

  const doUpdateArticle = async () => {
    if (uploading) {
      return
    }
    if (plagiarismDialogActiveRef.current) {
      console.warn('doUpdateArticle called during plagiarism dialog - should only come from Proceed button')
    }
    setUploading(true)
    
    if (updateInProgressRef.current) {
      return
    }
    updateInProgressRef.current = true
    
    try {

      const newMedia: Array<{ url: string; type: 'image' | 'video' }> = []
      for (const file of mediaFiles) {
        const result = await uploadFile(file, 'articles')
        if (result) newMedia.push({ url: result.url, type: file.type.startsWith('image') ? 'image' : 'video' })
      }
      // Filter out blob URLs from existing media (they are temporary preview URLs)
      const cleanExistingMedia = (formData.media || []).filter(media => 
        !media.url.startsWith('blob:')
      )
      
      // Combine clean existing media with newly uploaded media
      const allMedia = [...cleanExistingMedia, ...newMedia]
      
      // Additional safety: Remove any remaining duplicates based on URL
      const uniqueMedia = allMedia.filter((media, index, self) => 
        self.findIndex(m => m.url === media.url) === index
      )
      
      const firstImage = uniqueMedia.find(m => m.type === 'image')
      const firstVideo = uniqueMedia.find(m => m.type === 'video')
      const updateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        author: formData.author || "Admin",
        media: uniqueMedia,
        ...(firstImage ? { imageUrl: firstImage.url } : {}),
        ...(firstVideo ? { videoUrl: firstVideo.url } : {}),
        ...(formData.isFeatured ? { isFeatured: true } : {}),
        ...(formData.isTrending ? { isTrending: true } : {}),
        ...(formData.isLatest ? { isLatest: true } : {}),
        ...(formData.isLive ? { isLive: true } : {})
      }
      
      const response = await apiClient.patch(`/api/articles?id=${editingId}`, updateData)
      if (response && response.ok) {
        await fetchArticles()
        setFormData({
          title: "",
          description: "",
          category: "",
          author: "",
          imageUrl: "",
          videoUrl: "",
          media: [],
          isFeatured: false,
          isTrending: false,
          isLatest: false,
          isLive: false,
        })
        setMediaFiles([])
        setFileUploadKey(prev => prev + 1)
        setEditingId(null)
        setShowAddForm(false)
        console.log('Article update completed successfully')
      } else if (response) {
        const err = await response.text()
        console.error('Failed to update article:', err)
      }
    } catch (error) {
      console.error('Failed to update article:', error)
    } finally {
      setUploading(false)
      updateInProgressRef.current = false
    }
  }

  const handleAddArticle = async () => {
    if (uploading || addInProgressRef.current) {
      return
    }
    if (formData.title && formData.description && formData.category) {
      // Run plagiarism check before uploading
      try {
        const checkRes = await apiClient.post('/api/plagiarism/check', {
          mode: 'article',
          title: formData.title,
          content: formData.description,
        })
        if (checkRes && checkRes.ok) {
          const result = await checkRes.json()

          if (result.flagged || (typeof result.maxScore === 'number' && result.maxScore >= 0.45)) {

            const top = Array.isArray(result.topMatches) ? result.topMatches : []
            setPlagiarismInfo({
              maxScore: result.maxScore,
              topMatches: top.map((m: any) => ({ title: m.title, type: m.type, score: m.score })),
            })

            pendingActionType.current = 'add'
            // Don't create any functions that could be accidentally called
            setPendingAction(async () => {}) // Dummy function to trigger dialog state
            pendingActionRef.current = null // Clear ref to be safe

            setPlagiarismOpen(true)
            plagiarismDialogActiveRef.current = true

            return
          }
          // Client-side fallback warn check (moderate threshold)
          if (typeof result.maxScore !== 'number' || result.maxScore < 0.45) {
            try {
              const artsRes = await apiClient.get(`/api/articles?limit=200&status=published`)
              if (artsRes && artsRes.ok) {
                const data = await artsRes.json()
                const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : [])
                const corpus = items.map((a: any) => ({ id: a.id, type: 'article' as const, title: a.title, text: a.description || a.content || '' }))
                const { matches, maxScore } = compareTextAgainstCorpus({ title: formData.title, content: formData.description }, corpus, { ngram: 3 })
                if (maxScore >= 0.45) {
                  setPlagiarismInfo({ maxScore, topMatches: matches.slice(0, 5).map(m => ({ title: m.title, type: m.type, score: m.score })) })
                  pendingActionType.current = 'add'
                  setPendingAction(async () => {})
                  pendingActionRef.current = null
                  setPlagiarismOpen(true)
                  plagiarismDialogActiveRef.current = true
                  return
                }
              }
            } catch {}
          }
          // If we reach here, plagiarism check passed - proceed with article creation
          await doAddArticle()
          return
        }
      } catch (e) {
        console.warn('Plagiarism check unavailable:', e)
        await doAddArticle()
        return
      }

      // If we reach here, the API call failed (non-OK status) - proceed with article creation
      await doAddArticle()
    }
  }

  const handleEditArticle = (id: string) => {
    const article = articles.find((a) => a.id === id)
    if (article) {
      // Build combined media array from all sources for editing
      const existingMedia: Array<{ url: string; type: 'image' | 'video' }> = []
      
      if (article.media && article.media.length > 0) {
        // Use media array if it exists - this is the preferred source
        existingMedia.push(...article.media)

      } else {
        // Build from legacy fields if no media array exists
        if (article.imageUrl) {
          existingMedia.push({ url: article.imageUrl, type: 'image' })
        }
        if (article.videoUrl) {
          existingMedia.push({ url: article.videoUrl, type: 'video' })
        }

      }
      
      // Remove duplicates from existing media to prevent initial duplication
      const uniqueExistingMedia = existingMedia.filter((media, index, self) => 
        self.findIndex(m => m.url === media.url) === index
      )

      
      // Ensure optional fields are normalized to the form's expected types
      setFormData({
        title: article.title,
        description: article.description,
        category: article.category,
        author: article.author,
        imageUrl: article.imageUrl || "",
        videoUrl: article.videoUrl || "",
        media: uniqueExistingMedia,
        isFeatured: !!article.isFeatured,
        isTrending: !!article.isTrending,
        isLatest: !!article.isLatest,
        isLive: !!article.isLive,
      })
      setMediaFiles([])
      setEditingId(id)
      setFileUploadKey(prev => prev + 1) // Force file upload component to reset with new media
      setShowAddForm(true)
      
      // Scroll to top of page to show the form
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleUpdateArticle = async () => {

    if (updateInProgressRef.current) {

      return
    }
    if (editingId && formData.title && formData.description && formData.category) {
      // Run plagiarism check for updates with proper flow control

      
      // proceed normal update without plagiarism check
      try {
        // Validate form data before plagiarism check
        if (!formData.title.trim() || !formData.description.trim()) {
          console.error('Title and description are required for plagiarism check')
          return
        }
        

        const checkRes = await apiClient.post('/api/plagiarism/check', {
          mode: 'article',
          title: formData.title.trim(),
          content: formData.description.trim(),
          excludeId: editingId, // Exclude current article from plagiarism check
        })
        if (checkRes && checkRes.ok) {
          const result = await checkRes.json()

          if (result.flagged || (typeof result.maxScore === 'number' && result.maxScore >= 0.45)) {
            const top = Array.isArray(result.topMatches) ? result.topMatches : []
            setPlagiarismInfo({
              maxScore: result.maxScore,
              topMatches: top.map((m: any) => ({ title: m.title, type: m.type, score: m.score })),
            })
            const updateAction = async () => {
              console.log('Executing update action with data:', { editingId, formData, mediaFiles: mediaFiles.length })
              if (updateInProgressRef.current) {
                console.log('Update already in progress, skipping duplicate call')
                return
              }
              updateInProgressRef.current = true
              setUploading(true)
              try {
                const newMedia: Array<{ url: string; type: 'image' | 'video' }> = []
                for (const file of mediaFiles) {
                  const result = await uploadFile(file, 'articles')
                  if (result) newMedia.push({ url: result.url, type: file.type.startsWith('image') ? 'image' : 'video' })
                }
                // Filter out blob URLs from existing media (they are temporary preview URLs)
                const cleanExistingMedia = (formData.media || []).filter(media => 
                  !media.url.startsWith('blob:')
                )
                console.log('Media arrays before combining:', { 
                  originalExistingMedia: formData.media?.length || 0, 
                  cleanExistingMedia: cleanExistingMedia.length,
                  newMedia: newMedia.length,
                  mediaFilesCount: mediaFiles.length 
                })
                
                // Combine clean existing media with newly uploaded media
                const allMedia = [...cleanExistingMedia, ...newMedia]
                console.log('Final combined media array:', allMedia)
                
                // Additional safety: Remove any remaining duplicates based on URL
                const uniqueMedia = allMedia.filter((media, index, self) => 
                  self.findIndex(m => m.url === media.url) === index
                )
                console.log('Unique media after final deduplication:', uniqueMedia)
                
                const firstImage = uniqueMedia.find(m => m.type === 'image')
                const firstVideo = uniqueMedia.find(m => m.type === 'video')
                const updateData = {
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  author: formData.author || "Admin",
                  media: uniqueMedia,
                  ...(firstImage ? { imageUrl: firstImage.url } : {}),
                  ...(firstVideo ? { videoUrl: firstVideo.url } : {}),
                  ...(formData.isFeatured ? { isFeatured: true } : {}),
                  ...(formData.isTrending ? { isTrending: true } : {}),
                  ...(formData.isLatest ? { isLatest: true } : {}),
                  ...(formData.isLive ? { isLive: true } : {}),
                }
                console.log('Sending update request with data:', updateData)
                const response = await apiClient.patch(`/api/articles?id=${editingId}`, updateData)
                console.log('Update response:', { ok: response?.ok, status: response?.status })
                if (response && response.ok) {
                  console.log('Article updated successfully, refreshing data...')
                  await fetchArticles()
                  setFormData({
                    title: "",
                    description: "",
                    category: "",
                    author: "",
                    imageUrl: "",
                    videoUrl: "",
                    media: [],
                    isFeatured: false,
                    isTrending: false,
                    isLatest: false,
                    isLive: false,
                  })
                  setMediaFiles([])
                  setFileUploadKey(prev => prev + 1)
                  setEditingId(null)
                  setShowAddForm(false)
                  console.log('Article update completed successfully')
                } else if (response) {
                  const err = await response.text()
                  console.error('Failed to update article:', err)
                }
              } catch (error) {
                console.error('Failed to update article:', error)
              } finally {
                setUploading(false)
                updateInProgressRef.current = false
              }
            }

            pendingActionType.current = 'update'
            setPendingAction(async () => {}) // Dummy function to trigger dialog state
            pendingActionRef.current = null // Clear ref to be safe
            setPlagiarismOpen(true)
            plagiarismDialogActiveRef.current = true
            return // IMPORTANT: Return here to prevent fallback execution
          }
          // No client-side fallback needed for updates since API check is sufficient
        }
      } catch (e) {
        console.warn('Plagiarism check unavailable:', e)
        // If plagiarism check fails, proceed with update anyway
        // Continue to fallback execution below
      }

      // Only reach here if plagiarism check passed or failed (not flagged)
      // If flagged, function would have returned above
      if (updateInProgressRef.current) {
        console.log('Normal update already in progress, skipping duplicate call')
        return
      }
      updateInProgressRef.current = true
      try {
        console.log('Executing normal update with data:', { editingId, formData, mediaFiles: mediaFiles.length })
        setUploading(true)
        const newMedia: Array<{ url: string; type: 'image' | 'video' }> = []
        for (const file of mediaFiles) {
          const result = await uploadFile(file, 'articles')
          if (result) newMedia.push({ url: result.url, type: file.type.startsWith('image') ? 'image' : 'video' })
        }
        // Filter out blob URLs from existing media (they are temporary preview URLs)
        const cleanExistingMedia = (formData.media || []).filter(media => 
          !media.url.startsWith('blob:')
        )
        const allMedia = [...cleanExistingMedia, ...newMedia]
        const firstImage = allMedia.find(m => m.type === 'image')
        const firstVideo = allMedia.find(m => m.type === 'video')
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          author: formData.author || "Admin",
          media: allMedia,
          ...(firstImage ? { imageUrl: firstImage.url } : {}),
          ...(firstVideo ? { videoUrl: firstVideo.url } : {}),
          ...(formData.isFeatured ? { isFeatured: true } : {}),
          ...(formData.isTrending ? { isTrending: true } : {}),
          ...(formData.isLatest ? { isLatest: true } : {}),
          ...(formData.isLive ? { isLive: true } : {})
        }
        const response = await apiClient.patch(`/api/articles?id=${editingId}`, updateData)
        if (response && response.ok) {
          await fetchArticles()
          setFormData({
            title: "",
            description: "",
            category: "",
            author: "",
            imageUrl: "",
            videoUrl: "",
            media: [],
            isFeatured: false,
            isTrending: false,
            isLatest: false,
            isLive: false,
          })
          setMediaFiles([])
          setFileUploadKey(prev => prev + 1)
          setEditingId(null)
          setShowAddForm(false)
        } else if (response) {
          const err = await response.text()
          console.error('Failed to update article:', err)
        }
      } catch (error) {
        console.error('Failed to update article:', error)
      } finally {
        setUploading(false)
        updateInProgressRef.current = false
      }
    }
  }

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone and will also delete all associated media files.')) {
      return
    }
    
    try {
      // Find the article to get its media URLs
      const article = articles.find(a => a.id === id)
      
      // Delete the article first
      const response = await apiClient.delete(`/api/articles?id=${id}`)
      if (response && response.ok) {
        // After successful deletion, clean up media files from storage
        if (article) {
          const mediaToDelete: string[] = []
          
          // Collect all media URLs from the article
          if (article.media && article.media.length > 0) {
            mediaToDelete.push(...article.media.map(m => m.url))
          } else {
            // Fallback to legacy fields if no media array
            if (article.imageUrl) mediaToDelete.push(article.imageUrl)
            if (article.videoUrl) mediaToDelete.push(article.videoUrl)
          }
          
          // Delete each media file from storage (try articles bucket first, then live_updates as fallback)
          for (const url of mediaToDelete) {
            try {
              const parts = url.split('/')
              const bucketIndex = parts.findIndex(p => p === 'articles' || p === 'live_updates')
              if (bucketIndex >= 0) {
                const bucket = parts[bucketIndex] as 'articles' | 'live_updates'
                const path = parts.slice(bucketIndex + 1).join('/')
                await deleteFile(bucket, path)
              }
            } catch (err) {
              console.warn('Could not delete media file:', url, err)
            }
          }
        }
        
        // Refresh the current page data from server
        await fetchArticles()
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

  const handleToggleTag = async (id: string, tag: "isFeatured" | "isTrending" | "isLatest" | "isLive") => {
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

  // Articles are now server-paginated
  const totalArticlePages = Math.ceil(totalArticles / ITEMS_PER_PAGE)

  if (loading) return <LoadingScreen message="Loading articles..." />

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
            <div className="mb-6 flex justify-end">
              <Button onClick={() => {
                if (!showAddForm) {
                  // Reset form when opening to add new
                  setEditingId(null)
                  setFormData({
                    title: "",
                    description: "",
                    category: "",
                    author: "",
                    imageUrl: "",
                    videoUrl: "",
                    media: [],
                    isFeatured: false,
                    isTrending: false,
                    isLatest: false,
                    isLive: false,
                  })
                  setMediaFiles([])
                  setFileUploadKey(prev => prev + 1) // Force file upload component to reset
                }
                setShowAddForm(!showAddForm)
              }} className="font-semibold">
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
                        media: [],
                        isFeatured: false,
                        isTrending: false,
                        isLatest: false,
                        isLive: false,
                      })
                      setMediaFiles([])
                      setFileUploadKey(prev => prev + 1) // Force file upload component to reset
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
                  <MultiFileUpload
                    key={fileUploadKey}
                    label="Article Media (Images/Videos)"
                    accept="image/*,video/*"
                    maxSizeMB={50}
                    maxFiles={10}
                    onFilesChange={handleMediaFilesChange}
                    onMediaChange={handleMediaChange}
                    currentMedia={formData.media}
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isLive || false}
                        onChange={(e) => setFormData({ ...formData, isLive: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="font-semibold">Mark as Live Update</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={editingId ? handleUpdateArticle : handleAddArticle}
                      className="flex-1 font-semibold"
                      disabled={uploading}
                      variant="success"
                    >
                      {uploading ? "Uploading..." : editingId ? "Update Article" : "Add Article"}
                    </Button>
                    <Button
                      variant="destructive"
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
                          media: [],
                          isFeatured: false,
                          isTrending: false,
                          isLatest: false,
                          isLive: false,
                        })
                        setMediaFiles([])
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

            {articles.filter((article: Article) => article && article.id).map((article) => {
              // Build combined media array for display
              const displayMedia: Array<{ url: string; type: 'image' | 'video' }> = []
              if (article.media && Array.isArray(article.media) && article.media.length > 0) {
                displayMedia.push(...article.media)
              } else {
                if (article.imageUrl) displayMedia.push({ url: article.imageUrl, type: 'image' })
                if (article.videoUrl) displayMedia.push({ url: article.videoUrl, type: 'video' })
              }
              
              return (
              <div key={article.id} className="bg-card rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Display media thumbnails */}
                  {displayMedia.length > 0 && (
                    <div className="flex gap-2 flex-shrink-0">
                      {displayMedia.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="w-24 h-24 relative">
                          {item.type === 'image' ? (
                            <img
                              src={item.url}
                              alt={`${article.title} ${idx + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <video
                              src={item.url}
                              className="w-full h-full object-cover rounded-lg"
                              muted
                            />
                          )}
                        </div>
                      ))}
                      {displayMedia.length > 3 && (
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center text-sm font-semibold">
                          +{displayMedia.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Category: {article.category}</p>
                    <p className="text-sm text-muted-foreground mb-2">Author: {article.author}</p>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Eye size={14} /> 
                      {(article.views || 0).toLocaleString()} views
                    </p>
                    <p className="text-sm line-clamp-2">{article.description}</p>
                    {displayMedia.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {displayMedia.length} media file{displayMedia.length !== 1 ? 's' : ''}
                      </p>
                    )}
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
                      {article.isLive && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                          🔴 Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-shrink-0">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewingArticle(article)}>
                        <Eye size={16} className="mr-2" />
                        View
                      </Button>
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
                      <Button
                        size="sm"
                        variant={article.isLive ? "destructive" : "outline"}
                        onClick={() => handleToggleTag(article.id, "isLive")}
                        className="text-xs"
                      >
                        🔴 Live
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
            {totalArticlePages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setArticlePage((p) => Math.max(1, p - 1))}
                  disabled={articlePage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalArticlePages }, (_, i) => i + 1).map((page) => (
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
                  onClick={() => setArticlePage((p) => Math.min(totalArticlePages, p + 1))}
                  disabled={articlePage === totalArticlePages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* View Article Modal */}
        {viewingArticle && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-auto">
            <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Article Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setViewingArticle(null)}>
                  <X size={20} />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{viewingArticle.title}</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                    <span>Category: {viewingArticle.category}</span>
                    <span>•</span>
                    <span>Author: {viewingArticle.author}</span>
                  </div>
                </div>

                {/* Media Gallery - Build from all sources */}
                {(() => {
                  const allMedia: Array<{ url: string; type: 'image' | 'video' }> = []
                  
                  // Use media array if it exists
                  if (viewingArticle.media && viewingArticle.media.length > 0) {
                    allMedia.push(...viewingArticle.media)
                  } else {
                    // Fallback: build from legacy fields
                    if (viewingArticle.imageUrl) {
                      allMedia.push({ url: viewingArticle.imageUrl, type: 'image' })
                    }
                    if (viewingArticle.videoUrl) {
                      allMedia.push({ url: viewingArticle.videoUrl, type: 'video' })
                    }
                  }
                  
                  return allMedia.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-2">Media ({allMedia.length})</h4>
                      <MediaGallery media={allMedia} />
                    </div>
                  ) : null
                })()}

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{viewingArticle.description}</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {viewingArticle.isFeatured && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  )}
                  {viewingArticle.isTrending && (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Trending
                    </span>
                  )}
                  {viewingArticle.isLatest && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Latest
                    </span>
                  )}
                  {viewingArticle.isLive && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                      🔴 Live Update
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plagiarism confirmation */}
      <AlertDialog open={plagiarismOpen} onOpenChange={(open) => {
        if (!open) {
          setPlagiarismOpen(false)
          // Don't clear other state here - let the button handlers do it
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible plagiarism detected</AlertDialogTitle>
            <AlertDialogDescription>
              {plagiarismInfo
                ? `This article is highly similar to existing content. Similarity score: ${Math.round(plagiarismInfo.maxScore * 100)}%.`
                : `Do you want to proceed?`}
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
              <div>Do you want to proceed anyway?</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {

              setPlagiarismOpen(false)
              setPendingAction(null)
              pendingActionRef.current = null
              updateInProgressRef.current = false
              addInProgressRef.current = false
              plagiarismDialogActiveRef.current = false
              pendingActionType.current = null
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (updateInProgressRef.current || addInProgressRef.current) {
                return
              }
              
              // Capture the action type FIRST before any state changes
              const actionType = pendingActionType.current

              
              // Validate we have a valid action type
              if (!actionType) {
                console.error('No pending action type found! Dialog state may have been cleared prematurely.')

                return
              }
              
              // Close dialog and clear state AFTER capturing the action type
              setPlagiarismOpen(false)
              setPendingAction(null)
              pendingActionRef.current = null
              plagiarismDialogActiveRef.current = false
              pendingActionType.current = null
              
              // Execute the appropriate action based on type
              try {
                if (actionType === 'add') {

                  await doAddArticle()

                } else if (actionType === 'update') {

                  await doUpdateArticle()

                } else {
                  console.error('Unknown pending action type:', actionType)
                  return
                }
              } catch (error) {
                console.error('💥 Error executing pending action:', error)
              }
            }}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Plagiarism confirmation dialog rendering inside component return
// (Place near root return if needed)
