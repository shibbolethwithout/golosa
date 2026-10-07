function HamburgerIcon({ size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function SearchBar({ value, onChange, onToggleSidebar }) {
  return (
    <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 border-b border-white/5">
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Поиск по названию, автору, жанру…"
          className="w-full bg-[var(--color-bg-2)] rounded-lg px-4 py-2.5 text-sm outline-none
                     focus:ring-2 focus:ring-[var(--color-accent-dim)]
                     placeholder:text-[var(--color-fg-2)]"
        />
      </div>

      <button
        onClick={onToggleSidebar}
        className="md:hidden shrink-0 w-10 h-10 rounded-lg bg-[var(--color-bg-2)]
                   hover:bg-[var(--color-accent-dim)] hover:text-white
                   text-[var(--color-fg-1)] flex items-center justify-center"
        title="Меню"
        aria-label="Меню"
      >
        <HamburgerIcon size={18} />
      </button>
    </div>
  )
}
