"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react"
import { CATEGORIES } from "@/lib/categories"
import apiClient from "@/lib/apiClient"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Settings {
  id?: string
  heroTitle?: string
  heroDescription?: string
  showBreakingNews: boolean
  showCategories: boolean
  showFeaturedStories: boolean
  showTrendingSection: boolean
  showLatestSection: boolean
  showAdvertisements: boolean
  categoriesDisplayed?: string[]
  featuredStoriesCount: number
  trendingStoriesCount: number
  latestStoriesCount: number
  breakingNewsDuration: number
  newsArticleMediaDuration: number
  advertisementDuration: number
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    heroTitle: "Stay Informed",
    heroDescription: "Read breaking news, trending stories, and discover job opportunities",
    showBreakingNews: true,
    showCategories: true,
    showFeaturedStories: true,
    showTrendingSection: true,
    showLatestSection: true,
    showAdvertisements: true,
    categoriesDisplayed: CATEGORIES,
    featuredStoriesCount: 6,
    trendingStoriesCount: 6,
    latestStoriesCount: 6,
    breakingNewsDuration: 5,
    newsArticleMediaDuration: 5,
    advertisementDuration: 5,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      if (data) {
        setSettings({
          ...data,
          categoriesDisplayed: data.categoriesDisplayed || CATEGORIES,
        })
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      // Check if token exists
      const token = localStorage.getItem('token')
      if (!token) {
        toast({ title: 'Not authenticated', description: 'Please log in again.' })
        router.push('/admin/login')
        return
      }

      const res = await apiClient.post('/api/settings', settings)
      if (!res) throw new Error('No response')
      
      const r = res as Response
      if (r.status === 401) {
        toast({ title: 'Session expired', description: 'Please sign in again.' })
        localStorage.removeItem('token')
        localStorage.removeItem('admin')
        router.push('/admin/login')
        return
      }
      
      if (!r.ok) {
        const text = await r.text()
        throw new Error(text || 'Save failed')
      }
      
      const updated = await r.json()
      setSettings({
        ...updated,
        categoriesDisplayed: updated.categoriesDisplayed || CATEGORIES,
      })
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      toast({ title: 'Saved', description: 'Settings updated successfully!' })
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
      toast({ title: 'Error', description: 'Failed to save settings' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryToggle = (category: string) => {
    const categoriesDisplayed = settings.categoriesDisplayed || []
    const updated = categoriesDisplayed.includes(category)
      ? categoriesDisplayed.filter((c) => c !== category)
      : [...categoriesDisplayed, category]
    setSettings({ ...settings, categoriesDisplayed: updated })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">


        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hero Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">🏠</span>
              Hero Section
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hero Title
                </label>
                <Input
                  type="text"
                  value={settings.heroTitle || ''}
                  onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                  placeholder="Stay Informed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hero Description
                </label>
                <textarea
                  value={settings.heroDescription || ''}
                  onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
                  placeholder="Read breaking news, trending stories, and discover job opportunities"
                  className="w-full px-4 py-2 border rounded-lg min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Carousel Duration Settings */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">⏱️</span>
              Carousel Duration Settings
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure how long each slide displays before auto-advancing (in seconds)
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Breaking News / Live Updates Duration
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.breakingNewsDuration}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      breakingNewsDuration: parseInt(e.target.value) || 5 
                    })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 5 seconds
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    News Article Media Duration
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.newsArticleMediaDuration}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      newsArticleMediaDuration: parseInt(e.target.value) || 5 
                    })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration for images in article carousels
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Advertisement Duration
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.advertisementDuration}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      advertisementDuration: parseInt(e.target.value) || 5 
                    })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default duration (can be overridden per ad)
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Note:</strong> Videos will always play to completion regardless of these settings. 
                  These durations only apply to images.
                </p>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">👁️</span>
              Homepage Display Settings
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Control which sections appear on the homepage
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showBreakingNews}
                  onChange={(e) => setSettings({ ...settings, showBreakingNews: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Breaking News Carousel</span>
                  <p className="text-xs text-muted-foreground">Display live updates and breaking news at the top</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showCategories}
                  onChange={(e) => setSettings({ ...settings, showCategories: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Categories</span>
                  <p className="text-xs text-muted-foreground">Display news categories section</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showFeaturedStories}
                  onChange={(e) => setSettings({ ...settings, showFeaturedStories: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Featured Stories</span>
                  <p className="text-xs text-muted-foreground">Display featured articles section</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showTrendingSection}
                  onChange={(e) => setSettings({ ...settings, showTrendingSection: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Trending Section</span>
                  <p className="text-xs text-muted-foreground">Display trending news articles</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showLatestSection}
                  onChange={(e) => setSettings({ ...settings, showLatestSection: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Latest Section</span>
                  <p className="text-xs text-muted-foreground">Display latest news articles</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.showAdvertisements}
                  onChange={(e) => setSettings({ ...settings, showAdvertisements: e.target.checked })}
                  className="w-5 h-5 rounded border-2"
                />
                <div>
                  <span className="font-medium">Show Advertisements</span>
                  <p className="text-xs text-muted-foreground">Display advertisement spaces</p>
                </div>
              </label>
            </div>
          </Card>

          {/* Categories */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">📂</span>
              Categories to Display
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select which categories should be visible on the homepage
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={(settings.categoriesDisplayed || []).includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Content Settings */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-primary">📊</span>
              Content Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Featured Stories Count
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.featuredStoriesCount}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    featuredStoriesCount: parseInt(e.target.value) || 6 
                  })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of featured stories to display on the homepage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Trending Stories Count
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.trendingStoriesCount}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    trendingStoriesCount: parseInt(e.target.value) || 6 
                  })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of trending articles in the sidebar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Latest Stories Count
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.latestStoriesCount}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    latestStoriesCount: parseInt(e.target.value) || 6 
                  })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of latest articles in the sidebar
                </p>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={fetchSettings}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 min-w-[120px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
