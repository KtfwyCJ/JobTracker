import { fetchArbeitnow, fetchLinkedIn } from '../../../_lib/jobSearch'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keywords?: string[]
      location?: string
      company?: string
    }

    const { keywords, location, company } = body

    if (!keywords?.length || !location?.trim()) {
      return Response.json({ error: 'keywords and location are required' }, { status: 400 })
    }

    const [arbeitnowJobs, linkedInJobs] = await Promise.all([
      fetchArbeitnow(keywords),
      fetchLinkedIn(keywords, location.trim()),
    ])

    let jobs = [...arbeitnowJobs, ...linkedInJobs]

    // Keep only jobs whose title contains at least one keyword
    const keywordPatterns = keywords.map((k) => k.toLowerCase())
    jobs = jobs.filter((j) =>
      keywordPatterns.some((k) => j.title.toLowerCase().includes(k))
    )

    // Filter by location — match any word from the input against the job's location
    const locationWords = location.trim().toLowerCase().split(/[\s,]+/).filter(Boolean)
    jobs = jobs.filter((j) => {
      const jobLoc = j.location.toLowerCase()
      return locationWords.some((w) => jobLoc.includes(w))
    })

    // Filter by company if provided
    if (company?.trim()) {
      const needle = company.trim().toLowerCase()
      jobs = jobs.filter((j) => j.company.toLowerCase().includes(needle))
    }

    // Deduplicate by title + company
    const seen = new Set<string>()
    jobs = jobs.filter((j) => {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return Response.json({ results: jobs })
  } catch (err) {
    console.error('[explore/search]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
