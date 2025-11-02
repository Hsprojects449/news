"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import apiClient from "@/lib/apiClient"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts"

interface AdminUser {
  id: string
  username: string
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ 
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    publishedArticles: number;
    totalViews: number;
    activeJobs: number;
    topArticle: any | null;
  }>({
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    publishedArticles: 0,
    totalViews: 0,
    activeJobs: 0,
    topArticle: null,
  })

  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [articlesByCategory, setArticlesByCategory] = useState<{ category: string; count: number }[]>([])
  const [submissionsTrend, setSubmissionsTrend] = useState<{ date: string; approved: number; rejected: number; pending: number }[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (adminData) {
      setAdmin(JSON.parse(adminData))
    } else {
      router.push("/admin/login")
    }
    setLoading(false)
  }, [router])

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true)
        // Submissions
        const subRes = await apiClient.get('/api/submissions')
        const submissions = subRes && subRes.ok ? await subRes.json() : []
        const pendingSubmissions = submissions.filter((s: any) => s.status === 'pending').length
        const approvedSubmissions = submissions.filter((s: any) => s.status === 'approved').length
        const rejectedSubmissions = submissions.filter((s: any) => s.status === 'rejected').length

        // Recent submissions (last 5)
        const recent = Array.isArray(submissions)
          ? [...submissions]
              .sort((a, b) => new Date(b.submittedDate || b.created_at || 0).getTime() - new Date(a.submittedDate || a.created_at || 0).getTime())
              .slice(0, 5)
          : []
        setRecentSubmissions(recent)

        // Submissions trend (last 7 days)
        const days: { date: string; approved: number; rejected: number; pending: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = d.toISOString().slice(0, 10)
          const daySubs = Array.isArray(submissions)
            ? submissions.filter((s: any) => (s.submittedDate || s.created_at || '').slice(0,10) === key)
            : []
          days.push({
            date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            approved: daySubs.filter((s: any) => s.status === 'approved').length,
            rejected: daySubs.filter((s: any) => s.status === 'rejected').length,
            pending: daySubs.filter((s: any) => s.status === 'pending').length,
          })
        }
        setSubmissionsTrend(days)

        // Articles
        const artRes = await apiClient.get('/api/articles')
        const articles = artRes && artRes.ok ? await artRes.json() : []
        const publishedArticles = Array.isArray(articles) ? articles.length : 0
        const totalViews = Array.isArray(articles)
          ? articles.reduce((sum: number, a: any) => sum + (typeof a.views === 'number' ? a.views : 0), 0)
          : 0
        const topArticle = Array.isArray(articles) && articles.length
          ? articles.reduce((prev: any, curr: any) => ( (prev?.views || 0) > (curr?.views || 0) ? prev : curr ))
          : null

        // Articles by Category
        const byCatMap: Record<string, number> = {}
        if (Array.isArray(articles)) {
          for (const a of articles) {
            const cat = a.category || 'Uncategorized'
            byCatMap[cat] = (byCatMap[cat] || 0) + 1
          }
        }
        const byCat = Object.entries(byCatMap).map(([category, count]) => ({ category, count }))
        setArticlesByCategory(byCat)

        // Jobs
        const jobsRes = await apiClient.get('/api/jobs')
        const jobs = jobsRes && jobsRes.ok ? await jobsRes.json() : []
        const activeJobs = Array.isArray(jobs)
          ? jobs.filter((j: any) => j.status === 'active' || j.isActive).length
          : 0

        setStats({
          pendingSubmissions,
          approvedSubmissions,
          rejectedSubmissions,
          publishedArticles,
          totalViews,
          activeJobs,
          topArticle,
        })
    } catch (e) {
      console.error('Failed to fetch dashboard stats:', e)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Logout handled by common layout header

  if (loading) return <div>Loading...</div>

  if (!admin) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div />
          <Button onClick={() => fetchStats()} disabled={refreshing} variant="outline">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Dashboard Cards */}
          <div className="bg-gradient-to-br from-card to-card/50 rounded-lg shadow-md p-6 border border-border hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Pending Submissions</h3>
            <p className="text-3xl font-bold text-primary">{stats.pendingSubmissions}</p>
          </div>
          <div className="bg-gradient-to-br from-card to-card/50 rounded-lg shadow-md p-6 border border-border hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Published Articles</h3>
            <p className="text-3xl font-bold text-primary">{stats.publishedArticles}</p>
          </div>
          <div className="bg-gradient-to-br from-card to-card/50 rounded-lg shadow-md p-6 border border-border hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Active Jobs</h3>
            <p className="text-3xl font-bold text-primary">{stats.activeJobs}</p>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Submissions Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Approved</div>
                <div className="text-xl font-bold text-green-600">{stats.approvedSubmissions}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Rejected</div>
                <div className="text-xl font-bold text-red-600">{stats.rejectedSubmissions}</div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Article Views</h3>
            <div className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </div>
        </div>

        {/* Submissions Trend */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Submissions (Last 7 Days)</h3>
          <ChartContainer
            config={{
              approved: { label: 'Approved', color: '#16a34a' },
              rejected: { label: 'Rejected', color: '#dc2626' },
              pending: { label: 'Pending', color: '#d97706' },
            }}
            className="h-64"
          >
            <AreaChart data={submissionsTrend} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.3} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="approved" stroke="var(--color-approved)" fill="var(--color-approved)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="rejected" stroke="var(--color-rejected)" fill="var(--color-rejected)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="pending" stroke="var(--color-pending)" fill="var(--color-pending)" fillOpacity={0.2} />
            </AreaChart>
          </ChartContainer>
        </Card>

        {/* Articles by Category */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Articles by Category</h3>
          <ChartContainer
            config={{
              articles: { label: 'Articles', color: '#3b82f6' },
            }}
            className="h-64"
          >
            <BarChart data={articlesByCategory} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.3} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-articles)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Top Article */}
        {stats.topArticle && (
          <div className="bg-card rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Top Performing Article</h2>
            <div className="border-l-4 border-primary pl-6">
              <h3 className="text-xl font-bold mb-2">{stats.topArticle.title}</h3>
              {stats.topArticle.description && (
                <p className="text-muted-foreground mb-4">{stats.topArticle.description}</p>
              )}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Views: </span>
                  <span className="font-bold">{(stats.topArticle.views || 0).toLocaleString()}</span>
                </div>
                {stats.topArticle.category && (
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span className="font-bold">{stats.topArticle.category}</span>
                  </div>
                )}
                {stats.topArticle.author && (
                  <div>
                    <span className="text-muted-foreground">Author: </span>
                    <span className="font-bold">{stats.topArticle.author}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Recent Submissions</h3>
          {recentSubmissions.length === 0 ? (
            <div className="text-muted-foreground">No recent submissions</div>
          ) : (
            <div className="divide-y">
              {recentSubmissions.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.title || 'Untitled'}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.name || s.email || 'Anonymous'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`${s.status === 'approved' ? 'text-green-600' : s.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'} text-sm font-medium`}>{s.status || 'pending'}</span>
                    <span className="text-sm text-muted-foreground">{s.submittedDate ? new Date(s.submittedDate).toLocaleDateString() : '-'}</span>
                    <Button size="sm" variant="outline" onClick={() => window.location.assign('/admin/submissions')}>View</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-card to-card/50 rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-all duration-300 cursor-pointer border border-border">
            <h2 className="text-2xl font-bold mb-4">News Management</h2>
            <p className="text-muted-foreground mb-6">Review and manage submitted news articles</p>
            <Button onClick={() => router.push("/admin/news")} className="font-semibold">
              Manage News
            </Button>
          </div>

          <div className="bg-gradient-to-br from-card to-card/50 rounded-lg shadow-md p-8 text-center hover:shadow-lg transition-all duration-300 cursor-pointer border border-border">
            <h2 className="text-2xl font-bold mb-4">Jobs Management</h2>
            <p className="text-muted-foreground mb-6">Create and manage job listings</p>
            <Button onClick={() => router.push("/admin/jobs")} className="font-semibold">
              Manage Jobs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
