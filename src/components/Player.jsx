import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/playerStore'

// ─── Иконки (SVG) ───────────────────────────────────────────
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

// ─── Утилиты Share ──────────────────────────────────────────
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

// ─── Компонент ─────────────────────────────────────────────
export default function Player() {
  const audioRef = useRef(null)
  const lastSavedRef = useRef(0)
  const restoredRef = useRef(null)
  const [usingBackup, setUsingBackup] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)

  const {
    currentTrack, isPlaying, volume, progress, duration,
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
    if (isPlaying) el.play().catch(() => {})
    else el.pause()
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
    const close = () => setShareMenuOpen(false)
    const id = setTimeout(() => document.addEventListener('click', close), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('click', close)
    }
  }, [shareMenuOpen])

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
    setShareMenuOpen(false)
    if (!currentTrack) return
    const time = withTime ? progress : 0
    const slug = currentTrack?.playId || ''
    const url = buildShareUrl(currentTrack, slug, time)
    const title = `${currentTrack?.playTitle || 'Радиоспектакль'} — ${currentTrack?.title || 'часть'}`
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
    <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[var(--color-bg-1)]/95 backdrop-blur">
      <audio
        ref={audioRef}
        src={activeUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full
                        bg-[var(--color-bg-3)] text-xs text-[var(--color-fg-0)]
                        shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {shareMenuOpen && (
        <div
          className="absolute bottom-full right-3 md:right-6 mb-2 rounded-lg shadow-lg
                     bg-[var(--color-bg-2)] border border-white/10 overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleShareWith(true)}
            className="block w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-bg-3)] whitespace-nowrap"
          >
            С текущего места · {fmt(progress)}
          </button>
          <button
            onClick={() => handleShareWith(false)}
            className="block w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-bg-3)] whitespace-nowrap
                       border-t border-white/5"
          >
            С начала
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 px-3 md:px-6 py-2 md:py-3">

        <div className="flex items-center gap-2 md:gap-4 md:shrink-0">
          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
            <button
              onClick={prev}
              className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
              title="Предыдущая"
              aria-label="Предыдущая"
            >
              <PrevIcon size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="p-2 text-[var(--color-fg-0)] hover:text-[var(--color-accent)]"
              title={isPlaying ? 'Пауза' : 'Играть'}
              aria-label={isPlaying ? 'Пауза' : 'Играть'}
            >
              {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>
            <button
              onClick={next}
              className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)]"
              title="Следующая"
              aria-label="Следующая"
            >
              <NextIcon size={18} />
            </button>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShareMenuOpen(o => !o) }}
            className="p-2 text-[var(--color-fg-1)] hover:text-[var(--color-accent)] md:hidden"
            title="Поделиться"
            aria-label="Поделиться"
          >
            <ShareIcon size={16} />
          </button>

          <div className="flex-1 min-w-0 md:max-w-[240px] lg:max-w-[320px]">
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
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="hidden md:inline text-xs text-[var(--color-fg-2)] w-10 text-right shrink-0">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="flex-1 accent-[var(--color-accent)] min-w-0"
          />
          <span className="hidden md:inline text-xs text-[var(--color-fg-2)] w-10 shrink-0">{fmt(duration)}</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setShareMenuOpen(o => !o) }}
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
            className="w-20 lg:w-28 accent-[var(--color-accent)]"
          />
        </div>
      </div>
    </div>
  )
}
