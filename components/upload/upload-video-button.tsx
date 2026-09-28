"use client"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  UploadVideoDrawer,
  type SelectedVideo,
} from "@/components/upload/upload-video-drawer"
import { formatBytes, isVideoFile, MAX_VIDEO_BYTES, VIDEO_ACCEPT } from "@/lib/media/video"
import { FileVideo } from "lucide-react"
import * as React from "react"
import type { ComponentProps } from "react"
import { toast } from "sonner"

export function UploadVideoButton({
  className,
  disabled,
  title,
  variant = "outline",
  size = "sm",
}: {
  className?: string
  disabled?: boolean
  title?: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [video, setVideo] = React.useState<SelectedVideo | null>(null)
  const [pickError, setPickError] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (video) URL.revokeObjectURL(video.previewUrl)
    }
  }, [video])

  function handlePick() {
    if (disabled) return
    setPickError(null)
    inputRef.current?.click()
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (raw.length !== 1) {
      if (raw.length > 1) {
        const message = "Please upload one video at a time."
        setPickError(message)
        toast.error(message)
      }
      return
    }

    const file = raw[0]
    if (!file || !isVideoFile(file)) {
      const message = "Please choose a video file."
      setPickError(message)
      toast.error(message)
      return
    }

    if (file.name.length > 255) {
      const message = "Filename must be 255 characters or fewer."
      setPickError(message)
      toast.error(message)
      return
    }

    if (file.size > MAX_VIDEO_BYTES) {
      const message = `Files must be under ${formatBytes(MAX_VIDEO_BYTES)}.`
      setPickError(message)
      toast.error(message)
      return
    }

    if (video) URL.revokeObjectURL(video.previewUrl)

    setPickError(null)
    setVideo({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setOpen(true)
  }

  return (
    <>
      <HoverCard openDelay={10} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button
            type="button"
            size={size}
            variant={variant}
            className={className}
            onClick={handlePick}
            disabled={disabled}
          >
            <FileVideo className="size-4" aria-hidden="true" />
            {title ?? "Upload video"}
          </Button>
        </HoverCardTrigger>
        <HoverCardContent align="end" className="flex w-64 flex-col gap-0.5">
          <div className="font-semibold">{title ?? "Upload video"}</div>
          <div>
            Select one video. Max {formatBytes(MAX_VIDEO_BYTES)}.
          </div>
          {pickError ? (
            <div className="mt-1 text-destructive">{pickError}</div>
          ) : null}
        </HoverCardContent>
      </HoverCard>
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT.join(",")}
        className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        tabIndex={-1}
        onChange={handleFilesSelected}
      />
      <UploadVideoDrawer
        open={open}
        onOpenChange={setOpen}
        video={video}
        onVideoChange={setVideo}
      />
    </>
  )
}
