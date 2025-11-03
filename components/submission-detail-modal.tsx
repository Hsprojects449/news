"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Button } from "./ui/button"
import { MediaGallery } from "./media-gallery"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: any | null
  onApproveClick: () => void
  onRejectClick: () => void
}

export function SubmissionDetailModal({ open, onOpenChange, submission, onApproveClick, onRejectClick }: Props) {
  if (!submission) return null

  // Get all media from either media array or legacy fields
  const getAllMedia = () => {
    const mediaItems: Array<{ url: string; type: 'image' | 'video' }> = []
    
    // First priority: media array
    if (submission.media && Array.isArray(submission.media) && submission.media.length > 0) {
      return submission.media
    }
    
    // Second priority: files array
    if (submission.files && Array.isArray(submission.files) && submission.files.length > 0) {
      submission.files.forEach((f: any) => {
        if (f.url) {
          mediaItems.push({
            url: f.url,
            type: f.type || 'image'
          })
        }
      })
      if (mediaItems.length > 0) return mediaItems
    }
    
    // Fallback to legacy single fields
    if (submission.imageUrl) {
      mediaItems.push({ url: submission.imageUrl, type: 'image' })
    }
    if (submission.videoUrl) {
      mediaItems.push({ url: submission.videoUrl, type: 'video' })
    }
    
    return mediaItems
  }

  const media = getAllMedia()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogDescription>Review submission details and attached media</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{submission.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              By: {submission.name}
              {submission.email && ` • ${submission.email}`}
              {submission.phone && ` • ${submission.phone}`}
            </p>
            {submission.description && (
              <p className="text-sm">{submission.description}</p>
            )}
          </div>

          {/* Media Display */}
          {media.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Media ({media.length})</h4>
              <MediaGallery media={media} />
            </div>
          )}

          {/* Status Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                submission.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {submission.status}
              </span>
            </div>
            {submission.submittedDate && (
              <div>
                <span className="font-semibold">Submitted:</span>
                <span className="ml-2">{new Date(submission.submittedDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {submission.status === 'rejected' && submission.rejectionReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">Rejection Reason</h4>
              <p className="text-sm text-red-800">{submission.rejectionReason}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {submission.status === 'pending' ? (
            <>
              <Button className="bg-green-600 hover:bg-green-700" onClick={onApproveClick}>Approve</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={onRejectClick}>Reject</Button>
            </>
          ) : (
            submission.article_id ? (
              <Button
                variant="default"
                onClick={() => window.open(`/news/${submission.article_id}`, '_blank')}
              >
                View Article
              </Button>
            ) : null
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
