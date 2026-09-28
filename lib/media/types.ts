export type UUID = string
export type ISODateTime = string

export interface RequestUploadURLRequest {
  filename: string
  contentType: string
  sizeBytes: number
}

export interface RequestUploadURLResponse {
  projectId: UUID
  mediaFileId: UUID
  uploadUrl: string
  expiresAt: ISODateTime
}

export interface RealtimeConnection {
  token: string
  channel: string
  wsUrl: string
}

export interface MediaFileUploadedRealtimePayload {
  type: "media_file.uploaded"
  mediaFileId: UUID
  projectId: UUID
  status: "uploaded"
  occurredAt: ISODateTime
}
