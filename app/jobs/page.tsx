"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { MapPin, Briefcase, Mail, ExternalLink } from "lucide-react"

interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  imageUrl?: string
  applyEmail?: string
  applyUrl?: string
  postedDate: string
  status: string
}

const ITEMS_PER_PAGE = 5

function JobsContent() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.append("title", searchQuery)
        if (locationFilter) params.append("location", locationFilter)

        const response = await fetch(`/api/jobs?${params}`)
        const result = await response.json()
        // Handle both old format (array) and new format (object with data/count)
        const jobsData = Array.isArray(result) ? result : (result.data || [])
        setJobs(jobsData)
        setCurrentPage(1)
      } catch (error) {
        console.error("Failed to fetch jobs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [searchQuery, locationFilter])

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedJobs = jobs.slice(startIndex, endIndex)
  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-lg opacity-90">Find your next career opportunity</p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Job Title</label>
              <input
                type="text"
                placeholder="Search by job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Location</label>
              <input
                type="text"
                placeholder="Search by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg h-40 animate-pulse" />
            ))}
          </div>
        ) : paginatedJobs.length > 0 ? (
          <>
            <div className="space-y-4">
              {paginatedJobs.map((job) => (
                <div key={job.id} className="bg-card rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {job.imageUrl && (
                      <div className="w-32 h-32 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.imageUrl}
                          alt={job.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                      <p className="text-muted-foreground font-semibold mb-3">{job.company}</p>
                      <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase size={16} />
                          Posted {new Date(job.postedDate).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm line-clamp-2">{job.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-shrink-0">
                      {job.applyEmail && (
                        <a href={`mailto:${job.applyEmail}`}>
                          <Button className="w-full md:w-auto" size="sm">
                            <Mail size={16} className="mr-2" />
                            Apply via Email
                          </Button>
                        </a>
                      )}
                      {job.applyUrl && (
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="w-full md:w-auto bg-transparent" size="sm">
                            <ExternalLink size={16} className="mr-2" />
                            Apply Online
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      size="sm"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No jobs found. Try adjusting your search.</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsContent />
    </Suspense>
  )
}
