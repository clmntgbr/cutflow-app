"use client"

import { ApiError } from "@/lib/api-error"
import { shareInflight } from "@/lib/query/inflight"
import { queryKeys } from "@/lib/query/keys"
import { useQuery } from "@tanstack/react-query"
import { editorApi } from "./api"

const PRESIGNED_URL_REFRESH_MS = 50 * 60 * 1000
const EDITOR_NOT_READY_POLL_MS = 2500

export function useEditor(mediaFileId: string) {
  return useQuery({
    queryKey: queryKeys.editor.detail(mediaFileId),
    queryFn: () => shareInflight(`editor:${mediaFileId}`, () => editorApi.get(mediaFileId)),
    enabled: Boolean(mediaFileId),
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 409) return false
      return failureCount < 1
    },
    refetchInterval: (query) => {
      const error = query.state.error
      if (error instanceof ApiError && error.code === "EDITOR_NOT_READY") {
        return EDITOR_NOT_READY_POLL_MS
      }
      if (query.state.data) return PRESIGNED_URL_REFRESH_MS
      return false
    },
  })
}
