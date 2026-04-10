"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ViewMode = "construction" | "connection";
type ViewportName = "Top" | "Front" | "Right" | "Perspective";
type StepId =
  | "base-scale"
  | "rail-count"
  | "shank-profile"
  | "shoulder-rise"
  | "head-zone"
  | "stone-ref"
  | "prong-positions"
  | "connect-shoulder-head"
  | "symmetry-balance"
  | "precheck";

type InputKey =
  | "ringBaseWidth"
  | "ringRailCount"
  | "shankWidth"
  | "shoulderHeight"
  | "headWidth"
  | "headHeight"
  | "centerStoneDiameter"
  | "prongCount"
  | "prongSpread"
  | "connectionOffset"
  | "symmetryGuide"
  | "showLabels";

type OverlaySpec =
  | "grid"
  | "axis"
  | "ringBase"
  | "rails"
  | "shankOuter"
  | "shoulderGuides"
  | "headZone"
  | "stoneCenter"
  | "prongs"
  | "connectionTargets"
  | "balanceChecks"
  | "precheckZone";

type InputControlSpec = {
  key: InputKey;
  label: string;
  type: "slider" | "toggle" | "segmented";
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  unit?: string;
};

type TutorStep = {
  id: StepId;
  title: string;
  goal: string;
  explanation: string;
  viewportLearningNote: string;
  whyThisMatters: string;
  connectionGuidance: string;
  avoid: string[];
  nextStepSummary: string;
  inputs: InputControlSpec[];
  rhinoHints: string[];
  matrixGoldHints: string[];
  commonMistakes: string[];
  overlays: OverlaySpec[];
  primaryViewport: ViewportName;
  secondaryViewports?: ViewportName[];
  viewportReason: string;
};

type Workflow = {
  id: string;
  title: string;
  subtitle: string;
  steps: TutorStep[];
};

type TutorInputs = Record<InputKey, number | boolean>;

type CadCoachAiStep = {
  baslik?: string;
  komutlar?: string[];
  aciklama?: string;
  ipucu?: string | null;
  schema?: { gerekli?: boolean; tip?: string; aciklama?: string };
};

const DEFAULT_INPUTS: TutorInputs = {
  ringBaseWidth: 19,
  ringRailCount: 2,
  shankWidth: 2.3,
  shoulderHeight: 6.2,
  headWidth: 8.5,
  headHeight: 7.4,
  centerStoneDiameter: 6.5,
  prongCount: 4,
  prongSpread: 58,
  connectionOffset: 2,
  symmetryGuide: true,
  showLabels: true,
};

