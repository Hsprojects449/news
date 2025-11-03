import { supabase, hasSupabase } from "./supabase"
import { CATEGORIES } from "./categories"

// Helper: normalize article records from DB (snake_case) to app camelCase
function normalizeArticle(record: any) {
  if (!record) return record
  
  // Parse media array if it exists
  let media: Array<{ url: string; type: 'image' | 'video' }> = []
  if (record.media) {
    try {
      // If it's already an array, use it
      if (Array.isArray(record.media)) {
        media = record.media
      } 
      // If it's a string, parse it
      else if (typeof record.media === 'string') {
        const parsed = JSON.parse(record.media)
        media = Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      console.error('Failed to parse media:', e)
      media = []
    }
  }
  
  return {
    // prefer camelCase if already present, otherwise map snake_case
    id: record.id,
    title: record.title,
    description: record.description ?? record.content ?? null,
    content: record.content ?? record.description ?? null,
    category: record.category,
    author: record.author,
    imageUrl: record.imageUrl ?? record.image_url ?? null,
    videoUrl: record.videoUrl ?? record.video_url ?? null,
    media: media, // Use the parsed media array, not record.media
    isFeatured: typeof record.isFeatured !== 'undefined' ? record.isFeatured : record.is_featured ?? false,
    isTrending: typeof record.isTrending !== 'undefined' ? record.isTrending : record.is_trending ?? false,
    isLatest: typeof record.isLatest !== 'undefined' ? record.isLatest : record.is_latest ?? false,
    isLive: typeof record.isLive !== 'undefined' ? record.isLive : record.is_live ?? false,
    views: typeof record.views !== 'undefined' ? record.views : record.view_count ?? 0,
    publishedDate: record.publishedDate ?? record.published_date ?? record.publishedAt ?? record.published_at ?? null,
    createdAt: record.createdAt ?? record.created_at ?? null,
    status: record.status ?? null,
  }
}

// ---- Storage helpers (server-side) ----
function extractStorageRef(publicUrl?: string): { bucket: string; path: string } | null {
  if (!publicUrl || typeof publicUrl !== 'string') return null
  try {
    const url = new URL(publicUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    // Standard public URL format: /storage/v1/object/public/<bucket>/<path...>
    const objIdx = parts.findIndex((p, i) => p === 'object' && parts[i + 1] === 'public')
    if (objIdx >= 0) {
      const bucket = parts[objIdx + 2]
      const path = parts.slice(objIdx + 3).join('/')
      if (bucket && path) return { bucket, path }
    }
    // Fallback: try to detect known buckets in URL path
    const knownBuckets = ['articles', 'jobs', 'advertisements', 'submissions', 'live-updates']
    const bIdx = parts.findIndex(p => knownBuckets.includes(p))
    if (bIdx >= 0) {
      const bucket = parts[bIdx]
      const path = parts.slice(bIdx + 1).join('/')
      if (bucket && path) return { bucket, path }
    }
  } catch (_) {
    // ignore parse errors
  }
  return null
}

async function deleteStorageByUrls(urls: Array<string | undefined | null>) {
  if (!hasSupabase() || !supabase) return
  const grouped: Record<string, Set<string>> = {}
  for (const u of urls) {
    const ref = extractStorageRef(u || undefined)
    if (ref) {
      if (!grouped[ref.bucket]) grouped[ref.bucket] = new Set<string>()
      grouped[ref.bucket].add(ref.path)
    }
  }
  for (const [bucket, set] of Object.entries(grouped)) {
    const paths = Array.from(set)
    if (paths.length === 0) continue
    try {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) {
        console.warn(`Supabase storage remove error for bucket ${bucket}:`, error)
      }
    } catch (err) {
      console.warn(`Supabase storage remove exception for bucket ${bucket}:`, err)
    }
  }
}

// Admin
export async function getAdminByUsername(username: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase.from("admins").select("*").eq("username", username).limit(1).single()
    if (error) throw error
    return data || null
  } catch (err) {
    console.error("Supabase getAdmin error:", err)
    return null
  }
}

// Articles - Enhanced CRUD operations
export async function getArticles(filters?: { 
  category?: string
  search?: string
  status?: string
  limit?: number
  offset?: number
}) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    let query: any = supabase
      .from("articles")
      .select("*", { count: 'exact' })
      .order("published_date", { ascending: false })

    if (filters) {
      if (filters.category) {
        query = query.eq("category", filters.category)
      }
      if (filters.status) {
        query = query.eq("status", filters.status)
      }
      if (filters.search) {
        // simple ILIKE search across title and description
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      
      // Add pagination
      if (filters.limit !== undefined) {
        query = query.limit(filters.limit)
      }
      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }
    } else {
      // default to only published articles when no filters provided
      query = query.eq("status", "published")
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      data: Array.isArray(data) ? data.map(normalizeArticle) : data,
      count: count || 0
    }
  } catch (err) {
    console.error("Supabase getArticles error:", err)
    return { data: [], count: 0 }
  }
}

