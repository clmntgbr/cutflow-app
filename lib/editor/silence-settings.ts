import type { SilenceDetectionLevel } from "./types"

export const DETECTION_LEVELS: { id: SilenceDetectionLevel; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "moderate", label: "Moderate" },
  { id: "aggressive", label: "Aggressive" },
  { id: "very_aggressive", label: "Very aggressive" },
]

export function formatSettingSeconds(ms: number) {
  const seconds = ms / 1000
  return `${Number(seconds.toFixed(2))}s`
}
