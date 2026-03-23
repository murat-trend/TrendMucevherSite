# CAD Coach Implementation Roadmap

This roadmap is based on:
- `docs/cad/rhino-users-guide-windows.pdf`
- Existing prototype page: `/remaura/cad-koc`

## Goal
Build an interactive coach that does **step guidance**, not automatic full model generation.

## Product Strategy
1. User uploads jewelry image and enters key dimensions (ring diameter, stone size, shank width).
2. System detects likely part sequence (ring rail -> head curves -> prong layout -> shank blend).
3. UI highlights the active region and shows exact command candidates.
4. User confirms completion; coach runs checks and moves to next step.

## Technical Architecture
### 1) Knowledge Layer
- Rhino command index: `docs/cad/rhino-commands-index.json`
- Workflow data: `lib/remaura/cad/ring-cad-coach-v1.json`
- Types: `lib/remaura/cad/types.ts`

### 2) Step Engine (Next task)
- Input: workflow JSON + user dimensions + step progress.
- Output: active step + command suggestions + validation checklist + next-step enable state.

### 3) Visual Guidance Layer (Next task)
- Current: static SVG focus highlights.
- Planned:
  - multiple ring topologies (solitaire, halo, trilogy)
  - dimension callouts around focused region
  - per-step helper overlays (snap hints, symmetry axis)

### 4) Validation Layer (Next task)
- Step-level checks:
  - dimension threshold checks
  - symmetry checks
  - open-edge and continuity warnings
- UX:
  - "not passed yet" reason
  - fix suggestions linked to command candidates

### 5) Persistence and Reuse (Next task)
- Save session state per project:
  - selected workflow
  - measurements
  - completed steps
  - user notes

## Phased Delivery
### Phase A (done)
- New category page and test area.
- Initial interactive prototype.
- First ring workflow schema + command index baseline.

### Phase B (next)
- Refactor UI to read workflow JSON dynamically.
- Add image upload + simple part-type selector.
- Add step completion state and guard conditions.

### Phase C
- Add AI assistant mode for step explanation:
  - why this step now
  - what can fail
  - how to recover

### Phase D
- Add matrix/rhino profile packs:
  - command aliases by software profile
  - template-aware defaults

## Risk Notes
- Rhino docs are broad; jewelry-specific best practices must be curated.
- 1:1 "automatic CAD" is outside current scope and should stay out of MVP.
- Validation quality will define trust; checks should be strict but actionable.
