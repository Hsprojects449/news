"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Button } from "./ui/button"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: any | null
  onApproveClick: () => void
  onRejectClick: () => void
}

export function SubmissionDetailModal({ open, onOpenChange, submission, onApproveClick, onRejectClick }: Props) {
  if (!submission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogDescription>Review submission details and attached media</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-lg font-semibold">{submission.title}</h3>
            <p className="text-sm text-muted-foreground">By: {submission.name} — {submission.email}</p>
            <p className="mt-2">{submission.description}</p>
          </div>

          {submission.imageUrl && (
            <div>
              <p className="font-semibold">Image</p>
              <img src={submission.imageUrl} alt="submission image" className="w-full max-h-72 object-cover rounded" />
            </div>
          )}

          {submission.videoUrl && (
            <div>
              <p className="font-semibold">Video</p>
              <video src={submission.videoUrl} controls className="w-full max-h-80 rounded" />
            </div>
          )}

          {submission.files && Array.isArray(submission.files) && (
            <div>
              <p className="font-semibold">Files</p>
              <div className="grid grid-cols-2 gap-2">
                {submission.files.map((f: any, idx: number) => (
                  <div key={idx} className="border rounded p-2">
                    {f.type === 'image' ? (
                      <img src={f.url} className="w-full h-28 object-cover rounded" />
                    ) : (
                      <video src={f.url} controls className="w-full h-28 rounded" />
                    )}
                    <p className="text-xs mt-1">{f.path}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
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
