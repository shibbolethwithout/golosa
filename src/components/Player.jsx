import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/playerStore'

export default function Player() {
  const audioRef = useRef(null)
  const lastSavedRef = useRef(0)
  const restoredRef = useRef(null)
  const [usingBackup, setUsingBackup] = useState(false)
  const [error, setError] = useState(null)

  const {
    currentTrack, isPlaying, volume, progress, duration,
    togglePlay, next, prev, setProgress, setDuration, setVolume,
    saveProgress, getPartProgress, clearPartProgress,
  } = usePlayerStore()

  const activeUrl = usingBackup && currentTrack?.backup
    ? currentTrack.backup
    : currentTrack?.url

  useEffect(() => {
    lastSavedRef.current = 0
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
    const { queue, currentTrack } = usePlayerStore.getState()
    const idx = queue.findIndex(t => t.id === currentTrack?.id)
    const nextTrack = queue[idx + 1]
    if (
      usingBackup &&
      nextTrack &&
      nextTrack.backup === currentTrack?.backup
    ) {
      return
    }
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

      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 px-3 md:px-6 py-2 md:py-3">

        {/* ── Строка 1 (mobile) / часть общей (desktop): управление + инфо ── */}
        <div className="flex items-center gap-2 md:gap-4 md:shrink-0">
          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
            <button onClick={prev}
              className="p-2 text-base md:text-lg hover:text-[var(--color-accent)] transition"
              title="Предыдущая">⏮</button>
            <button onClick={togglePlay}
              className="p-2 text-xl md:text-2xl hover:text-[var(--color-accent)] transition"
              title={isPlaying ? 'Пауза' : 'Играть'}>{isPlaying ? '⏸' : '▶'}</button>
            <button onClick={next}
              className="p-2 text-base md:text-lg hover:text-[var(--color-accent)] transition"
              title="Следующая">⏭</button>
          </div>

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

        {/* ── Строка 2 (mobile) / stretch (desktop): прогресс ── */}
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

        {/* ── Громкость: только десктоп ── */}
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
