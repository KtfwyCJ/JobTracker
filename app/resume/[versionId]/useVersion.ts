'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
// Type-only import: app/_lib/resume/* uses fs/child_process and must never be bundled client-side.
import type { VersionView } from '@/app/_lib/resume/versions'
import type { ProfileId } from '@/app/_lib/resume/types'

const DEBOUNCE_MS = 400
const TEX_DEBOUNCE_MS = 1500

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
 * - Manual LaTeX: `texDraft` is the editor's content. Save responses never write back into it (that would
 *   eat keystrokes typed while the compile ran); it is only reset on load, startManual and discardManual.
 */
export function useVersion(id: string) {
  const [view, setView] = useState<VersionView | null>(null)
  const [accepted, setAccepted] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<ApiFailure | null>(null)
  const [pending, setPending] = useState(false) // toggle debounce scheduled or its PATCH in flight
  const [busy, setBusy] = useState<null | 'regenerate' | 'finalize' | 'duplicate' | 'manual'>(null)
  const [renderStamp, setRenderStamp] = useState(0)
  const [texDraft, setTexDraftState] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const acceptedRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqRef = useRef(0)
  const texRef = useRef('')
  const texTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const apply = useCallback((v: VersionView) => {
    setView(v)
    setAccepted(v.accepted)
    acceptedRef.current = v.accepted
  }, [])

  const syncTex = useCallback((v: VersionView) => {
    texRef.current = v.tex
    setTexDraftState(v.tex)
    setDirty(false)
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
      .then((v) => { if (alive) { apply(v); syncTex(v) } })
      .catch((e) => { if (alive) setLoadError(toFailure(e).message) })
    return () => {
      alive = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (texTimerRef.current) clearTimeout(texTimerRef.current)
    }
  }, [id, apply, syncTex])

  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

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

  /** Returns the new draft's id (whether its plan was regenerated / manual edits dropped), or null on failure. */
  const duplicate = async (): Promise<{ id: string; regenerated: boolean; manualDropped: boolean } | null> => {
    setBusy('duplicate')
    try {
      const r = await call<{ id: string; regenerated?: boolean; manualDropped?: boolean }>(`/api/resume/${id}/duplicate`, { method: 'POST' })
      setError(null)
      return { id: r.id, regenerated: !!r.regenerated, manualDropped: !!r.manualDropped }
    } catch (e) {
      setError(toFailure(e))
      return null
    } finally {
      setBusy(null)
    }
  }

  /** Save the current draft and compile it. Stale responses (the user typed again meanwhile) are dropped. */
  const saveTex = useCallback(async () => {
    if (texTimerRef.current) clearTimeout(texTimerRef.current)
    texTimerRef.current = null
    const req = reqRef.current
    const sent = texRef.current
    setSaving(true)
    try {
      const v = await call<VersionView>(`/api/resume/${id}`, {
        method: 'PATCH', body: JSON.stringify({ manualTex: sent }),
      })
      if (req !== reqRef.current) return
      apply(v)
      setError(null)
      setRenderStamp((s) => s + 1)
      if (sent === texRef.current) setDirty(false)
    } catch (e) {
      // No resync here: it would replace the draft with the server copy. The draft stays dirty.
      if (req === reqRef.current) setError(toFailure(e))
    } finally {
      if (req === reqRef.current) setSaving(false)
    }
  }, [id, apply])

  const setTexDraft = (s: string) => {
    texRef.current = s
    setTexDraftState(s)
    setDirty(true)
    reqRef.current++
    if (texTimerRef.current) clearTimeout(texTimerRef.current)
    texTimerRef.current = setTimeout(() => void saveTex(), TEX_DEBOUNCE_MS)
  }

  const saveNow = () => saveTex()

  const switchManual = async (manualTex: string | null) => {
    if (texTimerRef.current) clearTimeout(texTimerRef.current)
    texTimerRef.current = null
    reqRef.current++
    setSaving(false)
    setBusy('manual')
    try {
      const v = await call<VersionView>(`/api/resume/${id}`, { method: 'PATCH', body: JSON.stringify({ manualTex }) })
      apply(v)
      syncTex(v)
      setError(null)
      setRenderStamp((s) => s + 1)
    } catch (e) {
      setError(toFailure(e))
      await resync()
    } finally {
      setBusy(null)
    }
  }

  const startManual = () => switchManual(view?.generatedTex ?? '')
  const discardManual = () => switchManual(null)

  return {
    view, accepted, loadError, error, pending, busy, renderStamp, toggle, regenerate, finalize, duplicate,
    texDraft, setTexDraft, dirty, saving, startManual, saveNow, discardManual,
  }
}
