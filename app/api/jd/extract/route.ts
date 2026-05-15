export async function POST(request: Request) {
  try {
    const { url } = await request.json() as { url: string }
    if (!url?.trim()) {
      return Response.json({ error: 'URL is required' }, { status: 400 })
    }

    const jinaUrl = `https://r.jina.ai/${url.trim()}`
    const res = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
      },
    })

    if (!res.ok) {
      return Response.json({ error: `Could not fetch URL (${res.status})` }, { status: 502 })
    }

    const text = await res.text()
    const wordCount = text.split(/\s+/).filter(Boolean).length

    return Response.json({ text, wordCount })
  } catch {
    return Response.json({ error: 'Failed to fetch job posting' }, { status: 500 })
  }
}
