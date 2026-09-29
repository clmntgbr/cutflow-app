"use client"

import { Button } from "@/components/ui/button"
import {
  activeTimeline,
  EMPTY_DECISIONS,
  EMPTY_SEGMENTS,
  primaryMedia,
  sourceDurationMs,
} from "@/lib/editor/timeline"
import { useTimelinePlayer } from "@/lib/editor/use-timeline-player"
import { ApiError } from "@/lib/api-error"
import { useProject } from "@/lib/project/hooks"
import type { TimelineDecision } from "@/lib/project/types"
import { PauseIcon, PlayIcon } from "lucide-react"
import { useRef, useState } from "react"
import { PlayerTime } from "./player-time"
import { SourceTimeline } from "./source-timeline"
import { SubtitleOverlay } from "./subtitle-overlay"

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Failed to load project"
}

export function Editor({ projectId }: { projectId: string }) {
  const query = useProject(projectId)
  const project = query.data
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [selectedDecision, setSelectedDecision] = useState<TimelineDecision | null>(null)

  const media = project ? primaryMedia(project) : null
  const timeline = project && media ? activeTimeline(project, media.id) : null
  const segments = timeline?.segments ?? EMPTY_SEGMENTS
  const decisions = timeline?.decisions ?? EMPTY_DECISIONS
  const durationMs = sourceDurationMs(media, timeline)
  const outputDurationMs = timeline?.durationMs ?? 0
  const timelineVersion = timeline ? `${timeline.id}:${timeline.version}` : null

  const player = useTimelinePlayer(
    videoRef,
    segments,
    media?.originalUrl ?? null,
    timelineVersion
  )

  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    )
  }

  if (query.isError || !project || !media) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-destructive">
        {query.isError ? errorMessage(query.error) : "This project has no video."}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f9f9f9]">
      <header className="flex h-14 shrink-0 items-center border-b bg-background px-4">
        <h1 className="min-w-0 truncate text-sm font-medium">{project.name}</h1>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {media.originalUrl ? (
          <div className="relative aspect-video h-full max-h-full max-w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              src={media.originalUrl}
              className="size-full object-contain"
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <SubtitleOverlay />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The original video is not available yet.</p>
        )}
      </div>

      <div className="shrink-0 border-t bg-background px-6 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!media.originalUrl || segments.length === 0}
            onClick={player.togglePlayback}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
          <PlayerTime subscribe={player.subscribe} durationMs={outputDurationMs} />
        </div>

        {timeline && durationMs > 0 ? (
          <SourceTimeline
            durationMs={durationMs}
            segments={segments}
            decisions={decisions}
            selectedDecisionId={selectedDecision?.id ?? null}
            playing={playing}
            subscribe={player.subscribe}
            onSeekSource={player.seekSource}
            onSelectDecision={setSelectedDecision}
          />
        ) : (
          <p className="text-sm text-muted-foreground">The edit is not ready yet.</p>
        )}
      </div>
    </div>
  )
}
