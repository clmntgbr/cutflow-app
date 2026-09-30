"use client"

import { Button } from "@/components/ui/button"
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { EditorConfiguration } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { Drawer as DrawerPrimitive } from "vaul"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"

export interface ConfigurationPatch {
  silence?: { enabled: boolean }
  filler?: { enabled: boolean }
  repetition?: { enabled: boolean }
  subtitles?: { enabled: boolean }
}

interface ConfigurationDraft {
  silenceEnabled: boolean
  fillerEnabled: boolean
  repetitionEnabled: boolean
  subtitlesEnabled: boolean
}

function draftFromSettings(settings: EditorConfiguration): ConfigurationDraft {
  return {
    silenceEnabled: settings.silence.enabled,
    fillerEnabled: settings.filler.enabled,
    repetitionEnabled: settings.repetition.enabled,
    subtitlesEnabled: settings.subtitles.enabled,
  }
}

function configurationPatch(
  draft: ConfigurationDraft,
  settings: EditorConfiguration
): ConfigurationPatch {
  const patch: ConfigurationPatch = {}
  if (draft.silenceEnabled !== settings.silence.enabled) {
    patch.silence = { enabled: draft.silenceEnabled }
  }
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

export function ConfigurationDrawer({
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
  onSave: (patch: ConfigurationPatch) => void
}) {
  const settingsKey = [
    resetKey,
    settings.silence.enabled,
    settings.filler.enabled,
    settings.repetition.enabled,
    settings.subtitles.enabled,
  ].join(":")
  const [local, setLocal] = useState<{ key: string; value: ConfigurationDraft } | null>(null)
  const draft = local?.key === settingsKey ? local.value : draftFromSettings(settings)
  const patch = configurationPatch(draft, settings)
  const dirty = Object.keys(patch).length > 0

  function update(next: Partial<ConfigurationDraft>) {
    if (saving) return
    setLocal({ key: settingsKey, value: { ...draft, ...next } })
  }

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
          <DrawerTitle>Configuration</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
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
                onSave(patch)
              }}
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-2xl border bg-background px-4 py-3 text-left disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[oklch(0.508_0.118_165.612)]" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </span>
    </button>
  )
}
