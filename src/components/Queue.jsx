import { usePlayerStore } from '../store/playerStore'
import ScrollArea from './ScrollArea'

export default function Queue({ onClose }) {
  const { queue, currentTrack, removeFromQueue, playPart, clearQueue } = usePlayerStore()

  return (
    <aside className="
      fixed inset-y-0 right-0 z-40 w-full
      md:relative md:inset-auto md:w-80 md:z-auto
      border-l border-white/5 bg-[var(--color-bg-1)] flex flex-col
    ">
      <div className="grid grid-cols-3 items-center px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-medium justify-self-start">Очередь ({queue.length})</h2>

        {queue.length > 0 ? (
          <button
            onClick={clearQueue}
            className="text-xs text-[var(--color-fg-2)] hover:text-red-400 transition justify-self-center"
          >очистить</button>
        ) : (
          <span />
        )}

        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 rounded flex items-center justify-center text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] hover:bg-[var(--color-bg-2)] transition justify-self-end"
          title="Закрыть очередь"
        >✕</button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {queue.length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--color-fg-2)]">
              Очередь пуста
            </div>
          )}

          {queue.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id
            return (
              <div
                key={`${track.id}-${i}`}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition
                  ${isCurrent
                    ? 'bg-[var(--color-bg-2)] text-[var(--color-accent)]'
                    : 'hover:bg-[var(--color-bg-2)]'}`}
                onClick={() => playPart(null, null, track)}
              >
                <span className="flex-1 truncate">{track.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs
                    text-[var(--color-fg-2)] hover:text-red-400 hover:bg-[var(--color-bg-3)] transition"
                  title="Убрать"
                >✕</button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}
