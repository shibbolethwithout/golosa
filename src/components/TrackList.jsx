import { usePlayerStore } from '../store/playerStore'
function partsLabel(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'часть'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'части'
  return 'частей'
}

export default function TrackList({ plays, onOpen }) {
  const { playPlay, addPlayToQueue, currentPlay, isPlaying, togglePlay } = usePlayerStore()

  if (!plays.length) {
    return <div className="py-20 text-center text-[var(--color-fg-2)]">Ничего не найдено</div>
  }

  return (
    <div className="py-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {plays.map(play => {
        const isThisPlaying = currentPlay?.id === play.id

        return (
          <div
            key={play.id}
            className="group rounded-xl bg-[var(--color-bg-1)] hover:bg-[var(--color-bg-2)] p-4 cursor-pointer transition border border-white/5 hover:border-white/10"
            onClick={() => onOpen(play)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[15px] leading-snug line-clamp-2">{play.title}</div>
                <div className="mt-1 text-xs text-[var(--color-fg-2)] truncate">
                  {play.author || 'Автор неизвестен'}
                  {play.year && ` · ${play.year}`}
                </div>
                <div className="mt-2 text-xs text-[var(--color-fg-2)]">
                 {play.partCount} {partsLabel(play.partCount)}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (isThisPlaying) togglePlay()
                  else playPlay(play)
                }}
                className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-accent-dim)] hover:bg-[var(--color-accent)] text-black flex items-center justify-center text-lg transition"
                title={isThisPlaying && isPlaying ? 'Пауза' : 'Слушать'}
              >
                {isThisPlaying && isPlaying ? '⏸' : '▶'}
              </button>
            </div>

            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={(e) => { e.stopPropagation(); addPlayToQueue(play) }}
                className="text-xs px-2 py-1 rounded bg-[var(--color-bg-3)] hover:bg-[var(--color-bg-2)] text-[var(--color-fg-1)]"
              >В очередь</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
