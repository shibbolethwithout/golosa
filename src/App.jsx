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

  // ─── Загрузка библиотеки + глубокие ссылки ───────────
  useEffect(() => {
    const handleDeepLink = (lib) => {
      const params = new URLSearchParams(window.location.search)
      const playSlug = params.get('play')
      const queue = params.get('queue') === '1'
      const partId = params.get('part')
      const t = parseFloat(params.get('t') || '0')

      if (queue) setShowQueue(true)
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

      // Убираем ?t=&part= — оставляем только ?play= для чистоты
      const clean = new URLSearchParams()
      clean.set('play', playSlug)
      if (queue) clean.set('queue', '1')
      window.history.replaceState(
        { currentPlay: play.slug, showQueue: queue },
        '',
        `?${clean.toString()}`
      )
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

  // ─── Синхронизация URL → состояние (popstate) ─────────
  useEffect(() => {
    const onPopState = () => {
      if (!library.length) return
      const params = new URLSearchParams(window.location.search)
      const playSlug = params.get('play')
      const queue = params.get('queue') === '1'

      if (playSlug) {
        const play = library.find(p => p.slug === playSlug || p.id === playSlug)
        setCurrentPlay(play || null)
      } else {
        setCurrentPlay(null)
      }
      setShowQueue(queue)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [library])

  // ─── Помощник: пушим состояние в историю ──────────────
  const pushState = (play, queue) => {
    const params = new URLSearchParams()
    if (play) params.set('play', play.slug || play.id)
    if (queue) params.set('queue', '1')
    const qs = params.toString()
    const url = qs ? `?${qs}` : window.location.pathname
    window.history.pushState({ currentPlay: play?.slug || null, showQueue: queue }, '', url)
  }

  // ─── Навигация ─────────────────────────────────────────
  const openPlay = (play) => {
    pushState(play, showQueue)
    setCurrentPlay(play)
  }

  const closePlay = () => {
    // Если в истории есть предыдущая запись — идём назад.
    // Если мы попали сюда по прямой ссылке — просто закрываем.
    if (window.history.state === null) {
      window.history.replaceState({}, '', window.location.pathname)
      setCurrentPlay(null)
    } else {
      window.history.back()
    }
  }

  const toggleQueue = () => {
    const next = !showQueue
    pushState(currentPlay, next)
    setShowQueue(next)
  }

  const closeQueue = () => {
    if (window.history.state === null) {
      window.history.replaceState({}, '', window.location.pathname)
      setShowQueue(false)
    } else {
      window.history.back()
    }
  }

  // ─── Фильтры ────────────────────────────────────────────
  const applyNewFilter = (f) => {
    setFilter(f)
    setQuery('')
    // Фильтры не меняют URL — они не «страницы»
    // Но если открыт спектакль — закрываем его
    if (currentPlay) closePlay()
  }

  const clearFilter = () => setFilter(null)

  const goHome = () => {
    setFilter(null)
    setQuery('')
    if (currentPlay || showQueue) {
      // Сбрасываем URL и состояние одним махом
      window.history.replaceState({}, '', window.location.pathname)
      setCurrentPlay(null)
      setShowQueue(false)
    }
  }

  // ─── Формирование списка ────────────────────────────────
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
        <header className="px-6 py-3 text-center border-b border-white/5">
          <button
            onClick={goHome}
            className="text-xs uppercase tracking-[0.35em] text-[var(--color-fg-2)] hover:text-[var(--color-accent)]"
          >
            Радиоспектакли СССР
          </button>
        </header>

        <SearchBar
          value={query}
          onChange={(v) => { setQuery(v); if (currentPlay) closePlay() }}
          onToggleQueue={toggleQueue}
        />

        <FilterChips filter={filter} onClear={clearFilter} />

        <div className="flex-1 overflow-auto px-4 md:px-6 pb-32">
          {currentPlay ? (
            <PlayPage
              play={currentPlay}
              onBack={closePlay}
              onFilter={applyNewFilter}
            />
          ) : (
            <TrackList plays={visible} onOpen={openPlay} />
          )}
        </div>
      </main>

      {showQueue && <Queue onClose={closeQueue} />}
      <Player />
    </div>
  )
}
