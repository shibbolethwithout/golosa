import { useEffect, useRef, useState } from 'react'

export default function ScrollArea({ children, className = '', thumbColor }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const thumbRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)

  // ─── Обновление thumb при скролле ───
  useEffect(() => {
    const el = containerRef.current
    const content = contentRef.current
    const thumb = thumbRef.current
    if (!el || !content || !thumb) return

    let raf = null

    const update = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const { scrollHeight, clientHeight, scrollTop } = el
        if (scrollHeight <= clientHeight + 1) {
          thumb.style.opacity = '0'
          return
        }
        const ratio = clientHeight / scrollHeight
        const h = Math.max(32, clientHeight * ratio)
        const maxTop = clientHeight - h
        const y = (scrollTop / (scrollHeight - clientHeight)) * maxTop
        thumb.style.height = `${h}px`
        thumb.style.transform = `translateY(${y}px)`
        thumb.style.opacity = '1'
      })
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const roContent = new ResizeObserver(update)
    roContent.observe(content)
    const roContainer = new ResizeObserver(update)
    roContainer.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      roContent.disconnect()
      roContainer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // ─── Drag thumb ───
  const onThumbPointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = containerRef.current
    const thumb = thumbRef.current
    if (!el || !thumb) return

    const startY = e.clientY
    const startScroll = el.scrollTop
    const { scrollHeight, clientHeight } = el
    const thumbH = thumb.offsetHeight
    const maxTop = clientHeight - thumbH
    if (maxTop <= 0) return
    const ratio = (scrollHeight - clientHeight) / maxTop

    setDragging(true)

    const onMove = (ev) => {
      const delta = ev.clientY - startY
      el.scrollTop = startScroll + delta * ratio
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const active = hovered || dragging
  const thumbWidth = dragging ? 12 : active ? 10 : 8
  const thumbBg = dragging
    ? '#d0d0d8'
    : active
      ? '#b0b0b8'
      : (thumbColor || '#8a8a90')

  return (
    <div
      className={`relative flex flex-col min-h-0 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scroll-hide-native"
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>

      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        className="absolute right-1 top-0 rounded-full z-10"
        style={{
          width: `${thumbWidth}px`,
          height: 0,
          opacity: 0,
          background: thumbBg,
          transition: 'opacity 0.15s, width 0.12s, background 0.12s',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  )
}
