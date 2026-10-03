"use client"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-error"
import { EMPTY_SEGMENTS } from "@/lib/editor/timeline-mapper"
import { useEditor } from "@/lib/editor/use-editor"
import { useTimelineEvents } from "@/lib/editor/use-timeline-events"
import { useTimelinePlayer } from "@/lib/editor/use-timeline-player"
import { useFinalizeEditor, useUpdateEditor } from "@/lib/editor/use-update-editor"
import type {
  EditorAction,
  EditorConfiguration,
  EditorDecision,
  UpdateConfigurationAction,
  UpdateSilenceConfigurationAction,
} from "@/lib/editor/types"
import { queryKeys } from "@/lib/query/keys"
import { useQueryClient } from "@tanstack/react-query"
import { PauseIcon, PlayIcon, SettingsIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { EditStats } from "./edit-stats"
import { EditorSettingsDrawer, type EditorSettingsPatch } from "./editor-settings-drawer"
import { PlayerTime } from "./player-time"
import { SourceTimeline } from "./source-timeline"
import { SubtitleOverlay } from "./subtitle-overlay"

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Failed to load editor"
}

function settingsNeedRebuild(patch: EditorSettingsPatch, current: EditorConfiguration) {
  const silence = patch.silence
  if (silence) {
    if (silence.enabled !== undefined && silence.enabled !== current.silence.enabled) return true
    if (silence.detectionLevel !== undefined && silence.detectionLevel !== current.silence.detectionLevel) {
      return true
    }
    if (silence.minDurationMs !== undefined && silence.minDurationMs !== current.silence.minDurationMs) {
      return true
    }
    if (silence.paddingBeforeMs !== undefined && silence.paddingBeforeMs !== current.silence.paddingBeforeMs) {
      return true
    }
    if (silence.paddingAfterMs !== undefined && silence.paddingAfterMs !== current.silence.paddingAfterMs) {
      return true
    }
    if (silence.thresholdMode !== undefined && silence.thresholdMode !== current.silence.thresholdMode) {
      return true
    }
    if (silence.thresholdDb !== undefined && silence.thresholdDb !== current.silence.thresholdDb) return true
  }
  if (patch.filler && patch.filler.enabled !== current.filler.enabled) return true
  if (patch.repetition && patch.repetition.enabled !== current.repetition.enabled) return true
  return false
}

function settingsSaveAction(
  patch: EditorSettingsPatch,
  timelineVersion: number
): EditorAction | null {
  const silence = patch.silence && Object.keys(patch.silence).length > 0 ? patch.silence : null
  const configuration: UpdateSilenceConfigurationAction["configuration"] = {
    silence: silence ?? {},
  }
  if (patch.filler) configuration.filler = patch.filler
  if (patch.repetition) configuration.repetition = patch.repetition
  if (patch.subtitles) configuration.subtitles = patch.subtitles

  const hasToggle = Boolean(patch.filler || patch.repetition || patch.subtitles)
  if (!silence && !hasToggle) return null

  if (silence) {
    return {
      type: "update_silence_configuration",
      timelineVersion,
      configuration,
    }
  }

  const options: UpdateConfigurationAction["configuration"] = {}
  if (patch.filler) options.filler = patch.filler
  if (patch.repetition) options.repetition = patch.repetition
  if (patch.subtitles) options.subtitles = patch.subtitles
  return {
    type: "update_configuration",
    timelineVersion,
    configuration: options,
  }
}

