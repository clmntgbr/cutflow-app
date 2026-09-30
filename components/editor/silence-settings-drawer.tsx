"use client"

import { Button } from "@/components/ui/button"
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DETECTION_LEVELS,
  formatSettingSeconds,
} from "@/lib/editor/silence-settings"
import type {
  SilenceConfiguration,
  SilenceConfigurationPatch,
  SilenceDetectionLevel,
} from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { Drawer as DrawerPrimitive } from "vaul"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  AudioLinesIcon,
  HourglassIcon,
  Loader2Icon,
} from "lucide-react"
import { useState, type ReactNode } from "react"

const PADDING_BEFORE = { min: 0, max: 400, step: 10 }
const PADDING_AFTER = { min: 0, max: 500, step: 10 }
const MIN_SILENCE = { min: 100, max: 2000, step: 50 }

function silencePatch(
  draft: SilenceConfiguration,
  settings: SilenceConfiguration
): SilenceConfigurationPatch {
  const patch: SilenceConfigurationPatch = {}
  if (draft.thresholdMode !== settings.thresholdMode) patch.thresholdMode = draft.thresholdMode
  if (draft.detectionLevel !== settings.detectionLevel) patch.detectionLevel = draft.detectionLevel
  if (draft.minDurationMs !== settings.minDurationMs) patch.minDurationMs = draft.minDurationMs
  if (draft.paddingBeforeMs !== settings.paddingBeforeMs) {
    patch.paddingBeforeMs = draft.paddingBeforeMs
  }
  if (draft.paddingAfterMs !== settings.paddingAfterMs) patch.paddingAfterMs = draft.paddingAfterMs
  return patch
}

