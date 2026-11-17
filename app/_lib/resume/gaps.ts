import { buildFullPlan } from './base'
import { termMatches } from './coverage'
import { renderPlainText } from './render'
import type { Evidence, JdAnalysis, Plan } from './types'

/** Kept out of coverage.ts: render.ts imports coverage.ts, so importing render there would be circular. */
export function evidenceGaps(jd: JdAnalysis, ev: Evidence, plan: Plan): { missingFromEvidence: string[]; availableNotSelected: string[] } {
  const seen = new Set<string>()
  const terms = [...jd.keywords, ...jd.mustHave.flatMap(r => r.keywords), ...jd.plus.flatMap(r => r.keywords)].filter(k => {
    const lc = k.toLowerCase()
    if (!k || seen.has(lc)) return false
    seen.add(lc)
    return true
  })
  const full = renderPlainText(ev, buildFullPlan(ev, plan.profile))
  const chosen = renderPlainText(ev, plan)
  const missingFromEvidence: string[] = []
  const availableNotSelected: string[] = []
  for (const t of terms) {
    if (!termMatches(full, t, ev.aliases)) missingFromEvidence.push(t)
    else if (!termMatches(chosen, t, ev.aliases)) availableNotSelected.push(t)
  }
  return { missingFromEvidence, availableNotSelected }
}
