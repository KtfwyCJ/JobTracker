interface Props {
  missingFromEvidence: string[]
  availableNotSelected: string[]
}

function Chips({ items, className }: { items: string[]; className: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span key={t} className={`rounded px-1.5 py-0.5 text-[11px] ${className}`}>{t}</span>
      ))}
    </div>
  )
}

export default function GapList({ missingFromEvidence, availableNotSelected }: Props) {
  if (missingFromEvidence.length === 0 && availableNotSelected.length === 0) {
    return <p className="text-xs text-zinc-500">没有证据缺口。</p>
  }
  return (
    <div className="space-y-3 text-xs">
      {missingFromEvidence.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-zinc-700">
            证据库中没有 <span className="font-normal text-zinc-400">— 如属实请补进 evidence/cv.yaml</span>
          </p>
          <Chips items={missingFromEvidence} className="bg-red-50 text-red-700" />
        </div>
      )}
      {availableNotSelected.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-zinc-700">可用但未选</p>
          <Chips items={availableNotSelected} className="bg-amber-50 text-amber-700" />
        </div>
      )}
    </div>
  )
}
