import { parseApiError } from "@/lib/api-error"
import { shareInflight } from "@/lib/query/inflight"
import type { EditorAction, EditorState, FinalizeRequest } from "./types"

export const editorApi = {
  get: async (mediaFileId: string, signal?: AbortSignal): Promise<EditorState> => {
    const response = await fetch(`/api/media-files/${mediaFileId}/editor`, {
      method: "GET",
      signal,
    })

    if (!response.ok) {
      throw await parseApiError(response, "Failed to load editor")
    }

    return response.json()
  },

  update: (mediaFileId: string, action: EditorAction): Promise<void> =>
    shareInflight(`editor-patch:${mediaFileId}:${JSON.stringify(action)}`, () =>
      patchEditor(mediaFileId, action)
    ),

  finalize: async (mediaFileId: string, payload: FinalizeRequest): Promise<void> => {
    const response = await fetch(`/api/media-files/${mediaFileId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw await parseApiError(response, "Failed to export")
    }
  },
}

async function patchEditor(mediaFileId: string, action: EditorAction): Promise<void> {
  const response = await fetch(`/api/media-files/${mediaFileId}/editor`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  })

  if (!response.ok) {
    throw await parseApiError(response, "Impossible d'appliquer cette modification.")
  }
}
