import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/playerStore'

// ─── Иконки ───────────────────────────────────────────────
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
function PrevIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="19 4 19 20 9 12" />
      <rect x="5" y="4" width="2" height="16" />
    </svg>
  )
}
function NextIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 4 5 20 15 12" />
      <rect x="17" y="4" width="2" height="16" />
    </svg>
  )
}
function ShareIcon({ size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

// ─── Share утилиты ────────────────────────────────────────
function buildShareUrl(track, playSlug, time) {
  const base = window.location.origin + window.location.pathname
  const params = new URLSearchParams({
    play: playSlug || '',
    part: track?.id || '',
    t: String(Math.floor(time || 0)),
  })
  return `${base}?${params.toString()}`
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {}
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '-9999px'
    ta.setAttribute('readonly', '')
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return true
  } catch {}
  try {
    window.prompt('Скопируйте ссылку:', text)
    return true
  } catch {}
  return false
}

async function shareUrl(url, title) {
  const shareData = { title: title || 'Радиоспектакль', text: title ? `Слушаю: ${title}` : '', url }
  if (navigator.share) {
    try {
      await navigator.share(shareData)
      return { ok: true, method: 'share' }
    } catch (e) {
      if (e.name === 'AbortError') return { ok: false, method: 'abort' }
    }
  }
  const copied = await copyToClipboard(url)
  return { ok: copied, method: copied ? 'clipboard' : 'error' }
}

// ─── Компонент ────────────────────────────────────────────
export default function Player({ onToggleQueue }) {
  const audioRef = useRef(null)
  const lastSavedRef = useRef(0)
  const restoredRef = useRef(null)
  const shareRef = useRef(null)
  const preloadAudioRef = useRef(null)

  const [usingBackup, setUsingBackup] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [nextUrl, setNextUrl] = useState(null)

  const {
    currentTrack, currentPlay, isPlaying, volume, progress, duration,
    togglePlay, next, prev, setProgress, setDuration, setVolume,
    saveProgress, getPartProgress, clearPartProgress,
  } = usePlayerStore()

  const activeUrl = usingBackup && currentTrack?.backup
    ? currentTrack.backup
    : currentTrack?.url

  useEffect(() => {
    setUsingBackup(false)
    setError(null)
    lastSavedRef.current = 0
    setShareMenuOpen(false)
  }, [currentTrack?.id])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !currentTrack) return

    // При смене URL — принудительно перезагружаем
    if (el.getAttribute('src') !== activeUrl) {
      el.src = activeUrl
      el.load()
    }

    if (isPlaying) {
      const p = el.play()
      if (p && p.catch) p.catch(() => {})
    } else {
      el.pause()
    }
  }, [isPlaying, currentTrack, activeUrl])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!shareMenuOpen) return
    const onDown = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [shareMenuOpen])

  // ─── Предзагрузка следующего трека ───
  useEffect(() => {
    const { queue, currentTrack: cur } = usePlayerStore.getState()
    const idx = queue.findIndex(t => t.id === cur?.id)
    const nextTrack = queue[idx + 1] || null
    const url = nextTrack ? (nextTrack.backup || nextTrack.url) : null
    setNextUrl(url)
  }, [currentTrack?.id])

  // ─── Media Session: метаданные ───
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!currentTrack) return

    // Firefox Android: без сброса metadata в null плашка не обновляется
    // при автопереходе между частями. Сбрасываем и через 50 мс ставим новую.
    try { navigator.mediaSession.metadata = null } catch {}

    const playTitle = currentTrack.playTitle || 'Радиоспектакль'
    const author = currentTrack.playAuthor || ''
    const partTitle = currentTrack.title || 'Часть'

    const artwork = currentPlay?.cover
      ? [{ src: currentPlay.cover, sizes: '512x512', type: 'image/webp' }]
      : []

    const id = setTimeout(() => {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: partTitle,
          artist: author,
          album: playTitle,
          artwork,
        })
      } catch {}
    }, 50)

    try {
      navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay())
      navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay())
      navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prev())
      navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next())
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const el = audioRef.current
        if (el) el.currentTime = Math.max(0, el.currentTime - 10)
      })
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const el = audioRef.current
        if (el && el.duration) el.currentTime = Math.min(el.duration, el.currentTime + 10)
      })
    } catch {}

    return () => clearTimeout(id)
  }, [currentTrack, currentPlay])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    } catch {}
  }, [isPlaying])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (typeof navigator.mediaSession.setPositionState !== 'function') return
    if (!duration || !isFinite(duration) || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, progress), duration),
      })
    } catch {}
  }, [progress, duration])

  const handleLoadedMetadata = (e) => {
    const el = e.target
    setDuration(el.duration)
    if (restoredRef.current === activeUrl) return
    restoredRef.current = activeUrl
    const saved = getPartProgress(activeUrl)
    if (saved > 5 && saved < el.duration - 10) {
      el.currentTime = saved
      setProgress(saved)
    }
  }

  const handleTimeUpdate = (e) => {
    const t = e.target.currentTime
    setProgress(t)
    if (Math.abs(t - lastSavedRef.current) > 5) {
      saveProgress(activeUrl, t)
      lastSavedRef.current = t
    }
  }

  const handleEnded = () => {
    clearPartProgress(activeUrl)
    next()
  }

  const handleSeek = (e) => {
    const t = Number(e.target.value)
    audioRef.current.currentTime = t
    setProgress(t)
    saveProgress(activeUrl, t)
    lastSavedRef.current = t
  }

  const handleError = () => {
    if (!usingBackup && currentTrack?.backup) {
      setUsingBackup(true)
      return
    }
    setError('Ошибка')
  }

  const handleShareWith = async (withTime) => {
    if (!currentTrack) return
    const time = withTime ? progress : 0
    const slug = currentTrack?.playId || ''
    const url = buildShareUrl(currentTrack, slug, time)
    const title = `${currentTrack?.playTitle || 'Радиоспектакль'} — ${currentTrack?.title || 'часть'}`
    setShareMenuOpen(false)
    const result = await shareUrl(url, title)
    if (result.method === 'clipboard') setToast('Ссылка скопирована')
    else if (result.method === 'error') setToast('Не удалось скопировать')
    else if (result.method === 'share') setToast('Отправлено')
  }

  if (!currentTrack) return null

  const fmt = s => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed left-0 right-0 border-t border-white/5 bg-[var(--color-bg-1)]/82 backdrop-blur"
         style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <audio
        ref={audioRef}
        src={activeUrl}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {nextUrl && (
        <audio
          ref={preloadAudioRef}
          src={nextUrl}
          preload="auto"
          muted
          style={{ display: 'none' }}
        />
      )}

      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full
                        bg-[var(--color-bg-3)] text-xs text-[var(--color-fg-0)]
                        shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      <div ref={shareRef} className="absolute bottom-full right-3 md:right-6 mb-2 z-10">
        {shareMenuOpen && (
          <div className="rounded-lg shadow-lg bg-[var(--color-bg-2)] border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => handleShareWith(true)}
              className="block w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-bg-3)] whitespace-nowrap"
            >
              С текущего места · {fmt(progress)}
            </button>
            <button
              type="button"
              onClick={() => handleShareWith(false)}
              className="block w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-bg-3)] whitespace-nowrap border-t border-white/5"
            >
              С начала
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 px-3 md:px-6 py-2 md:py-3">

        <div className="flex items-center gap-2 md:gap-4 md:shrink-0">
          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
            <button onClick={prev} className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)]" title="Предыдущая" aria-label="Предыдущая">
              <PrevIcon size={18} />
            </button>
            <button onClick={togglePlay} className="p-2 text-[var(--color-fg-0)] hover:text-[var(--color-accent)]" title={isPlaying ? 'Пауза' : 'Играть'} aria-label={isPlaying ? 'Пауза' : 'Играть'}>
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>
            <button onClick={next} className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)]" title="Следующая" aria-label="Следующая">
              <NextIcon size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShareMenuOpen(o => !o)}
            className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)] md:hidden"
            title="Поделиться"
            aria-label="Поделиться"
          >
            <ShareIcon size={16} />
          </button>

          {/* Название — тап открывает очередь */}
          <button
            type="button"
            onClick={onToggleQueue}
            className="flex-1 min-w-0 md:max-w-[240px] lg:max-w-[320px] text-left
                       hover:opacity-80 transition"
            title="Открыть очередь"
          >
            <div className="truncate text-xs md:text-sm font-medium flex items-center gap-2">
              <span className="truncate">{currentTrack.playTitle || 'Спектакль'}</span>
              {usingBackup && (
                <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">backup</span>
              )}
              {error && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{error}</span>
              )}
            </div>
            <div className="truncate text-[11px] md:text-xs text-[var(--color-fg-2)]">
              {currentTrack.title}
              {currentTrack.playAuthor && ` · ${currentTrack.playAuthor}`}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="hidden md:inline text-xs text-[var(--color-fg-2)] w-10 text-right shrink-0">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="flex-1 min-w-0"
            style={{ '--range-progress': `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
          <span className="hidden md:inline text-xs text-[var(--color-fg-2)] w-10 shrink-0">{fmt(duration)}</span>
        </div>

        <button
          type="button"
          onClick={() => setShareMenuOpen(o => !o)}
          className="hidden md:inline-flex p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)] shrink-0"
          title="Поделиться"
          aria-label="Поделиться"
        >
          <ShareIcon size={18} />
        </button>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-20 lg:w-28"
            style={{ '--range-progress': `${volume * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