const SOLITAIRE_WORKFLOW: Workflow = {
  id: "solitaire-ring-builder",
  title: "Rhino Ring Tutor",
  subtitle: "Solitaire Ring Builder",
  steps: [
    {
      id: "base-scale",
      title: "1. Set basic ring size / base scale",
      goal: "Lock the ring base scale before building profile logic.",
      explanation:
        "Start by sizing the base ring width. This gives every later curve a stable dimension anchor and prevents scale drift when you move into shoulder and head transitions.",
      viewportLearningNote: "Work in Top view to maintain accurate width and spacing.",
      whyThisMatters:
        "If the base is wrong, every downstream proportion feels off. It is faster to lock this now than to rebuild rails and prongs later.",
      connectionGuidance:
        "Use the center axis as the origin. Build left and right around the same axis line so both shoulder roots start from a common base.",
      avoid: [
        "Sizing visually without numeric value",
        "Changing ring base after shoulder construction",
        "Offsetting the base away from axis center",
      ],
      nextStepSummary: "Now decide rail count so transition control matches the complexity you want.",
      inputs: [
        { key: "ringBaseWidth", label: "Ring Base Width", type: "slider", min: 14, max: 24, step: 0.1, unit: "mm" },
        { key: "symmetryGuide", label: "Symmetry Guide", type: "toggle" },
        { key: "showLabels", label: "Show Labels", type: "toggle" },
      ],
      rhinoHints: ["Circle", "Scale1D", "SetPt", "SmartTrack", "Ortho"],
      matrixGoldHints: ["Ring Rail setup", "History state on"],
      commonMistakes: [
        "Building on an offset axis",
        "Ignoring mm precision and using approximate values",
        "Not checking left-right mirror baseline",
      ],
      overlays: ["grid", "axis", "ringBase"],
      primaryViewport: "Top",
      secondaryViewports: ["Perspective"],
      viewportReason:
        "Use Top view to define ring diameter and base proportions without perspective distortion.",
    },
    {
      id: "rail-count",
      title: "2. Choose ring rail count",
      goal: "Select single or double rail strategy for shoulder control.",
      explanation:
        "A double rail gives more control over section thickness and transition smoothness. A single rail is faster but less forgiving when shaping the shoulder into the head.",
      viewportLearningNote: "Work in Top view so rail spacing stays clean and measurable.",
      whyThisMatters:
        "Rail count defines your construction logic. It affects how easy it is to keep mass balance while sculpting the upper flow.",
      connectionGuidance:
        "Keep rails centered around the same base axis. Spread them evenly so left and right trajectories stay consistent.",
      avoid: [
        "Placing rails too close at the start",
        "Using uneven rail spacing left vs right",
        "Switching rail count after head zone is blocked",
      ],
      nextStepSummary: "With rails defined, shape the shank outer profile with controlled width.",
      inputs: [
        {
          key: "ringRailCount",
          label: "Rail Count",
          type: "segmented",
          options: [
            { label: "1 Rail", value: 1 },
            { label: "2 Rails", value: 2 },
            { label: "3 Rails", value: 3 },
          ],
        },
        { key: "ringBaseWidth", label: "Ring Base Width", type: "slider", min: 14, max: 24, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["InterpCrv", "Offset", "Mirror"],
      matrixGoldHints: ["Ring Rail count option", "Parametric rail spacing"],
      commonMistakes: [
        "Choosing too many rails for a slim design",
        "Not mirroring rails before continuing",
        "Rail spacing too wide causing weak shoulder merge",
      ],
      overlays: ["grid", "axis", "ringBase", "rails"],
      primaryViewport: "Top",
      secondaryViewports: ["Perspective"],
      viewportReason: "Rail spacing and count are easiest to control in plan view.",
    },
    {
      id: "shank-profile",
      title: "3. Establish shank outer profile",
      goal: "Define the outer shank silhouette with stable thickness logic.",
      explanation:
        "Draw the shank outside profile first. Keep width transitions gradual from base to upper shoulder area so the ring does not pinch abruptly.",
      viewportLearningNote: "Work in Top view to keep outer width and symmetry precise.",
      whyThisMatters:
        "The shank profile carries visual weight and wearing comfort. It also controls how naturally your shoulder can rise to the head.",
      connectionGuidance:
        "Start from base rail points and pull the profile toward shoulder entry marks. Keep tangent flow smooth near the lower third.",
      avoid: [
        "Over-tight waist in the middle",
        "Flat shoulder entry with no curvature prep",
        "Different profile tension on left and right",
      ],
      nextStepSummary: "Next, lift shoulder guides so the top section gains vertical energy.",
      inputs: [
        { key: "shankWidth", label: "Shank Width", type: "slider", min: 1.4, max: 4.5, step: 0.05, unit: "mm" },
        { key: "ringBaseWidth", label: "Ring Base Width", type: "slider", min: 14, max: 24, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["InterpCrv", "BlendCrv", "Rebuild", "Analyze > CurvatureGraph"],
      matrixGoldHints: ["Shank profile editor", "Profile library as reference"],
      commonMistakes: [
        "Forcing width changes too early",
        "No curvature check before shoulder rise",
        "Ignoring section continuity",
      ],
      overlays: ["grid", "axis", "ringBase", "rails", "shankOuter"],
      primaryViewport: "Top",
      secondaryViewports: ["Perspective"],
      viewportReason: "Outer shank width and symmetry are controlled best from Top view.",
    },
    {
      id: "shoulder-rise",
      title: "4. Raise shoulder transition",
      goal: "Create a controlled shoulder lift toward the future head zone.",
      explanation:
        "Raise the shoulder guides gradually. The shoulder should support the head, not fight it. Keep your rise smooth and avoid sudden vertical spikes.",
      viewportLearningNote: "Switch to Front view to control vertical rise without perspective distortion.",
      whyThisMatters:
        "Shoulder energy determines elegance and structural support. This is where many ring forms either become refined or unstable.",
      connectionGuidance:
        "Lift from shoulder root to upper support point, not directly to stone center. Leave room for the head construction zone.",
      avoid: [
        "Pushing shoulder too high too early",
        "Connecting straight into center stone location",
        "Asymmetric rise angles",
      ],
      nextStepSummary: "After shoulder rise, define exact head envelope dimensions.",
      inputs: [
        { key: "shoulderHeight", label: "Shoulder Height", type: "slider", min: 3, max: 10, step: 0.1, unit: "mm" },
        { key: "connectionOffset", label: "Connection Offset", type: "slider", min: 0, max: 4, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["Move", "SetPt", "BlendCrv", "Match", "History"],
      matrixGoldHints: ["Shoulder raise handles", "Support curve controls"],
      commonMistakes: [
        "Vertical jump near shoulder peak",
        "No transition offset margin",
        "Different shoulder crest heights",
      ],
      overlays: ["grid", "axis", "ringBase", "rails", "shankOuter", "shoulderGuides", "connectionTargets"],
      primaryViewport: "Front",
      secondaryViewports: ["Perspective"],
      viewportReason:
        "Vertical shoulder rise must be adjusted in Front view to avoid incorrect height perception.",
    },
    {
      id: "head-zone",
      title: "5. Define top/head zone",
      goal: "Block out the head envelope where stone and prong logic will live.",
      explanation:
        "Set head width and height before placing stone references. Think of this as your construction box for all top-side geometry.",
      viewportLearningNote: "Use Front view to lock head height and placement.",
      whyThisMatters:
        "A clear head envelope prevents crowding and gives a reliable boundary for prongs and shoulder connections.",
      connectionGuidance:
        "Anchor the lower head boundary to shoulder support points. Keep equal distance to the axis on both sides.",
      avoid: [
        "Head zone too narrow for stone diameter",
        "Overly tall head causing unstable silhouette",
        "Uncentered head envelope",
      ],
      nextStepSummary: "Now place the center stone reference exactly inside this envelope.",
      inputs: [
        { key: "headWidth", label: "Head Width", type: "slider", min: 5, max: 13, step: 0.1, unit: "mm" },
        { key: "headHeight", label: "Head Height", type: "slider", min: 4, max: 12, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["Rectangle", "Scale2D", "Move", "Mirror"],
      matrixGoldHints: ["Head region scaffold", "Top profile constraints"],
      commonMistakes: [
        "Head box built from visual guess",
        "No relation to shoulder apex",
        "Stone diameter not checked before proceeding",
      ],
      overlays: ["grid", "axis", "ringBase", "rails", "shankOuter", "shoulderGuides", "headZone"],
      primaryViewport: "Front",
      secondaryViewports: ["Perspective"],
      viewportReason: "Head height and placement depend on vertical alignment.",
    },
    {
      id: "stone-ref",
      title: "6. Place center stone reference",
      goal: "Set the exact stone center and diameter guide.",
      explanation:
        "Place a clean stone reference circle and center point. This defines where support and prong geometry must terminate.",
      viewportLearningNote: "Set height in Front, verify centering in Top.",
      whyThisMatters:
        "Without a true stone center, every top connection becomes visual guesswork and final symmetry usually drifts.",
      connectionGuidance:
        "Position stone center on main axis and keep clearance from head boundary for prong thickness.",
      avoid: [
        "Off-axis stone center",
        "Stone diameter larger than usable head width",
        "No clearance margin for prongs",
      ],
      nextStepSummary: "Next define prong positions around the stone reference.",
      inputs: [
        { key: "centerStoneDiameter", label: "Stone Diameter", type: "slider", min: 3, max: 10, step: 0.1, unit: "mm" },
        { key: "headWidth", label: "Head Width", type: "slider", min: 5, max: 13, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["Circle", "Point", "Distance", "Analyze > Radius"],
      matrixGoldHints: ["Stone seat reference", "Center lock tools"],
      commonMistakes: [
        "Skipping center point and only drawing circle",
        "Stone too close to one side support",
        "Not rechecking diameter after head edits",
      ],
      overlays: ["grid", "axis", "ringBase", "rails", "headZone", "stoneCenter"],
      primaryViewport: "Front",
      secondaryViewports: ["Top", "Perspective"],
      viewportReason: "Stone height is controlled in Front, while Top ensures proper centering.",
    },
    {
      id: "prong-positions",
      title: "7. Define prong positions",
      goal: "Distribute prong targets with controlled spread around the stone.",
      explanation:
        "Choose prong count and spread. Keep the pattern symmetrical and sized to support stone security without crowding the top view.",
      viewportLearningNote: "Use Top view to keep radial spacing truly symmetrical.",
      whyThisMatters:
        "Prong placement drives both structural safety and visual rhythm.",
      connectionGuidance:
        "Array around stone center, then verify each prong target still aligns with shoulder support logic.",
      avoid: [
        "Uneven angular spacing",
        "Spread too wide for head envelope",
        "Prongs crossing shoulder entry lines",
      ],
      nextStepSummary: "Now connect shoulder curves into the side support targets under the head.",
      inputs: [
        {
          key: "prongCount",
          label: "Prong Count",
          type: "segmented",
          options: [
            { label: "4", value: 4 },
            { label: "6", value: 6 },
            { label: "8", value: 8 },
          ],
        },
        { key: "prongSpread", label: "Prong Spread", type: "slider", min: 40, max: 90, step: 1, unit: "%" },
      ],
      rhinoHints: ["ArrayPolar", "Rotate", "Move", "Mirror"],
      matrixGoldHints: ["Prong layout helpers", "Radial placement presets"],
      commonMistakes: [
        "Placing prongs on visual centerline only",
        "No angular check after manual nudging",
        "Using too many prongs for small stone",
      ],
      overlays: ["grid", "axis", "headZone", "stoneCenter", "prongs"],
      primaryViewport: "Top",
      secondaryViewports: ["Perspective"],
      viewportReason: "Prong distribution must be symmetrical around the stone in plan view.",
    },
    {
      id: "connect-shoulder-head",
      title: "8. Connect shoulder to head",
      goal: "Build clean transitions from shoulder guides into head support points.",
      explanation:
        "Create transition curves from each shoulder crest into the head side support points. Keep continuity smooth and avoid direct centerline hits.",
      viewportLearningNote: "Switch to Right view for accurate side connection curvature.",
      whyThisMatters:
        "This transition defines quality. Good transitions look intentional; bad ones look forced.",
      connectionGuidance:
        "Connect shoulder crest to side support point, not to stone center. Maintain mirrored curvature behavior.",
      avoid: [
        "Offset set to zero too early",
        "No continuity check before mirror",
        "Crossing transition paths near head base",
      ],
      nextStepSummary: "Then evaluate symmetry and mass balance before surfacing.",
      inputs: [
        { key: "connectionOffset", label: "Connection Offset", type: "slider", min: 0, max: 4, step: 0.1, unit: "mm" },
        { key: "shoulderHeight", label: "Shoulder Height", type: "slider", min: 3, max: 10, step: 0.1, unit: "mm" },
      ],
      rhinoHints: ["BlendCrv", "Match", "Sweep1", "Sweep2"],
      matrixGoldHints: ["Transition bridge tools", "History-safe blending"],
      commonMistakes: [
        "Offset set to zero too early",
        "No continuity check before mirror",
        "Crossing transition paths near head base",
      ],
      overlays: ["grid", "axis", "shoulderGuides", "headZone", "connectionTargets", "stoneCenter"],
      primaryViewport: "Right",
      secondaryViewports: ["Front", "Perspective"],
      viewportReason: "Side connection curvature is best evaluated from the Right view.",
    },
    {
      id: "symmetry-balance",
      title: "9. Check symmetry and mass balance",
      goal: "Validate design balance before final pre-check.",
      explanation:
        "Inspect left-right symmetry and visual mass around head and shoulders. Make micro-adjustments before surface cleanup.",
      viewportLearningNote: "Use Perspective for mass read, then confirm in Top and Front.",
      whyThisMatters:
        "Balanced construction prevents late-stage rework and improves both visual quality and wear comfort.",
      connectionGuidance:
        "Evaluate distances from axis to key points: shoulder crest, side supports, and prong anchors.",
      avoid: [
        "Trusting eye only, no measurement",
        "Not checking top and side consistency",
        "Accepting uneven shoulder heights",
      ],
      nextStepSummary: "Finalize with practical STL/CAD pre-check basics.",
      inputs: [
        { key: "symmetryGuide", label: "Symmetry Guide", type: "toggle" },
        { key: "showLabels", label: "Show Labels", type: "toggle" },
      ],
      rhinoHints: ["Mirror", "Distance", "Analyze > Deviation", "Zebra"],
      matrixGoldHints: ["Symmetry diagnostics", "Mass distribution preview"],
      commonMistakes: [
        "Trusting eye only, no measurement",
        "Not checking top and side consistency",
        "Accepting uneven shoulder heights",
      ],
      overlays: ["grid", "axis", "ringBase", "shoulderGuides", "headZone", "prongs", "balanceChecks"],
      primaryViewport: "Perspective",
      secondaryViewports: ["Top", "Front"],
      viewportReason: "Overall volume and balance must be validated in 3D.",
    },
    {
      id: "precheck",
      title: "10. STL/CAD pre-check basics",
      goal: "Run final structural and continuity checks before production export.",
      explanation:
        "Do a final pass on continuity, target offsets, and support clearances. Ensure no rushed edits remain in load-bearing transition areas.",
      viewportLearningNote: "Run final checks in Perspective, then confirm Top, Front, and Right.",
      whyThisMatters:
        "This is your final quality gate before moving to production surfaces or downstream file prep.",
      connectionGuidance:
        "Confirm all shoulder-to-head links terminate on intended support points with consistent spacing.",
      avoid: [
        "Relying on visual pass only",
        "No checklist for transition consistency",
        "Skipping tolerance notes before handoff",
      ],
      nextStepSummary: "Construction logic is complete. You can now proceed to detailed surfacing and production refinements.",
      inputs: [
        { key: "connectionOffset", label: "Connection Offset", type: "slider", min: 0, max: 4, step: 0.1, unit: "mm" },
        { key: "showLabels", label: "Show Labels", type: "toggle" },
      ],
      rhinoHints: ["Join", "FilletEdge", "Check", "EdgeContinuity", "STL preview"],
      matrixGoldHints: ["Pre-production checklist", "Final tolerance review"],
      commonMistakes: [
        "Relying on visual pass only",
        "No checklist for transition consistency",
        "Skipping tolerance notes before handoff",
      ],
      overlays: ["grid", "axis", "ringBase", "rails", "shankOuter", "shoulderGuides", "headZone", "stoneCenter", "prongs", "connectionTargets", "balanceChecks", "precheckZone"],
      primaryViewport: "Perspective",
      secondaryViewports: ["Top", "Front", "Right"],
      viewportReason: "Final validation requires checking all spatial directions.",
    },
  ],
};

function num(inputs: TutorInputs, key: InputKey): number {
  return Number(inputs[key] ?? 0);
}

function bool(inputs: TutorInputs, key: InputKey): boolean {
  return Boolean(inputs[key]);
}

function chipClass(active: boolean): string {
  return active
    ? "border-[#c69575]/70 bg-[#c69575]/15 text-[#e9c9b4]"
    : "border-white/10 bg-white/[0.02] text-zinc-400";
}

function viewportContextLabel(step: TutorStep): string {
  if (step.id === "shoulder-rise") return "Raise in Front";
  if (step.id === "connect-shoulder-head") return "Side connection in Right";
  if (step.id === "symmetry-balance" || step.id === "precheck") return "Check in Perspective";
  if (step.primaryViewport === "Top") return "Build in Top";
  if (step.primaryViewport === "Front") return "Build in Front";
  if (step.primaryViewport === "Right") return "Build in Right";
  return "Check in Perspective";
}

function StepList({
  steps,
  activeStepId,
  visited,
  onSelect,
}: {
  steps: TutorStep[];
  activeStepId: StepId;
  visited: Record<StepId, boolean>;
  onSelect: (id: StepId) => void;
}) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const active = step.id === activeStepId;
        const done = visited[step.id];
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
              active
                ? "border-[#c69575]/70 bg-[#c69575]/15"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold ${active ? "text-[#f2d8c8]" : "text-zinc-200"}`}>
                {step.title}
              </p>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] ${
                  done ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "border-white/15 text-zinc-500"
                }`}
              >
                {done ? "OK" : idx + 1}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">{step.goal}</p>
          </button>
        );
      })}
    </div>
  );
}

function ViewportGuidanceCard({ step }: { step: TutorStep }) {
  return (
    <div className="sticky top-2 z-20 rounded-xl border border-[#c69575]/45 bg-[#1a1411]/85 p-3 shadow-[0_0_0_1px_rgba(198,149,117,0.25),0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.11em] text-[#d8b39a]">Viewport Guidance</p>
      <motion.div
        key={step.id}
        initial={{ opacity: 0.6, scale: 0.97 }}
        animate={{ opacity: [0.9, 1, 0.92, 1], scale: [0.99, 1.02, 1] }}
        transition={{ duration: 0.45 }}
        className="mt-2 inline-flex rounded-lg border border-[#d8b39a]/65 bg-[#d8b39a]/20 px-3 py-1.5 text-sm font-semibold text-[#ffe7d8] shadow-[0_0_22px_rgba(216,179,154,0.25)]"
      >
        {step.primaryViewport}
      </motion.div>
      {!!step.secondaryViewports?.length && (
        <div className="mt-2">
          <p className="text-[11px] text-zinc-400">Check in:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {step.secondaryViewports.map((view) => (
              <span
                key={`${step.id}-${view}`}
                className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-1 text-[10px] text-zinc-300"
              >
                {view}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="mt-2 text-xs leading-relaxed text-zinc-300">
        <span className="font-semibold text-zinc-100">Reason:</span> {step.viewportReason}
      </p>
    </div>
  );
}

function ParamControl({
  spec,
  value,
  onChange,
}: {
  spec: InputControlSpec;
  value: number | boolean;
  onChange: (value: number | boolean) => void;
}) {
  if (spec.type === "toggle") {
    return (
      <button
        type="button"
        onClick={() => onChange(!Boolean(value))}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs ${chipClass(Boolean(value))}`}
      >
        <span>{spec.label}</span>
        <span className="font-semibold">{Boolean(value) ? "On" : "Off"}</span>
      </button>
    );
  }

  if (spec.type === "segmented" && spec.options) {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] text-zinc-400">{spec.label}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {spec.options.map((opt) => {
            const active = Number(value) === Number(opt.value);
            return (
              <button
                key={`${spec.key}-${opt.value}`}
                type="button"
                onClick={() => onChange(Number(opt.value))}
                className={`rounded-lg border px-2 py-2 text-[11px] ${chipClass(active)}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-400">{spec.label}</p>
        <p className="text-[11px] font-semibold text-zinc-200">
          {Number(value).toFixed(spec.step && spec.step < 1 ? 1 : 0)} {spec.unit ?? ""}
        </p>
      </div>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#c69575]"
      />
    </div>
  );
}

function HintSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs font-semibold text-zinc-200">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((hint) => (
          <span key={hint} className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-zinc-300">
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}

function TutorCanvas({
  step,
  inputs,
  viewMode,
}: {
  step: TutorStep;
  inputs: TutorInputs;
  viewMode: ViewMode;
}) {
  const baseW = num(inputs, "ringBaseWidth");
  const railCount = Math.round(num(inputs, "ringRailCount"));
  const shankW = num(inputs, "shankWidth");
  const shoulderH = num(inputs, "shoulderHeight");
  const headW = num(inputs, "headWidth");
  const headH = num(inputs, "headHeight");
  const stoneD = num(inputs, "centerStoneDiameter");
  const prongCount = Math.round(num(inputs, "prongCount"));
  const prongSpread = num(inputs, "prongSpread");
  const connectionOffset = num(inputs, "connectionOffset");
  const showLabels = bool(inputs, "showLabels");
  const showSymmetry = bool(inputs, "symmetryGuide");

  const overlays = new Set(step.overlays);
  const cx = 360;
  const baseY = 355;
  const rx = 120 + (baseW - 19) * 8;
  const ry = 70 + (shankW - 2.3) * 12;
  const shoulderY = baseY - (65 + shoulderH * 8);
  const shoulderLX = cx - (95 + shankW * 9);
  const shoulderRX = cx + (95 + shankW * 9);
  const headTopY = shoulderY - (20 + headH * 6);
  const headBottomY = shoulderY + 18;
  const headLeft = cx - (38 + headW * 4.2);
  const headRight = cx + (38 + headW * 4.2);
  const stoneR = 16 + stoneD * 2.2;
  const stoneCy = headBottomY - stoneR - 7;
  const connY = shoulderY - connectionOffset * 7;
  const connLX = cx - (58 + connectionOffset * 7);
  const connRX = cx + (58 + connectionOffset * 7);

  const activeOpacity = (overlay: OverlaySpec) => (overlays.has(overlay) ? 1 : 0.15);
  const prongPoints = Array.from({ length: prongCount }).map((_, i) => {
    const spread = (Math.PI * 2 * (prongSpread / 100)) / prongCount;
    const start = -Math.PI / 2 - ((prongCount - 1) * spread) / 2;
    const angle = start + i * spread;
    return {
      x: cx + Math.cos(angle) * (stoneR + 14),
      y: stoneCy + Math.sin(angle) * (stoneR + 14),
    };
  });

  const shoulderPath = `M ${cx - rx + 30} ${baseY - 14}
    C ${cx - rx + 54} ${baseY - 72}, ${shoulderLX - 28} ${shoulderY + 34}, ${shoulderLX} ${shoulderY}
    C ${shoulderLX + 18} ${shoulderY - 20}, ${connLX - 14} ${connY + 8}, ${connLX} ${connY}`;
  const shoulderPathR = `M ${cx + rx - 30} ${baseY - 14}
    C ${cx + rx - 54} ${baseY - 72}, ${shoulderRX + 28} ${shoulderY + 34}, ${shoulderRX} ${shoulderY}
    C ${shoulderRX - 18} ${shoulderY - 20}, ${connRX + 14} ${connY + 8}, ${connRX} ${connY}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f13] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.5)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#c69575]/40 bg-[#c69575]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#f0d2bf]">
            Interactive Tutor Canvas
          </span>
          <motion.span
            key={`draw-${step.id}`}
            initial={{ opacity: 0.55, scale: 0.95 }}
            animate={{ opacity: [0.85, 1, 0.92, 1], scale: [0.98, 1.03, 1] }}
            transition={{ duration: 0.45 }}
            className="rounded-full border border-[#d8b39a]/70 bg-[#d8b39a]/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ffe8db] shadow-[0_0_24px_rgba(216,179,154,0.28)]"
          >
            Draw in: {step.primaryViewport}
          </motion.span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-400">
            {viewMode === "construction" ? "Construction View" : "Connection View"}
          </span>
        </div>
        <div className="flex gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded-full border border-white/10 px-2 py-1">Guide</span>
          <span className="rounded-full border border-[#c69575]/40 px-2 py-1 text-[#e7c4ae]">Active</span>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-2">
        <div className="grid grid-cols-4 gap-2">
          {(["Top", "Front", "Right", "Perspective"] as ViewportName[]).map((view) => {
            const isPrimary = step.primaryViewport === view;
            const isSecondary = step.secondaryViewports?.includes(view);
            return (
              <div
                key={`${step.id}-${view}`}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold transition ${
                  isPrimary
                    ? "border-[#d8b39a]/75 bg-[#d8b39a]/20 text-[#ffe5d7] shadow-[0_0_18px_rgba(216,179,154,0.24)]"
                    : isSecondary
                      ? "border-[#9cb5df]/55 bg-[#9cb5df]/12 text-[#cfe0ff]"
                      : "border-white/10 bg-white/[0.01] text-zinc-500"
                }`}
              >
                {view}
              </div>
            );
          })}
        </div>
      </div>

      <svg viewBox="0 0 720 460" className="h-[460px] w-full rounded-xl bg-[#0b0c10]">
        <defs>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#d8b39a" />
          </marker>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {overlays.has("grid") && <rect width="720" height="460" fill="url(#gridPattern)" opacity={activeOpacity("grid")} />}
        <line x1="0" y1={baseY + 32} x2="720" y2={baseY + 32} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />

        {showSymmetry && (
          <line
            x1={cx}
            y1="20"
            x2={cx}
            y2="440"
            stroke="#73a3ff"
            strokeDasharray="6 6"
            strokeWidth={2}
            opacity={activeOpacity("axis")}
          />
        )}

        <ellipse cx={cx} cy={baseY} rx={rx} ry={ry} fill="none" stroke="#8f95a3" strokeWidth={3} opacity={activeOpacity("ringBase")} />

        {Array.from({ length: railCount }).map((_, i) => {
          const shift = (i - (railCount - 1) / 2) * 15;
          return (
            <ellipse
              key={`rail-${i}`}
              cx={cx}
              cy={baseY - 5}
              rx={rx - 14 + shift}
              ry={ry - 10}
              fill="none"
              stroke="#d9b6a0"
              strokeWidth={2.2}
              opacity={activeOpacity("rails")}
            />
          );
        })}

        <path d={shoulderPath} fill="none" stroke="#e4c9b8" strokeWidth={4} opacity={activeOpacity("shoulderGuides")} />
        <path d={shoulderPathR} fill="none" stroke="#e4c9b8" strokeWidth={4} opacity={activeOpacity("shoulderGuides")} />
        <path d={shoulderPath} fill="none" stroke="#98a0b0" strokeWidth={2.4} opacity={activeOpacity("shankOuter")} />
        <path d={shoulderPathR} fill="none" stroke="#98a0b0" strokeWidth={2.4} opacity={activeOpacity("shankOuter")} />

        <rect
          x={headLeft}
          y={headTopY}
          width={headRight - headLeft}
          height={headBottomY - headTopY}
          rx={12}
          fill="rgba(198,149,117,0.08)"
          stroke="#d9b49a"
          strokeWidth={2}
          opacity={activeOpacity("headZone")}
        />

        <circle cx={cx} cy={stoneCy} r={stoneR} fill="rgba(196,222,255,0.08)" stroke="#b5d4ff" strokeWidth={2.6} opacity={activeOpacity("stoneCenter")} />
        <circle cx={cx} cy={stoneCy} r={2.6} fill="#d8ecff" opacity={activeOpacity("stoneCenter")} />

        {prongPoints.map((p, idx) => (
          <g key={`prong-${idx}`} opacity={activeOpacity("prongs")}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#efc8af" />
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={8}
              fill="none"
              stroke="#efc8af"
              strokeWidth={1.2}
              animate={{ opacity: [0.7, 0.1, 0.7], r: [7, 11, 7] }}
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, delay: idx * 0.15 }}
            />
          </g>
        ))}

        <g opacity={activeOpacity("connectionTargets")}>
          <circle cx={connLX} cy={connY} r={5} fill="#f1d6c6" filter="url(#softGlow)" />
          <circle cx={connRX} cy={connY} r={5} fill="#f1d6c6" filter="url(#softGlow)" />
          <line x1={shoulderLX - 6} y1={shoulderY - 8} x2={connLX - 8} y2={connY + 3} stroke="#f1d6c6" strokeWidth={2} markerEnd="url(#arrowHead)" />
          <line x1={shoulderRX + 6} y1={shoulderY - 8} x2={connRX + 8} y2={connY + 3} stroke="#f1d6c6" strokeWidth={2} markerEnd="url(#arrowHead)" />
        </g>

        {viewMode === "connection" && (
          <>
            <line x1={connLX} y1={connY} x2={headLeft + 14} y2={headBottomY - 8} stroke="#c69575" strokeWidth={2.2} strokeDasharray="5 5" />
            <line x1={connRX} y1={connY} x2={headRight - 14} y2={headBottomY - 8} stroke="#c69575" strokeWidth={2.2} strokeDasharray="5 5" />
          </>
        )}

        <g opacity={activeOpacity("balanceChecks")}>
          <line x1={cx - 150} y1={stoneCy} x2={cx + 150} y2={stoneCy} stroke="#7ed0ff" strokeDasharray="4 6" strokeWidth={1.6} />
          <line x1={shoulderLX} y1={shoulderY} x2={shoulderRX} y2={shoulderY} stroke="#7ed0ff" strokeDasharray="4 6" strokeWidth={1.6} />
        </g>

        <rect
          x={40}
          y={32}
          width={640}
          height={390}
          rx={16}
          fill="none"
          stroke="#b8f0da"
          strokeDasharray="8 8"
          strokeWidth={1.5}
          opacity={activeOpacity("precheckZone")}
        />

        {showLabels && (
          <g fontSize="11" fill="#d7dde8">
            <text x={cx + 8} y={40}>Center Axis</text>
            <text x={cx - rx - 14} y={baseY + 8}>Ring Base</text>
            <text x={shoulderLX - 80} y={shoulderY - 6}>Shoulder Rise</text>
            <text x={headLeft} y={headTopY - 8}>Head Zone</text>
            <text x={cx + stoneR + 8} y={stoneCy + 4}>Stone Center</text>
            <text x={connRX + 10} y={connY + 4}>{`Offset +${connectionOffset.toFixed(1)} mm`}</text>
          </g>
        )}

        <AnimatePresence mode="wait">
          <motion.g
            key={`viewport-label-${step.id}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 0.95, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <rect x="24" y="20" width="188" height="30" rx="10" fill="rgba(216,179,154,0.14)" stroke="rgba(216,179,154,0.45)" />
            <text x="36" y="40" fontSize="12" fill="#f1d8c8" fontWeight="600">
              {viewportContextLabel(step)}
            </text>
          </motion.g>
        </AnimatePresence>
      </svg>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-full border border-white/15 px-2 py-1 text-zinc-400">Reference</span>
        <span className="rounded-full border border-[#d8b39a]/50 px-2 py-1 text-[#e8c9b5]">Target</span>
        <span className="rounded-full border border-[#7ed0ff]/50 px-2 py-1 text-[#b7e6ff]">Symmetry</span>
        <span className="rounded-full border border-[#b8f0da]/45 px-2 py-1 text-[#c9f8e6]">Pre-check Zone</span>
      </div>
    </div>
  );
}

function WhyStepSection({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-xs font-semibold text-zinc-200">Why this step?</p>
        <span className="text-[11px] text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden text-xs leading-relaxed text-zinc-300"
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CadCoach() {
  const workflow = SOLITAIRE_WORKFLOW;
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("construction");
  const [inputs, setInputs] = useState<TutorInputs>(DEFAULT_INPUTS);
  const [visitedSteps, setVisitedSteps] = useState<Record<StepId, boolean>>(() =>
    workflow.steps.reduce((acc, step, idx) => {
      acc[step.id] = idx === 0;
      return acc;
    }, {} as Record<StepId, boolean>)
  );

  const [base64DataUrl, setBase64DataUrl] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<CadCoachAiStep[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runCadAnalyze = async () => {
    if (!base64DataUrl) {
      setAiError("Önce bir görsel seçin.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/cad-kocu/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64DataUrl }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Analiz başarısız");
      const steps = json.data?.steps ?? [];
      setAiSteps(steps);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Analiz başarısız");
      setAiSteps([]);
    } finally {
      setAiLoading(false);
    }
  };

  const activeStep = workflow.steps[activeStepIndex];
  const progress = useMemo(
    () => Math.round((Object.values(visitedSteps).filter(Boolean).length / workflow.steps.length) * 100),
    [visitedSteps, workflow.steps.length]
  );

  const setInput = (key: InputKey, value: number | boolean) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const goStepById = (id: StepId) => {
    const idx = workflow.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    setActiveStepIndex(idx);
    setVisitedSteps((prev) => ({ ...prev, [id]: true }));
  };

  const goNext = () => {
    setActiveStepIndex((prev) => {
      const next = Math.min(prev + 1, workflow.steps.length - 1);
      setVisitedSteps((old) => ({ ...old, [workflow.steps[next].id]: true }));
      return next;
    });
  };
  const goPrev = () => setActiveStepIndex((prev) => Math.max(prev - 1, 0));
  const resetInputs = () => setInputs(DEFAULT_INPUTS);

  return (
    <section id="remaura-workspace" className="mx-auto w-full max-w-[1680px] px-4 pb-10 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-[#090b10] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_100px_rgba(0,0,0,0.55)] md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#c69575]">Premium CAD Education MVP</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-100">{workflow.title}</h2>
            <p className="text-sm text-zinc-400">{workflow.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("construction")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${chipClass(viewMode === "construction")}`}
            >
              Construction View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("connection")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${chipClass(viewMode === "connection")}`}
            >
              Connection View
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            REMAURA ANALİZİ
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex cursor-pointer flex-col gap-1 text-xs text-zinc-300">
              <span>Görsel</span>
              <input
                type="file"
                accept="image/*"
                className="max-w-[220px] text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-zinc-200"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !file.type.startsWith("image/")) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setBase64DataUrl(reader.result as string);
                    setAiError(null);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {base64DataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL önizleme
              <img
                src={base64DataUrl}
                alt=""
                className="h-16 w-16 rounded-lg border border-white/10 object-cover"
              />
            ) : null}
            <button
              type="button"
              disabled={aiLoading || !base64DataUrl}
              onClick={() => void runCadAnalyze()}
              className="rounded-lg border border-[#c69575]/60 bg-[#c69575]/15 px-4 py-2 text-xs font-semibold text-[#f0d8c9] disabled:opacity-40"
            >
              {aiLoading ? "Analiz çalışıyor…" : "Analizi çalıştır"}
            </button>
          </div>
          {aiError ? <p className="mt-2 text-xs text-red-400">{aiError}</p> : null}
          {aiSteps.length > 0 ? (
            <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-zinc-300">
              {aiSteps.map((s, i) => (
                <li key={i} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
                  <span className="font-semibold text-zinc-100">
                    {s.baslik ?? `Adım ${i + 1}`}
                  </span>
                  {s.komutlar?.length ? (
                    <p className="mt-0.5 text-[11px] text-zinc-400">{s.komutlar.join(" · ")}</p>
                  ) : null}
                  {s.aciklama ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{s.aciklama}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-3 rounded-xl border border-[#c69575]/35 bg-[#c69575]/10 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#e9cab8]">Workflow</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">Solitaire Ring Builder</p>
              <p className="mt-2 text-[11px] text-zinc-400">Progress {progress}%</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[#c69575]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>

            <StepList
              steps={workflow.steps}
              activeStepId={activeStep.id}
              visited={visitedSteps}
              onSelect={goStepById}
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-lg border border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-zinc-200 hover:border-white/25"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg border border-[#c69575]/70 bg-[#c69575]/15 px-3 py-2 text-xs font-semibold text-[#f0d8c9] hover:bg-[#c69575]/20"
              >
                Next
              </button>
            </div>
          </aside>

          <main>
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <TutorCanvas step={activeStep} inputs={inputs} viewMode={viewMode} />
            </motion.div>
          </main>

          <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <ViewportGuidanceCard step={activeStep} />

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-[0.11em] text-zinc-400">Active Step</p>
              <h3 className="mt-1 text-sm font-semibold text-zinc-100">{activeStep.title}</h3>
              <p className="mt-2 text-xs text-zinc-300">{activeStep.goal}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{activeStep.explanation}</p>
              <p className="mt-2 rounded-lg border border-[#d8b39a]/35 bg-[#d8b39a]/10 px-2 py-1.5 text-xs text-[#f4ddcf]">
                {activeStep.viewportLearningNote}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs font-semibold text-zinc-200">From where to where</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300">{activeStep.connectionGuidance}</p>
            </div>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-200">Step Inputs</p>
                <button
                  type="button"
                  onClick={resetInputs}
                  className="rounded-lg border border-white/15 px-2 py-1 text-[10px] text-zinc-300 hover:border-white/25"
                >
                  Reset Defaults
                </button>
              </div>
              {activeStep.inputs.map((spec) => (
                <ParamControl
                  key={spec.key}
                  spec={spec}
                  value={inputs[spec.key]}
                  onChange={(value) => setInput(spec.key, value)}
                />
              ))}
            </div>

            <HintSection title="Rhino Command Hints" items={activeStep.rhinoHints} />
            <HintSection title="Guidance hints" items={activeStep.matrixGoldHints} />

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs font-semibold text-zinc-200">Common Mistakes</p>
              <ul className="mt-2 space-y-1.5">
                {activeStep.commonMistakes.map((mistake) => (
                  <li key={mistake} className="text-xs text-zinc-300">
                    - {mistake}
                  </li>
                ))}
              </ul>
            </div>

            <WhyStepSection text={activeStep.whyThisMatters} />

            <div className="rounded-xl border border-[#c69575]/35 bg-[#c69575]/10 p-3">
              <p className="text-xs font-semibold text-[#ecd1c0]">What to do next</p>
              <p className="mt-1 text-xs text-zinc-200">{activeStep.nextStepSummary}</p>
              <p className="mt-2 text-[11px] text-zinc-400">Avoid now: {activeStep.avoid.join(" / ")}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
