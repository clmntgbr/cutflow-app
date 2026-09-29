"use client"

import { formatClock } from "@/lib/editor/timeline"
import type { PlaybackTime } from "@/lib/editor/use-timeline-player"
import { useEffect, useRef } from "react"

export function PlayerTime({
  subscribe,
  durationMs,
}: {
  subscribe: (listener: (time: PlaybackTime) => void) => () => void
  durationMs: number
}) {
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const render = (time: PlaybackTime) => {
      node.textContent = `${formatClock(time.outputMs)} / ${formatClock(durationMs)}`
    }

    render({ sourceMs: 0, outputMs: 0 })
    return subscribe(render)
  }, [durationMs, subscribe])

  return (
    <span
      ref={nodeRef}
      className="tabular-nums text-sm text-muted-foreground"
    />
  )
}
