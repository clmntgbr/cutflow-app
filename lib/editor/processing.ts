import type { ProjectDetail, ProjectJob } from "@/lib/project/types"

export type ProcessingStepState = "pending" | "active" | "done" | "failed"

export interface ProcessingStep {
  id: string
  label: string
  state: ProcessingStepState
}

const JOB_STEPS: { id: string; label: string; jobs: string[] }[] = [
  { id: "audio", label: "Audio extracted", jobs: ["extract_audio"] },
  { id: "transcript", label: "Transcription complete", jobs: ["transcribe_audio"] },
  { id: "silence", label: "Silences detected", jobs: ["detect_silence"] },
  {
    id: "content",
    label: "Content analysis",
    jobs: ["analyze_transcript", "analyze_viral"],
  },
  { id: "edit", label: "Edit preparation", jobs: ["rebuild_timeline"] },
]

function latestJob(jobs: ProjectJob[], name: string): ProjectJob | undefined {
  let latest: ProjectJob | undefined
  for (const job of jobs) {
    if (job.name !== name) continue
    if (!latest || job.createdAt > latest.createdAt) latest = job
  }
  return latest
}

function jobState(job: ProjectJob | undefined): ProcessingStepState {
  if (!job) return "pending"
  if (job.status === "success" || job.status === "succeeded" || job.status === "completed") {
    return "done"
  }
  if (job.status === "failed" || job.status === "error") return "failed"
  return "active"
}

function combine(states: ProcessingStepState[]): ProcessingStepState {
  if (states.some((state) => state === "failed")) return "failed"
  if (states.every((state) => state === "done")) return "done"
  if (states.some((state) => state === "active" || state === "done")) return "active"
  return "pending"
}

export function processingSteps(project: ProjectDetail): ProcessingStep[] {
  const jobs = project.jobs ?? []
  const media = project.mediaFiles[0]
  const videoReady = media?.status === "ready" || (media?.durationMs ?? 0) > 0

  const steps: ProcessingStep[] = [
    {
      id: "video",
      label: "Video analyzed",
      state: videoReady ? "done" : project.status === "failed" ? "failed" : "active",
    },
    ...JOB_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      state: combine(step.jobs.map((name) => jobState(latestJob(jobs, name)))),
    })),
  ]

  if (project.status !== "processing" && project.status !== "draft") return steps

  const hasActive = steps.some((step) => step.state === "active")
  const hasFailed = steps.some((step) => step.state === "failed")
  if (hasActive || hasFailed) return steps

  const nextPending = steps.find((step) => step.state === "pending")
  if (!nextPending) return steps

  return steps.map((step) =>
    step.id === nextPending.id ? { ...step, state: "active" } : step
  )
}

export function failedJobMessage(project: ProjectDetail): string | null {
  const failed = (project.jobs ?? []).find(
    (job) => job.status === "failed" || job.status === "error"
  )
  return failed?.errorMessage ?? null
}
