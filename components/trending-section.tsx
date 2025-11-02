"use client"

import type React from "react"

import { Clock } from "lucide-react"
import Link from "next/link"

interface Article {
  id: string
  title: string
  views: number
  publishedDate: string
  category: string
}

interface TrendingSectionProps {
  articles: Article[]
  title: string
  icon: React.ReactNode
}

export function TrendingSection({ articles, title, icon }: TrendingSectionProps) {
  return (
    <div className="bg-gradient-to-br from-card via-card/90 to-card/80 rounded-xl p-5 border-2 border-secondary/40 hover:border-secondary/60 transition-all duration-300 shadow-lg">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>

      <div className="space-y-3">
        {articles.slice(0, 5).map((article, idx) => (
          <Link key={article.id} href={`/news/${article.id}`}>
            <div className="group p-3 rounded-lg hover:bg-primary/8 transition-all duration-300 cursor-pointer border-l-4 border-secondary/50 hover:border-accent hover:translate-x-1 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-secondary bg-secondary/10 px-2 py-1 rounded flex-shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-secondary transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="bg-accent/15 text-accent px-2 py-0.5 rounded font-medium">{article.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {(() => {
                        try {
                          const d = article.publishedDate ? new Date(article.publishedDate) : null
                          if (d && !isNaN(d.getTime())) return d.toLocaleDateString()
                        } catch (e) {
                          // fallthrough
                        }
                        return "Unknown date"
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
