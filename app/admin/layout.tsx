"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, FileText, Briefcase, Settings, BarChart3, ImageIcon } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { LoadingScreen } from "@/components/loading-screen"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminData = localStorage.getItem("admin")
    if (!adminData && pathname !== "/admin/login") {
      router.push("/admin/login")
    } else if (adminData) {
      setIsLoggedIn(true)
    }
    setLoading(false)
  }, [pathname, router])

  const isActive = (path: string) => pathname === path

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (loading) return <LoadingScreen message="Authenticating..." fullScreen />

  if (!isLoggedIn) return null

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed top-0 left-0 h-screen w-64 bg-primary text-primary-foreground shadow-lg z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold">NewsHub Admin</h1>
        </div>

        <nav className="space-y-2 px-4 py-8">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link
            href="/admin/news"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/news") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <FileText size={20} />
            News Management
          </Link>

          <Link
            href="/admin/submissions"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/submissions") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <FileText size={20} />
            Submissions Management
          </Link>

          <Link
            href="/admin/jobs"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/jobs") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <Briefcase size={20} />
            Jobs Management
          </Link>

          <Link
            href="/admin/content"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/content") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <Settings size={20} />
            Content Management
          </Link>

          {/* Analytics link removed; analytics moved to dashboard */}

          <Link
            href="/admin/advertisements"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/advertisements") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <ImageIcon size={20} />
            Advertisements
          </Link>

          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/settings") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <Settings size={20} />
            Settings
          </Link>

          <Link
            href="/admin/live-updates"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive("/admin/live-updates") ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
            }`}
          >
            <FileText size={20} />
            Live Updates
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pl-64">
        <header className="fixed top-0 left-64 right-0 bg-primary text-primary-foreground shadow-md z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-wide">{(pathname?.startsWith('/admin') ? (pathname.replace('/admin', '').replace('/', '') || 'DASHBOARD') : 'ADMIN').toUpperCase()}</h2>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-base">HI ADMIN</span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 pt-16">{children}</main>
      </div>
    </div>
  )
}
