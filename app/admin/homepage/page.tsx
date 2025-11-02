"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import apiClient from "@/lib/apiClient"
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
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/homepage')
        if (res && (res as Response).ok) {
          const data = await (res as Response).json()
          setSettings(data)
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

  if (loading) return <div className="p-8">Loading...</div>

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
                value={settings.featuredStoriesCount}
                onChange={(e) => setSettings({ ...settings, featuredStoriesCount: Number.parseInt(e.target.value) })}
              />
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
