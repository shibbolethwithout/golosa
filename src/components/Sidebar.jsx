import { useMemo } from 'react'
import ScrollArea from './ScrollArea'

// Безопасные компараторы — не падают ни на числах, ни на объектах
const byLabelAsc   = (a, b) => String(a[0]).localeCompare(String(b[0]), 'ru')
const byCountDesc  = (a, b) => b[1] - a[1]
const byNumberDesc = (a, b) => Number(b[0]) - Number(a[0])

// Достаём строковое значение из любого представления:
// "Иванов" → "Иванов"; {name: "Иванов"} → "Иванов"; 42 → "42"; null/[] → null
function toStr(v) {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (v && typeof v === 'object' && typeof v.name === 'string') return v.name.trim() || null
  return null
}

// Универсальный обход: массив или одиночное значение
function eachString(v, cb) {
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = toStr(x)
      if (s) cb(s)
    }
  } else {
    const s = toStr(v)
    if (s) cb(s)
  }
}

export default function Sidebar({ library, onFilter, activeFilter, className = '', onHome }) {
  const facets = useMemo(() => {
    const genres = new Map()
    const authors = new Map()
    const directors = new Map()
    const theatres = new Map()
    const decades = new Map()

    const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1)

    for (const play of library || []) {
      eachString(play.genre,     g => bump(genres, g))
      eachString(play.author,    a => bump(authors, a))
      eachString(play.directors, d => bump(directors, d))
      eachString(play.theatre,   t => bump(theatres, t))

      const y = Number(play.year)
      if (Number.isFinite(y) && y > 0) {
        const dec = Math.floor(y / 10) * 10
        bump(decades, dec)
      }
    }

    return {
      genres:    [...genres.entries()].sort(byCountDesc).slice(0, 20),
      authors:   [...authors.entries()].sort(byLabelAsc),
      directors: [...directors.entries()].sort(byLabelAsc),
      theatres:  [...theatres.entries()].sort(byLabelAsc),
      decades:   [...decades.entries()].sort(byNumberDesc),
    }
  }, [library])

  const isActive = (type, value) =>
    activeFilter?.type === type && activeFilter?.value === value

  const Item = ({ type, value, label, count }) => (
    <button
      onClick={() => onFilter(isActive(type, value) ? null : { type, value })}
      className={`w-full grid items-center gap-2 px-3 py-1.5 rounded text-sm transition
        ${isActive(type, value)
          ? 'bg-[var(--color-accent-dim)]/20 text-[var(--color-accent)]'
          : 'hover:bg-[var(--color-bg-2)] text-[var(--color-fg-1)]'}`}
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
      title={label}
    >
      <span className="truncate text-left">{label}</span>
      <span className="text-xs text-[var(--color-fg-2)] tabular-nums">{count}</span>
    </button>
  )

  return (
    <aside className={`w-64 border-r border-white/5 bg-[var(--color-bg-1)] flex flex-col min-h-0 ${className}`}>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          <button
            onClick={onHome}
            className="text-lg font-medium mb-4 text-left hover:text-[var(--color-accent)]! transition"
          >Голоса СССР</button>

          {facets.genres.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">Жанры</h2>
              <div className="space-y-0.5">
                {facets.genres.map(([g, c]) => (
                  <Item key={g} type="genre" value={g} label={g} count={c} />
                ))}
              </div>
            </div>
          )}

          {facets.authors.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">Авторы</h2>
              <div className="space-y-0.5">
                {facets.authors.map(([a, c]) => (
                  <Item key={a} type="author" value={a} label={a} count={c} />
                ))}
              </div>
            </div>
          )}

          {facets.directors.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">Режиссёры</h2>
              <div className="space-y-0.5">
                {facets.directors.map(([d, c]) => (
                  <Item key={d} type="director" value={d} label={d} count={c} />
                ))}
              </div>
            </div>
          )}

          {facets.theatres.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">Театры</h2>
              <div className="space-y-0.5">
                {facets.theatres.map(([t, c]) => (
                  <Item key={t} type="theatre" value={t} label={t} count={c} />
                ))}
              </div>
            </div>
          )}

          {facets.decades.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">Десятилетия</h2>
              <div className="space-y-0.5">
                {facets.decades.map(([d, c]) => (
                  <Item key={d} type="decade" value={d} label={`${d}-е`} count={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
