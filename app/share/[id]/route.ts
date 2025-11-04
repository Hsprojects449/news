import { NextRequest } from "next/server"
import { getArticleById } from "@/lib/dbClient"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // The route param is part of the pathname; extract last segment as id
    const pathname = new URL(request.url).pathname
    const parts = pathname.split('/')
    const id = parts[parts.length - 1]

    if (!id) {
      return new Response('Missing article id', { status: 400 })
    }

    const article = await getArticleById(id)
    if (!article) {
      return new Response('Article not found', { status: 404 })
    }

    const origin = new URL(request.url).origin
    const articleUrl = `${origin}/news/${id}`
    // Prefer explicit imageUrl, fallback to first media item
    const image = article.imageUrl || (Array.isArray(article.media) && article.media[0]?.url) || ''
    const title = article.title || 'News'
    const description = article.description || article.content || ''
    const publishedDate = article.publishedDate || article.created_at || new Date().toISOString()
    const author = article.author || 'Staff'

    // JSON-LD structured data for the article
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": title,
      "description": description,
      "image": image ? [image] : [],
      "datePublished": publishedDate,
      "dateModified": publishedDate,
      "author": {
        "@type": "Person",
        "name": author
      },
      "publisher": {
        "@type": "Organization",
        "name": "NewsHub"
      },
      "url": articleUrl,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleUrl
      }
    }

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(title)}</title>

        <!-- Open Graph -->
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${escapeHtml(title)}" />
        <meta property="og:description" content="${escapeHtml(description.substring(0, 300))}" />
        <meta property="og:url" content="${articleUrl}" />
        <meta property="og:site_name" content="NewsHub" />
        ${image ? `<meta property="og:image" content="${image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />` : ''}
        <meta property="article:published_time" content="${publishedDate}" />
        <meta property="article:author" content="${escapeHtml(author)}" />
        <meta property="article:section" content="${escapeHtml(article.category || 'News')}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@NewsHub" />
        <meta name="twitter:title" content="${escapeHtml(title)}" />
        <meta name="twitter:description" content="${escapeHtml(description.substring(0, 200))}" />
        ${image ? `<meta name="twitter:image" content="${image}" />
        <meta name="twitter:image:alt" content="${escapeHtml(title)}" />` : ''}
        
        <!-- WhatsApp specific -->
        <meta property="og:locale" content="en_US" />
        <meta name="theme-color" content="#075e54" />

        <!-- JSON-LD Structured Data -->
        <script type="application/ld+json">
        ${JSON.stringify(structuredData, null, 2)}
        </script>

        <!-- Redirect to the canonical article page after providing metadata -->
        <meta http-equiv="refresh" content="0;url=${articleUrl}" />
        
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          .redirect-box { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .redirect-link { color: #0066cc; text-decoration: none; font-weight: 500; }
          .redirect-link:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="redirect-box">
          <h1>${escapeHtml(title)}</h1>
          <p>Redirecting to article...</p>
          <p>If you are not redirected automatically, <a href="${articleUrl}" class="redirect-link">click here to view the article</a></p>
        </div>
      </body>
    </html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (err) {
    console.error('Share route error:', err)
    return new Response('Internal error', { status: 500 })
  }
}

function escapeHtml(str: string) {
  return String(str || '').replace(/[&<>\"]+/g, (s) => {
    switch (s) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return s
    }
  })
}
