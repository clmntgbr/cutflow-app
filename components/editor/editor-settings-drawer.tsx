"use client"

import { Button } from "@/components/ui/button"
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Switch } from "@/components/ui/switch"
import {
  DETECTION_LEVELS,
  formatSettingSeconds,
} from "@/lib/editor/silence-settings"
import type {
  EditorConfiguration,
  SilenceConfigurationPatch,
  SilenceDetectionLevel,
  SilenceThresholdMode,
} from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { Drawer as DrawerPrimitive } from "vaul"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"

const PADDING_BEFORE = { min: 0, max: 400, step: 10 }
const PADDING_AFTER = { min: 0, max: 500, step: 10 }
const MIN_SILENCE = { min: 100, max: 2000, step: 50 }

export interface EditorSettingsPatch {
  silence?: SilenceConfigurationPatch
  filler?: { enabled: boolean }
  repetition?: { enabled: boolean }
  subtitles?: { enabled: boolean }
}

interface SettingsDraft {
  silenceEnabled: boolean
  fillerEnabled: boolean
  repetitionEnabled: boolean
  subtitlesEnabled: boolean
  thresholdMode: SilenceThresholdMode
  detectionLevel: SilenceDetectionLevel
  paddingBeforeMs: number
  paddingAfterMs: number
  minDurationMs: number
}

function draftFromSettings(settings: EditorConfiguration): SettingsDraft {
  return {
    silenceEnabled: settings.silence.enabled,
    fillerEnabled: settings.filler.enabled,
    repetitionEnabled: settings.repetition.enabled,
    subtitlesEnabled: settings.subtitles.enabled,
    thresholdMode: settings.silence.thresholdMode,
    detectionLevel: settings.silence.detectionLevel,
    paddingBeforeMs: settings.silence.paddingBeforeMs,
    paddingAfterMs: settings.silence.paddingAfterMs,
    minDurationMs: settings.silence.minDurationMs,
  }
}

function settingsPatch(draft: SettingsDraft, settings: EditorConfiguration): EditorSettingsPatch {
  const patch: EditorSettingsPatch = {}
  const silence: SilenceConfigurationPatch = {}

  if (draft.silenceEnabled !== settings.silence.enabled) silence.enabled = draft.silenceEnabled
  if (draft.thresholdMode !== settings.silence.thresholdMode) {
    silence.thresholdMode = draft.thresholdMode
  }
  if (draft.detectionLevel !== settings.silence.detectionLevel) {
    silence.detectionLevel = draft.detectionLevel
  }
  if (draft.minDurationMs !== settings.silence.minDurationMs) {
    silence.minDurationMs = draft.minDurationMs
  }
  if (draft.paddingBeforeMs !== settings.silence.paddingBeforeMs) {
    silence.paddingBeforeMs = draft.paddingBeforeMs
  }
  if (draft.paddingAfterMs !== settings.silence.paddingAfterMs) {
    silence.paddingAfterMs = draft.paddingAfterMs
  }
  if (Object.keys(silence).length > 0) patch.silence = silence
  if (draft.fillerEnabled !== settings.filler.enabled) {
    patch.filler = { enabled: draft.fillerEnabled }
  }
  if (draft.repetitionEnabled !== settings.repetition.enabled) {
    patch.repetition = { enabled: draft.repetitionEnabled }
  }
  if (draft.subtitlesEnabled !== settings.subtitles.enabled) {
    patch.subtitles = { enabled: draft.subtitlesEnabled }
  }
  return patch
}

