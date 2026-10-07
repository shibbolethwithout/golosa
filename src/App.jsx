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
import ScrollArea from './components/ScrollArea'

export default function App() {
  const [library, setLibrary] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(null)
  const [showQueue, setShowQueue] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [currentPlay, setCurrentPlay] = useState(null)

  useEffect(() => {
    const handleDeepLink = (lib) => {
      const params = new URLSearchParams(window.location.search)
      const playSlug = params.get('play')
      const queue = params.get('queue') === '1'
      const partId = params.get('part')
      const t = parseFloat(params.get('t') || '0')

      const play = playSlug
        ? lib.find(p => p.slug === playSlug || p.id === playSlug)
        : null

      const isExternal = play && !window.history.state?.__app

      if (isExternal) {
        window.history.replaceState({ __app: true }, '', '/')
        const qs = new URLSearchParams()
        qs.set('play', playSlug)
        if (queue) qs.set('queue', '1')
        window.history.pushState(
          { __app: true, currentPlay: playSlug, showQueue: queue },
          '',
          `?${qs.toString()}`
        )
      } else if (!play && playSlug) {
        window.history.replaceState({ __app: true }, '', '/')
      } else {
        const st = window.history.state || {}
        window.history.replaceState({ ...st, __app: true }, '', window.location.href)
      }

      if (queue) setShowQueue(true)
      if (!play) return

      setCurrentPlay(play)

      // ─── Ключевая проверка ───
      // Если Zustand уже восстановил currentTrack для этого же спектакля —
      // не перезапускаем воспроизведение с начала. Это происходит, когда
      // Chrome перезагрузил вкладку (tab discard) на Android.
      const playerState = usePlayerStore.getState()
      const alreadyPlayingThisPlay =
        playerState.currentTrack?.playId === play.id &&
        playerState.queue.some(t => t.id === playerState.currentTrack.id)

      if (alreadyPlayingThisPlay && !partId) {
        // Просто восстанавливаем страницу спектакля, не сбрасывая трек
        return
      }

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

  useEffect(() => {
    const onPopState = () => {
      if (!library.length) return
      const params = new URLSearchParams(window.location.search)
      const playSlug = params.get('play')
      const queue = params.get('queue') === '1'
      const sidebar = window.history.state?.sidebar

      // Любой back закрывает sidebar, если он был открыт
      if (!sidebar) setShowSidebar(false)

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

  const pushState = (play, queue) => {
    const params = new URLSearchParams()
    if (play) params.set('play', play.slug || play.id)
    if (queue) params.set('queue', '1')
    const qs = params.toString()
    const url = qs ? `?${qs}` : '/'
    window.history.pushState(
      { __app: true, currentPlay: play?.slug || null, showQueue: queue },
      '',
      url
    )
  }

  const replaceWithHome = () => {
    window.history.replaceState(
      { __app: true, currentPlay: null, showQueue: false },
      '',
      '/'
    )
  }

  const openPlay = (play) => {
    pushState(play, showQueue)
    setCurrentPlay(play)
    setShowSidebar(false)
  }

  const closePlay = () => {
    const st = window.history.state
    if (st?.currentPlay) {
      window.history.back()
    } else {
      replaceWithHome()
      setCurrentPlay(null)
      setShowQueue(false)
    }
  }

  const toggleQueue = () => {
    const next = !showQueue
    pushState(currentPlay, next)
    setShowQueue(next)
  }

  const closeQueue = () => {
    const st = window.history.state
    if (st?.showQueue) {
      window.history.back()
    } else {
      setShowQueue(false)
    }
  }

  // ─── Sidebar (мобильный drawer) с pushState, чтобы back закрывал ───
  const openSidebar = () => {
    window.history.pushState({ __app: true, sidebar: true, currentPlay: currentPlay?.slug || null, showQueue }, '', window.location.href)
    setShowSidebar(true)
  }

  const closeSidebar = () => {
    if (window.history.state?.sidebar) {
      window.history.back()
    } else {
      setShowSidebar(false)
    }
  }

  const toggleSidebar = () => {
    if (showSidebar) closeSidebar()
    else openSidebar()
  }

  const applyNewFilter = (f) => {
    setFilter(f)
    setQuery('')
    window.history.replaceState(
      { __app: true, currentPlay: null, showQueue: false },
      '',
      '/'
    )
    setCurrentPlay(null)
    setShowQueue(false)
    setShowSidebar(false)
  }

  const clearFilter = () => setFilter(null)

  const goHome = () => {
    setFilter(null)
    setQuery('')
    if (currentPlay || showQueue) {
      replaceWithHome()
      setCurrentPlay(null)
      setShowQueue(false)
    }
    setShowSidebar(false)
  }

  const onSearchChange = (v) => {
    setQuery(v)
    if (currentPlay || showQueue) {
      replaceWithHome()
      setCurrentPlay(null)
      setShowQueue(false)
    }
  }

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
      {/* Sidebar — десктоп */}
      <Sidebar
        className="hidden md:flex"
        library={library}
        onFilter={applyNewFilter}
        activeFilter={filter}
        onHome={goHome}
      />

      {/* Sidebar — мобильный drawer */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeSidebar}
          />
          <div className="relative w-72 max-w-[85vw] h-full flex flex-col bg-[var(--color-bg-1)]">
            <Sidebar
              className="flex-1"
              library={library}
              onFilter={applyNewFilter}
              activeFilter={filter}
              onHome={goHome}
            />
            <button
              onClick={closeSidebar}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded
                         text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] hover:bg-[var(--color-bg-2)]"
              title="Закрыть меню"
            >✕</button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
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
          onChange={onSearchChange}
          onToggleSidebar={toggleSidebar}
        />

        <FilterChips filter={filter} onClear={clearFilter} />

        <ScrollArea
          className="flex-1"
          resetKey={`${query}|${filter?.type || ''}|${filter?.value || ''}|${currentPlay?.id || 'list'}`}
        >
          <div className="px-4 md:px-6 pb-32">
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
        </ScrollArea>
      </main>

      {showQueue && <Queue onClose={closeQueue} />}
      <Player onToggleQueue={toggleQueue} />
    </div>
  )
}
