"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// Header and logout are provided by the common admin layout
import api from "@/lib/apiClient"

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [approvedSubmissions, setApprovedSubmissions] = useState(0)
  const [rejectedSubmissions, setRejectedSubmissions] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [topArticle, setTopArticle] = useState<any | null>(null)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData) {
      router.push("/admin/login")
    } else {
      const parsed = JSON.parse(adminData)
      setAdmin(parsed)
      // Load analytics once admin is set
      ;(async () => {
        try {
          setLoading(true)
          setError("")

          // Fetch all submissions (admin-only)
          const subRes = await api.get("/api/submissions")
          if (subRes.status === 401) {
            // Token missing/expired, redirect to login
            router.push("/admin/login")
            return
          }
          const submissions = await subRes.json()

          // Compute submission metrics
          const total = Array.isArray(submissions) ? submissions.length : 0
          const approved = Array.isArray(submissions)
            ? submissions.filter((s: any) => s.status === "approved").length
            : 0
          const rejected = Array.isArray(submissions)
            ? submissions.filter((s: any) => s.status === "rejected").length
            : 0
          setTotalSubmissions(total)
          setApprovedSubmissions(approved)
          setRejectedSubmissions(rejected)

          // Fetch published articles (public)
          const artRes = await api.get("/api/articles")
          const articles = await artRes.json()

          if (Array.isArray(articles) && articles.length > 0) {
            // Sum views with fallback to 0
            const viewsSum = articles.reduce(
              (sum: number, a: any) => sum + (Number(a.views) || 0),
              0
            )
            setTotalViews(viewsSum)

            // Top article by views
            const top = articles.reduce((prev: any, curr: any) => {
              const prevViews = Number(prev?.views) || 0
              const currViews = Number(curr?.views) || 0
              return prevViews >= currViews ? prev : curr
            })
            setTopArticle(top)
          } else {
            setTotalViews(0)
            setTopArticle(null)
          }
        } catch (e: any) {
          console.error("Admin analytics load error:", e)
          setError("Failed to load analytics")
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [router])

  // Logout handled by common layout header

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && <div className="mb-6">Loading analytics…</div>}
        {!!error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Submissions</h3>
            <p className="text-3xl font-bold">{totalSubmissions}</p>
          </div>
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Approved</h3>
            <p className="text-3xl font-bold text-green-600">{approvedSubmissions}</p>
          </div>
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Rejected</h3>
            <p className="text-3xl font-bold text-red-600">{rejectedSubmissions}</p>
          </div>
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Views</h3>
            <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
          </div>
        </div>

        {/* Top Article */}
        <div className="bg-card rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Top Performing Article</h2>
          {topArticle ? (
            <div className="border-l-4 border-primary pl-6">
              <h3 className="text-xl font-bold mb-2">{topArticle.title}</h3>
              {topArticle.description && (
                <p className="text-muted-foreground mb-4">{topArticle.description}</p>
              )}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Views: </span>
                  <span className="font-bold">{Number(topArticle.views || 0).toLocaleString()}</span>
                </div>
                {topArticle.category && (
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span className="font-bold">{topArticle.category}</span>
                  </div>
                )}
                {topArticle.author && (
                  <div>
                    <span className="text-muted-foreground">Author: </span>
                    <span className="font-bold">{topArticle.author}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No articles available yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
