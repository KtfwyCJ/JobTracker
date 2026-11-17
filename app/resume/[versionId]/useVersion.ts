'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
// Type-only import: app/_lib/resume/* uses fs/child_process and must never be bundled client-side.
import type { VersionView } from '@/app/_lib/resume/versions'
import type { ProfileId } from '@/app/_lib/resume/types'

const DEBOUNCE_MS = 400

/** Error from an API call, with whatever detail lists the route returned. */
export interface ApiFailure { message: string; details: string[] }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const details: string[] = [...(data.errors ?? []), ...(data.validationErrors ?? [])]
    throw Object.assign(new Error(data.error ?? (details.length ? '请求被拒绝' : `HTTP ${res.status}`)), { details })
  }
  return data as T
}

const toFailure = (e: unknown): ApiFailure => ({
  message: e instanceof Error ? e.message : String(e),
  details: (e as { details?: string[] })?.details ?? [],
})

/**
 * Data/state for the review page.
 * - `accepted` updates locally right away; a PATCH fires DEBOUNCE_MS after the last toggle.
 * - Responses from superseded requests are dropped (request counter).
 * - `renderStamp` bumps after every successful rebuild so the PDF iframe reloads.
 */
export function useVersion(id: string) {
  const [view, setView] = useState<VersionView | null>(null)
  const [accepted, setAccepted] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<ApiFailure | null>(null)
  const [pending, setPending] = useState(false) // toggle debounce scheduled or its PATCH in flight
  const [busy, setBusy] = useState<null | 'regenerate' | 'finalize' | 'duplicate'>(null)
  const [renderStamp, setRenderStamp] = useState(0)

  const acceptedRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqRef = useRef(0)

  const apply = useCallback((v: VersionView) => {
    setView(v)
    setAccepted(v.accepted)
    acceptedRef.current = v.accepted
  }, [])

  /**
   * Re-read the server view after a failed request. Guarded by the request counter: if the user
   * toggled again while this GET was in flight, applying it would revert that newer local change.
   * A failure is appended to the error banner (loadError is only shown before the first load).
   */
  const resync = useCallback(async () => {
    const req = reqRef.current
    try {
      const v = await call<VersionView>(`/api/resume/${id}`)
      if (req === reqRef.current) apply(v)
    } catch (e) {
      const msg = `重新同步失败：${toFailure(e).message}`
      setError((prev) => (prev ? { ...prev, details: [...prev.details, msg] } : { message: msg, details: [] }))
    }
  }, [id, apply])

  useEffect(() => {
    let alive = true
    call<VersionView>(`/api/resume/${id}`)
      .then((v) => { if (alive) apply(v) })
      .catch((e) => { if (alive) setLoadError(toFailure(e).message) })
    return () => {
      alive = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [id, apply])

  const cancelPendingToggle = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    reqRef.current++ // any in-flight accepted PATCH becomes stale
    setPending(false)
  }

  const sendAccepted = useCallback(async () => {
    timerRef.current = null
    const req = reqRef.current
    try {
      const v = await call<VersionView>(`/api/resume/${id}`, {
        method: 'PATCH', body: JSON.stringify({ accepted: acceptedRef.current }),
      })
      if (req !== reqRef.current) return
      apply(v)
      setError(null)
      setRenderStamp((s) => s + 1)
    } catch (e) {
      if (req !== reqRef.current) return
      setError(toFailure(e))
      await resync()
    } finally {
      if (req === reqRef.current) setPending(false)
    }
  }, [id, apply, resync])

  const toggle = (suggestionId: string) => {
    const cur = acceptedRef.current
    const next = cur.includes(suggestionId) ? cur.filter((x) => x !== suggestionId) : [...cur, suggestionId]
    acceptedRef.current = next
    setAccepted(next)
    setPending(true)
    reqRef.current++ // every toggle supersedes earlier requests, even before its own PATCH is sent
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(sendAccepted, DEBOUNCE_MS)
  }

  const regenerate = async (profile: ProfileId) => {
    cancelPendingToggle()
    setBusy('regenerate')
    try {
      apply(await call<VersionView>(`/api/resume/${id}`, {
        method: 'PATCH', body: JSON.stringify({ regenerateProfile: profile }),
      }))
      setError(null)
      setRenderStamp((s) => s + 1)
    } catch (e) {
      setError(toFailure(e))
      await resync()
    } finally {
      setBusy(null)
    }
  }

  const finalize = async () => {
    setBusy('finalize')
    try {
      apply(await call<VersionView>(`/api/resume/${id}/finalize`, { method: 'POST' }))
      setError(null)
    } catch (e) {
      setError(toFailure(e))
      await resync()
    } finally {
      setBusy(null)
    }
  }

  /** Returns the new draft's id, or null on failure. */
  const duplicate = async (): Promise<string | null> => {
    setBusy('duplicate')
    try {
      const r = await call<{ id: string }>(`/api/resume/${id}/duplicate`, { method: 'POST' })
      setError(null)
      return r.id
    } catch (e) {
      setError(toFailure(e))
      return null
    } finally {
      setBusy(null)
    }
  }

  return { view, accepted, loadError, error, pending, busy, renderStamp, toggle, regenerate, finalize, duplicate }
}
