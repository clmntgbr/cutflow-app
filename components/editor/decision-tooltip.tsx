"use client"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import type { EditorDecision } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { PlayIcon } from "lucide-react"
import type { ReactElement } from "react"

const DECISION_DOT: Record<string, string> = {
  silence: "bg-amber-400",
  filler: "bg-sky-400",
  repetition: "bg-violet-400",
  false_start: "bg-orange-400",
  manual: "bg-rose-400",
}

export function decisionLabel(type: string): string {
  switch (type) {
    case "silence":
      return "Silence"
    case "filler":
      return "Filler"
    case "repetition":
      return "Repetition"
    case "false_start":
      return "False start"
    case "manual":
      return "Manual"
    default:
      return type
  }
}

function formatRangeTimestamp(ms: number) {
  const clamped = Math.max(0, ms)
  const minutes = Math.floor(clamped / 60_000)
  const seconds = (clamped % 60_000) / 1000
  const whole = Math.floor(seconds)
  const tenth = Math.min(9, Math.floor((seconds - whole) * 10))
  return `${String(minutes).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${tenth}`
}

function formatCutDuration(startMs: number, endMs: number) {
  const seconds = ((endMs - startMs) / 1000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `Duration: ${seconds} s`
}

function decisionStatus(decision: EditorDecision) {
  if (decision.modifiedByUser) {
    return decision.effectiveAction === "keep" ? "Kept" : "Removed"
  }
  return decision.effectiveAction === "remove" ? "Removed automatically" : "Kept automatically"
}

export function DecisionTooltip({
  decision,
  open,
  onOpenChange,
  disabled,
  onListen,
  onKeep,
  onReset,
  children,
}: {
  decision: EditorDecision
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  onListen: () => void
  onKeep: () => void
  onReset: () => void
  children: ReactElement
}) {
  const overridden = decision.modifiedByUser

  return (
    <HoverCard open={open} onOpenChange={onOpenChange} openDelay={120} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        className="z-[80] w-72 rounded-2xl border border-black/10 bg-white p-4 text-foreground shadow-lg"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              decision.effectiveAction === "keep"
                ? "bg-[oklch(0.508_0.118_165.612)]"
                : (DECISION_DOT[decision.type] ?? "bg-foreground/40")
            )}
          />
          <p className="min-w-0 truncate text-base font-semibold leading-tight">
            {decision.label || decisionLabel(decision.type)}
          </p>
        </div>
        <p className="mt-3 tabular-nums">
          {formatRangeTimestamp(decision.sourceStartMs)} → {formatRangeTimestamp(decision.sourceEndMs)}
        </p>
        <p className="mt-1 text-muted-foreground">
          {formatCutDuration(decision.sourceStartMs, decision.sourceEndMs)}
        </p>
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-center">
          {decisionStatus(decision)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onListen}>
            <PlayIcon />
            Listen
          </Button>
          {decision.effectiveAction === "remove" ? (
            <Button type="button" variant="outline" disabled={disabled} onClick={onKeep}>
              Keep
            </Button>
          ) : overridden ? (
            <Button type="button" variant="outline" disabled={disabled} onClick={onReset}>
              Remove
            </Button>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
