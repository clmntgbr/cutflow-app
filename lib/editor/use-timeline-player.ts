"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import {
  findSegmentIndexBySource,
  firstSegmentAtOrAfter,
  outputToSource,
  sourceToOutput,
} from "./timeline-mapper"
import type { TimelineSegment } from "./types"

const FRAME_LEAD_MS = 40

export interface PlaybackTime {
  sourceMs: number
  outputMs: number
}

type TimeListener = (time: PlaybackTime) => void

function playbackOutputMs(segments: TimelineSegment[], sourceMs: number): number {
  const exact = sourceToOutput(segments, sourceMs)
  if (exact != null) return exact
  const next = firstSegmentAtOrAfter(segments, sourceMs)
  if (next) return next.outputStartMs
  return segments[segments.length - 1]?.outputEndMs ?? 0
}

function jumpTo(video: HTMLVideoElement, sourceMs: number) {
  const nextTime = sourceMs / 1000
  if (Math.abs(video.currentTime - nextTime) < 0.02) return
  video.currentTime = nextTime
}

export function useTimelinePlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  segments: TimelineSegment[],
  mediaUrl: string | null,
  timelineVersion: string | null
) {
  const segmentsRef = useRef(segments)
  const listenersRef = useRef(new Set<TimeListener>())
  const previewUntilRef = useRef<number | null>(null)
  const appliedVersionRef = useRef<string | null>(null)
  const heldSourceMsRef = useRef(0)
  const heldPausedRef = useRef(true)
  const reloadingSrcRef = useRef(false)

  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  const rememberTime = useCallback((video: HTMLVideoElement) => {
    const sourceMs = video.currentTime * 1000
    if (reloadingSrcRef.current && sourceMs < 250 && heldSourceMsRef.current > 1000) return
    heldSourceMsRef.current = sourceMs
  }, [])

  const publish = useCallback((video: HTMLVideoElement) => {
    rememberTime(video)
    const sourceMs = heldSourceMsRef.current
    const outputMs = playbackOutputMs(segmentsRef.current, sourceMs)
    const snapshot = { sourceMs, outputMs }
    for (const listener of listenersRef.current) listener(snapshot)
  }, [rememberTime])

  const restoreHeldTime = useCallback((video: HTMLVideoElement) => {
    const held = heldSourceMsRef.current
    if (held <= 250) return
    if (Math.abs(video.currentTime * 1000 - held) <= 250) return
    jumpTo(video, held)
    if (!heldPausedRef.current) void video.play()
  }, [])

  const enforcePlayback = useCallback((video: HTMLVideoElement) => {
    if (video.paused || video.seeking) return

    const sourceMs = video.currentTime * 1000
    const previewUntil = previewUntilRef.current
    if (previewUntil != null) {
      if (sourceMs >= previewUntil) {
        previewUntilRef.current = null
        video.pause()
      }
      return
    }

    const current = segmentsRef.current
    if (current.length === 0) return

    const index = findSegmentIndexBySource(current, sourceMs)
    if (index >= 0) {
      const segment = current[index]
      const playedMs = sourceMs - segment.sourceStartMs
      if (playedMs < FRAME_LEAD_MS) return
      if (sourceMs < segment.sourceEndMs - FRAME_LEAD_MS) return
      const next = current[index + 1]
      if (next) jumpTo(video, next.sourceStartMs)
      else video.pause()
      return
    }

    const next = firstSegmentAtOrAfter(current, sourceMs)
    if (next) jumpTo(video, next.sourceStartMs)
    else video.pause()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !mediaUrl) return

    if (video.getAttribute("src") !== mediaUrl) {
      const heldSeconds = Math.max(video.currentTime, heldSourceMsRef.current / 1000)
      if (heldSeconds > 0.25) heldSourceMsRef.current = heldSeconds * 1000
      reloadingSrcRef.current = heldSeconds > 0.25
      const onReady = () => {
        restoreHeldTime(video)
        reloadingSrcRef.current = false
      }
      video.addEventListener("loadedmetadata", onReady, { once: true })
      video.src = mediaUrl
    }

    let frameHandle = 0
    let stopped = false
    const hasVideoFrame = typeof video.requestVideoFrameCallback === "function"

    const stopFrames = () => {
      if (hasVideoFrame) video.cancelVideoFrameCallback(frameHandle)
      else cancelAnimationFrame(frameHandle)
    }

    const onFrame = () => {
      if (stopped) return
      enforcePlayback(video)
      publish(video)
      if (video.paused) return
      if (hasVideoFrame) frameHandle = video.requestVideoFrameCallback(onFrame)
      else frameHandle = requestAnimationFrame(onFrame)
    }

    const startFrames = () => {
      stopFrames()
      if (hasVideoFrame) frameHandle = video.requestVideoFrameCallback(onFrame)
      else frameHandle = requestAnimationFrame(onFrame)
    }

    const onPlay = () => {
      heldPausedRef.current = false
      startFrames()
    }
    const onPause = () => {
      heldPausedRef.current = true
      stopFrames()
      publish(video)
    }
    const onSeeked = () => publish(video)

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("seeked", onSeeked)
    if (!video.paused) startFrames()
    else publish(video)

    return () => {
      stopped = true
      stopFrames()
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("seeked", onSeeked)
    }
  }, [enforcePlayback, mediaUrl, publish, restoreHeldTime, videoRef])

  useEffect(() => {
    if (!timelineVersion) return
    if (appliedVersionRef.current == null) {
      appliedVersionRef.current = timelineVersion
      return
    }
    if (appliedVersionRef.current === timelineVersion) return
    appliedVersionRef.current = timelineVersion

    const video = videoRef.current
    if (!video) return
    restoreHeldTime(video)
    if (Math.abs(video.currentTime * 1000 - heldSourceMsRef.current) <= 250) {
      publish(video)
    }
  }, [publish, restoreHeldTime, timelineVersion, videoRef])

  const subscribe = useCallback((listener: TimeListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const seekSource = useCallback(
    (sourceMs: number) => {
      const video = videoRef.current
      if (!video) return
      previewUntilRef.current = null
      jumpTo(video, sourceMs)
    },
    [videoRef]
  )

  const seekOutput = useCallback(
    (outputMs: number) => {
      seekSource(outputToSource(segmentsRef.current, outputMs))
    },
    [seekSource]
  )

  const previewSourceRange = useCallback(
    (startMs: number, endMs: number) => {
      const video = videoRef.current
      if (!video) return
      previewUntilRef.current = endMs
      jumpTo(video, startMs)
      void video.play()
    },
    [videoRef]
  )

  const togglePlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }, [videoRef])

  return { subscribe, seekSource, seekOutput, previewSourceRange, togglePlayback }
}
