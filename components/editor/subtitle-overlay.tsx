"use client"

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

interface SubtitlePosition {
  x: number
  y: number
}

export function SubtitleOverlay() {
  const frameRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<SubtitlePosition>({ x: 50, y: 84 })
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)

  function clampPosition(clientX: number, clientY: number, caption: HTMLElement) {
    const frame = frameRef.current
    const offset = dragOffsetRef.current
    if (!frame || !offset) return
    const frameBox = frame.getBoundingClientRect()
    const captionBox = caption.getBoundingClientRect()
    if (frameBox.width <= 0 || frameBox.height <= 0) return

    const halfX = (captionBox.width / frameBox.width) * 50
    const halfY = (captionBox.height / frameBox.height) * 50
    const centerX = ((clientX - offset.x - frameBox.left + captionBox.width / 2) / frameBox.width) * 100
    const centerY = ((clientY - offset.y - frameBox.top + captionBox.height / 2) / frameBox.height) * 100

    setPosition({
      x: Math.min(100 - halfX, Math.max(halfX, centerX)),
      y: Math.min(100 - halfY, Math.max(halfY, centerY)),
    })
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const captionBox = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - captionBox.left,
      y: event.clientY - captionBox.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragOffsetRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    clampPosition(event.clientX, event.clientY, event.currentTarget)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragOffsetRef.current = null
  }

  return (
    <div ref={frameRef} className="pointer-events-none absolute inset-0">
      <div
        className="pointer-events-auto absolute max-w-[85%] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none px-3 py-1 text-center text-2xl  tracking-wide text-white select-none active:cursor-grabbing"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          textShadow: "0 2px 2px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.65)",
          WebkitTextStroke: "1px rgba(0,0,0,0.85)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        C&apos;est vraiment <span className="text-primary">bien</span>
      </div>
    </div>
  )
}
