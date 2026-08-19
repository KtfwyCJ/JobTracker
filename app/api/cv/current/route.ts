import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const cv = readFileSync(join(process.cwd(), 'CV.md'), 'utf-8')
    return Response.json({ cv })
  } catch {
    return Response.json({ error: 'CV.md not found in project root. Please add your CV as CV.md.' }, { status: 500 })
  }
}
