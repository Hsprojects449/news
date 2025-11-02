"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import apiClient from "@/lib/apiClient"

export default function PrivacyPage() {
  const [content, setContent] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/content?id=privacy')
        if (res && (res as Response).ok) {
          const data = await (res as Response).json()
          setContent({ title: data.title || 'Privacy Policy', content: data.content || '' })
        } else {
          setContent({ title: 'Privacy Policy', content: '' })
        }
      } catch {
        setContent({ title: 'Privacy Policy', content: '' })
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
          <h1 className="text-4xl font-bold mb-2">{content?.title || 'Privacy Policy'}</h1>
          <p className="text-lg opacity-90">We respect your privacy and protect your data</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        {content?.content ? (
          <div className="whitespace-pre-wrap text-muted-foreground">{content.content}</div>
        ) : (
          <div className="space-y-6 text-muted-foreground">
            <p>
              Your privacy is important to us. This policy explains what information we collect, how we use it, and your
              rights regarding your personal data.
            </p>
            <p>
              We only collect information necessary to provide our services and improve your experience. We do not sell
              your personal information to third parties.
            </p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}
