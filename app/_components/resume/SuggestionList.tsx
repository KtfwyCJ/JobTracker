import type { Suggestion } from '@/app/_lib/resume/suggestions'

interface Props {
  suggestions: Suggestion[]
  accepted: string[]
  disabled: boolean
  /** experienceId → company, for group headings */
  companies: Record<string, string>
  /** bulletId → bullet text, to give bold suggestions context */
  bulletText: Record<string, string>
  onToggle: (id: string) => void
  /** Shown above the list when suggestions are locked (manual LaTeX mode). */
  lockedNote?: string
}

function Row({ s, checked, disabled, hint, onToggle }: {
  s: Suggestion; checked: boolean; disabled: boolean; hint?: string; onToggle: (id: string) => void
}) {
  return (
    <label className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-zinc-50'}`}>
      <input
        type="checkbox"
        className="mt-0.5 shrink-0 accent-zinc-900"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(s.id)}
      />
      <span className="min-w-0">
        <span className="text-zinc-800">{s.label}</span>
        {hint && <span className="mt-0.5 block truncate text-[11px] text-zinc-400">{hint}</span>}
      </span>
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export default function SuggestionList({ suggestions, accepted, disabled, companies, bulletText, onToggle, lockedNote }: Props) {
  if (suggestions.length === 0) {
    return <p className="text-xs text-zinc-500">LLM 方案与基础版相同，没有可勾选的建议。</p>
  }

  const isBold = (s: Suggestion) => s.kind === 'bold-add' || s.kind === 'bold-remove'
  const isSkills = (s: Suggestion) => s.kind === 'skills-order' || s.kind === 'skills-groups'
  const bulletLevel = suggestions.filter((s) => !isBold(s) && !isSkills(s))
  const bold = suggestions.filter(isBold)
  const skills = suggestions.filter(isSkills)

  const expIds = [...new Set(bulletLevel.map((s) => s.experienceId ?? ''))]
  const row = (s: Suggestion, hint?: string) => (
    <Row key={s.id} s={s} checked={accepted.includes(s.id)} disabled={disabled} hint={hint} onToggle={onToggle} />
  )

  return (
    <div className="space-y-4">
      {lockedNote && <p className="rounded-md bg-violet-50 px-2 py-1.5 text-xs text-violet-700">{lockedNote}</p>}
      {expIds.map((eid) => (
        <Group key={eid || '_'} title={companies[eid] ?? eid}>
          {bulletLevel.filter((s) => (s.experienceId ?? '') === eid).map((s) => row(s))}
        </Group>
      ))}
      {bold.length > 0 && (
        <Group title="加粗">
          {bold.map((s) => row(s, s.bulletId ? bulletText[s.bulletId] : undefined))}
        </Group>
      )}
      {skills.length > 0 && <Group title="技能">{skills.map((s) => row(s))}</Group>}
    </div>
  )
}
