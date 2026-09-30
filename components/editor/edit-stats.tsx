function formatStatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const ss = String(seconds).padStart(2, "0")
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`
  return `${minutes}:${ss}`
}

function compressionPercent(originalMs: number, removedMs: number): number {
  if (originalMs <= 0) return 0
  return Math.round((removedMs / originalMs) * 100)
}

export function EditStats({
  originalMs,
  keptMs,
}: {
  originalMs: number
  keptMs: number
}) {
  const removedMs = Math.max(0, originalMs - keptMs)
  const stats = [
    { label: "Originale", value: formatStatDuration(originalMs) },
    { label: "Conservé :", value: formatStatDuration(keptMs) },
    { label: "Supprimé :", value: formatStatDuration(removedMs) },
    { label: "Compression", value: `${compressionPercent(originalMs, removedMs)}%` },
  ]

  return (
    <div className="flex items-center gap-5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col leading-tight">
          <span className="text-[11px] text-muted-foreground">{stat.label}</span>
          <span className="text-sm font-medium tabular-nums">{stat.value}</span>
        </div>
      ))}
    </div>
  )
}
