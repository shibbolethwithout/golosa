export default function SearchBar({ value, onChange, onToggleQueue }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Поиск по названию, автору, жанру…"
          className="w-full bg-[var(--color-bg-2)] rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent-dim)] placeholder:text-[var(--color-fg-2)]"
        />
      </div>
      <button
        onClick={onToggleQueue}
        className="px-3 py-2.5 rounded-lg bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm transition"
      >
        Очередь
      </button>
    </div>
  )
}