export async function getArticleById(id: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return normalizeArticle(data)
  } catch (err) {
    console.error("Supabase getArticleById error:", err)
    return null
  }
}

export async function getLiveArticles(limit?: number) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    let query = supabase
      .from("articles")
      .select("id, title, image_url, video_url, media, published_date, created_at")
      .eq("is_live", true)
      .eq("status", "published")
      .order("published_date", { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    if (error) throw error
    return Array.isArray(data) ? data.map(normalizeArticle) : []
  } catch (err) {
    console.error("Supabase getLiveArticles error:", err)
    return []
  }
}

export async function createArticle(article: any) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const dbArticle: any = {
      ...article,
      content: (article as any).content || (article as any).description || null,
      ...(typeof (article as any).isFeatured !== 'undefined' ? { is_featured: (article as any).isFeatured } : {}),
      ...(typeof (article as any).isTrending !== 'undefined' ? { is_trending: (article as any).isTrending } : {}),
      ...(typeof (article as any).isLatest !== 'undefined' ? { is_latest: (article as any).isLatest } : {}),
      ...(typeof (article as any).isLive !== 'undefined' ? { is_live: (article as any).isLive } : {}),
      ...(typeof (article as any).imageUrl !== 'undefined' ? { image_url: (article as any).imageUrl } : {}),
      ...(typeof (article as any).videoUrl !== 'undefined' ? { video_url: (article as any).videoUrl } : {}),
      ...(typeof (article as any).media !== 'undefined' ? { media: JSON.stringify((article as any).media || []) } : {}),
      published_date: (article as any).publishedDate || (article as any).published_date || new Date().toISOString(),
    }

    delete (dbArticle as any).isFeatured
    delete (dbArticle as any).isTrending
    delete (dbArticle as any).isLatest
    delete (dbArticle as any).isLive
    delete (dbArticle as any).publishedDate
    delete (dbArticle as any).imageUrl
    delete (dbArticle as any).videoUrl

    const { data, error } = await supabase
      .from("articles")
      .insert([dbArticle])
      .select()
      .single()
    if (error) throw error
    return normalizeArticle(data)
  } catch (err) {
    console.error("Supabase createArticle error:", err)
    return null
  }
}

export async function updateArticle(id: string, updates: any) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const dbUpdates: any = {
      ...updates,
      ...(typeof (updates as any).isFeatured !== 'undefined' ? { is_featured: (updates as any).isFeatured } : {}),
      ...(typeof (updates as any).isTrending !== 'undefined' ? { is_trending: (updates as any).isTrending } : {}),
      ...(typeof (updates as any).isLatest !== 'undefined' ? { is_latest: (updates as any).isLatest } : {}),
      ...(typeof (updates as any).isLive !== 'undefined' ? { is_live: (updates as any).isLive } : {}),
      ...(typeof (updates as any).publishedDate !== 'undefined' ? { published_date: (updates as any).publishedDate } : {}),
      ...(typeof (updates as any).imageUrl !== 'undefined' ? { image_url: (updates as any).imageUrl } : {}),
      ...(typeof (updates as any).videoUrl !== 'undefined' ? { video_url: (updates as any).videoUrl } : {}),
      ...(typeof (updates as any).media !== 'undefined' ? { media: JSON.stringify((updates as any).media || []) } : {}),
    }
    delete (dbUpdates as any).isFeatured
    delete (dbUpdates as any).isTrending
    delete (dbUpdates as any).isLatest
    delete (dbUpdates as any).isLive
    delete (dbUpdates as any).publishedDate
    delete (dbUpdates as any).imageUrl
    delete (dbUpdates as any).videoUrl

    const { data, error } = await supabase
      .from("articles")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return normalizeArticle(data)
  } catch (err) {
    console.error("Supabase updateArticle error:", err)
    return null
  }
}

export async function deleteArticle(id: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const normalized = normalizeArticle(data)
    // Best-effort storage cleanup: imageUrl, videoUrl, and media[] urls
    const mediaUrls: string[] = []
    if (normalized?.imageUrl) mediaUrls.push(normalized.imageUrl)
    if (normalized?.videoUrl) mediaUrls.push(normalized.videoUrl)
    if (Array.isArray((normalized as any).media)) {
      for (const m of (normalized as any).media) {
        if (m?.url) mediaUrls.push(m.url)
      }
    }
    await deleteStorageByUrls(mediaUrls)
    return normalized
  } catch (err) {
    console.error('Supabase deleteArticle error:', err)
    return null
  }
}

