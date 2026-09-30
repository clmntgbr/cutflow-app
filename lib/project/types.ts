export type ProjectStatus =
  | "draft"
  | "processing"
  | "ready"
  | "rendering"
  | "completed"
  | "failed"

export interface ProjectListItem {
  id: string
  name: string
  status: ProjectStatus | string
  createdAt: string
  thumbnailUrl?: string | null
}

export interface PaginatedProjects {
  total: number
  page: number
  limit: number
  totalPages: number
  members: ProjectListItem[]
}

export interface ProjectMediaFile {
  id: string
  originalFilename: string | null
  mimeType: string | null
  sizeBytes: number
  durationMs: number
  width?: number
  height?: number
  fps?: number
  originalUrl: string | null
  thumbnailUrl: string | null
  status: string
  createdAt: string
}

export interface ProjectJob {
  id: string
  mediaFileId: string
  name: string
  status: string
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface TimelineSegment {
  index: number
  mediaFileId: string
  sourceStartMs: number
  sourceEndMs: number
  outputStartMs: number
  outputEndMs: number
}

export interface TimelineDecision {
  id: string
  mediaFileId: string
  type: string
  sourceStartMs: number
  sourceEndMs: number
  action: string
  source: string
  confidence: number | null
  reasons: string[]
}

export interface ProjectTimeline {
  id: string
  mediaFileId: string
  version: number
  durationMs: number
  isActive: boolean
  segments: TimelineSegment[]
  decisions: TimelineDecision[]
  createdAt: string
  updatedAt: string
}

export type SilenceThresholdMode = "auto" | "manual"

export type SilenceDetectionLevel =
  | "low"
  | "moderate"
  | "aggressive"
  | "very_aggressive"

export interface MediaConfiguration {
  id: string
  mediaFileId: string
  silenceRemovalEnabled: boolean
  silenceThresholdMode: SilenceThresholdMode | string
  silenceThresholdDb?: number | null
  noiseFloorDb?: number | null
  calculatedSilenceThresholdDb?: number | null
  silenceDetectionLevel: SilenceDetectionLevel | string
  silencePaddingBeforeMs: number
  silencePaddingAfterMs: number
  silenceMinDurationMs: number
  speechMinDurationMs: number
}

export interface ProjectDetail {
  id: string
  name: string
  status: ProjectStatus | string
  createdAt: string
  updatedAt: string
  mediaFiles: ProjectMediaFile[]
  jobs?: ProjectJob[]
  timelines?: ProjectTimeline[]
  configurations?: MediaConfiguration[]
}
