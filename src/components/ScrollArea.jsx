import { useEffect, useRef } from 'react'

export default function ScrollArea({ children, className = '', thumbColor }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const thumbRef = useRef(null)

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

    // Наблюдаем за контентом (меняется при смене спектакля, поиске и т.п.)
    const roContent = new ResizeObserver(update)
    roContent.observe(content)
    // И за самим контейнером (например, при resize окна)
    const roContainer = new ResizeObserver(update)
    roContainer.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      roContent.disconnect()
      roContainer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={`relative flex flex-col min-h-0 ${className}`}>
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
        className="pointer-events-none absolute right-1 top-0 rounded-full z-10"
        style={{
          width: '8px',
          height: 0,
          opacity: 0,
          background: thumbColor || '#8a8a90',
          transition: 'opacity 0.15s',
        }}
      />
    </div>
  )
}
