import fs from 'node:fs'
import path from 'node:path'
import { versionDir, VersionNotFoundError } from '../../../../_lib/resume/versions'
import { errorResponse, type RouteCtx } from '../../_errors'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    const file = path.join(versionDir(id), 'cv.pdf')
    if (!fs.existsSync(file)) throw new VersionNotFoundError(`No PDF for version ${id}`)
    return new Response(new Uint8Array(fs.readFileSync(file)), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
