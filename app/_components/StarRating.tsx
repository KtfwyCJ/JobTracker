'use client'

interface StarRatingProps {
  value: number | undefined
  onChange?: (n: number) => void
  readOnly?: boolean
}

export default function StarRating({ value, onChange, readOnly = false }: StarRatingProps) {
  const filled = value ?? 0

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n === filled ? 0 : n)}
          className={`text-base leading-none transition-colors ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${n <= filled ? 'text-amber-400' : 'text-zinc-300'}`}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
