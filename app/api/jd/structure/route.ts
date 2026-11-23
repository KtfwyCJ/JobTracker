import { structureJd } from '@/app/_lib/resume/llm'

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as { text: string }
    if (!text?.trim()) {
      return Response.json({ error: 'JD text is required' }, { status: 400 })
    }
    const result = await structureJd(text)
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to structure JD: ${msg}` }, { status: 500 })
  }
}