export function SilenceSettingsDrawer({
  open,
  onOpenChange,
  settings,
  resetKey,
  saving = false,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: SilenceConfiguration
  resetKey: number
  saving?: boolean
  onSave: (patch: SilenceConfigurationPatch) => void
}) {
  const settingsKey = [
    resetKey,
    settings.thresholdMode,
    settings.detectionLevel,
    settings.paddingBeforeMs,
    settings.paddingAfterMs,
    settings.minDurationMs,
  ].join(":")
  const [local, setLocal] = useState<{ key: string; value: SilenceConfiguration } | null>(null)
  const draft = local?.key === settingsKey ? local.value : settings

  function update(patch: Partial<SilenceConfiguration>) {
    if (saving) return
    setLocal({ key: settingsKey, value: { ...draft, ...patch } })
  }

  const patch = silencePatch(draft, settings)
  const dirty = Object.keys(patch).length > 0

  const detectionIndex = Math.max(
    0,
    DETECTION_LEVELS.findIndex((level) => level.id === draft.detectionLevel)
  )

  return (
    <DrawerPrimitive.NestedRoot
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      handleOnly
    >
      <DrawerContent
        className="flex h-full w-[80vw]! max-w-[80vw]! flex-col bg-[#f7f7f8]"
        style={{
          width: "80vw",
          maxWidth: "80vw",
          backgroundColor: "#f7f7f8",
        }}
      >
        <DrawerHeader className="border-b bg-background px-6">
          <DrawerTitle>Silence</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <section className="rounded-2xl border border-orange-100 bg-[#fff6ee] p-4">
            <div className="mt-4">
              <p className="text-sm font-medium text-orange-600">Detection level</p>
              <SettingSlider
                className="mt-3"
                min={0}
                max={DETECTION_LEVELS.length - 1}
                step={1}
                value={detectionIndex}
                color="#fb923c"
                disabled={saving}
                onChange={(index) =>
                  update({
                    detectionLevel: DETECTION_LEVELS[index].id as SilenceDetectionLevel,
                  })
                }
              />
              <div className="mt-2 grid grid-cols-4 text-center text-xs text-muted-foreground">
                {DETECTION_LEVELS.map((level) => (
                  <span
                    key={level.id}
                    className={cn(
                      level.id === draft.detectionLevel &&
                        "font-semibold text-orange-600"
                    )}
                  >
                    {level.label}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Controls how sensitive detection is. A more aggressive level cuts
                more background noise.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PaddingControl
                title="Padding before speech"
                seconds={formatSettingSeconds(draft.paddingBeforeMs)}
                hint="Time kept before each segment (for the intro)."
                icon={<ArrowLeftIcon className="size-4" />}
                min={PADDING_BEFORE.min}
                max={PADDING_BEFORE.max}
                step={PADDING_BEFORE.step}
                value={draft.paddingBeforeMs}
                disabled={saving}
                onChange={(paddingBeforeMs) => update({ paddingBeforeMs })}
              />
              <PaddingControl
                title="Padding after speech"
                seconds={formatSettingSeconds(draft.paddingAfterMs)}
                hint="Time kept after each segment (for the outro)."
                icon={<ArrowRightIcon className="size-4" />}
                min={PADDING_AFTER.min}
                max={PADDING_AFTER.max}
                step={PADDING_AFTER.step}
                value={draft.paddingAfterMs}
                disabled={saving}
                onChange={(paddingAfterMs) => update({ paddingAfterMs })}
              />
            </div>
          </section>

          <DurationCard
            tone="sky"
            icon={<HourglassIcon className="size-4" />}
            title="Minimum silence duration"
            seconds={formatSettingSeconds(draft.minDurationMs)}
            hint="Shortest silence that gets removed."
            min={MIN_SILENCE.min}
            max={MIN_SILENCE.max}
            step={MIN_SILENCE.step}
            value={draft.minDurationMs}
            color="#38bdf8"
            disabled={saving}
            onChange={(minDurationMs) => update({ minDurationMs })}
          />
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
              onClick={() => onSave(patch)}
            >
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DrawerContent>
    </DrawerPrimitive.NestedRoot>
  )
}

function PaddingControl({
  title,
  seconds,
  hint,
  icon,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  title: string
  seconds: string
  hint: string
  icon: ReactNode
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div>
      <h3 className="flex items-start gap-2 text-sm font-semibold text-emerald-700">
        {icon}
        <span>
          {title} ({seconds})
        </span>
      </h3>
      <SettingSlider
        className="mt-3"
        min={min}
        max={max}
        step={step}
        value={value}
        color="#34d399"
        disabled={disabled}
        onChange={onChange}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Minimal</span>
        <span>Generous</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

function DurationCard({
  tone,
  icon,
  title,
  seconds,
  hint,
  min,
  max,
  step,
  value,
  color,
  disabled,
  onChange,
}: {
  tone: "sky" | "violet"
  icon: ReactNode
  title: string
  seconds: string
  hint: string
  min: number
  max: number
  step: number
  value: number
  color: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        tone === "sky" && "border-sky-100 bg-sky-50/80",
        tone === "violet" && "border-violet-100 bg-violet-50/80"
      )}
    >
      <h2
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          tone === "sky" && "text-sky-700",
          tone === "violet" && "text-violet-700"
        )}
      >
        {icon}
        {title} ({seconds})
      </h2>
      <SettingSlider
        className="mt-4"
        min={min}
        max={max}
        step={step}
        value={value}
        color={color}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Short</span>
        <span>Long</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </section>
  )
}

function SettingSlider({
  value,
  min,
  max,
  step,
  color,
  className,
  disabled,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  color: string
  className?: string
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
        "h-2 w-full cursor-pointer appearance-none rounded-full",
        "[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow",
        "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-white",
        className
      )}
      style={{
        background: `linear-gradient(to right, ${color} ${ratio}%, rgb(226 232 240) ${ratio}%)`,
      }}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

function Waveform({ tone }: { tone: "amber" }) {
  const bars = [8, 14, 22, 18, 28, 16, 10, 24, 30, 20, 12, 26, 18, 8, 22, 28, 14]
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-1 rounded-xl bg-[#1c2430] px-3",
        tone === "amber" && "bg-[#1c2430]"
      )}
      aria-hidden="true"
    >
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-1.5 rounded-full bg-emerald-400"
          style={{ height }}
        />
      ))}
    </div>
  )
}
