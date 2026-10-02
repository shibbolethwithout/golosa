import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import FilterChips from './components/FilterChips'
import TrackList from './components/TrackList'
import PlayPage from './components/PlayPage'
import Player from './components/Player'
import Queue from './components/Queue'
import { buildIndex, search, applyFilter } from './lib/search'
import { usePlayerStore } from './store/playerStore'

export default function App() {
  const [library, setLibrary] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(null)
  const [showQueue, setShowQueue] = useState(false)
  const [currentPlay, setCurrentPlay] = useState(null)

  // ─── Загрузка библиотеки + обработка deep link ───────────
  useEffect(() => {
    const handleDeepLink = (lib) => {
      const params = new URLSearchParams(window.location.search)
      const playSlug = params.get('play')
      const partId = params.get('part')
      const t = parseFloat(params.get('t') || '0')

      if (!playSlug) return

      const play = lib.find(p => p.slug === playSlug || p.id === playSlug)
      if (!play) return

      setCurrentPlay(play)

      const { playPart } = usePlayerStore.getState()
      const partIdx = partId ? play.parts.findIndex(p => p.id === partId) : 0
      const idx = partIdx >= 0 ? partIdx : 0

      playPart(play, idx)

      if (t > 0) {
        const targetPart = play.parts[idx]
        setTimeout(() => {
          const { saveProgress } = usePlayerStore.getState()
          saveProgress(targetPart.url, t)
        }, 100)
      }

      // Убираем query-параметры, чтобы при перезагрузке не открывалось заново
      window.history.replaceState({}, '', window.location.pathname)
    }

    fetch('/library.json')
      .then(r => r.json())
      .then(data => {
        setLibrary(data)
        buildIndex(data)
        handleDeepLink(data)
      })
      .catch(() => setLibrary([]))
  }, [])

  // ─── Действия с фильтрами ────────────────────────────────
  const applyNewFilter = (f) => {
    setFilter(f)          // null → сброс
    setQuery('')
    setCurrentPlay(null)
  }

  const clearFilter = () => {
    setFilter(null)
  }

  const goHome = () => {
    setFilter(null)
    setQuery('')
    setCurrentPlay(null)
  }

  const openPlay = (play) => {
    setCurrentPlay(play)
  }

  // ─── Формирование отображаемого списка ───────────────────
  let visible = library
  if (query) {
    const found = search(query)
    if (found) visible = found
  }
  if (filter) {
    visible = applyFilter(visible, filter)
  }

  return (
    <div className="flex h-full">
      <Sidebar
        className="hidden md:flex"
        library={library}
        onFilter={applyNewFilter}
        activeFilter={filter}
        onHome={goHome}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Шапка */}
        <header className="px-6 py-3 text-center border-b border-white/5">
          <button
            onClick={goHome}
            className="text-xs uppercase tracking-[0.35em] text-[var(--color-fg-2)] hover:text-[var(--color-accent)] transition"
          >
            Радиоспектакли СССР
          </button>
        </header>

        <SearchBar
          value={query}
          onChange={(v) => { setQuery(v); setCurrentPlay(null) }}
          onToggleQueue={() => setShowQueue(s => !s)}
        />

        <FilterChips filter={filter} onClear={clearFilter} />

        <div className="flex-1 overflow-auto px-4 md:px-6 pb-32">
          {currentPlay ? (
            <PlayPage
              play={currentPlay}
              onBack={() => setCurrentPlay(null)}
              onFilter={applyNewFilter}
            />
          ) : (
            <TrackList plays={visible} onOpen={openPlay} />
          )}
        </div>
      </main>

      {showQueue && <Queue onClose={() => setShowQueue(false)} />}
      <Player />
    </div>
  )
}