export function Editor({
  projectId,
  mediaFileId,
}: {
  projectId: string
  mediaFileId: string
}) {
  const queryClient = useQueryClient()
  const query = useEditor(mediaFileId)
  const updateEditor = useUpdateEditor(mediaFileId)
  const finalizeEditor = useFinalizeEditor(mediaFileId)
  const editor = query.data
  const videoRef = useRef<HTMLVideoElement>(null)
  const saveInFlightRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsResetKey, setSettingsResetKey] = useState(0)
  const [settingsLock, setSettingsLock] = useState(false)
  const [awaitingVersion, setAwaitingVersion] = useState<number | null>(null)
  const [pendingRebuild, setPendingRebuild] = useState<"settings" | "finalize" | "decision" | null>(null)
  const pendingRebuildRef = useRef<"settings" | "finalize" | "decision" | null>(null)
  const [decisionPreview, setDecisionPreview] = useState<
    Record<string, Pick<EditorDecision, "effectiveAction" | "modifiedByUser">>
  >({})

  const timelineVersion = editor?.timeline.version ?? null
  const waitingForTimeline =
    awaitingVersion != null && (timelineVersion ?? 0) <= awaitingVersion
  const settingsSaving = settingsLock || (pendingRebuild === "settings" && waitingForTimeline)
  const rebuilding =
    finalizeEditor.isPending || settingsSaving || (pendingRebuild === "finalize" && waitingForTimeline)
  const timelineUpdating = waitingForTimeline || finalizeEditor.isPending || settingsLock

  function markRebuild(kind: "settings" | "finalize" | "decision" | null) {
    pendingRebuildRef.current = kind
    setPendingRebuild(kind)
  }

  const onUpdated = useCallback(() => {
    const kind = pendingRebuildRef.current
    pendingRebuildRef.current = null
    setAwaitingVersion(null)
    setPendingRebuild(null)
    if (kind === "settings") {
      setSettingsLock(false)
      setSettingsOpen(false)
    }
  }, [])

  useTimelineEvents(projectId, mediaFileId, onUpdated)

  const segments = editor?.timeline.segments ?? EMPTY_SEGMENTS
  const decisions = editor?.decisions ?? []
  const displayedDecisions = decisions.map((decision) => {
    const preview = decisionPreview[decision.id]
    return preview ? { ...decision, ...preview } : decision
  })

  useEffect(() => {
    setDecisionPreview({})
  }, [timelineVersion])
  const durationMs = editor?.media.durationMs ?? 0
  const outputDurationMs = editor?.timeline.durationMs ?? 0
  const versionKey = editor ? `${editor.timeline.id}:${editor.timeline.version}` : null

  const player = useTimelinePlayer(videoRef, segments, editor?.media.url ?? null, versionKey)

  function saveSettings(patch: EditorSettingsPatch) {
    if (saveInFlightRef.current || !editor || settingsSaving) return
    const version = editor.timeline.version
    const action = settingsSaveAction(patch, version)
    if (!action) return

    const rebuild = settingsNeedRebuild(patch, editor.configuration)

    saveInFlightRef.current = true
    setSettingsLock(true)
    updateEditor.mutate(action, {
      onSuccess: () => {
        if (rebuild) {
          markRebuild("settings")
          setAwaitingVersion(version)
          return
        }
        setSettingsLock(false)
        setSettingsOpen(false)
        saveInFlightRef.current = false
        void queryClient.invalidateQueries({
          queryKey: queryKeys.editor.detail(mediaFileId),
        })
      },
      onError: (error: unknown) => {
        saveInFlightRef.current = false
        setSettingsLock(false)
        setSettingsResetKey((value) => value + 1)
        if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.editor.detail(mediaFileId),
          })
          toast.error("The edit changed. Try again.")
          return
        }
        toast.error("Couldn't apply this change.")
      },
    })
  }

  function clearDecisionPreview(decisionId: string) {
    setDecisionPreview((current) => {
      if (!(decisionId in current)) return current
      const next = { ...current }
      delete next[decisionId]
      return next
    })
  }

  function handleDecisionError(decisionId: string, error: unknown) {
    clearDecisionPreview(decisionId)
    if (pendingRebuildRef.current === "decision") markRebuild(null)
    setAwaitingVersion(null)
    if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.editor.detail(mediaFileId),
      })
      toast.error("The edit changed. Try again.")
      return
    }
    toast.error("Couldn't update the edit.")
  }

  function keepDecision(decision: EditorDecision) {
    if (!editor || updateEditor.isPending || waitingForTimeline) return
    const version = editor.timeline.version
    setDecisionPreview((current) => ({
      ...current,
      [decision.id]: { effectiveAction: "keep", modifiedByUser: true },
    }))
    updateEditor.mutate(
      {
        type: "override_decision",
        timelineVersion: version,
        decisionId: decision.id,
        action: "keep",
      },
      {
        onSuccess: () => {
          markRebuild("decision")
          setAwaitingVersion(version)
        },
        onError: (error: unknown) => handleDecisionError(decision.id, error),
      }
    )
  }

  function resetDecision(decision: EditorDecision) {
    if (!editor || updateEditor.isPending || waitingForTimeline) return
    const version = editor.timeline.version
    setDecisionPreview((current) => ({
      ...current,
      [decision.id]: {
        effectiveAction: decision.automaticAction ?? "remove",
        modifiedByUser: false,
      },
    }))
    updateEditor.mutate(
      {
        type: "clear_decision_override",
        timelineVersion: version,
        decisionId: decision.id,
      },
      {
        onSuccess: () => {
          markRebuild("decision")
          setAwaitingVersion(version)
        },
        onError: (error: unknown) => handleDecisionError(decision.id, error),
      }
    )
  }

  function exportEdit() {
    if (!editor || rebuilding) return
    const version = editor.timeline.version
    finalizeEditor.mutate(
      {
        timelineId: editor.timeline.id,
        timelineVersion: version,
      },
      {
        onSuccess: () => {
          markRebuild("finalize")
          setAwaitingVersion(version)
          toast.success("Export started.")
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.editor.detail(mediaFileId),
            })
            toast.error("The edit changed. Try again.")
            return
          }
          toast.error(error instanceof ApiError ? error.message : "Failed to export")
        },
      }
    )
  }

  if (query.isLoading) return <EditorSkeleton />

  if (query.error instanceof ApiError && query.error.code === "EDITOR_NOT_READY") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
        Preparing your edit...
      </div>
    )
  }

  if (query.isError || !editor) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-destructive">
        {query.isError ? errorMessage(query.error) : "Failed to load editor"}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f9f9f9]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
        <h1 className="min-w-0 truncate text-sm ">{editor.media.name}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!editor.configuration || rebuilding}
            onClick={() => {
              saveInFlightRef.current = false
              setSettingsOpen(true)
            }}
          >
            <SettingsIcon />
            Configuration
          </Button>
          <Button type="button" disabled={rebuilding} onClick={exportEdit}>
            Approve and export
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {editor.media.url ? (
          <div className="relative aspect-video h-full max-h-full max-w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
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
            disabled={!editor.media.url || segments.length === 0}
            onClick={player.togglePlayback}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
          <EditStats originalMs={durationMs} keptMs={outputDurationMs} decisions={decisions} />
          <PlayerTime subscribe={player.subscribe} durationMs={outputDurationMs} />
          {timelineUpdating ? (
            <p className="text-xs text-muted-foreground">Updating the edit…</p>
          ) : null}
        </div>

        {durationMs > 0 ? (
          <SourceTimeline
            durationMs={durationMs}
            segments={segments}
            decisions={displayedDecisions}
            playing={playing}
            subscribe={player.subscribe}
            onSeekSource={player.seekSource}
            onListenDecision={(decision) =>
              player.previewSourceRange(decision.sourceStartMs, decision.sourceEndMs)
            }
            onKeepDecision={keepDecision}
            onResetDecision={resetDecision}
            actionsDisabled={updateEditor.isPending || waitingForTimeline}
          />
        ) : (
          <p className="text-sm text-muted-foreground">The edit is not ready yet.</p>
        )}
      </div>

      <EditorSettingsDrawer
        open={settingsOpen}
        onOpenChange={(next) => {
          if (!next && settingsSaving) return
          setSettingsOpen(next)
        }}
        settings={editor.configuration}
        resetKey={settingsResetKey}
        saving={settingsSaving}
        onSave={saveSettings}
      />
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="min-h-0 flex-1 animate-pulse rounded-xl bg-muted" />
      <div className="h-14 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