export async function incrementArticleViews(id: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    // Use Supabase RPC to increment views atomically
    const { data, error } = await supabase.rpc('increment_article_views', { article_id: id })
    
    if (error) {
      // Fallback: fetch current count and update
      const article = await getArticleById(id)
      if (article) {
        const currentViews = article.views || 0
        await supabase
          .from('articles')
          .update({ views: currentViews + 1 })
          .eq('id', id)
      }
    }
    return true
  } catch (err) {
    console.error('Supabase incrementArticleViews error:', err)
    return false
  }
}

// Jobs - Enhanced CRUD operations
export async function getActiveJobs(filters?: { 
  title?: string
  location?: string
  limit?: number
  offset?: number
}) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    let query: any = supabase
      .from("jobs")
      .select("*", { count: 'exact' })
      .eq("status", "active")

    if (filters?.title && String(filters.title).trim().length > 0) {
      query = query.ilike('title', `%${filters.title}%`)
    }

    if (filters?.location && String(filters.location).trim().length > 0) {
      query = query.ilike('location', `%${filters.location}%`)
    }

    query = query.order("posted_date", { ascending: false })
    
    // Add pagination
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      data: Array.isArray(data) ? data.map(normalizeJob) : data,
      count: count || 0
    }
  } catch (err) {
    console.error("Supabase getActiveJobs error:", err)
    return { data: [], count: 0 }
  }
}

export async function createJob(job: any) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const dbJob = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      status: (job as any).status,
      apply_email: (job as any).applyEmail,
      apply_url: (job as any).applyUrl,
      ...(typeof (job as any).imageUrl !== 'undefined' ? { image_url: (job as any).imageUrl } : {}),
      posted_date: (job as any).postedDate || new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert([dbJob])
      .select()
      .single()
    if (error) throw error
    return normalizeJob(data)
  } catch (err) {
    console.error("Supabase createJob error:", err)
    return null
  }
}

export async function updateJob(id: string, updates: any) {
  if (!id) {
    console.error("updateJob: No id provided");
    return null;
  }

  console.log("updateJob - ID:", id);
  console.log("updateJob - Updates:", updates);

  if (hasSupabase() && supabase) {
    try {
      // Map client updates to DB column names
      const dbUpdates = {
        ...(updates.title && { title: updates.title }),
        ...(updates.company && { company: updates.company }),
        ...(updates.location && { location: updates.location }),
        ...(updates.description && { description: updates.description }),
        ...(updates.status && { status: updates.status }),
        // Map camelCase to snake_case only if values exist
        ...((updates as any).applyEmail && { 
          apply_email: (updates as any).applyEmail 
        }),
        ...((updates as any).applyUrl && { 
          apply_url: (updates as any).applyUrl 
        }),
        ...((updates as any).postedDate && { 
          posted_date: (updates as any).postedDate 
        }),
        ...(typeof (updates as any).imageUrl !== 'undefined' ? { 
          image_url: (updates as any).imageUrl 
        } : {})
      }

      const { data, error } = await supabase
        .from("jobs")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return normalizeJob(data)
    } catch (err) {
      console.error("Supabase updateJob error:", err)
      return null
    }
  }
  return null
}

export async function deleteJob(id: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    const normalized = normalizeJob(data)
    await deleteStorageByUrls([normalized?.imageUrl])
    return normalized
  } catch (err) {
    console.error("Supabase deleteJob error:", err)
    return null
  }
}

// Submissions - Enhanced CRUD operations
export async function getPendingSubmissions() {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("status", "pending")
      .order("submitted_date", { ascending: false })
    if (error) throw error
    return Array.isArray(data) ? data.map(normalizeSubmission) : data
  } catch (err) {
    console.error("Supabase getPendingSubmissions error:", err)
    return []
  }
}

// Get submissions with optional status filter. When no filter provided, return all statuses.
export async function getSubmissions(filters?: { 
  status?: string
  limit?: number
  offset?: number
}) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    let query: any = supabase
      .from("submissions")
      .select("*", { count: 'exact' })
      .order("submitted_date", { ascending: false })

    if (filters?.status && filters.status !== 'all') {
      query = query.eq("status", filters.status)
    }
    
    // Add pagination
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      data: Array.isArray(data) ? data.map(normalizeSubmission) : data,
      count: count || 0
    }
  } catch (err) {
    console.error("Supabase getSubmissions error:", err)
    return { data: [], count: 0 }
  }
}

