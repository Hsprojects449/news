"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleCard } from "@/components/article-card"
import { BreakingNewsCarousel } from "@/components/breaking-news-carousel"
import { TrendingSection } from "@/components/trending-section"
import EmptyState from "@/components/empty-state"
import { AdvertisementSpace } from "@/components/advertisement-space"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock } from "lucide-react"
import { CATEGORIES } from "@/lib/categories"

interface Article {
  id: string
  title: string
  description: string
  content: string
  category: string
  imageUrl?: string
  author: string
  source: string
  publishedDate: string
  views: number
  status: string
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/articles?limit=50&ts=" + Date.now(), { cache: 'no-store' })
        const result = await response.json()
        // Handle both old format (array) and new format (object with data/count)
        const articlesData = Array.isArray(result) ? result : (result.data || [])
        setArticles(articlesData)
      } catch (error) {
        console.error("Failed to fetch articles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/homepage?ts=' + Date.now(), { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        }
      } catch (e) {
        console.error('Failed to fetch homepage settings:', e)
      }
    }
    fetchSettings()
  }, [])

  

  // avoid mutating `articles` in-place (sort is in-place)
  // Sections should only show articles explicitly flagged as featured/trending/latest
  const featuredArticles = articles.filter((a) => Boolean((a as any).isFeatured))
  
  // Get trending articles - auto-sort by highest views
  const trendingLimit = settings?.trendingStoriesCount || 6
  const trendingArticles = articles
    .filter((a) => Boolean((a as any).isTrending))
    .slice()
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, trendingLimit)
  
  // Get latest articles sorted by date with limit from settings
  const allLatestArticles = articles.filter((a) => Boolean((a as any).isLatest))
  const latestLimit = settings?.latestStoriesCount || 6
  const latestArticles = allLatestArticles
    .slice()
    .sort((a, b) => {
      const ta = a.publishedDate ? new Date(a.publishedDate).getTime() : 0
      const tb = b.publishedDate ? new Date(b.publishedDate).getTime() : 0
      return tb - ta
    })
    .slice(0, latestLimit)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      {/* Live Updates are shown inside BreakingNewsCarousel below */}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground py-20 md:py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {settings?.heroTitle ?? 'Stay Informed'}
          </h1>
          <p className="text-xl md:text-2xl opacity-95 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {settings?.heroDescription ?? 'Read breaking news, trending stories, and discover job opportunities'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Link href="/news">
              <Button
                size="lg"
                className="font-semibold bg-white text-primary hover:bg-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Browse News
              </Button>
            </Link>
          </div>
        </div>
      </section>

  {settings?.showBreakingNews !== false && <BreakingNewsCarousel />}

      {/* Categories Section - Moved to Top */}
      {settings?.showCategories !== false && (
      <section className="bg-gradient-to-b from-background to-background py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-4xl font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="text-secondary" size={32} />
              Browse by Category
            </h2>
            <p className="text-muted-foreground text-lg">Explore news by your favorite topics</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(settings?.categoriesDisplayed ?? CATEGORIES).map((category: string, idx: number) => (
              <Link key={category} href={`/news?category=${category}`}>
                <div
                  className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-8 rounded-xl text-center hover:shadow-2xl hover:scale-110 transition-all duration-300 cursor-pointer font-semibold text-lg border-2 border-primary/30 hover:border-secondary"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {category}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Advertisement */}
          {settings?.showAdvertisements !== false && (
            <div className="hidden lg:block">
              <AdvertisementSpace position="left" />
            </div>
          )}

          {/* Center Content */}
          <div className="lg:col-span-2">
            {settings?.showFeaturedStories !== false && (
              <>
                <div className="mb-10">
                  <h2 className="text-4xl font-bold mb-3">Featured Stories</h2>
                  <p className="text-muted-foreground text-lg">Discover the most viewed and trending articles</p>
                </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl h-80 animate-pulse" />
                ))}
              </div>
            ) : articles.length > 0 ? (
              featuredArticles.length > 0 && settings?.showFeaturedStories !== false ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredArticles.slice(0, settings?.featuredStoriesCount ?? 6).map((article, idx) => (
                    <div
                      key={article.id}
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <ArticleCard {...article} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No featured articles at the moment." />
              )
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No articles available at the moment.</p>
              </div>
            )}
            </>
            )}

            <div className="mt-12 text-center">
              <Link href="/news">
                <Button
                  size="lg"
                  className="font-semibold bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  View All News
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Sidebar: Trending & Latest */}
          <div className="space-y-6">
            {settings?.showTrendingSection !== false && (trendingArticles.length > 0 ? (
              <TrendingSection
                articles={trendingArticles}
                title="Trending Now"
                icon={<TrendingUp className="text-destructive" size={24} />}
              />
            ) : (
              <EmptyState message="No trending articles at the moment." />
            ))}

            {settings?.showLatestSection !== false && (latestArticles.length > 0 ? (
              <TrendingSection
                articles={latestArticles}
                title="Latest News"
                icon={<Clock className="text-primary" size={24} />}
              />
            ) : (
              <EmptyState message="No latest articles at the moment." />
            ))}
          </div>
        </div>

        {/* Mobile Advertisement */}
        {settings?.showAdvertisements !== false && (
          <div className="lg:hidden mt-12">
            <AdvertisementSpace position="bottom" />
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-secondary/20 via-secondary/10 to-accent/10 text-foreground py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-4">Have a Story to Share?</h2>
          <p className="text-xl opacity-90 mb-10">Submit your news and get featured on NewsHub</p>
          <Link href="/submit">
            <Button size="lg" className="font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105" variant="default">
              Submit Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
