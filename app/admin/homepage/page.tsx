"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LogoutButton } from "@/components/logout-button"
import apiClient from "@/lib/apiClient"
import { LoadingScreen } from "@/components/loading-screen"
import { CATEGORIES } from "@/lib/categories"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface HomePageSettings {
  heroTitle: string
  heroDescription: string
  showBreakingNews: boolean
  showCategories: boolean
  showFeaturedStories: boolean
  showTrendingSection: boolean
  showLatestSection: boolean
  showAdvertisements: boolean
  categoriesDisplayed: string[]
  featuredStoriesCount: number
  trendingStoriesCount: number
  latestStoriesCount: number
}

export default function HomepageSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<HomePageSettings>({
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
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/homepage')
        if (res && (res as Response).ok) {
          const data = await (res as Response).json()
          // Ensure all fields have default values to prevent controlled/uncontrolled issues
          setSettings({
            heroTitle: data.heroTitle || "Stay Informed",
            heroDescription: data.heroDescription || "Read breaking news, trending stories, and discover job opportunities",
            showBreakingNews: data.showBreakingNews ?? true,
            showCategories: data.showCategories ?? true,
            showFeaturedStories: data.showFeaturedStories ?? true,
            showTrendingSection: data.showTrendingSection ?? true,
            showLatestSection: data.showLatestSection ?? true,
            showAdvertisements: data.showAdvertisements ?? true,
            categoriesDisplayed: data.categoriesDisplayed || CATEGORIES,
            featuredStoriesCount: data.featuredStoriesCount || 6,
            trendingStoriesCount: data.trendingStoriesCount || 6,
            latestStoriesCount: data.latestStoriesCount || 6,
          })
        }
      } catch (e) {
        console.error('Failed to load homepage settings:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      const res = await apiClient.patch('/api/homepage', settings)
      if (!res) throw new Error('No response')
      const r = res as Response
      if (r.status === 401) {
        toast({ title: 'Session expired', description: 'Please sign in again.' })
        router.push('/admin/login')
        return
      }
      if (!r.ok) {
        const text = await r.text()
        throw new Error(text || 'Save failed')
      }
      const data = await r.json()
      setSettings(data)
      setSaved(true)
      toast({ title: 'Saved', description: 'Homepage settings updated.' })
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save homepage settings:', e)
      toast({ title: 'Save failed', description: 'Could not update settings.' })
    }
  }

  const handleCategoryToggle = (category: string) => {
    const updated = settings.categoriesDisplayed.includes(category)
      ? settings.categoriesDisplayed.filter((c) => c !== category)
      : [...settings.categoriesDisplayed, category]
    setSettings({ ...settings, categoriesDisplayed: updated })
  }

  if (loading) return <LoadingScreen message="Loading settings..." />

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6 max-w-2xl">
          {/* Hero Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hero Title</label>
                <Input
                  value={settings.heroTitle}
                  onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hero Description</label>
                <textarea
                  value={settings.heroDescription}
                  onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Sections Visibility */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Sections Visibility</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showBreakingNews}
                  onChange={(e) => setSettings({ ...settings, showBreakingNews: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Breaking News</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showCategories}
                  onChange={(e) => setSettings({ ...settings, showCategories: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Categories</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showFeaturedStories}
                  onChange={(e) => setSettings({ ...settings, showFeaturedStories: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Featured Stories</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showTrendingSection}
                  onChange={(e) => setSettings({ ...settings, showTrendingSection: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Trending Section</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showLatestSection}
                  onChange={(e) => setSettings({ ...settings, showLatestSection: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Latest News Section</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showAdvertisements}
                  onChange={(e) => setSettings({ ...settings, showAdvertisements: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Show Advertisements</span>
              </label>
            </div>
          </Card>

          {/* Categories */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Categories to Display</h2>
            <div className="space-y-3">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.categoriesDisplayed.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="w-4 h-4"
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Featured Stories Count */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Featured Stories</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Number of Featured Stories to Display</label>
              <Input
                type="number"
                min="1"
                max="12"
                value={settings.featuredStoriesCount || 6}
                onChange={(e) => setSettings({ ...settings, featuredStoriesCount: Number.parseInt(e.target.value) || 6 })}
              />
            </div>
          </Card>

          {/* Trending Stories Count */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Trending Stories</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Number of Trending Stories to Display</label>
              <Input
                type="number"
                min="1"
                max="12"
                value={settings.trendingStoriesCount || 6}
                onChange={(e) => setSettings({ ...settings, trendingStoriesCount: Number.parseInt(e.target.value) || 6 })}
              />
              <p className="text-xs text-muted-foreground mt-2">Controls how many articles appear in the "Trending Now" sidebar section</p>
            </div>
          </Card>

          {/* Latest Stories Count */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Latest Stories</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Number of Latest Stories to Display</label>
              <Input
                type="number"
                min="1"
                max="12"
                value={settings.latestStoriesCount || 6}
                onChange={(e) => setSettings({ ...settings, latestStoriesCount: Number.parseInt(e.target.value) || 6 })}
              />
              <p className="text-xs text-muted-foreground mt-2">Controls how many articles appear in the "Latest News" sidebar section</p>
            </div>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} size="lg" className="w-full">
            Save Settings
          </Button>

          {saved && <div className="bg-green-100 text-green-800 p-4 rounded-lg">Settings saved successfully!</div>}
        </div>
      </div>
    </div>
  )
}
