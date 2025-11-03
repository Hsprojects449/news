# Multiple Media Support - Implementation Guide

## Overview
The project now supports multiple images/videos for:
- Articles (news content)
- Advertisements (with auto-rotating carousel)
- Submissions (guest uploads)

## Database Changes

### Run the updated SQL schema
Execute `supabase/init.sql` in your Supabase SQL Editor. Key changes:

1. **Articles table**: Added `media` JSONB column
2. **Submissions table**: Added `media` JSONB column  
3. **Advertisements table**: 
   - Added `media` JSONB column
   - Added `display_duration` integer column (seconds, default: 5)

### Media Format
```json
[
  { "url": "https://...", "type": "image" },
  { "url": "https://...", "type": "video" }
]
```

## Components Created

### 1. MultiFileUpload Component
Location: `components/multi-file-upload.tsx`

**Features:**
- Multiple file selection
- Grid preview layout
- Drag preview with remove button
- Type indicators (image/video icons)
- Max files limit (default: 10)
- File size validation
- Returns array of File objects

**Usage:**
```tsx
<MultiFileUpload
  label="Upload Media"
  accept="image/*,video/*"
  maxSizeMB={50}
  maxFiles={10}
  onFilesChange={(files) => setMediaFiles(files)}
  currentMedia={formData.media}
/>
```

### 2. AdvertisementsCarousel Component
Location: `components/advertisements-carousel.tsx`

**Features:**
- Auto-rotates ads based on `displayDuration` setting
- Supports multiple media per ad
- Navigation arrows and dot indicators
- Pause on hover
- Clickable ads (opens link in new tab)
- Responsive design

**How it works:**
- Filters active ads for specific position
- Rotates through ads using `displayDuration` (default: 5s)
- If an ad has multiple media, cycles through them (3s each)
- Shows overlay with title/description
- Navigation controls appear on hover

### 3. MediaGallery Component
Location: `components/media-gallery.tsx`

**Features:**
- Large main image/video display
- Thumbnail navigation grid
- Fullscreen mode for images
- Keyboard/click navigation
- Counter display (e.g., "3 / 10")
- Video controls
- Responsive layout

**Usage in article detail page:**
```tsx
{article.media && article.media.length > 0 ? (
  <MediaGallery media={article.media} />
) : (
  // Fallback to legacy single image/video
)}
```

## Admin UI Updates

### Admin News Page (Completed)
Location: `app/admin/news/page.tsx`

- Replaced separate image/video uploads with `MultiFileUpload`
- Handles multiple media files
- Uploads all files to 'articles' bucket
- Saves media array to database
- Backward compatible (still sets imageUrl/videoUrl for first image/video)

**Key changes:**
```tsx
const [mediaFiles, setMediaFiles] = useState<File[]>([])

// Upload loop
for (const file of mediaFiles) {
  const result = await uploadFile(file, 'articles')
  if (result) {
    media.push({
      url: result.url,
      type: file.type.startsWith('image') ? 'image' : 'video'
    })
  }
}
```

### Admin Advertisements Page (TODO)
Location: `app/admin/advertisements/page.tsx`

**Required changes:**
1. Import `MultiFileUpload`
2. Replace state:
   ```tsx
   const [mediaFiles, setMediaFiles] = useState<File[]>([])
   ```
3. Replace FileUpload with:
   ```tsx
   <MultiFileUpload
     label="Advertisement Media"
     onFilesChange={setMediaFiles}
     currentMedia={formData.media}
   />
   ```
4. Add `displayDuration` field:
   ```tsx
   <input
     type="number"
     min="1"
     max="60"
     placeholder="Display Duration (seconds)"
     value={formData.displayDuration || 5}
     onChange={(e) => setFormData({ ...formData, displayDuration: parseInt(e.target.value) })}
   />
   ```
5. Upload files and build media array (same pattern as news page)

### Submit Page (Guest Submissions) (TODO)
Location: `app/submit/page.tsx`

Currently supports multiple files via existing upload flow. No changes needed, but could be enhanced with `MultiFileUpload` for better UX.

## API Updates

### Articles API
- Already passes through `media` field in POST/PATCH
- `dbClient.createArticle` and `updateArticle` now serialize media array to JSON

### Advertisements API  
- Already passes through `media` and `displayDuration` fields
- `dbClient.createAdvertisement` and `updateAdvertisement` handle serialization

### Submissions API
- POST now builds `media` array from `mediaUrls`
- Detects type from file extension
- Stores in database

## Data Layer (lib/dbClient.ts)

### Normalization Functions
All normalize functions now parse `media` JSONB:

```typescript
let media: Array<{ url: string; type: 'image' | 'video' }> = []
if (record.media) {
  try {
    media = Array.isArray(record.media) ? record.media : JSON.parse(record.media)
  } catch {
    media = []
  }
}
return { ...record, media }
```

### Create/Update Functions
Stringify media arrays before inserting:

```typescript
{
  ...otherFields,
  media: JSON.stringify(updates.media || [])
}
```

## Frontend Display

### Article Detail Page
Location: `app/news/[id]/page.tsx`

- Uses `MediaGallery` component if `media` array exists
- Falls back to legacy `imageUrl`/`videoUrl` display
- Fully backward compatible

### Advertisement Spaces
Location: `components/advertisement-space.tsx`

- Now fetches all active ads for position
- Uses `AdvertisementsCarousel` component
- Auto-rotates with admin-configurable timing

## Backward Compatibility

All changes are backward compatible:

1. **Legacy fields preserved**: `imageUrl` and `videoUrl` still populated (first image/video from media array)
2. **Fallback rendering**: If `media` array is empty, falls back to single image/video display
3. **Existing data**: Works without migration - empty media arrays handled gracefully

## Remaining Tasks

### 1. Update Admin Advertisements Page
Follow pattern from admin news page:
- Use `MultiFileUpload`
- Add `displayDuration` number input
- Upload files and build media array
- Test carousel on homepage

### 2. Test Full Flow
1. Create article with multiple images/videos
2. View on news detail page - verify gallery works
3. Create advertisement with multiple media and set duration
4. Verify carousel auto-rotates on homepage
5. Submit story as guest with multiple files
6. Verify submission shows all media in admin

### 3. Optional Enhancements
- Add drag-and-drop reordering in MultiFileUpload
- Add media captions/alt text
- Add video thumbnails to gallery
- Add swipe gestures for mobile gallery

## Testing Checklist

- [ ] Upload multiple images to article
- [ ] Upload multiple videos to article
- [ ] Mix images and videos in article
- [ ] Verify gallery navigation works
- [ ] Test fullscreen mode
- [ ] Create ad with 3+ media items
- [ ] Verify ad carousel auto-rotates
- [ ] Test different displayDuration values
- [ ] Verify pause on hover works
- [ ] Submit guest story with multiple files
- [ ] Verify all media displays in admin
- [ ] Test on mobile devices
- [ ] Verify backward compatibility with existing articles

## Migration Notes

If you have existing data:

1. Run the SQL schema update (adds columns with defaults)
2. Existing articles/ads will have empty media arrays
3. They'll continue to display using imageUrl/videoUrl
4. Edit and re-save to populate media array (optional)

## Support

For issues:
1. Check browser console for errors
2. Verify Supabase buckets exist and have public policies
3. Check file size limits (default: 50MB)
4. Verify env variables are set correctly
