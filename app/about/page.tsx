"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import apiClient from "@/lib/apiClient"

export default function AboutPage() {
  const [content, setContent] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/content?id=about')
        if (res && (res as Response).ok) {
          const data = await (res as Response).json()
          setContent({ title: data.title || 'About NewsHub', content: data.content || '' })
        } else {
          setContent({ title: 'About NewsHub', content: '' })
        }
      } catch {
        setContent({ title: 'About NewsHub', content: '' })
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{content?.title || 'About NewsHub'}</h1>
          <p className="text-lg opacity-90">Your trusted source for news and opportunities</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            {content?.content ? (
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{content.content}</div>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                NewsHub is dedicated to providing accurate, timely, and relevant news to our readers worldwide. We believe
                in the power of information and strive to create a platform where diverse voices can be heard and
                important stories can be shared.
              </p>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">What We Do</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Curate and publish news from trusted sources and community contributors</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Provide a platform for citizen journalists to share their stories</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Post job opportunities to help people find their next career</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Maintain editorial standards and verify content quality</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-bold mb-2">Accuracy</h3>
                <p className="text-sm text-muted-foreground">
                  We verify all information before publication to ensure accuracy and reliability.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-bold mb-2">Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  We are open about our editorial process and sources of information.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-bold mb-2">Inclusivity</h3>
                <p className="text-sm text-muted-foreground">
                  We welcome diverse perspectives and stories from all communities.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-bold mb-2">Integrity</h3>
                <p className="text-sm text-muted-foreground">
                  We maintain the highest ethical standards in journalism and content curation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
