import { ApiError, parseApiError } from "@/lib/api-error"
import type { RequestUploadURLResponse } from "./types"

export async function requestUploadUrl(
  file: File,
  signal?: AbortSignal
): Promise<RequestUploadURLResponse> {
  const response = await fetch("/api/projects/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "video/mp4",
      sizeBytes: file.size,
    }),
    signal,
  })

  if (!response.ok) {
    throw await parseApiError(response, "Failed to generate upload url")
  }

  return response.json()
}

export function uploadFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4")

    const onAbort = () => xhr.abort()
    signal?.addEventListener("abort", onAbort, { once: true })

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }

      reject(new ApiError(`Upload failed: ${xhr.status}`, xhr.status))
    }

    xhr.onerror = () => {
      cleanup()
      reject(new Error("Upload failed"))
    }

    xhr.onabort = () => {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
    }

    if (signal?.aborted) {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    xhr.send(file)
  })
}
