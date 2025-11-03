"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { CATEGORIES } from "@/lib/categories"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (data: {
    category: string
    isFeatured: boolean
    isTrending: boolean
    isLatest: boolean
    isLive: boolean
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ApproveSubmissionDialog({
  open,
  onOpenChange,
  onApprove,
  onCancel,
  isLoading = false
}: Props) {
  const [formData, setFormData] = useState({
    category: CATEGORIES[0] || "Technology",
    isFeatured: false,
    isTrending: false,
    isLatest: true,
    isLive: false
  })

  const handleApprove = async () => {
    await onApprove(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Submission</DialogTitle>
          <DialogDescription>
            Configure how this submission will appear as an article
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFeatured: checked as boolean })
                }
              />
              <Label htmlFor="featured">Featured Article</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="trending"
                checked={formData.isTrending}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isTrending: checked as boolean })
                }
              />
              <Label htmlFor="trending">Trending Article</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="latest"
                checked={formData.isLatest}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isLatest: checked as boolean })
                }
              />
              <Label htmlFor="latest">Latest News</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="live"
                checked={formData.isLive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isLive: checked as boolean })
                }
              />
              <Label htmlFor="live">🔴 Live Update</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isLoading} variant="success">
            {isLoading ? "Approving..." : "Approve & Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}