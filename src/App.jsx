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

  // ─── Загрузка библиотеки + обработка deep link ───────
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

      // Пришли извне по deep link на валидный спектакль?
      const isExternal = play && !window.history.state?.__app

      if (isExternal) {
        // 1) Заменяем текущую запись (play) на главную
        window.history.replaceState({ __app: true }, '', '/')
        // 2) Пушим поверх play-запись
        const qs = new URLSearchParams()
        qs.set('play', playSlug)
        if (queue) qs.set('queue', '1')
        window.history.pushState(
          { __app: true, currentPlay: playSlug, showQueue: queue },
          '',
          `?${qs.toString()}`
        )
      } else if (!play && playSlug) {
        // play не найден — тихо уходим на главную
        window.history.replaceState({ __app: true }, '', '/')
      } else {
        // Обычная загрузка или F5 — просто помечаем state
        const st = window.history.state || {}
        window.history.replaceState(
          { ...st, __app: true },
          '',
          window.location.href
        )
      }

      if (queue) setShowQueue(true)
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

  // ─── popstate: браузерная кнопка «Назад» ─────────────
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

  // ─── Работа с историей ───────────────────────────────
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

  // Возврат на главную БЕЗ history.back() — заменяем текущую запись
  const replaceWithHome = () => {
    window.history.replaceState(
      { __app: true, currentPlay: null, showQueue: false },
      '',
      '/'
    )
  }

  // ─── Навигация ───────────────────────────────────────
  const openPlay = (play) => {
    pushState(play, showQueue)
    setCurrentPlay(play)
  }

  const closePlay = () => {
    const st = window.history.state
    if (st?.currentPlay) {
      // Мы попали на play-страницу внутренним переходом — back() вернёт на главную
      window.history.back()
    } else {
      // Страховка: если истории нет — просто идём на главную
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

  // ─── Фильтры и поиск ────────────────────────────────
  const applyNewFilter = (f) => {
    setFilter(f)
    setQuery('')
    if (currentPlay || showQueue) {
      replaceWithHome()   // ← НЕ history.back()
      setCurrentPlay(null)
      setShowQueue(false)
    }
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
  }

  const onSearchChange = (v) => {
    setQuery(v)
    // При вводе в поиск — прячем play/queue БЕЗ history.back(),
    // иначе браузер уйдёт во внешний сайт (мессенджер).
    if (currentPlay || showQueue) {
      replaceWithHome()
      setCurrentPlay(null)
      setShowQueue(false)
    }
  }

  // ─── Список ─────────────────────────────────────────
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
          onChange={onSearchChange}
          onToggleQueue={toggleQueue}
        />

        <FilterChips filter={filter} onClear={clearFilter} />

        <div className="flex-1 overflow-auto px-4 md:px-6 safe-bottom-pad">
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
