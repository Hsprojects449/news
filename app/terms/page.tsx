"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import apiClient from "@/lib/apiClient"

export default function TermsPage() {
  const [content, setContent] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/api/content?id=terms')
        if (res && (res as Response).ok) {
          const data = await (res as Response).json()
          setContent({ title: data.title || 'Terms & Conditions', content: data.content || '' })
        } else {
          setContent({ title: 'Terms & Conditions', content: '' })
        }
      } catch {
        setContent({ title: 'Terms & Conditions', content: '' })
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
          <h1 className="text-4xl font-bold mb-2">{content?.title || 'Terms & Conditions'}</h1>
          <p className="text-lg opacity-90">Please read these terms carefully</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8 text-muted-foreground">
          {content?.content && (
            <div className="whitespace-pre-wrap text-foreground">
              {content.content}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using NewsHub, you accept and agree to be bound by the terms and provision of this
              agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on
              NewsHub for personal, non-commercial transitory viewing only. This is the grant of a license, not a
              transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on NewsHub</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Disclaimer</h2>
            <p>
              The materials on NewsHub are provided on an 'as is' basis. NewsHub makes no warranties, expressed or
              implied, and hereby disclaims and negates all other warranties including, without limitation, implied
              warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of
              intellectual property or other violation of rights.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Limitations</h2>
            <p>
              In no event shall NewsHub or its suppliers be liable for any damages (including, without limitation,
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability
              to use the materials on NewsHub.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on NewsHub could include technical, typographical, or photographic errors. NewsHub
              does not warrant that any of the materials on its website are accurate, complete, or current. NewsHub may
              make changes to the materials contained on its website at any time without notice.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