export function EditorSettingsDrawer({
  open,
  onOpenChange,
  settings,
  resetKey,
  saving = false,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: EditorConfiguration
  resetKey: number
  saving?: boolean
  onSave: (patch: EditorSettingsPatch) => void
}) {
  const settingsKey = [
    resetKey,
    settings.silence.enabled,
    settings.filler.enabled,
    settings.repetition.enabled,
    settings.subtitles.enabled,
    settings.silence.thresholdMode,
    settings.silence.detectionLevel,
    settings.silence.paddingBeforeMs,
    settings.silence.paddingAfterMs,
    settings.silence.minDurationMs,
  ].join(":")
  const [local, setLocal] = useState<{ key: string; value: SettingsDraft } | null>(null)
  const draft = local?.key === settingsKey ? local.value : draftFromSettings(settings)
  const patch = settingsPatch(draft, settings)
  const dirty = Object.keys(patch).length > 0
  const saveBody: EditorSettingsPatch = {
    silence: {
      enabled: draft.silenceEnabled,
      ...patch.silence,
    },
    filler: { enabled: draft.fillerEnabled },
    repetition: { enabled: draft.repetitionEnabled },
    subtitles: { enabled: draft.subtitlesEnabled },
  }
  const detectionIndex = Math.max(
    0,
    DETECTION_LEVELS.findIndex((level) => level.id === draft.detectionLevel)
  )
  const silenceDetailsDisabled = saving || !draft.silenceEnabled

  function update(next: Partial<SettingsDraft>) {
    if (saving) return
    setLocal({ key: settingsKey, value: { ...draft, ...next } })
  }

  return (
    <DrawerPrimitive.NestedRoot open={open} onOpenChange={onOpenChange} direction="right" handleOnly>
      <DrawerContent
        className="flex h-full w-[80vw]! max-w-[80vw]! flex-col"
        style={{ width: "80vw", maxWidth: "80vw" }}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>Configuration</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <section className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="">Edit</h2>
                <p className="text-sm text-muted-foreground">
                  Choose what the edit removes, and whether subtitles are shown.
                </p>
              </div>
              <div className="flex flex-col gap-6 md:col-span-2">
                <OptionSwitch
                  label="Silence"
                  description="Cut detected silences."
                  checked={draft.silenceEnabled}
                  disabled={saving}
                  onCheckedChange={(silenceEnabled) => update({ silenceEnabled })}
                />
                <OptionSwitch
                  label="Fillers"
                  description="Cut filler words."
                  checked={draft.fillerEnabled}
                  disabled={saving}
                  onCheckedChange={(fillerEnabled) => update({ fillerEnabled })}
                />
                <OptionSwitch
                  label="Repetitions"
                  description="Cut repetitions and false starts."
                  checked={draft.repetitionEnabled}
                  disabled={saving}
                  onCheckedChange={(repetitionEnabled) => update({ repetitionEnabled })}
                />
                <OptionSwitch
                  label="Subtitles"
                  description="Show subtitles. This does not rebuild the timeline."
                  checked={draft.subtitlesEnabled}
                  disabled={saving}
                  onCheckedChange={(subtitlesEnabled) => update({ subtitlesEnabled })}
                />
              </div>
            </section>

            <div className="my-10 h-px w-full bg-border" />

            <section className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="">Silence</h2>
                <p className="text-sm text-muted-foreground">
                  Detection level, padding around speech, and the shortest silence that gets
                  removed.
                </p>
              </div>
              <div
                className={cn(
                  "flex flex-col gap-6 md:col-span-2",
                  silenceDetailsDisabled && "opacity-60"
                )}
              >
                <div className="space-y-2">
                  <p className="text-sm ">Detection level</p>
                  <SettingSlider
                    min={0}
                    max={DETECTION_LEVELS.length - 1}
                    step={1}
                    value={detectionIndex}
                    disabled={silenceDetailsDisabled}
                    onChange={(index) =>
                      update({
                        detectionLevel: DETECTION_LEVELS[index].id,
                      })
                    }
                  />
                  <div className="grid grid-cols-4 text-center text-xs text-muted-foreground">
                    {DETECTION_LEVELS.map((level) => (
                      <span
                        key={level.id}
                        className={cn(
                          level.id === draft.detectionLevel && " text-foreground"
                        )}
                      >
                        {level.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Controls how sensitive detection is. A more aggressive level cuts more
                    background noise.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <SliderField
                    label="Padding before speech"
                    valueLabel={formatSettingSeconds(draft.paddingBeforeMs)}
                    description="Time kept before each segment (for the intro)."
                    minLabel="Minimal"
                    maxLabel="Generous"
                    min={PADDING_BEFORE.min}
                    max={PADDING_BEFORE.max}
                    step={PADDING_BEFORE.step}
                    value={draft.paddingBeforeMs}
                    disabled={silenceDetailsDisabled}
                    onChange={(paddingBeforeMs) => update({ paddingBeforeMs })}
                  />
                  <SliderField
                    label="Padding after speech"
                    valueLabel={formatSettingSeconds(draft.paddingAfterMs)}
                    description="Time kept after each segment (for the outro)."
                    minLabel="Minimal"
                    maxLabel="Generous"
                    min={PADDING_AFTER.min}
                    max={PADDING_AFTER.max}
                    step={PADDING_AFTER.step}
                    value={draft.paddingAfterMs}
                    disabled={silenceDetailsDisabled}
                    onChange={(paddingAfterMs) => update({ paddingAfterMs })}
                  />
                </div>

                <SliderField
                  label="Minimum silence duration"
                  valueLabel={formatSettingSeconds(draft.minDurationMs)}
                  description="Shortest silence that gets removed."
                  minLabel="Short"
                  maxLabel="Long"
                  min={MIN_SILENCE.min}
                  max={MIN_SILENCE.max}
                  step={MIN_SILENCE.step}
                  value={draft.minDurationMs}
                  disabled={silenceDetailsDisabled}
                  onChange={(minDurationMs) => update({ minDurationMs })}
                />
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t bg-background px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!dirty || saving}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (saving || !dirty) return
                  onSave(saveBody)
                }}
              >
                Save
                {saving ? <Loader2Icon className="ml-2 size-4 animate-spin" /> : null}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </DrawerPrimitive.NestedRoot>
  )
}

function OptionSwitch({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm ">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function SliderField({
  label,
  valueLabel,
  description,
  minLabel,
  maxLabel,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string
  valueLabel: string
  description: string
  minLabel: string
  maxLabel: string
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm ">{label}</p>
        <p className="text-sm text-muted-foreground">{valueLabel}</p>
      </div>
      <SettingSlider
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function SettingSlider({
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const ratio = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed",
        "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-background"
      )}
      style={{
        background: `linear-gradient(to right, var(--foreground) ${ratio}%, var(--border) ${ratio}%)`,
      }}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}
