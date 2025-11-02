import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"

interface ArticleCardProps {
  id: string
  title: string
  description: string
  imageUrl?: string
  category: string
  // publishedDate may come as `publishedDate` or `published_date` from the API
  publishedDate?: string | null
  published_date?: string | null
  views: number
}

export function ArticleCard({ id, title, description, imageUrl, category, publishedDate, published_date, views }: ArticleCardProps) {
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

  return (
    <Link href={`/news/${id}`}>
      <article className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {imageUrl && (
          <div className="relative w-full h-48 bg-muted">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
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
