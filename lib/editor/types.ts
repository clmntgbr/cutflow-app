export interface EditorState {
  media: EditorMedia
  timeline: EditorTimeline
  configuration: EditorConfiguration
  decisions: EditorDecision[]
  subtitles: EditorSubtitles
  viralCandidates: ViralCandidate[]
}

export interface EditorMedia {
  id: string
  name: string
  url: string
  durationMs: number
  width: number | null
  height: number | null
}

export interface EditorTimeline {
  id: string
  version: number
  durationMs: number
  segments: TimelineSegment[]
}

export interface TimelineSegment {
  id: string
  index: number
  sourceStartMs: number
  sourceEndMs: number
  outputStartMs: number
  outputEndMs: number
}

export type EditDecisionType = "silence" | "filler" | "repetition" | "false_start" | "manual"

export type EditAction = "keep" | "remove"

export interface EditorDecision {
  id: string
  type: EditDecisionType
  label: string | null
  sourceStartMs: number
  sourceEndMs: number
  automaticAction: EditAction | null
  effectiveAction: EditAction
  modifiedByUser: boolean
}

export type SilenceThresholdMode = "auto" | "manual"

export type SilenceDetectionLevel = "low" | "moderate" | "aggressive" | "very_aggressive"

export interface SilenceConfiguration {
  enabled: boolean
  thresholdMode: SilenceThresholdMode
  detectionLevel: SilenceDetectionLevel
  minDurationMs: number
  paddingBeforeMs: number
  paddingAfterMs: number
  thresholdDb: number | null
  noiseFloorDb: number | null
  calculatedSilenceThresholdDb: number | null
}

export interface EditorConfiguration {
  silence: SilenceConfiguration
  filler: { enabled: boolean }
  repetition: { enabled: boolean }
  subtitles: { enabled: boolean; maxWords: number; styleId: string }
  output: { aspectRatio: string }
}

export interface EditorWord {
  id: string
  text: string
  sourceStartMs: number
  sourceEndMs: number
  confidence: number | null
}

export interface EditorSubtitles {
  words: EditorWord[]
}

export interface ViralCandidate {
  id: string
  sourceStartMs: number
  sourceEndMs: number
  score: number
  title: string
  hook: string
  selected: boolean
}

export type SilenceConfigurationPatch = Partial<
  Pick<
    SilenceConfiguration,
    | "enabled"
    | "thresholdMode"
    | "detectionLevel"
    | "minDurationMs"
    | "paddingBeforeMs"
    | "paddingAfterMs"
    | "thresholdDb"
  >
>

export interface UpdateConfigurationAction {
  type: "update_configuration"
  timelineVersion: number
  configuration: {
    filler?: { enabled?: boolean }
    repetition?: { enabled?: boolean }
    subtitles?: { enabled?: boolean; maxWords?: number }
  }
}

export interface UpdateSilenceConfigurationAction {
  type: "update_silence_configuration"
  timelineVersion: number
  configuration: {
    silence: SilenceConfigurationPatch
  }
}

export interface OverrideDecisionAction {
  type: "override_decision"
  timelineVersion: number
  decisionId: string
  action: EditAction
}

export interface ClearDecisionOverrideAction {
  type: "clear_decision_override"
  timelineVersion: number
  decisionId: string
}

export interface CreateManualCutAction {
  type: "create_manual_cut"
  timelineVersion: number
  sourceStartMs: number
  sourceEndMs: number
}

export type EditorAction =
  | UpdateConfigurationAction
  | UpdateSilenceConfigurationAction
  | OverrideDecisionAction
  | ClearDecisionOverrideAction
  | CreateManualCutAction

export interface FinalizeRequest {
  timelineId: string
  timelineVersion: number
}

export interface TimelineUpdatedEvent {
  mediaFileId: string
  timelineId: string
  version: number
}
