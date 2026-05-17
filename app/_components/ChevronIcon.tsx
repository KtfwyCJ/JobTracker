interface ChevronIconProps {
  open: boolean
  size?: number
}

export default function ChevronIcon({ open, size = 12 }: ChevronIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={`shrink-0 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