export async function uploadSubmissionFile(file: File, submissionId: string) {
  if (!hasSupabase() || !supabase) return null;

  try {
    const timestamp = new Date().getTime();
    const fileExt = file.name.split('.').pop();
    const filePath = `submissions/${submissionId}/${timestamp}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl,
      type: file.type.startsWith('image/') ? 'image' : 'video',
    };
  } catch (err) {
    console.error("Supabase file upload error:", err);
    return null;
  }
}

export async function createSubmission(submission: any, files?: File[]) {
  if (hasSupabase() && supabase) {
    try {
      // If no files to upload, create submission directly
      if (!files || files.length === 0) {
        const { data, error } = await supabase
          .from("submissions")
          .insert([submission])
          .select()
          .single();
        
        if (error) throw error;
        return normalizeSubmission(data);
      }

      // Generate temporary ID for file uploads
      const tempId = crypto.randomUUID();
      
      // Upload files in parallel BEFORE creating database record
      const fileUploads = await Promise.all(
        files.map(file => uploadSubmissionFile(file, tempId))
      );

      // Filter out failed uploads
      const successfulUploads = fileUploads.filter(Boolean);

      // Build media arrays
      const imageUrls = successfulUploads
        .filter(f => f?.type === 'image')
        .map(f => f?.url);
      const videoUrls = successfulUploads
        .filter(f => f?.type === 'video')
        .map(f => f?.url);
      
      const mediaArray = successfulUploads.map(upload => ({
        url: upload!.url,
        type: upload!.type as 'image' | 'video'
      }));

      // Create submission with all file data in ONE database write
      const { data, error } = await supabase
        .from("submissions")
        .insert([{
          ...submission,
          image_url: imageUrls[0] || null,
          video_url: videoUrls[0] || null,
          files: successfulUploads,
          media: JSON.stringify(mediaArray)
        }])
        .select()
        .single();
      
      if (error) throw error;
      return normalizeSubmission(data);
    } catch (err) {
      console.error("Supabase createSubmission error:", err)
      return null
    }
  }
  return null
}

export async function approveSubmission(id: string, articleData: {
  category: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isLatest?: boolean;
  isLive?: boolean;
}) {
  if (hasSupabase() && supabase) {
    try {
      // First get the submission
      const { data: submission, error: fetchError } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Create an article from the submission
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .insert([{
          title: submission.title,
          description: submission.description,
          content: submission.description,
          category: articleData.category,
          author: submission.name,
          status: "published",
          image_url: submission.image_url,
          video_url: submission.video_url,
          media: submission.media || '[]', // Transfer media array
          is_featured: articleData.isFeatured || false,
          is_trending: articleData.isTrending || false,
          is_latest: articleData.isLatest || false,
          is_live: articleData.isLive || false,
          published_date: new Date().toISOString(),
          source: "user_submission"
        }])
        .select()
        .single();

      if (articleError) throw articleError;

      // Update submission status to approved
      const { data: updatedSubmission, error: updateError } = await supabase
        .from("submissions")
        .update({
          status: "approved",
          approved_date: new Date().toISOString(),
          article_id: article.id
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        submission: normalizeSubmission(updatedSubmission),
        article: normalizeArticle(article)
      };
    } catch (err) {
      console.error("Supabase approveSubmission error:", err);
      return null;
    }
  }
  return null;
}

export async function rejectSubmission(id: string, reason?: string) {
  if (hasSupabase() && supabase) {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .update({
          status: "rejected",
          rejected_date: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return normalizeSubmission(data);
    } catch (err) {
      console.error("Supabase rejectSubmission error:", err);
      return null;
    }
  }
  return null;
}

export async function updateSubmission(id: string, updates: any) {
  if (hasSupabase() && supabase) {
    try {
      // Map camelCase fields to DB columns
      const dbUpdates: any = {
        ...updates,
        ...(typeof (updates as any).paidStatus !== 'undefined' ? { paid_status: (updates as any).paidStatus } : {}),
        ...(typeof (updates as any).paidDate !== 'undefined' ? { paid_date: (updates as any).paidDate } : {}),
        ...(typeof (updates as any).media !== 'undefined' ? { media: JSON.stringify((updates as any).media || []) } : {}),
      }
      delete (dbUpdates as any).paidStatus
      delete (dbUpdates as any).paidDate

      const { data, error } = await supabase
        .from("submissions")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return normalizeSubmission(data)
    } catch (err) {
      console.error("Supabase updateSubmission error:", err)
      return null
    }
  }
  return null
}

export default {
  // Admin
  getAdminByUsername,
  // Articles
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  // Jobs
  getActiveJobs,
  createJob,
  // Submissions
  getSubmissions,
  getPendingSubmissions,
  createSubmission,
  updateSubmission,
  // Delete
  deleteArticle,
}

// Normalize job listing records
function normalizeJob(record: any) {
  if (!record) return record
  return {
    id: record.id,
    title: record.title,
    company: record.company,
    location: record.location,
    description: record.description ?? null,
    imageUrl: record.imageUrl ?? record.image_url ?? null,
    // Prefer camelCase if present, otherwise map from snake_case
    applyUrl: record.applyUrl ?? record.apply_url ?? null,
    applyEmail: record.applyEmail ?? record.apply_email ?? null,
    postedDate: record.postedDate ?? record.posted_date ?? null,
    createdAt: record.createdAt ?? record.created_at ?? null,
    status: record.status ?? null,
    // Only include known fields to avoid passing through snake_case DB fields
  }
}

// Normalize submission records
function normalizeSubmission(record: any) {
  if (!record) return record
  
  // Parse media array if it exists
  let media: Array<{ url: string; type: 'image' | 'video' }> = []
  if (record.media) {
    try {
      if (Array.isArray(record.media)) {
        media = record.media
      } else if (typeof record.media === 'string') {
        const parsed = JSON.parse(record.media)
        media = Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      console.error('Failed to parse submission media:', e)
      media = []
    }
  }
  
  // Parse files array if it exists (legacy support)
  let files: any[] = []
  if (record.files) {
    try {
      if (Array.isArray(record.files)) {
        files = record.files
      } else if (typeof record.files === 'string') {
        const parsed = JSON.parse(record.files)
        files = Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      console.error('Failed to parse submission files:', e)
      files = []
    }
  }
  
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    title: record.title,
    description: record.description ?? null,
    imageUrl: record.imageUrl ?? record.image_url ?? null,
    videoUrl: record.videoUrl ?? record.video_url ?? null,
    media: media,
    files: files,
    articleId: record.articleId ?? record.article_id ?? null,
    submittedDate: record.submittedDate ?? record.submitted_date ?? null,
    status: record.status ?? null,
    approvedDate: record.approvedDate ?? record.approved_date ?? null,
    rejectedDate: record.rejectedDate ?? record.rejected_date ?? null,
    rejectionReason: record.rejectionReason ?? record.rejection_reason ?? null,
    amount: typeof record.amount !== 'undefined' ? Number(record.amount) : null,
    paidStatus: record.paidStatus ?? record.paid_status ?? 'pending',
    paidDate: record.paidDate ?? record.paid_date ?? null,
  }
}

// Normalize advertisement records
function normalizeAdvertisement(record: any) {
  if (!record) return record
  
  // Parse media array if it exists
  let media: Array<{ url: string; type: 'image' | 'video' }> = []
  if (record.media) {
    try {
      if (Array.isArray(record.media)) {
        media = record.media
      } else if (typeof record.media === 'string') {
        const parsed = JSON.parse(record.media)
        media = Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      console.error('Failed to parse advertisement media:', e)
      media = []
    }
  }
  
  // Get imageUrl from either field
  const imageUrl = record.image_url ?? record.imageUrl ?? null
  
  // If no media array but has imageUrl, create media array from imageUrl
  if (media.length === 0 && imageUrl) {
    media = [{ url: imageUrl, type: 'image' }]
  }
  
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? null,
    imageUrl: imageUrl,
    media: media,
    link: record.link ?? null,
    position: record.position,
    displayDuration: record.displayDuration ?? record.display_duration ?? 5,
    isActive: typeof record.isActive !== 'undefined' ? record.isActive : record.is_active ?? false,
    createdDate: record.createdDate ?? record.created_date ?? record.created_at ?? null,
  }
}

// Advertisements - Enhanced CRUD operations
export async function getAdvertisements() {
  if (hasSupabase() && supabase) {
    try {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .order("created_date", { ascending: false })
      if (error) throw error
      return Array.isArray(data) ? data.map(normalizeAdvertisement) : data
    } catch (err) {
      console.error("Supabase getAdvertisements error:", err)
      return []
    }
  }
  return []
}

export async function createAdvertisement(ad: { title: string; description: string; imageUrl?: string; media?: Array<{ url: string; type: 'image' | 'video' }>; link?: string; position: string; displayDuration?: number }) {
  if (hasSupabase() && supabase) {
    try {
      const dbAd = {
        title: ad.title,
        description: ad.description,
        image_url: ad.imageUrl,
        media: JSON.stringify(ad.media || []),
        link: ad.link,
        position: ad.position,
        display_duration: ad.displayDuration ?? 5,
        is_active: true,
        created_date: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from("advertisements")
        .insert([dbAd])
        .select()
        .single()
      if (error) throw error
      return normalizeAdvertisement(data)
    } catch (err) {
      console.error("Supabase createAdvertisement error:", err)
      return null
    }
  }
  return null
}

export async function updateAdvertisement(id: string, updates: Partial<{ title: string; description: string; imageUrl: string; media: Array<{ url: string; type: 'image' | 'video' }>; link: string; position: string; displayDuration: number; isActive: boolean }>) {
  if (hasSupabase() && supabase) {
    try {
      const dbUpdates = {
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description }),
        ...(updates.imageUrl && { image_url: updates.imageUrl }),
        ...(updates.media && { media: JSON.stringify(updates.media) }),
        ...(updates.link && { link: updates.link }),
        ...(updates.position && { position: updates.position }),
        ...(typeof updates.displayDuration !== 'undefined' && { display_duration: updates.displayDuration }),
        ...(typeof updates.isActive !== 'undefined' && { is_active: updates.isActive })
      }

      const { data, error } = await supabase
        .from("advertisements")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return normalizeAdvertisement(data)
    } catch (err) {
      console.error("Supabase updateAdvertisement error:", err)
      return null
    }
  }
  return null
}

export async function deleteAdvertisement(id: string) {
  if (hasSupabase() && supabase) {
    try {
      const { data, error } = await supabase
        .from("advertisements")
        .delete()
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      const normalized = normalizeAdvertisement(data)
      const urls: string[] = []
      if (normalized?.imageUrl) urls.push(normalized.imageUrl)
      if (Array.isArray((normalized as any).media)) {
        for (const m of (normalized as any).media) {
          if (m?.url) urls.push(m.url)
        }
      }
      await deleteStorageByUrls(urls)
      return normalized
    } catch (err) {
      console.error("Supabase deleteAdvertisement error:", err)
      return null
    }
  }
  return null
}

// ---- Live Updates ----
type LiveUpdate = {
  id: string
  title: string
  url?: string | null
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
}

function normalizeLiveUpdate(record: any): LiveUpdate {
  return {
    id: record.id,
    title: record.title,
    url: record.url ?? null,
    imageUrl: record.imageUrl ?? record.image_url ?? null,
    isActive: typeof record.isActive !== 'undefined' ? record.isActive : !!record.is_active,
    createdAt: record.createdAt ?? record.created_at ?? new Date().toISOString(),
  }
}

export async function getLiveUpdates(options?: { activeOnly?: boolean; limit?: number }) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    let query = supabase.from('live_updates').select('*').order('created_at', { ascending: false })
    if (options?.activeOnly) query = query.eq('is_active', true)
    if (options?.limit && Number.isFinite(options.limit)) query = (query as any).limit(options.limit)
    const { data, error } = await query
    if (error) throw error
    return (data || []).map(normalizeLiveUpdate)
  } catch (err) {
    console.error('Supabase getLiveUpdates error:', err)
    return []
  }
}

export async function createLiveUpdate(payload: { title: string; url?: string | null; imageUrl?: string | null; isActive?: boolean }) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const insert = {
      title: payload.title,
      url: payload.url ?? null,
      image_url: typeof payload.imageUrl !== 'undefined' ? payload.imageUrl : null,
      is_active: typeof payload.isActive === 'boolean' ? payload.isActive : true,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('live_updates').insert([insert]).select().single()
    if (error) throw error
    return normalizeLiveUpdate(data)
  } catch (err) {
    console.error('Supabase createLiveUpdate error:', err)
    return null
  }
}

export async function updateLiveUpdate(id: string, updates: Partial<{ title: string; url: string | null; imageUrl: string | null; isActive: boolean }>) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const dbUpdates: any = {
      ...(typeof updates.title !== 'undefined' && { title: updates.title }),
      ...(typeof updates.url !== 'undefined' && { url: updates.url }),
      ...(typeof updates.imageUrl !== 'undefined' && { image_url: updates.imageUrl }),
      ...(typeof updates.isActive !== 'undefined' && { is_active: updates.isActive }),
    }
    const { data, error } = await supabase.from('live_updates').update(dbUpdates).eq('id', id).select().single()
    if (error) throw error
    return normalizeLiveUpdate(data)
  } catch (err) {
    console.error('Supabase updateLiveUpdate error:', err)
    return null
  }
}

export async function deleteLiveUpdate(id: string) {
  if (!hasSupabase() || !supabase) throw new Error("Supabase not configured")
  try {
    const { data, error } = await supabase.from('live_updates').delete().eq('id', id).select().single()
    if (error) throw error
    const normalized = normalizeLiveUpdate(data)
    await deleteStorageByUrls([normalized?.imageUrl])
    return normalized
  } catch (err) {
    console.error('Supabase deleteLiveUpdate error:', err)
    return null
  }
}

// ---- Static Content Pages (About, Terms, Privacy) ----
export async function getPageById(id: string) {
  if (hasSupabase() && supabase) {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return { id: data.id, title: data.title, content: data.content }
    } catch (err) {
      console.error('Supabase getPageById error:', err)
    }
  }
  // default fallbacks
  const defaults: Record<string, { id: string; title: string; content: string }> = {
    about: { id: 'about', title: 'About Us', content: 'Your trusted source for news and opportunities.' },
    terms: { id: 'terms', title: 'Terms & Conditions', content: 'Please read our terms and conditions carefully.' },
    privacy: { id: 'privacy', title: 'Privacy Policy', content: 'We respect your privacy and protect your data.' },
  }
  return defaults[id] || null
}

export async function upsertPage(page: { id: string; title: string; content: string }) {
  if (hasSupabase() && supabase) {
    try {
      const { data, error } = await supabase
        .from('pages')
        .upsert({ id: page.id, title: page.title, content: page.content })
        .select()
        .single()
      if (error) throw error
      return { id: data.id, title: data.title, content: data.content }
    } catch (err) {
      console.error('Supabase upsertPage error:', err)
      return null
    }
  }
  // no persistence without supabase; echo back
  return page
}

// ---- Homepage Settings ----
type HomepageSettings = {
  heroTitle: string
  heroDescription: string
  showBreakingNews: boolean
  showCategories: boolean
  showFeaturedStories: boolean
  showTrendingSection: boolean
  showLatestSection: boolean
  showAdvertisements: boolean
  categoriesDisplayed: string[]
  featuredStoriesCount: number
  trendingStoriesCount: number
  latestStoriesCount: number
  breakingNewsDuration: number
  newsArticleMediaDuration: number
  advertisementDuration: number
}

const defaultHomepageSettings: HomepageSettings = {
  heroTitle: 'Stay Informed',
  heroDescription: 'Read breaking news, trending stories, and discover job opportunities',
  showBreakingNews: true,
  showCategories: true,
  showFeaturedStories: true,
  showTrendingSection: true,
  showLatestSection: true,
  showAdvertisements: true,
  categoriesDisplayed: CATEGORIES,
  featuredStoriesCount: 6,
  trendingStoriesCount: 6,
  latestStoriesCount: 6,
  breakingNewsDuration: 5,
  newsArticleMediaDuration: 5,
  advertisementDuration: 5,
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  if (!hasSupabase() || !supabase) throw new Error('Supabase not configured')
  try {
    const { data, error } = await supabase
      .from('homepage_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return defaultHomepageSettings
    return {
      heroTitle: data.hero_title ?? defaultHomepageSettings.heroTitle,
      heroDescription: data.hero_description ?? defaultHomepageSettings.heroDescription,
      showBreakingNews: typeof data.show_breaking_news === 'boolean' ? data.show_breaking_news : defaultHomepageSettings.showBreakingNews,
      showCategories: typeof data.show_categories === 'boolean' ? data.show_categories : defaultHomepageSettings.showCategories,
      showFeaturedStories: typeof data.show_featured_stories === 'boolean' ? data.show_featured_stories : defaultHomepageSettings.showFeaturedStories,
      showTrendingSection: typeof data.show_trending_section === 'boolean' ? data.show_trending_section : defaultHomepageSettings.showTrendingSection,
      showLatestSection: typeof data.show_latest_section === 'boolean' ? data.show_latest_section : defaultHomepageSettings.showLatestSection,
      showAdvertisements: typeof data.show_advertisements === 'boolean' ? data.show_advertisements : defaultHomepageSettings.showAdvertisements,
      categoriesDisplayed: Array.isArray(data.categories_displayed) ? data.categories_displayed : defaultHomepageSettings.categoriesDisplayed,
      featuredStoriesCount: typeof data.featured_stories_count === 'number' ? data.featured_stories_count : defaultHomepageSettings.featuredStoriesCount,
      trendingStoriesCount: typeof data.trending_stories_count === 'number' ? data.trending_stories_count : defaultHomepageSettings.trendingStoriesCount,
      latestStoriesCount: typeof data.latest_stories_count === 'number' ? data.latest_stories_count : defaultHomepageSettings.latestStoriesCount,
      breakingNewsDuration: typeof data.breaking_news_duration === 'number' ? data.breaking_news_duration : defaultHomepageSettings.breakingNewsDuration,
      newsArticleMediaDuration: typeof data.news_article_media_duration === 'number' ? data.news_article_media_duration : defaultHomepageSettings.newsArticleMediaDuration,
      advertisementDuration: typeof data.advertisement_duration === 'number' ? data.advertisement_duration : defaultHomepageSettings.advertisementDuration,
    }
  } catch (err) {
    console.error('Supabase getHomepageSettings error:', err)
    return defaultHomepageSettings
  }
}

export async function updateHomepageSettings(settings: HomepageSettings): Promise<HomepageSettings | null> {
  if (!hasSupabase() || !supabase) throw new Error('Supabase not configured')
  try {
    const basePayload: any = {
      hero_title: settings.heroTitle,
      hero_description: settings.heroDescription,
      show_breaking_news: settings.showBreakingNews,
      show_categories: settings.showCategories,
      show_featured_stories: settings.showFeaturedStories,
      show_trending_section: settings.showTrendingSection,
      show_latest_section: settings.showLatestSection,
      categories_displayed: settings.categoriesDisplayed,
      featured_stories_count: settings.featuredStoriesCount,
      trending_stories_count: settings.trendingStoriesCount,
      latest_stories_count: settings.latestStoriesCount,
      breaking_news_duration: settings.breakingNewsDuration,
      news_article_media_duration: settings.newsArticleMediaDuration,
      advertisement_duration: settings.advertisementDuration,
    }
    let payload: any = { ...basePayload, show_advertisements: settings.showAdvertisements }
    const { data: existing, error: findError } = await supabase
      .from('homepage_settings')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (findError) throw findError

    const sb = supabase!
    const doSave = async (p: any) => {
      if (existing?.id) {
        const { data: upd, error: updErr } = await sb
          .from('homepage_settings')
          .update(p)
          .eq('id', existing.id)
          .select()
          .single()
        if (updErr) throw updErr
        return upd
      } else {
        const { data: ins, error: insErr } = await sb
          .from('homepage_settings')
          .insert(p)
          .select()
          .single()
        if (insErr) throw insErr
        return ins
      }
    }

    let data: any = null
    try {
      data = await doSave(payload)
    } catch (firstErr: any) {
      const msg = String(firstErr?.message || '')
      if (msg.includes('show_advertisements')) {
        const { show_advertisements, ...fallbackPayload } = payload
        data = await doSave(fallbackPayload)
      } else {
        throw firstErr
      }
    }

    const normalized: HomepageSettings = {
      heroTitle: data.hero_title ?? defaultHomepageSettings.heroTitle,
      heroDescription: data.hero_description ?? defaultHomepageSettings.heroDescription,
      showBreakingNews: typeof data.show_breaking_news === 'boolean' ? data.show_breaking_news : defaultHomepageSettings.showBreakingNews,
      showCategories: typeof data.show_categories === 'boolean' ? data.show_categories : defaultHomepageSettings.showCategories,
      showFeaturedStories: typeof data.show_featured_stories === 'boolean' ? data.show_featured_stories : defaultHomepageSettings.showFeaturedStories,
      showTrendingSection: typeof data.show_trending_section === 'boolean' ? data.show_trending_section : defaultHomepageSettings.showTrendingSection,
      showLatestSection: typeof data.show_latest_section === 'boolean' ? data.show_latest_section : defaultHomepageSettings.showLatestSection,
      showAdvertisements: typeof data.show_advertisements === 'boolean' ? data.show_advertisements : defaultHomepageSettings.showAdvertisements,
      categoriesDisplayed: Array.isArray(data.categories_displayed) ? data.categories_displayed : defaultHomepageSettings.categoriesDisplayed,
      featuredStoriesCount: typeof data.featured_stories_count === 'number' ? data.featured_stories_count : defaultHomepageSettings.featuredStoriesCount,
      trendingStoriesCount: typeof data.trending_stories_count === 'number' ? data.trending_stories_count : defaultHomepageSettings.trendingStoriesCount,
      latestStoriesCount: typeof data.latest_stories_count === 'number' ? data.latest_stories_count : defaultHomepageSettings.latestStoriesCount,
      breakingNewsDuration: typeof data.breaking_news_duration === 'number' ? data.breaking_news_duration : defaultHomepageSettings.breakingNewsDuration,
      newsArticleMediaDuration: typeof data.news_article_media_duration === 'number' ? data.news_article_media_duration : defaultHomepageSettings.newsArticleMediaDuration,
      advertisementDuration: typeof data.advertisement_duration === 'number' ? data.advertisement_duration : defaultHomepageSettings.advertisementDuration,
    }
    return normalized
  } catch (err) {
    console.error('Supabase updateHomepageSettings error:', err)
    return null
  }
}