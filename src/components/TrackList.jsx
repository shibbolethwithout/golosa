import { usePlayerStore } from '../store/playerStore'

function partsLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'часть'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'части'
  return 'частей'
}

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="7 4 20 12 7 20" />
    </svg>
  )
}

function PauseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="4" width="3.5" height="16" rx="0.5" />
      <rect x="14" y="4" width="3.5" height="16" rx="0.5" />
    </svg>
  )
}

export default function TrackList({ plays, onOpen }) {
  const { playPlay, currentPlay, currentTrack, isPlaying, togglePlay } = usePlayerStore()

  if (!plays.length) {
    return <div className="py-20 text-center text-[var(--color-fg-2)]">Ничего не найдено</div>
  }

  return (
    <div className="py-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {plays.map(play => {
        const isThisPlaying =
          currentPlay?.id === play.id ||
          currentTrack?.playId === play.id

        const metaParts = []
        if (play.author) metaParts.push(play.author)
        if (play.year) metaParts.push(play.year)
        metaParts.push(`${play.partCount} ${partsLabel(play.partCount)}`)
        const metaLine = metaParts.join(' · ')

        return (
          <div
            key={play.id}
            className="group rounded-xl bg-[var(--color-bg-1)] hover:bg-[var(--color-bg-2)] p-4
                       cursor-pointer transition border border-white/5 hover:border-white/10"
            onClick={() => onOpen(play)}
          >
            <div className="flex items-start justify-between gap-3">
              {play.cover && (
                <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-2)] shrink-0 overflow-hidden">
                  <img src={play.cover} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] leading-snug line-clamp-2">
                  {play.title}
                </div>
                <div className="mt-1 text-xs text-[var(--color-fg-2)] truncate leading-tight">
                  {metaLine}
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
                {isThisPlaying && isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
              </button>
            </div>

            <div className="-mt-1.0 h-[3.75rem] overflow-hidden">
              {play.description && (
                <div className="text-xs text-[var(--color-fg-2)] italic line-clamp-5 leading-3">
                  «{play.description}»
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
