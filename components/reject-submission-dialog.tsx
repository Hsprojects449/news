"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReject: (reason: string) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function RejectSubmissionDialog({
  open,
  onOpenChange,
  onReject,
  onCancel,
  isLoading = false
}: Props) {
  const [reason, setReason] = useState("")

  const handleReject = async () => {
    await onReject(reason)
    setReason("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Submission</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? "Rejecting..." : "Reject Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}