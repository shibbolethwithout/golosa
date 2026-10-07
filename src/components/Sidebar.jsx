import { useMemo } from 'react'
import ScrollArea from './ScrollArea'

export default function Sidebar({ library, onFilter, activeFilter, className = '', onHome }) {
  const facets = useMemo(() => {
    const genres = new Map()
    const authors = new Map()
    const directors = new Map()
    const theatres = new Map()
    const decades = new Map()

    for (const play of library) {
      for (const g of play.genre || []) genres.set(g, (genres.get(g) || 0) + 1)
      if (play.author) authors.set(play.author, (authors.get(play.author) || 0) + 1)
      for (const d of play.directors || []) directors.set(d, (directors.get(d) || 0) + 1)
      if (play.theatre) theatres.set(play.theatre, (theatres.get(play.theatre) || 0) + 1)
      if (play.year) {
        const dec = Math.floor(play.year / 10) * 10
        decades.set(dec, (decades.get(dec) || 0) + 1)
      }
    }

    return {
      genres: [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
      authors: [...authors.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')),
      directors: [...directors.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')),
      theatres: [...theatres.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')),
      decades: [...decades.entries()].sort((a, b) => b[0] - a[0]),
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
    <aside className={`w-64 border-r border-white/5 bg-[var(--color-bg-1)] ${className}`}>
      <ScrollArea className="h-full">
        <div className="p-4">
          <button
            onClick={onHome}
            className="text-lg font-medium mb-4 text-left hover:text-[var(--color-accent)] transition"
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
