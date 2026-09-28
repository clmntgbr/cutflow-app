export const MAX_VIDEO_BYTES = 2147483648

export const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "mpeg",
  "mpg",
  "wmv",
  "asf",
  "flv",
  "webm",
  "ogg",
  "ogv",
] as const

export const VIDEO_ACCEPT = [
  "video/*",
  ...VIDEO_EXTENSIONS.map((extension) => `.${extension}`),
] as const

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true
  const extension = file.name.split(".").pop()?.toLowerCase()
  return VIDEO_EXTENSIONS.some((allowed) => allowed === extension)
}

export function videoContentType(file: File): string {
  return file.type || "video/mp4"
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unitIndex]}`
}
