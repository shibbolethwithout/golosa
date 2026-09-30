import { usePlayerStore } from '../store/playerStore'

export default function PlayPage({ play, onBack, onFilter }) {
  const { playPlay, playPart, currentTrack, isPlaying, addPlayToQueue } = usePlayerStore()

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] mb-4"
      >← Назад</button>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Обложка — только если есть */}
        {play.cover && (
          <div className="w-48 h-48 rounded-lg bg-[var(--color-bg-2)] shrink-0 overflow-hidden">
            <img src={play.cover} alt={play.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Метаданные */}
        <div className="flex-1 min-w-0">
          {/* Название */}
          <h1 className="text-3xl font-semibold leading-tight">{play.title}</h1>

          {/* Автор */}
          {play.author && (
            <button
              onClick={() => onFilter({ type: 'author', value: play.author })}
              className="mt-1 block text-[var(--color-fg-1)] hover:text-[var(--color-accent)] transition"
            >{play.author}</button>
          )}

          {/* Кнопки управления — сразу под названием/автором */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => playPlay(play)}
              className="px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-black font-medium hover:bg-[var(--color-accent-dim)] transition shrink-0"
            >▶ Слушать</button>
            <button
              onClick={() => addPlayToQueue(play)}
              className="px-3 py-1.5 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-xs text-[var(--color-fg-1)] transition shrink-0"
            >В очередь</button>
          </div>

          {/* Театр + год */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-2)]">
            {play.theatre && (
              <>
                <button
                  onClick={() => onFilter({ type: 'theatre', value: play.theatre })}
                  className="hover:text-[var(--color-accent)] transition"
                >{play.theatre}</button>
                {play.year && <span>·</span>}
              </>
            )}
            {play.year && (
              <button
                onClick={() => onFilter({ type: 'decade', value: Math.floor(play.year / 10) * 10 })}
                className="hover:text-[var(--color-accent)] transition"
              >{play.year}</button>
            )}
          </div>

          {/* Жанры и теги */}
          <div className="mt-3 flex flex-wrap gap-2">
            {play.genre?.map(g => (
              <button key={g}
                onClick={() => onFilter({ type: 'genre', value: g })}
                className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)] transition"
              >🎭 {g}</button>
            ))}
            {play.tags?.map(t => (
              <button key={t}
                onClick={() => onFilter({ type: 'tag', value: t })}
                className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)] transition"
              ># {t}</button>
            ))}
          </div>

	  {/* Режиссёр(ы) */}
          {play.directors && play.directors.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">
                {play.directors.length > 1 ? 'Режиссёры' : 'Режиссёр'}
              </div>
              <div className="flex flex-wrap gap-2">
                {play.directors.map(d => (
                  <button key={d}
                    onClick={() => onFilter({ type: 'director', value: d })}
                    className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)] transition"
                  >🎬 {d}</button>
                ))}
              </div>
            </div>
          )}

          {/* В ролях */}
          {play.actors && play.actors.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">
                В ролях
              </div>
              <div className="flex flex-wrap gap-2">
                {play.actors.map(a => (
                  <button key={a}
                    onClick={() => onFilter({ type: 'actor', value: a })}
                    className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)] transition"
                  >{a}</button>
                ))}
              </div>
            </div>
          )}

          {/* Описание */}
          {play.description && (
            <p className="mt-4 text-sm text-[var(--color-fg-1)] leading-relaxed">
              {play.description}
            </p>
          )}
        </div>
      </div>

      {/* Список частей */}
      <h2 className="text-lg font-medium mb-3">Части ({play.parts.length})</h2>
      <div className="space-y-1">
        {play.parts.map((part, i) => {
          const isCurrent = currentTrack?.url === part.url
          return (
            <div
              key={part.id}
              onClick={() => playPart(play, i)}
              className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition
                ${isCurrent
                  ? 'bg-[var(--color-bg-2)] text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-bg-1)]'}`}
            >
              <div className="w-6 text-center text-xs text-[var(--color-fg-2)]">
                {isCurrent && isPlaying ? '▶' : i + 1}
              </div>
              <div className="flex-1 text-sm flex items-center gap-2">
                <span>{part.title || `Часть ${i + 1}`}</span>
                {part.isTitr && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-3)] text-[var(--color-fg-2)] uppercase tracking-wide">
                    титр
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
