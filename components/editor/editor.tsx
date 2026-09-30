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
  EditorDecision,
  SilenceConfigurationPatch,
  UpdateConfigurationAction,
} from "@/lib/editor/types"
import { queryKeys } from "@/lib/query/keys"
import { useQueryClient } from "@tanstack/react-query"
import { PauseIcon, PlayIcon, SettingsIcon, SlidersHorizontalIcon } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfigurationDrawer, type ConfigurationPatch } from "./configuration-drawer"
import { EditStats } from "./edit-stats"
import { PlayerTime } from "./player-time"
import { SilenceSettingsDrawer } from "./silence-settings-drawer"
import { decisionLabel, SourceTimeline } from "./source-timeline"
import { SubtitleOverlay } from "./subtitle-overlay"

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Failed to load editor"
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
  const [playing, setPlaying] = useState(false)
  const [silenceOpen, setSilenceOpen] = useState(false)
  const [silenceResetKey, setSilenceResetKey] = useState(0)
  const [silenceLock, setSilenceLock] = useState(false)
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [configurationResetKey, setConfigurationResetKey] = useState(0)
  const [configurationLock, setConfigurationLock] = useState(false)
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null)
  const [awaitingVersion, setAwaitingVersion] = useState<number | null>(null)
  const [pendingRebuild, setPendingRebuild] = useState<
    "silence" | "configuration" | "finalize" | null
  >(null)

  const timelineVersion = editor?.timeline.version ?? null
  const waitingForTimeline =
    awaitingVersion != null && (timelineVersion ?? 0) <= awaitingVersion
  const silenceSaving = silenceLock || (pendingRebuild === "silence" && waitingForTimeline)
  const configurationSaving =
    configurationLock || (pendingRebuild === "configuration" && waitingForTimeline)
  const rebuilding =
    finalizeEditor.isPending || silenceSaving || configurationSaving || waitingForTimeline

  const onUpdated = useCallback(() => {
    setAwaitingVersion(null)
    setPendingRebuild(null)
    setSilenceLock(false)
    setConfigurationLock(false)
    setSilenceOpen(false)
    setConfigurationOpen(false)
  }, [])

  useTimelineEvents(projectId, mediaFileId, onUpdated)

  const segments = editor?.timeline.segments ?? EMPTY_SEGMENTS
  const decisions = editor?.decisions ?? []
  const durationMs = editor?.media.durationMs ?? 0
  const outputDurationMs = editor?.timeline.durationMs ?? 0
  const versionKey = editor ? `${editor.timeline.id}:${editor.timeline.version}` : null
  const selectedDecision = decisions.find((decision) => decision.id === selectedDecisionId) ?? null
  const silence = editor?.configuration.silence

  const player = useTimelinePlayer(videoRef, segments, editor?.media.url ?? null, versionKey)

  function submit(action: EditorAction) {
    if (!editor || rebuilding) return
    updateEditor.mutate(action, {
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.editor.detail(mediaFileId),
          })
          toast.error("Le montage a changé. Réessayez.")
          return
        }
        toast.error("Impossible d'appliquer cette modification.")
      },
    })
  }

  function saveSilence(patch: SilenceConfigurationPatch) {
    if (!editor || silenceSaving || configurationSaving || Object.keys(patch).length === 0) return
    const version = editor.timeline.version
    setSilenceLock(true)
    updateEditor.mutate(
      {
        type: "update_silence_configuration",
        timelineVersion: version,
        configuration: { silence: patch },
      },
      {
        onSuccess: () => {
          setPendingRebuild("silence")
          setAwaitingVersion(version)
        },
        onError: (error: unknown) => {
          setSilenceLock(false)
          setSilenceResetKey((value) => value + 1)
          if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.editor.detail(mediaFileId),
            })
            toast.error("Le montage a changé. Réessayez.")
            return
          }
          toast.error("Impossible d'appliquer cette modification.")
        },
      }
    )
  }

  async function saveConfiguration(patch: ConfigurationPatch) {
    if (!editor || configurationSaving || silenceSaving) return
    const version = editor.timeline.version
    const configuration: UpdateConfigurationAction["configuration"] = {}
    if (patch.filler) configuration.filler = patch.filler
    if (patch.repetition) configuration.repetition = patch.repetition
    if (patch.subtitles) configuration.subtitles = patch.subtitles
    const rebuild = Boolean(patch.silence || patch.filler || patch.repetition)

    setConfigurationLock(true)
    try {
      if (Object.keys(configuration).length > 0) {
        await updateEditor.mutateAsync({
          type: "update_configuration",
          timelineVersion: version,
          configuration,
        })
      }
      if (patch.silence) {
        await updateEditor.mutateAsync({
          type: "update_silence_configuration",
          timelineVersion: version,
          configuration: { silence: patch.silence },
        })
      }
      if (rebuild) {
        setPendingRebuild("configuration")
        setAwaitingVersion(version)
        return
      }
      setConfigurationLock(false)
      setConfigurationOpen(false)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.editor.detail(mediaFileId),
      })
    } catch (error: unknown) {
      setConfigurationLock(false)
      setConfigurationResetKey((value) => value + 1)
      if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.editor.detail(mediaFileId),
        })
        toast.error("Le montage a changé. Réessayez.")
        return
      }
      toast.error("Impossible d'appliquer cette modification.")
    }
  }

  function restoreDecision(decision: EditorDecision) {
    if (!editor) return
    submit({
      type: "override_decision",
      timelineVersion: editor.timeline.version,
      decisionId: decision.id,
      action: "keep",
    })
  }

  function resetDecision(decision: EditorDecision) {
    if (!editor) return
    submit({
      type: "clear_decision_override",
      timelineVersion: editor.timeline.version,
      decisionId: decision.id,
    })
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
          setPendingRebuild("finalize")
          setAwaitingVersion(version)
          toast.success("Export en cours.")
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 409 && error.code === "STALE_TIMELINE") {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.editor.detail(mediaFileId),
            })
            toast.error("Le montage a changé. Réessayez.")
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
        Préparation de votre montage...
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
        <h1 className="min-w-0 truncate text-sm font-medium">{editor.media.name}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!silence || rebuilding}
            onClick={() => setSilenceOpen(true)}
          >
            <SlidersHorizontalIcon />
            Silences
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!editor.configuration || rebuilding}
            onClick={() => setConfigurationOpen(true)}
          >
            <SettingsIcon />
            Configuration
          </Button>
          <Button type="button" disabled={rebuilding} onClick={exportEdit}>
            Valider et exporter
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {editor.media.url ? (
          <div className="relative aspect-video h-full max-h-full max-w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              src={editor.media.url}
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
          <EditStats originalMs={durationMs} keptMs={outputDurationMs} />
          <PlayerTime subscribe={player.subscribe} durationMs={outputDurationMs} />
          {rebuilding ? <p className="text-xs text-muted-foreground">Mise à jour du montage...</p> : null}
        </div>

        {selectedDecision ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {selectedDecision.label || decisionLabel(selectedDecision.type)}
            </p>
            {selectedDecision.modifiedByUser ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Modifié manuellement
              </span>
            ) : null}
            {selectedDecision.effectiveAction === "remove" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rebuilding}
                onClick={() => restoreDecision(selectedDecision)}
              >
                Restaurer
              </Button>
            ) : null}
            {selectedDecision.modifiedByUser ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rebuilding}
                onClick={() => resetDecision(selectedDecision)}
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>
        ) : null}

        {durationMs > 0 ? (
          <SourceTimeline
            durationMs={durationMs}
            segments={segments}
            decisions={decisions}
            selectedDecisionId={selectedDecision?.id ?? null}
            playing={playing}
            subscribe={player.subscribe}
            onSeekSource={player.seekSource}
            onSelectDecision={(decision) => setSelectedDecisionId(decision.id)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">The edit is not ready yet.</p>
        )}
      </div>

      {silence ? (
        <SilenceSettingsDrawer
          open={silenceOpen}
          onOpenChange={(next) => {
            if (!next && silenceSaving) return
            setSilenceOpen(next)
          }}
          settings={silence}
          resetKey={silenceResetKey}
          saving={silenceSaving}
          onSave={saveSilence}
        />
      ) : null}
      <ConfigurationDrawer
        open={configurationOpen}
        onOpenChange={(next) => {
          if (!next && configurationSaving) return
          setConfigurationOpen(next)
        }}
        settings={editor.configuration}
        resetKey={configurationResetKey}
        saving={configurationSaving}
        onSave={saveConfiguration}
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
