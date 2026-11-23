import type { DiffRow, DiffSection, SkillsDiff } from '@/app/_lib/resume/suggestions'

interface Props {
  sections: DiffSection[]
  skills: SkillsDiff[]
}

const ROW_STYLE: Record<DiffRow['status'], string> = {
  kept: 'text-zinc-700',
  added: 'bg-green-50 text-green-800',
  removed: 'bg-red-50 text-red-700 line-through',
  moved: 'text-zinc-700',
}

const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

function BulletRow({ row }: { row: DiffRow }) {
  return (
    <li className={`rounded px-2 py-1 ${ROW_STYLE[row.status]}`}>
      <span className="mr-1 text-zinc-400">{row.status === 'added' ? '+' : row.status === 'removed' ? '−' : '·'}</span>
      {row.text}
      {row.status === 'moved' && (
        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 no-underline">↕ moved</span>
      )}
      {(row.boldAdded.length > 0 || row.boldRemoved.length > 0) && (
        <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
          {row.boldAdded.map((t) => (
            <span key={`+${t}`} className="rounded bg-yellow-200 px-1 text-[11px] font-semibold text-zinc-900">{t}</span>
          ))}
          {row.boldRemoved.map((t) => (
            <span key={`-${t}`} className="rounded bg-zinc-100 px-1 text-[11px] font-semibold text-zinc-500 line-through">{t}</span>
          ))}
        </span>
      )}
    </li>
  )
}

export default function ResumeDiff({ sections, skills }: Props) {
  const changedSkills = skills.filter((g) => !sameArr(g.before, g.after))
  return (
    <div className="space-y-4 text-xs">
      {sections.map((sec) => (
        <div key={sec.experienceId}>
          <h4 className="mb-1 font-semibold text-zinc-800">{sec.company}</h4>
          <ul className="space-y-0.5">
            {sec.rows.map((r) => <BulletRow key={r.bulletId} row={r} />)}
          </ul>
        </div>
      ))}
      <div>
        <h4 className="mb-1 font-semibold text-zinc-800">技能</h4>
        <ul className="space-y-1">
          {skills.map((g, i) => {
            const changed = changedSkills.includes(g)
            return (
              <li key={g.groupId} className="px-2">
                <span className="font-medium text-zinc-600">{i + 1}. {g.label}</span>
                {changed ? (
                  <span className="ml-2">
                    <span className="text-zinc-400 line-through">{g.before.join(', ')}</span>
                    <span className="mx-1 text-zinc-400">→</span>
                    <span className="bg-green-50 text-green-800">{g.after.join(', ')}</span>
                  </span>
                ) : (
                  <span className="ml-2 text-zinc-500">{g.after.join(', ')}</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
