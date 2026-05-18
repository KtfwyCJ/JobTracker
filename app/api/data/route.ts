import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppData } from '../../_lib/types'

const DATA_FILE = join(process.cwd(), 'data.json')

const DEFAULT: AppData = {
  companies: [],
  jobs: [],
  timelineEvents: [],
  interviews: [],
  waitlist: [],
}

export async function GET() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return Response.json(JSON.parse(raw))
  } catch {
    return Response.json(DEFAULT)
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8')
    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to write data.json: ${msg}` }, { status: 500 })
  }
}
