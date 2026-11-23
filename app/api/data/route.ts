import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { isDestructiveWrite } from '../../_lib/dataGuard'
import { join } from 'path'

const DATA_FILE = join(process.cwd(), 'data.json')

export async function GET() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return Response.json(JSON.parse(raw))
  } catch {
    // File doesn't exist yet — 404 so the client keeps localStorage data
    return new Response(null, { status: 404 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    let existing: unknown = null
    try { existing = JSON.parse(readFileSync(DATA_FILE, 'utf-8')) } catch { /* first run */ }
    if (isDestructiveWrite(existing, data)) {
      console.error('[data] refused a write that would drop most jobs from data.json')
      return Response.json({ error: 'Refused: this write would delete most saved jobs. data.json was not changed.' }, { status: 409 })
    }
    // Keep the previous version next to the file as a one-step undo.
    if (existing !== null) copyFileSync(DATA_FILE, DATA_FILE + '.bak')
    writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8')
    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to write data.json: ${msg}` }, { status: 500 })
  }
}
