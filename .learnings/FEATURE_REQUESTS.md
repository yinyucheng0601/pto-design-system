# Feature Requests

## [FEAT-20260721-001] sidecar_annotation_click_inspector

**Logged**: 2026-07-21T14:24:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Requested Capability
Every training-sidecar metric, operator, tensor flow, boundary, parameter, and lifecycle annotation should open a click detail panel. Metric details must explain the basic definition, current value, reference range, and whether the value is abnormal.

### User Context
The side view contains dense, abbreviated training information that cannot be understood reliably from labels and hover tips alone.

### Complexity Estimate
medium

### Suggested Implementation
Use one delegated `data-detail` contract shared by SVG and DOM overlay nodes, plus a single inspector renderer with structured values, status, and execution context.

### Metadata
- Frequency: first_time
- Related Features: hover tips, Layer focus lens, mock telemetry

### Resolution
- **Resolved**: 2026-07-21T14:24:00+08:00
- **Notes**: Implemented a shared click inspector; all existing tooltip-bearing overlays inherit click details, while metrics provide structured definitions and anomaly assessment.

---
## [FEAT-20260721-002] object_anchored_detail_inspector

**Logged**: 2026-07-21T14:36:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Requested Capability
The annotation detail panel should follow the selected object while the canvas is panned or zoomed.

### User Context
A viewport-fixed panel loses its visual relationship to the metric, operator, boundary, or tensor flow it explains.

### Complexity Estimate
medium

### Suggested Implementation
Assign stable detail keys to overlay targets, keep the inspector readable in screen space, and recompute its collision-aware left/top position from the target's projected bounds after every render.

### Metadata
- Frequency: first_time
- Related Features: sidecar annotation click inspector, unified overlay zoom

### Resolution
- **Resolved**: 2026-07-21T14:36:00+08:00
- **Notes**: The inspector now selects left/right placement based on available space and follows the stable keyed target during zoom and pan.

---
