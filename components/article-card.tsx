import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { MediaCarousel } from "./media-carousel"

interface ArticleCardProps {
  id: string
  title: string
  description: string
  imageUrl?: string
  videoUrl?: string
  media?: Array<{ url: string; type: 'image' | 'video' }>
  category: string
  // publishedDate may come as `publishedDate` or `published_date` from the API
  publishedDate?: string | null
  published_date?: string | null
  views: number
}

export function ArticleCard({ id, title, description, imageUrl, videoUrl, media, category, publishedDate, published_date, views }: ArticleCardProps) {
  // Normalize published date from possible field names and guard invalid values
  const finalPublished = publishedDate ?? published_date
  let timeAgo = ""
  try {
    const parsed = finalPublished ? new Date(finalPublished) : null
    if (parsed && !isNaN(parsed.getTime())) {
      timeAgo = formatDistanceToNow(parsed, { addSuffix: true })
    } else {
      timeAgo = "Unknown date"
    }
  } catch (e) {
    timeAgo = "Unknown date"
  }

  // Build media array for carousel
  const displayMedia: Array<{ url: string; type: 'image' | 'video' }> = []
  if (media && Array.isArray(media) && media.length > 0) {
    displayMedia.push(...media)
  } else {
    // Fallback to legacy fields
    if (imageUrl) displayMedia.push({ url: imageUrl, type: 'image' })
    if (videoUrl) displayMedia.push({ url: videoUrl, type: 'video' })
  }

  return (
    <Link href={`/news/${id}`}>
      <article className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {displayMedia.length > 0 && (
          <div className="relative w-full h-48 bg-muted">
            <MediaCarousel media={displayMedia} autoSlide={true} />
          </div>
        )}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-1 rounded">
              {category}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-card-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-grow">{description}</p>
          <div className="mt-4 text-xs text-muted-foreground">{views.toLocaleString()} views</div>
        </div>
      </article>
    </Link>
  )
}
