"use client"

import { DecisionTooltip, decisionLabel } from "@/components/editor/decision-tooltip"
import { Button } from "@/components/ui/button"
import type { PlaybackTime } from "@/lib/editor/use-timeline-player"
import type { EditorDecision, TimelineSegment } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { MinusIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const MIN_ZOOM = 1
const MAX_ZOOM = 128

const DECISION_COLOR: Record<string, string> = {
  silence: "bg-amber-400/80",
  filler: "bg-sky-400/80",
  repetition: "bg-violet-400/80",
  false_start: "bg-orange-400/80",
  manual: "bg-rose-400/80",
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function formatZoom(zoom: number) {
  const rounded = zoom >= 10 ? Math.round(zoom) : Math.round(zoom * 10) / 10
  return `${rounded}×`
}

export function SourceTimeline({
  durationMs,
  segments,
  decisions,
  selectedDecisionId,
  playing,
  subscribe,
  onSeekSource,
  onSelectDecision,
  onListenDecision,
  onKeepDecision,
  onResetDecision,
  actionsDisabled = false,
}: {
  durationMs: number
  segments: TimelineSegment[]
  decisions: EditorDecision[]
  selectedDecisionId: string | null
  playing: boolean
  subscribe: (listener: (time: PlaybackTime) => void) => () => void
  onSeekSource: (sourceMs: number) => void
  onSelectDecision: (decision: EditorDecision) => void
  onListenDecision: (decision: EditorDecision) => void
  onKeepDecision: (decision: EditorDecision) => void
  onResetDecision: (decision: EditorDecision) => void
  actionsDisabled?: boolean
}) {
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [openDecisionId, setOpenDecisionId] = useState<string | null>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const followRef = useRef(playing)
  const userScrolledRef = useRef(false)
  const programmaticScrollRef = useRef(false)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    followRef.current = playing
    if (playing) userScrolledRef.current = false
  }, [playing])

  useEffect(() => {
    return subscribe(({ sourceMs }) => {
      const playhead = playheadRef.current
      const viewport = viewportRef.current
      const track = trackRef.current
      if (!playhead || !viewport || !track || durationMs <= 0) return

      const ratio = Math.min(1, Math.max(0, sourceMs / durationMs))
      playhead.style.left = `${ratio * 100}%`
      if (!followRef.current || userScrolledRef.current || zoomRef.current <= MIN_ZOOM) {
        return
      }

      const x = ratio * track.offsetWidth
      const viewLeft = viewport.scrollLeft
      const viewWidth = viewport.clientWidth
      const edge = viewWidth * 0.2
      if (x < viewLeft + edge || x > viewLeft + viewWidth - edge) {
        programmaticScrollRef.current = true
        viewport.scrollLeft = Math.max(0, x - viewWidth * 0.35)
        requestAnimationFrame(() => {
          programmaticScrollRef.current = false
        })
      }
    })
  }, [durationMs, subscribe])

  const sourceRatioFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }, [])

  const applyZoom = useCallback((clientX: number, nextZoom: number) => {
    const sourceRatio = sourceRatioFromPointer(clientX)
    const viewport = viewportRef.current
    const pointerX = viewport ? clientX - viewport.getBoundingClientRect().left : 0
    zoomRef.current = nextZoom
    setZoom(nextZoom)
    requestAnimationFrame(() => {
      const currentViewport = viewportRef.current
      const track = trackRef.current
      if (!currentViewport || !track) return
      programmaticScrollRef.current = true
      currentViewport.scrollLeft = sourceRatio * track.offsetWidth - pointerX
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false
      })
    })
  }, [sourceRatioFromPointer])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      event.preventDefault()
      const nextZoom = clampZoom(zoomRef.current * Math.exp(-event.deltaY * 0.002))
      applyZoom(event.clientX, nextZoom)
    }

    viewport.addEventListener("wheel", onWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", onWheel)
  }, [applyZoom])

  function zoomBy(factor: number) {
    const viewport = viewportRef.current
    const center = viewport
      ? viewport.getBoundingClientRect().left + viewport.clientWidth / 2
      : 0
    applyZoom(center, clampZoom(zoomRef.current * factor))
  }

  function resetZoom() {
    zoomRef.current = MIN_ZOOM
    setZoom(MIN_ZOOM)
    const viewport = viewportRef.current
    if (!viewport) return
    programmaticScrollRef.current = true
    viewport.scrollLeft = 0
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false
    })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => zoomBy(0.5)}
        >
          <MinusIcon />
        </Button>
        <button
          type="button"
          className="w-12 text-center text-xs text-muted-foreground tabular-nums"
          aria-label="Reset zoom"
          onClick={resetZoom}
        >
          {formatZoom(zoom)}
        </button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => zoomBy(2)}
        >
          <PlusIcon />
        </Button>
      </div>
      <div
        ref={viewportRef}
        className="timeline-scroll overflow-x-auto overscroll-x-contain rounded-lg bg-muted"
        onScroll={() => {
          if (programmaticScrollRef.current) return
          userScrolledRef.current = true
        }}
      >
        <div
          ref={trackRef}
          className="relative h-14 cursor-pointer"
          style={{ width: `${zoom * 100}%` }}
          onClick={(event) => {
            if (event.target !== event.currentTarget || durationMs <= 0) return
            onSeekSource(sourceRatioFromPointer(event.clientX) * durationMs)
          }}
        >
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="pointer-events-none absolute inset-y-2 min-w-px rounded-sm bg-[oklch(0.508_0.118_165.612)]/80"
              style={{
                left: `${(segment.sourceStartMs / durationMs) * 100}%`,
                width: `${((segment.sourceEndMs - segment.sourceStartMs) / durationMs) * 100}%`,
              }}
            />
          ))}
          {decisions.map((decision) => (
            <DecisionTooltip
              key={decision.id}
              decision={decision}
              open={openDecisionId === decision.id}
              onOpenChange={(next) => setOpenDecisionId(next ? decision.id : null)}
              disabled={actionsDisabled}
              onListen={() => onListenDecision(decision)}
              onKeep={() => onKeepDecision(decision)}
              onReset={() => onResetDecision(decision)}
            >
              <button
                type="button"
                aria-label={decisionLabel(decision.type)}
                className={cn(
                  "absolute inset-y-1 min-w-px rounded-sm",
                  DECISION_COLOR[decision.type] ?? "bg-foreground/30",
                  (selectedDecisionId === decision.id || openDecisionId === decision.id) &&
                    "ring-2 ring-foreground"
                )}
                style={{
                  left: `${(decision.sourceStartMs / durationMs) * 100}%`,
                  width: `${((decision.sourceEndMs - decision.sourceStartMs) / durationMs) * 100}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectDecision(decision)
                  setOpenDecisionId(decision.id)
                }}
              />
            </DecisionTooltip>
          ))}
          <div
            ref={playheadRef}
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-foreground"
            style={{ left: "0%" }}
          />
        </div>
      </div>
    </div>
  )
}
