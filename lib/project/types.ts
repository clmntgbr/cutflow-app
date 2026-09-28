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
  originalUrl: string | null
  thumbnailUrl: string | null
  status: string
  createdAt: string
}

export interface ProjectDetail {
  id: string
  name: string
  status: ProjectStatus | string
  createdAt: string
  updatedAt: string
  mediaFiles: ProjectMediaFile[]
}
