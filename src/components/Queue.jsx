import { usePlayerStore } from '../store/playerStore'

export default function Queue({ onClose }) {
  const { queue, currentTrack, removeFromQueue, moveInQueue, playPart, clearQueue } = usePlayerStore()

  return (
    <aside className="w-80 border-l border-white/5 bg-[var(--color-bg-1)] flex flex-col">
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

      <div className="flex-1 overflow-auto p-2">
        {queue.length === 0 && (
          <div className="text-center py-8 text-sm text-[var(--color-fg-2)]">
            Очередь пуста
          </div>
        )}

        {queue.map((track, i) => {
          const isCurrent = currentTrack?.id === track.id
          const isFirst = i === 0
          const isLast = i === queue.length - 1

          return (
            <div
              key={`${track.id}-${i}`}
              className={`flex items-center gap-1 px-2 py-2 rounded cursor-pointer text-sm transition
                ${isCurrent
                  ? 'bg-[var(--color-bg-2)] text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-bg-2)]'}`}
              onClick={() => playPart(null, null, track)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (!isFirst) moveInQueue(i, i - 1) }}
                disabled={isFirst}
                className={`shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs transition
                  ${isFirst ? 'opacity-20 cursor-default' : 'text-[var(--color-fg-2)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-3)]'}`}
                title="Вверх"
              >↑</button>

              <button
                onClick={(e) => { e.stopPropagation(); if (!isLast) moveInQueue(i, i + 1) }}
                disabled={isLast}
                className={`shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs transition
                  ${isLast ? 'opacity-20 cursor-default' : 'text-[var(--color-fg-2)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-3)]'}`}
                title="Вниз"
              >↓</button>

              <span className="flex-1 truncate pl-1">{track.title}</span>

              <button
                onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs
                  text-[var(--color-fg-2)] hover:text-red-400 hover:bg-[var(--color-bg-3)] transition"
                title="Убрать"
              >✕</button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
