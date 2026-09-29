"use client"

import { ApiError } from "@/lib/api-error"
import { queryKeys } from "@/lib/query/keys"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { requestUploadUrl, uploadFileToPresignedUrl } from "./api"
import type { RequestUploadURLResponse } from "./types"

export type VideoUploadPhase = "idle" | "requesting" | "uploading" | "failed"

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  )
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldError = error.errors ? Object.values(error.errors)[0] : undefined
    return fieldError || error.message
  }
  if (error instanceof Error && error.message) return error.message
  return "Upload failed"
}

export function useVideoUpload() {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<VideoUploadPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [upload, setUpload] = useState<RequestUploadURLResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)
  const inFlightRef = useRef(false)

  const reset = useCallback(() => {
    runIdRef.current += 1
    inFlightRef.current = false
    abortRef.current?.abort()
    abortRef.current = null
    setPhase("idle")
    setProgress(0)
    setUpload(null)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const startUpload = useCallback(async (
    file: File,
    options?: { onUploaded?: () => void }
  ) => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const runId = runIdRef.current + 1
    runIdRef.current = runId

    const isCurrent = () =>
      runIdRef.current === runId && !controller.signal.aborted

    setError(null)
    setProgress(0)
    setUpload(null)
    setPhase("requesting")

    try {
      const presign = await requestUploadUrl(file, controller.signal)
      if (!isCurrent()) return

      setUpload(presign)
      setPhase("uploading")
      await uploadFileToPresignedUrl(
        file,
        presign.uploadUrl,
        (next) => {
          if (isCurrent()) setProgress(next)
        },
        controller.signal
      )

      if (!isCurrent()) return

      setProgress(100)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      options?.onUploaded?.()
      if (isCurrent()) setPhase("idle")
    } catch (caught) {
      if (!isCurrent() || isAbortError(caught)) return

      const message = uploadErrorMessage(caught)
      setError(message)
      setPhase("failed")
      toast.error(message)
    } finally {
      if (runIdRef.current === runId) {
        inFlightRef.current = false
      }
    }
  }, [queryClient])

  return { phase, progress, upload, error, startUpload, reset }
}
