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
  const isTrending = title.toLowerCase().includes('trending')
  
  return (
    <div className={`bg-white dark:bg-card rounded-xl border-2 overflow-hidden ${
      isTrending 
        ? 'border-destructive/30' 
        : 'border-primary/30'
    }`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center gap-2.5 ${
        isTrending 
          ? 'bg-gradient-to-r from-destructive/10 to-transparent' 
          : 'bg-gradient-to-r from-primary/10 to-transparent'
      }`}>
        <div className={isTrending ? 'text-destructive' : 'text-primary'}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">{title}</h3>
      </div>

      {/* Articles List */}
      <div className="py-3">
        {articles.slice(0, 6).map((article, idx) => (
          <Link key={article.id} href={`/news/${article.id}`}>
            <div className={`px-5 py-4 mx-3 rounded-lg transition-all duration-200 border-l-[6px] ${
              isTrending 
                ? 'bg-destructive/5 dark:bg-destructive/10 border-l-destructive hover:bg-destructive/10 hover:border-l-destructive hover:shadow-lg hover:scale-[1.02]' 
                : 'bg-primary/5 dark:bg-primary/10 border-l-primary hover:bg-primary/10 hover:border-l-primary hover:shadow-lg hover:scale-[1.02]'
            }`}>
              <div className="flex items-start gap-3">
                {/* Number Badge */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base ${
                    isTrending 
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    #{idx + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <h4 className="font-semibold text-[15px] text-gray-900 dark:text-foreground line-clamp-2 mb-2 leading-snug">
                    {article.title}
                  </h4>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                      isTrending
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {article.category}
                    </span>
                    
                    <span className="flex items-center gap-1 text-gray-500 dark:text-muted-foreground">
                      <Clock size={12} />
                      {(() => {
                        try {
                          const d = article.publishedDate ? new Date(article.publishedDate) : null
                          if (d && !isNaN(d.getTime())) {
                            return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                          }
                        } catch (e) {
                          // fallthrough
                        }
                        return "Unknown"
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
