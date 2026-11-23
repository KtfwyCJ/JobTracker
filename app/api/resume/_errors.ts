import {
  BadInputError, FinalizeNotAllowedError, ManualModeError, PlanInvalidError, VersionFrozenError, VersionIdError,
  VersionNotFoundError,
} from '../../_lib/resume/versions'

export type RouteCtx = { params: Promise<{ id: string }> }

export function errorResponse(e: unknown): Response {
  if (e instanceof VersionIdError) return Response.json({ error: e.message }, { status: 400 })
  if (e instanceof VersionNotFoundError) return Response.json({ error: e.message }, { status: 404 })
  if (e instanceof VersionFrozenError) return Response.json({ error: e.message }, { status: 409 })
  if (e instanceof ManualModeError) return Response.json({ error: e.message }, { status: 409 })
  if (e instanceof BadInputError) return Response.json({ error: e.message }, { status: 400 })
  if (e instanceof PlanInvalidError) return Response.json({ error: 'Invalid plan', errors: e.errors }, { status: 422 })
  if (e instanceof FinalizeNotAllowedError)
    return Response.json({ error: e.message, validationErrors: e.validationErrors, pageFill: e.pageFill }, { status: 422 })
  console.error('[resume api]', e)
  return Response.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 })
