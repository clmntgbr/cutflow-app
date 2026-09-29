import type {
  ProjectDetail,
  ProjectMediaFile,
  ProjectTimeline,
  TimelineDecision,
  TimelineSegment,
} from "@/lib/project/types"

export const EMPTY_SEGMENTS: TimelineSegment[] = []
export const EMPTY_DECISIONS: TimelineDecision[] = []

export function primaryMedia(project: ProjectDetail): ProjectMediaFile | null {
  return project.mediaFiles[0] ?? null
}

export function activeTimeline(
  project: ProjectDetail,
  mediaFileId: string
): ProjectTimeline | null {
  const timelines = (project.timelines ?? []).filter(
    (timeline) => timeline.mediaFileId === mediaFileId
  )
  if (timelines.length === 0) return null

  return (
    timelines.find((timeline) => timeline.isActive) ??
    timelines.reduce((latest, timeline) =>
      timeline.version > latest.version ? timeline : latest
    )
  )
}

export function sourceDurationMs(
  media: ProjectMediaFile | null,
  timeline: ProjectTimeline | null
): number {
  if (media && media.durationMs > 0) return media.durationMs
  const segments = timeline?.segments ?? []
  const lastSegment = segments[segments.length - 1]
  return lastSegment?.sourceEndMs ?? timeline?.durationMs ?? 0
}

export function findSegmentIndexBySource(
  segments: TimelineSegment[],
  sourceMs: number
): number {
  let low = 0
  let high = segments.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    const segment = segments[mid]
    if (sourceMs < segment.sourceStartMs) high = mid - 1
    else if (sourceMs >= segment.sourceEndMs) low = mid + 1
    else return mid
  }

  return -1
}

export function findSegmentByOutput(
  segments: TimelineSegment[],
  outputMs: number
): TimelineSegment | null {
  if (segments.length === 0) return null

  let low = 0
  let high = segments.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    const segment = segments[mid]
    const isLast = mid === segments.length - 1
    const endsBefore = isLast
      ? outputMs > segment.outputEndMs
      : outputMs >= segment.outputEndMs

    if (outputMs < segment.outputStartMs) high = mid - 1
    else if (endsBefore) low = mid + 1
    else return segment
  }

  return null
}

export function firstSegmentAtOrAfter(
  segments: TimelineSegment[],
  sourceMs: number
): TimelineSegment | null {
  let low = 0
  let high = segments.length - 1
  let match = -1

  while (low <= high) {
    const mid = (low + high) >> 1
    if (segments[mid].sourceStartMs >= sourceMs) {
      match = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  if (match === -1) return null
  return segments[match]
}

export function sourceToOutput(
  segments: TimelineSegment[],
  sourceMs: number
): number {
  const index = findSegmentIndexBySource(segments, sourceMs)
  if (index >= 0) {
    const segment = segments[index]
    return segment.outputStartMs + (sourceMs - segment.sourceStartMs)
  }

  const next = firstSegmentAtOrAfter(segments, sourceMs)
  if (next) return next.outputStartMs

  const last = segments[segments.length - 1]
  return last?.outputEndMs ?? 0
}

export function outputToSource(
  segments: TimelineSegment[],
  outputMs: number
): number {
  const segment = findSegmentByOutput(segments, outputMs)
  if (segment) {
    return segment.sourceStartMs + (outputMs - segment.outputStartMs)
  }

  const last = segments[segments.length - 1]
  if (!last) return 0
  if (outputMs >= last.outputEndMs) return last.sourceEndMs
  return segments[0]?.sourceStartMs ?? 0
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function formatTimestampMs(ms: number): string {
  const clamped = Math.max(0, Math.round(ms))
  const minutes = Math.floor(clamped / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1000)
  const millis = clamped % 1000
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}
