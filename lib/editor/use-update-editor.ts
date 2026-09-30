"use client"

import { useMutation } from "@tanstack/react-query"
import { editorApi } from "./api"
import type { EditorAction, FinalizeRequest } from "./types"

export function useUpdateEditor(mediaFileId: string) {
  return useMutation({
    mutationFn: (action: EditorAction) => editorApi.update(mediaFileId, action),
  })
}

export function useFinalizeEditor(mediaFileId: string) {
  return useMutation({
    mutationFn: (payload: FinalizeRequest) => editorApi.finalize(mediaFileId, payload),
  })
}
