"use client"

import { DecisionTooltip, decisionLabel } from "@/components/editor/decision-tooltip"
import { Button } from "@/components/ui/button"
import { formatClock } from "@/lib/editor/timeline"
import type { PlaybackTime } from "@/lib/editor/use-timeline-player"
import type { EditDecisionType, EditorDecision, TimelineSegment } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { MinusIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

const MIN_ZOOM = 1
const MAX_ZOOM = 128

const DECISION_COLOR: Record<string, string> = {
  silence: "bg-amber-400/80",
  filler: "bg-sky-400/80",
  repetition: "bg-violet-400/80",
  false_start: "bg-orange-400/80",
  manual: "bg-rose-400/80",
}

const KEPT_BAR = "bg-[oklch(0.508_0.118_165.612)]/80"

type TimelineRowId = "kept" | "silence" | "filler" | "repetition"

const TIMELINE_ROWS: {
  id: TimelineRowId
  label: string
  dot: string
  types: EditDecisionType[]
}[] = [
  { id: "kept", label: "Kept", dot: "bg-[oklch(0.508_0.118_165.612)]", types: [] },
  { id: "silence", label: "Silences", dot: "bg-amber-400", types: ["silence"] },
  { id: "filler", label: "Fillers", dot: "bg-sky-400", types: ["filler"] },
  { id: "repetition", label: "Repetitions", dot: "bg-violet-400", types: ["repetition", "false_start"] },
]

function rowForType(type: string): TimelineRowId | null {
  const match = TIMELINE_ROWS.find((row) => row.types.includes(type as EditDecisionType))
  return match?.id ?? null
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function formatZoom(zoom: number) {
  const rounded = zoom >= 10 ? Math.round(zoom) : Math.round(zoom * 10) / 10
  return `${rounded}×`
}

function sourceSpan(startMs: number, endMs: number, durationMs: number) {
  return {
    left: `${(startMs / durationMs) * 100}%`,
    width: `${((endMs - startMs) / durationMs) * 100}%`,
  }
}

const TICK_STEPS_MS = [
  100, 250, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000,
  600_000, 900_000, 1_800_000,
]

function tickStepMs(durationMs: number, zoom: number, viewportWidth: number) {
  if (durationMs <= 0 || viewportWidth <= 0 || zoom <= 0) return 60_000
  const pxPerMs = (viewportWidth * zoom) / durationMs
  const target = 96 / pxPerMs
  return TICK_STEPS_MS.find((step) => step >= target) ?? TICK_STEPS_MS[TICK_STEPS_MS.length - 1]
}

function timeTicks(durationMs: number, stepMs: number) {
  if (durationMs <= 0 || stepMs <= 0) return []
  const ticks: number[] = []
  for (let ms = 0; ms <= durationMs; ms += stepMs) ticks.push(ms)
  return ticks
}

function formatTick(ms: number, stepMs: number) {
  if (stepMs >= 1_000) return formatClock(ms)
  const seconds = ms / 1000
  const whole = Math.floor(seconds)
  const fraction = Math.round((seconds - whole) * 10)
  const minutes = Math.floor(whole / 60)
  const remain = whole % 60
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}.${fraction}`
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
  const [viewportWidth, setViewportWidth] = useState(0)
  const [openDecisionId, setOpenDecisionId] = useState<string | null>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const followRef = useRef(playing)
  const userScrolledRef = useRef(false)
  const programmaticScrollRef = useRef(false)
  const scrollLeftRef = useRef(0)
  const playheadRatioRef = useRef(0)

  const rows = TIMELINE_ROWS
  const stepMs = tickStepMs(durationMs, zoom, viewportWidth)
  const ticks = timeTicks(durationMs, stepMs)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const update = () => setViewportWidth(viewport.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useLayoutEffect(() => {
    const playhead = playheadRef.current
    const viewport = viewportRef.current
    if (playhead) playhead.style.left = `${playheadRatioRef.current * 100}%`
    if (!viewport) return
    if (Math.abs(viewport.scrollLeft - scrollLeftRef.current) <= 1) return
    programmaticScrollRef.current = true
    viewport.scrollLeft = scrollLeftRef.current
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false
    })
  })

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    if (Math.abs(viewport.scrollLeft - scrollLeftRef.current) <= 1) return
    programmaticScrollRef.current = true
    viewport.scrollLeft = scrollLeftRef.current
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false
    })
  }, [segments, decisions, durationMs])

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
      playheadRatioRef.current = ratio
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

  function renderDecision(decision: EditorDecision) {
    return (
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
            "absolute inset-y-1 box-border min-w-px rounded-sm border border-black/15",
            decision.effectiveAction === "keep"
              ? KEPT_BAR
              : (DECISION_COLOR[decision.type] ?? "bg-foreground/30"),
            (selectedDecisionId === decision.id || openDecisionId === decision.id) &&
              "ring-2 ring-black/20"
          )}
          style={sourceSpan(decision.sourceStartMs, decision.sourceEndMs, durationMs)}
          onClick={(event) => {
            event.stopPropagation()
            onSelectDecision(decision)
            setOpenDecisionId(decision.id)
          }}
        />
      </DecisionTooltip>
    )
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
      <div className="flex gap-2">
        <div className="flex w-28 shrink-0 flex-col">
          <div className="h-5" />
          {rows.map((row) => (
            <div key={row.id} className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", row.dot)} />
              {row.label}
            </div>
          ))}
        </div>
        <div
          ref={viewportRef}
          className="timeline-scroll min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-lg bg-muted"
          onScroll={() => {
            const viewport = viewportRef.current
            if (viewport) scrollLeftRef.current = viewport.scrollLeft
            if (programmaticScrollRef.current) return
            userScrolledRef.current = true
          }}
        >
          <div
            ref={trackRef}
            className="relative cursor-pointer"
            style={{ width: `${zoom * 100}%` }}
            onClick={(event) => {
              if (durationMs <= 0) return
              onSeekSource(sourceRatioFromPointer(event.clientX) * durationMs)
            }}
          >
            <div className="relative h-5">
              {ticks.map((ms) => (
                <span
                  key={ms}
                  className={cn(
                    "pointer-events-none absolute top-0 text-[10px] leading-5 text-muted-foreground tabular-nums",
                    ms > 0 && ms < durationMs && "-translate-x-1/2"
                  )}
                  style={{ left: `${(ms / durationMs) * 100}%` }}
                >
                  {formatTick(ms, stepMs)}
                </span>
              ))}
            </div>
            {ticks.map((ms) =>
              ms === 0 ? null : (
                <div
                  key={ms}
                  className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-black/10"
                  style={{ left: `${(ms / durationMs) * 100}%` }}
                />
              )
            )}
            {rows.map((row) => (
              <div key={row.id} className="relative h-8 border-b border-black/5 last:border-b-0">
                {row.id === "kept" ? (
                  <>
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className={cn(
                          "pointer-events-none absolute inset-y-1 min-w-px rounded-sm border border-black/15",
                          KEPT_BAR
                        )}
                        style={sourceSpan(segment.sourceStartMs, segment.sourceEndMs, durationMs)}
                      />
                    ))}
                    {decisions.filter((decision) => decision.type === "manual").map(renderDecision)}
                  </>
                ) : null}
                {decisions
                  .filter((decision) => rowForType(decision.type) === row.id)
                  .map(renderDecision)}
              </div>
            ))}
            <div
              ref={playheadRef}
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
