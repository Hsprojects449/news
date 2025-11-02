"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import apiClient from "@/lib/apiClient"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Share2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Article {
  id: string
  title: string
  description: string
  content: string
  category: string
  imageUrl?: string
  videoUrl?: string
  author: string
  source: string
  publishedDate: string
  views: number
}

export default function ArticlePage() {
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get(`/api/articles?id=${params.id}`)
        if (response && response.ok) {
          const data = await response.json()
          setArticle(data)
        } else {
          console.error('Failed to load article')
        }
      } catch (err) {
        console.error('Failed to load article:', err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      load()
    }
  }, [params.id])

  if (loading) return <div>Loading...</div>

  if (!article)
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Article not found</p>
        </div>
        <Footer />
      </div>
    )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Article Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/news">
            <Button
              variant="outline"
              className="mb-6 bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to News
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm opacity-90">
            <span>{article.category || 'News'}</span>
            <span>•</span>
            <span>By {article.author || 'Staff'}</span>
            <span>•</span>
            <span>{article.publishedDate ? new Date(article.publishedDate).toLocaleDateString() : '-'}</span>
            <span>•</span>
            <span>{(article.views ?? 0).toLocaleString()} views</span>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="max-w-4xl mx-auto px-4 py-12 w-full">
        {article.imageUrl && (
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={article.imageUrl || "/placeholder.svg"}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {article.videoUrl && !article.imageUrl && (
          <div className="relative w-full mb-8 rounded-lg overflow-hidden">
            <video
              src={article.videoUrl}
              controls
              className="w-full rounded-lg"
            />
          </div>
        )}

        <div className="prose prose-invert max-w-none mb-8">
          <p className="text-lg text-muted-foreground mb-6">{article.description}</p>
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">{article.content}</div>
        </div>

        {/* Share Section */}
        <div className="border-t border-border pt-8 mt-8">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Share this article:</span>
            <Button variant="outline" size="sm">
              <Share2 size={16} className="mr-2" />
              Share
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
