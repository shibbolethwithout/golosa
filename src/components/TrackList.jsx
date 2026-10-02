import { usePlayerStore } from '../store/playerStore'

function partsLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'часть'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'части'
  return 'частей'
}

function PlayIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 21 12 5 21" />
    </svg>
  );
}

function PauseIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="4" width="3.5" height="16" rx="0.5" />
      <rect x="14" y="4" width="3.5" height="16" rx="0.5" />
    </svg>
  )
}

export default function TrackList({ plays, onOpen }) {
  const { playPlay, addPlayToQueue, currentPlay, currentTrack, isPlaying, togglePlay } = usePlayerStore()

  if (!plays.length) {
    return <div className="py-20 text-center text-[var(--color-fg-2)]">Ничего не найдено</div>
  }

  return (
    <div className="py-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {plays.map(play => {
        const isThisPlaying =
          currentPlay?.id === play.id ||
          currentTrack?.playId === play.id

        return (
          <div
            key={play.id}
            className="group rounded-xl bg-[var(--color-bg-1)] hover:bg-[var(--color-bg-2)] p-4 cursor-pointer border border-white/5 hover:border-white/10"
            onClick={() => onOpen(play)}
          >
            <div className="flex items-start gap-3">
              {play.cover && (
                <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-2)] shrink-0 overflow-hidden">
                  <img src={play.cover} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] leading-snug line-clamp-2">{play.title}</div>
                <div className="mt-1 text-xs text-[var(--color-fg-2)] truncate">
                  {play.author || 'Автор неизвестен'}
                  {play.year && ` · ${play.year}`}
                </div>
                <div className="mt-1 text-xs text-[var(--color-fg-2)]">
                  {play.partCount} {partsLabel(play.partCount)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (isThisPlaying) togglePlay()
                  else playPlay(play)
                }}
                className="shrink-0 w-10 h-10 rounded-full
                           bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)]
                           text-white flex items-center justify-center"
                title={isThisPlaying && isPlaying ? 'Пауза' : 'Слушать'}
                aria-label={isThisPlaying && isPlaying ? 'Пауза' : 'Слушать'}
              >
                {isThisPlaying && isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
            </div>

            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); addPlayToQueue(play) }}
                className="text-xs px-2.5 py-1 rounded
                           bg-[var(--color-bg-3)] hover:bg-[var(--color-accent-dim)] hover:text-white
                           text-[var(--color-fg-1)]"
              >В очередь</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
