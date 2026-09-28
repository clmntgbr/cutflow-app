"use client"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Progress } from "@/components/ui/progress"
import { useVideoUpload } from "@/lib/media/hooks"
import { formatBytes } from "@/lib/media/video"
import { Loader2Icon, XIcon } from "lucide-react"
import { useEffect } from "react"

export type SelectedVideo = {
  id: string
  file: File
  previewUrl: string
}

function fileExtensionLabel(file: File) {
  const fromName = file.name.split(".").pop()?.toUpperCase()
  if (fromName) return fromName
  return file.type.split("/")[1]?.toUpperCase() || "FILE"
}

function revokePreview(video: SelectedVideo | null) {
  if (video) URL.revokeObjectURL(video.previewUrl)
}

export interface UploadVideoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: SelectedVideo | null
  onVideoChange: (video: SelectedVideo | null) => void
}

export function UploadVideoDrawer({
  open,
  onOpenChange,
  video,
  onVideoChange,
}: UploadVideoDrawerProps) {
  const { phase, progress, error, startUpload, reset } = useVideoUpload()

  const isBusy = phase === "requesting" || phase === "uploading"
  const isFailed = phase === "failed"

  useEffect(() => {
    if (open) reset()
  }, [open, video?.id, reset])

  const attachmentState = isFailed
    ? "error"
    : phase === "uploading" || phase === "requesting"
      ? "uploading"
      : "done"

  function clearSelection() {
    revokePreview(video)
    onVideoChange(null)
    reset()
  }

  function handleRemove() {
    if (isBusy) return
    onOpenChange(false)
    clearSelection()
  }

  function handleCancel() {
    if (isBusy) return
    onOpenChange(false)
    clearSelection()
  }

  function handleUpload() {
    if (!video || isBusy) return
    const file = video.file
    const previewUrl = video.previewUrl
    void startUpload(file, {
      onUploaded: () => {
        URL.revokeObjectURL(previewUrl)
        onVideoChange(null)
        onOpenChange(false)
        reset()
      },
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isBusy) {
      clearSelection()
    }
    onOpenChange(nextOpen)
  }

  const description = isBusy
    ? null
    : video
      ? `${fileExtensionLabel(video.file)} · ${formatBytes(video.file.size)}`
      : null

  const actionLabel = isBusy
    ? phase === "uploading"
      ? "Uploading…"
      : "Preparing…"
    : isFailed
      ? "Try again"
      : "Upload"

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction="right"
      dismissible={!isBusy}
    >
      <DrawerContent
        className="flex h-full w-[80vw]! max-w-[80vw]! flex-col"
        style={{ width: "80vw", maxWidth: "80vw", backgroundColor: "#f9f9f9" }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Upload video</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center overflow-auto px-6 py-8">
            <div className="w-full">
              {!video ? (
                <p className="text-center text-sm text-muted-foreground">
                  No file selected.
                </p>
              ) : (
                <div className="flex w-full justify-center">
                  <Attachment
                    orientation="vertical"
                    state={attachmentState}
                    className="w-80! max-w-none has-data-[slot=attachment-content]:w-80!"
                  >
                    <AttachmentMedia variant="image" className="aspect-video!">
                      <video
                        src={video.previewUrl}
                        className="size-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(event) => {
                          const el = event.currentTarget
                          if (el.currentTime === 0) el.currentTime = 0.1
                        }}
                      />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{video.file.name}</AttachmentTitle>
                      <div className="mt-0.5 flex h-4 items-center">
                        {isBusy ? (
                          <Progress value={progress} className="h-1.5 w-full" />
                        ) : description ? (
                          <AttachmentDescription className="mt-0">
                            {description}
                          </AttachmentDescription>
                        ) : null}
                      </div>
                    </AttachmentContent>
                    {!isBusy ? (
                      <AttachmentActions className="group-data-[orientation=vertical]/attachment:-end-2.5! group-data-[orientation=vertical]/attachment:-top-2.5!">
                        <AttachmentAction
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Remove ${video.file.name}`}
                          className="size-7 rounded-full border border-border bg-white text-foreground shadow-none hover:bg-white"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleRemove()
                          }}
                        >
                          <XIcon className="size-3.5" />
                        </AttachmentAction>
                      </AttachmentActions>
                    ) : null}
                    <AttachmentTrigger asChild>
                      <a
                        href={video.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${video.file.name}`}
                      />
                    </AttachmentTrigger>
                  </Attachment>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t bg-background px-6 py-4">
            {error ? (
              <p className="mb-3 text-xs text-destructive">{error}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleCancel}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!video || isBusy}
                onClick={handleUpload}
              >
                {isBusy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
