import { supabaseClient } from "./supabaseClient"

export type UploadResult = {
  url: string
  path: string
  type: 'image' | 'video'
}

/**
 * Upload a file to Supabase Storage
 * @param file - File to upload
 * @param bucket - Storage bucket name
 * @param folder - Optional folder path within bucket
 * @returns Upload result with public URL and path
 */
export async function uploadFile(
  file: File,
  bucket: string,
  folder?: string
): Promise<UploadResult | null> {
  if (!supabaseClient) {
    console.error('Supabase client not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return null
  }

  try {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const fileName = `${timestamp}-${randomStr}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const type = file.type.startsWith('image/') ? 'image' : 'video'

    return {
      url: urlData.publicUrl,
      path: filePath,
      type
    }
  } catch (err) {
    console.error('Upload exception:', err)
    return null
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  if (!supabaseClient) {
    console.error('Supabase client not configured')
    return false
  }

  try {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Delete exception:', err)
    return false
  }
}

/**
 * Validate file type and size
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @param allowedTypes - Allowed MIME types (default images and videos)
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov']
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}` }
  }

  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }

  return { valid: true }
}

/**
 * Generate a preview URL for a file
 * @param file - File to preview
 */
export function getFilePreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Clean up object URL
 * @param url - Object URL to revoke
 */
export function revokeFilePreview(url: string): void {
  URL.revokeObjectURL(url)
}
