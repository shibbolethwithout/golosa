import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import FilterChips from './components/FilterChips'
import TrackList from './components/TrackList'
import PlayPage from './components/PlayPage'
import Player from './components/Player'
import Queue from './components/Queue'
import { buildIndex, search, applyFilter } from './lib/search'

export default function App() {
  const [library, setLibrary] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(null)
  const [showQueue, setShowQueue] = useState(false)
  const [currentPlay, setCurrentPlay] = useState(null)

  useEffect(() => {
    fetch('/library.json')
      .then(r => r.json())
      .then(data => { setLibrary(data); buildIndex(data) })
      .catch(() => setLibrary([]))
  }, [])

  // ─── Сброс всех фильтров при выборе нового ───
  const applyNewFilter = (f) => {
    setFilter(f)          // null → сброс
    setQuery('')          // очищаем поиск
    setCurrentPlay(null)  // уходим со страницы спектакля
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

  // ─── Формируем отображаемый список ───
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
