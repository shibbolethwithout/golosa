const LABELS = {
  author: 'Автор',
  actor: 'Актёр',
  genre: 'Жанр',
  tag: 'Тег',
  theatre: 'Театр',
  decade: 'Годы',
}

export default function FilterChips({ filter, onClear }) {
  if (!filter) return null

  const label = LABELS[filter.type] || filter.type
  const value = filter.type === 'decade' ? `${filter.value}-е` : filter.value

  return (
    <div className="flex items-center gap-2 px-4 md:px-6 pt-3 pb-1">
      <span className="text-xs text-[var(--color-fg-2)]">Фильтр:</span>
      <button
        onClick={onClear}
        className="group flex items-center gap-2 px-3 py-1 rounded-full
                   bg-[var(--color-accent-dim)]/20 text-[var(--color-accent)]
                   hover:bg-[var(--color-accent-dim)]/30 transition text-sm"
        title="Снять фильтр"
      >
        <span className="text-[var(--color-fg-2)]">{label}:</span>
        <span>{value}</span>
        <span className="opacity-60 group-hover:opacity-100 transition">✕</span>
      </button>
    </div>
  )
}
