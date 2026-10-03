"use client"

import { failedJobMessage, processingSteps } from "@/lib/editor/processing"
import { useProject } from "@/lib/project/hooks"
import { cn } from "@/lib/utils"
import { CheckIcon, Loader2Icon } from "lucide-react"

export function ProjectScreen({ projectId }: { projectId: string }) {
  const query = useProject(projectId)
  const project = query.data

  if (!project) return null

  const steps = processingSteps(project)
  const failure = failedJobMessage(project)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f9f9f9]">
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-xl border bg-background p-6">
          <h1 className="text-lg ">
            {project.status === "rendering"
              ? "Creating your video"
              : project.status === "completed"
                ? "Your video is ready"
                : project.status === "failed"
                  ? "Analysis failed"
                  : "Preparing your video"}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{project.name}</p>

          {project.status === "rendering" ? (
            <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground">
              <p>Preparation, edit, encoding, then finishing.</p>
              <p>You can close this panel.</p>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {steps.map((step) => (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  <StepMark state={step.state} />
                  <span
                    className={cn(
                      step.state === "pending" && "text-muted-foreground",
                      step.state === "failed" && "text-destructive"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
              {project.status === "failed" ? (
                <p className="pt-2 text-sm text-destructive">
                  {failure ?? "The analysis could not be completed."}
                </p>
              ) : (
                <p className="pt-2 text-sm text-muted-foreground">Analysis in progress…</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StepMark({ state }: { state: "pending" | "active" | "done" | "failed" }) {
  if (state === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-3" />
      </span>
    )
  }
  if (state === "active") {
    return <Loader2Icon className="size-5 animate-spin text-primary" />
  }
  if (state === "failed") {
    return <span className="size-5 rounded-full border border-destructive" />
  }
  return <span className="size-5 rounded-full border border-border" />
}
