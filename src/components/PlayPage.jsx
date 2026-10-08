import { usePlayerStore } from '../store/playerStore'

function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="7 4 20 12 7 20" />
    </svg>
  )
}

function PauseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="4" width="3.5" height="16" rx="0.5" />
      <rect x="14" y="4" width="3.5" height="16" rx="0.5" />
    </svg>
  )
}

export default function PlayPage({ play, onBack, onFilter }) {
  const {
    playPlay, playPart, currentTrack, currentPlay, isPlaying,
    addPlayToQueue, togglePlay,
  } = usePlayerStore()

  const isThisPlaying = currentPlay?.id === play.id || currentTrack?.playId === play.id

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="text-sm text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] mb-4"
      >← Назад</button>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {play.cover && (
          <div className="w-48 h-48 rounded-lg bg-[var(--color-bg-2)] shrink-0 overflow-hidden">
            <img src={play.cover} alt={play.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-semibold leading-tight">{play.title}</h1>

          {play.author && (
            <button
              onClick={() => onFilter({ type: 'author', value: play.author })}
              className="mt-1 block text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
            >{play.author}</button>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => isThisPlaying ? togglePlay() : playPlay(play)}
              className="px-5 py-2.5 rounded-full
                         bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]
                         text-white font-medium
                         flex items-center gap-2 shrink-0"
              aria-label={isThisPlaying && isPlaying ? 'Пауза' : 'Слушать'}
            >
              {isThisPlaying && isPlaying ? (
                <>
                  <PauseIcon size={18} />
                  <span>Играет</span>
                </>
              ) : (
                <>
                  <PlayIcon size={18} />
                  <span>Слушать</span>
                </>
              )}
            </button>

            <button
              onClick={() => addPlayToQueue(play)}
              className="px-3 py-1.5 rounded-full
                         bg-[var(--color-bg-2)] hover:bg-[var(--color-accent-dim)] hover:text-white
                         text-xs text-[var(--color-fg-1)] shrink-0"
            >В очередь</button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-2)]">
            {play.theatre && (
              <>
                <button
                  onClick={() => onFilter({ type: 'theatre', value: play.theatre })}
                  className="hover:text-[var(--color-accent)]"
                >{play.theatre}</button>
                {play.year && <span>·</span>}
              </>
            )}
            {play.year && (
              <button
                onClick={() => onFilter({ type: 'decade', value: Math.floor(play.year / 10) * 10 })}
                className="hover:text-[var(--color-accent)]"
              >{play.year}</button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {play.genre?.map(g => (
              <button key={g}
                onClick={() => onFilter({ type: 'genre', value: g })}
                className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
              >🎭 {g}</button>
            ))}
            {play.tags?.map(t => (
              <button key={t}
                onClick={() => onFilter({ type: 'tag', value: t })}
                className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
              ># {t}</button>
            ))}
          </div>

          {play.directors && play.directors.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">
                {play.directors.length > 1 ? 'Режиссёры' : 'Режиссёр'}
              </div>
              <div className="flex flex-wrap gap-2">
                {play.directors.map(d => (
                  <button key={d}
                    onClick={() => onFilter({ type: 'director', value: d })}
                    className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
                  >🎬 {d}</button>
                ))}
              </div>
            </div>
          )}

          {play.actors && play.actors.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase text-[var(--color-fg-2)] mb-2 tracking-wide">
                В ролях
              </div>
              <div className="flex flex-wrap gap-2">
                {play.actors.map(a => (
                  <button key={a}
                    onClick={() => onFilter({ type: 'actor', value: a })}
                    className="px-3 py-1 rounded-full bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-3)] text-sm text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
                  >{a}</button>
                ))}
              </div>
            </div>
          )}

          {play.description && (
            <p className="mt-4 text-sm text-[var(--color-fg-1)] leading-relaxed">
              {play.description}
            </p>
          )}
        </div>
      </div>

      <h2 className="text-lg font-medium mb-3">Части ({play.parts.length})</h2>
      <div className="space-y-1">
        {play.parts.map((part, i) => {
          const isCurrent = currentTrack?.url === part.url
          return (
            <div
	      key={part.id}
	      onClick={() => isCurrent ? togglePlay() : playPart(play, i)}
	      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer
	        ${isCurrent
	          ? 'bg-[var(--color-bg-2)] text-[var(--color-accent)]'
	         : 'hover:bg-[var(--color-bg-1)]'}`}
	   >
	     <div className="w-6 text-center text-xs text-[var(--color-fg-2)]">
	       {isCurrent && isPlaying
	         ? <PauseIcon size={12} />
	          : isCurrent
	  	    ? <PlayIcon size={12} />
	 	    : i + 1}
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
