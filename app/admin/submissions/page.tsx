"use client"

import { useState, useEffect } from "react"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock, Eye, Check, X } from "lucide-react"
import { ApproveSubmissionDialog } from "@/components/approve-submission-dialog"
import { RejectSubmissionDialog } from "@/components/reject-submission-dialog"
import { SubmissionDetailModal } from "@/components/submission-detail-modal"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState<string>("")
  const [editingPaidStatus, setEditingPaidStatus] = useState<"pending" | "paid">("pending")
  const itemsPerPage = 5
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const statusParam = filter === 'all' ? '' : `?status=${filter}`
        const response = await apiClient.get(`/api/submissions${statusParam}`)
        if (response && (response as Response).ok) {
          const result = await (response as Response).json()
          // Handle both old format (array) and new format (object with data/count)
          const submissionsData = Array.isArray(result) ? result : (result.data || [])
          setSubmissions(submissionsData)
          setCurrentPage(1)
        }
      } catch (error) {
        console.error('Error fetching submissions:', error)
      }
    }
    fetchSubmissions()
  }, [filter])

  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprove = async (data: {
    category: string
    isFeatured: boolean
    isTrending: boolean
    isLatest: boolean
    isLive: boolean
  }) => {
    if (!selectedSubmission) return

    setIsSubmitting(true)
    try {
      const response = await apiClient.patch(`/api/submissions?id=${selectedSubmission}&action=approve`, data)

      // If auth failed or no response, redirect to login
      if (!response || (response as Response).status === 401) {
        window.location.href = '/admin/login'
        return
      }

      if (!(response as Response).ok) {
        const text = await (response as Response).text()
        throw new Error(text || 'Failed to approve')
      }

      // Update local state (or remove if current filter doesn't show approved)
      const updatedList = submissions.map(sub => 
        sub.id === selectedSubmission ? 
          { ...sub, status: 'approved', approvedDate: new Date().toISOString() } : 
          sub
      )
      const finalList = (filter !== 'all' && filter !== 'approved') 
        ? updatedList.filter(s => s.id !== selectedSubmission)
        : updatedList
      setSubmissions(finalList)

      setShowApproveDialog(false)
    } catch (error) {
      console.error("Failed to approve submission:", error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
      setSelectedSubmission(null)
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedSubmission) return

    setIsSubmitting(true)
    try {
      const response = await apiClient.patch(`/api/submissions?id=${selectedSubmission}&action=reject`, { reason })

      if (!response || (response as Response).status === 401) {
        window.location.href = '/admin/login'
        return
      }

      if (!(response as Response).ok) {
        const text = await (response as Response).text()
        throw new Error(text || 'Failed to reject')
      }

      // Update local state (or remove if current filter doesn't show rejected)
      const updatedList = submissions.map(sub => 
        sub.id === selectedSubmission ? 
          { ...sub, status: 'rejected', rejectedDate: new Date().toISOString(), rejectionReason: reason } : 
          sub
      )
      const finalList = (filter !== 'all' && filter !== 'rejected') 
        ? updatedList.filter(s => s.id !== selectedSubmission)
        : updatedList
      setSubmissions(finalList)

      setShowRejectDialog(false)
    } catch (error) {
      console.error("Failed to reject submission:", error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
      setSelectedSubmission(null)
    }
  }

  const handleUpdateAmount = async (id: string, amount: string) => {
    const numeric = Number.parseFloat(amount)
    const optimistic = submissions.map((sub) => (sub.id === id ? { ...sub, amount: Number.isFinite(numeric) ? numeric : 0 } : sub))
    setSubmissions(optimistic)
    try {
      const res = await apiClient.patch(`/api/submissions?id=${id}`, { amount: Number.isFinite(numeric) ? numeric : 0 })
      if (!res || !(res as Response).ok) {
        throw new Error('Failed to update amount')
      }
    } catch (e) {
      console.error('Amount update failed:', e)
    }
  }

  const handleUpdatePaidStatus = async (id: string, status: "pending" | "paid") => {
    const paidDate = status === "paid" ? new Date().toISOString() : null
    const optimistic = submissions.map((sub) =>
      sub.id === id ? { ...sub, paidStatus: status, paidDate } : sub,
    )
    setSubmissions(optimistic)
    setEditingId(null)
    try {
      const res = await apiClient.patch(`/api/submissions?id=${id}`, { paidStatus: status, paidDate })
      if (!res || !(res as Response).ok) {
        throw new Error('Failed to update paid status')
      }
    } catch (e) {
      console.error('Paid status update failed:', e)
    }
  }

  const paginatedSubmissions = submissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(submissions.length / itemsPerPage)

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        {/* Filter Tabs */}
        <div className="mb-4 flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-primary/10 border-b z-10">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Email</th>
                  <th className="px-6 py-4 text-left font-semibold">Contact</th>
                  <th className="px-6 py-4 text-left font-semibold">News Title</th>
                  <th className="px-6 py-4 text-left font-semibold">Submitted On</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  {filter === 'approved' && (
                    <>
                      <th className="px-6 py-4 text-left font-semibold">Amount</th>
                      <th className="px-6 py-4 text-left font-semibold">Paid Status</th>
                      <th className="px-6 py-4 text-left font-semibold">Paid Date</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-b hover:bg-background/50">
                    <td className="px-6 py-4">{submission.name || "N/A"}</td>
                    <td className="px-6 py-4">{submission.email || "N/A"}</td>
                    <td className="px-6 py-4">{submission.phone || "N/A"}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{submission.title || "N/A"}</td>
                    <td className="px-6 py-4 text-sm">
                      {submission.submittedDate ? new Date(submission.submittedDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {submission.status === "approved" && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={18} />
                          <span>Approved</span>
                        </div>
                      )}
                      {submission.status === "rejected" && (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle size={18} />
                          <span>Rejected</span>
                        </div>
                      )}
                      {submission.status === "pending" && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Clock size={18} />
                          <span>Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {submission.status === "approved" && submission.approvedDate
                        ? new Date(submission.approvedDate).toLocaleDateString()
                        : submission.status === "rejected" && submission.rejectedDate
                          ? new Date(submission.rejectedDate).toLocaleDateString()
                          : "-"}
                    </td>
                    {filter === 'approved' && (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={submission.amount ?? ""}
                            onChange={(e) => setSubmissions(submissions.map(s => s.id === submission.id ? { ...s, amount: e.target.value } : s))}
                            onBlur={(e) => handleUpdateAmount(submission.id, String(e.target.value))}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 border rounded bg-background"
                          />
                        </td>
                        <td className="px-6 py-4">
                          {editingId === submission.id ? (
                            <select
                              value={editingPaidStatus}
                              onChange={(e) => setEditingPaidStatus(e.target.value as "pending" | "paid")}
                              onBlur={() => handleUpdatePaidStatus(submission.id, editingPaidStatus)}
                              className="px-2 py-1 border rounded bg-background"
                              autoFocus
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(submission.id)
                                setEditingPaidStatus(submission.paidStatus || "pending")
                                // Scroll to top for editing interface
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                              className={`px-3 py-1 rounded text-sm font-medium cursor-pointer ${
                                submission.paidStatus === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {submission.paidStatus === "paid" ? "Paid" : "Pending"}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {submission.paidDate ? new Date(submission.paidDate).toLocaleDateString() : "-"}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {submission.status === "pending" && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-2 rounded hover:bg-muted"
                                    onClick={() => { setSelectedSubmission(submission.id); setShowApproveDialog(true); }}
                                    aria-label="Approve"
                                  >
                                    <Check size={18} className="text-green-600" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Approve</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-2 rounded hover:bg-muted"
                                    onClick={() => { setSelectedSubmission(submission.id); setShowRejectDialog(true); }}
                                    aria-label="Reject"
                                  >
                                    <X size={18} className="text-red-600" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Reject</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="p-2 rounded hover:bg-muted"
                                onClick={() => { setSelectedSubmission(submission.id); setDetailOpen(true); }}
                                aria-label="View"
                              >
                                <Eye size={18} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => setCurrentPage(page)}
                variant={currentPage === page ? "default" : "outline"}
              >
                {page}
              </Button>
            ))}
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <ApproveSubmissionDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onApprove={handleApprove}
        onCancel={() => {
          setShowApproveDialog(false)
          setSelectedSubmission(null)
        }}
        isLoading={isSubmitting}
      />

      <RejectSubmissionDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={handleReject}
        onCancel={() => {
          setShowRejectDialog(false)
          setSelectedSubmission(null)
        }}
        isLoading={isSubmitting}
      />

      <SubmissionDetailModal
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedSubmission(null) }}
        submission={submissions.find(s => s.id === selectedSubmission) || null}
        onApproveClick={() => {
          if (selectedSubmission) { setShowApproveDialog(true) }
        }}
        onRejectClick={() => {
          if (selectedSubmission) { setShowRejectDialog(true) }
        }}
      />
    </div>
  )
}
